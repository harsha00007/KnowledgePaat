import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitResponse, getRealClientIp, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';
import { normalizePlanId, PLANS, PlanId } from '@/config/plans';
import { createRazorpayOrder, getRazorpayCredentials } from '@/lib/razorpay';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate the student user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to proceed with checkout.' }, { status: 401 });
    }

    // 2. Enforce Payment Order Creation Rate Limit
    const rateLimitKey = `pay_create:${user.id}`;
    const rl = await checkRateLimit(rateLimitKey, RATE_LIMIT_POLICIES.PAYMENT_CREATE);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json().catch(() => ({}));
    const { orderType = 'subscription', planId, productIds } = body as {
      orderType?: 'subscription' | 'store_cart';
      planId?: string;
      productIds?: string[];
      // Note: Any client-supplied "amount" or "price" is intentionally ignored for security
    };

    // Ensure student profile exists (required by fk_orders_profile foreign key constraint)
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      const fallbackName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student';
      const fallbackEmail = user.email || '';

      const { data: createdProfile, error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          user_id: user.id,
          email: fallbackEmail,
          full_name: fallbackName,
          role: 'student',
          is_active: true,
        }, { onConflict: 'id' })
        .select('id, full_name, email')
        .maybeSingle();

      if (createdProfile) {
        profile = createdProfile;
      } else if (profileErr) {
        logger.warn('Could not auto-provision profile for order checkout', {
          module: 'payment',
          userId: user.id,
          error: profileErr
        });
      }
    }

    const studentName = profile?.full_name || user.user_metadata?.full_name || 'Student';
    const studentEmail = profile?.email || user.email || '';

    // =========================================================================
    // CASE A: SUBSCRIPTION PLAN CHECKOUT
    // =========================================================================
    if (orderType === 'subscription' || planId) {
      if (!planId) {
        return NextResponse.json({ error: 'Missing required planId for subscription checkout.' }, { status: 400 });
      }

      const normalizedPlan = normalizePlanId(planId);
      if (normalizedPlan === 'free') {
        return NextResponse.json({ error: 'Free tier does not require payment.' }, { status: 400 });
      }

      const planConfig = PLANS[normalizedPlan];
      if (!planConfig || planConfig.price <= 0) {
        return NextResponse.json({ error: 'Invalid subscription plan selected.' }, { status: 400 });
      }

      // Trusted Server-Side Price Lookup
      const officialPrice = planConfig.price;

      // Create internal pending order in Supabase
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          student_id: user.id,
          total_amount: officialPrice,
          status: 'pending',
          payment_status: 'pending',
          order_status: 'pending'
        })
        .select()
        .single();

      if (orderErr || !orderData) {
        logger.error('Failed to create internal order record', orderErr, {
          module: 'payment',
          userId: user.id,
          code: (orderErr as any)?.code,
          message: (orderErr as any)?.message,
          details: (orderErr as any)?.details,
          hint: (orderErr as any)?.hint
        });
        return NextResponse.json({
          error: (orderErr as any)?.message || 'Unable to initialize order. Please try again.',
          debug: process.env.NODE_ENV === 'development' ? orderErr : undefined
        }, { status: 500 });
      }

      // Create Razorpay test order
      const razorpayOrder = await createRazorpayOrder({
        amountInRupees: officialPrice,
        receipt: `sub_${orderData.id.slice(0, 8)}`,
        notes: {
          internalOrderId: orderData.id,
          studentId: user.id,
          orderType: 'subscription',
          planId: normalizedPlan
        }
      });

      const { keyId } = getRazorpayCredentials();

      logger.info('Subscription checkout order initialized', {
        module: 'payment',
        userId: user.id,
        internalOrderId: orderData.id,
        razorpayOrderId: razorpayOrder.id,
        plan: normalizedPlan,
        amount: officialPrice
      });

      return NextResponse.json({
        success: true,
        orderId: razorpayOrder.id,
        internalOrderId: orderData.id,
        amount: razorpayOrder.amount, // in paise
        currency: razorpayOrder.currency,
        keyId,
        name: 'KnowledgePaat',
        description: `${planConfig.name} Membership Plan Subscription`,
        prefill: {
          name: studentName,
          email: studentEmail
        },
        notes: {
          orderType: 'subscription',
          planId: normalizedPlan
        }
      });
    }

    // =========================================================================
    // CASE B: DIGITAL STORE & NOTES CART CHECKOUT
    // =========================================================================
    if (orderType === 'store_cart') {
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return NextResponse.json({ error: 'No items provided for checkout.' }, { status: 400 });
      }

      // Fetch official products from database to calculate server-side total
      const { data: dbProducts, error: prodErr } = await supabase
        .from('store_products')
        .select('*')
        .in('id', productIds)
        .eq('status', 'active');

      if (prodErr || !dbProducts || dbProducts.length === 0) {
        return NextResponse.json({ error: 'Selected items are no longer available.' }, { status: 400 });
      }

      // Compute trusted server-side total price
      const officialTotal = dbProducts.reduce((sum, p) => sum + Number(p.price), 0);

      if (officialTotal <= 0) {
        return NextResponse.json({ error: 'Invalid cart total amount.' }, { status: 400 });
      }

      // Create internal pending order
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          student_id: user.id,
          total_amount: officialTotal,
          status: 'pending',
          payment_status: 'pending',
          order_status: 'pending'
        })
        .select()
        .single();

      if (orderErr || !orderData) {
        logger.error('Failed to create internal order for store cart', orderErr, {
          module: 'payment',
          userId: user.id,
          code: (orderErr as any)?.code,
          message: (orderErr as any)?.message,
          details: (orderErr as any)?.details,
          hint: (orderErr as any)?.hint
        });
        return NextResponse.json({
          error: (orderErr as any)?.message || 'Unable to initialize checkout order.',
          debug: process.env.NODE_ENV === 'development' ? orderErr : undefined
        }, { status: 500 });
      }

      // Create order items
      const orderItems = dbProducts.map(p => ({
        order_id: orderData.id,
        product_id: p.id,
        price: p.price
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
      if (itemsErr) {
        logger.error('Failed to insert order items for store cart', itemsErr, {
          module: 'payment',
          userId: user.id,
          orderId: orderData.id,
          code: (itemsErr as any)?.code,
          message: (itemsErr as any)?.message,
          details: (itemsErr as any)?.details
        });
      }

      // Create Razorpay test order
      const razorpayOrder = await createRazorpayOrder({
        amountInRupees: officialTotal,
        receipt: `cart_${orderData.id.slice(0, 8)}`,
        notes: {
          internalOrderId: orderData.id,
          studentId: user.id,
          orderType: 'store_cart',
          itemsCount: String(dbProducts.length)
        }
      });

      const { keyId } = getRazorpayCredentials();

      logger.info('Store cart checkout order initialized', {
        module: 'payment',
        userId: user.id,
        internalOrderId: orderData.id,
        razorpayOrderId: razorpayOrder.id,
        itemsCount: dbProducts.length,
        total: officialTotal
      });

      return NextResponse.json({
        success: true,
        orderId: razorpayOrder.id,
        internalOrderId: orderData.id,
        amount: razorpayOrder.amount, // in paise
        currency: razorpayOrder.currency,
        keyId,
        name: 'KnowledgePaat Digital Store',
        description: `Purchase of ${dbProducts.length} digital study resource(s)`,
        prefill: {
          name: studentName,
          email: studentEmail
        },
        notes: {
          orderType: 'store_cart',
          itemsCount: String(dbProducts.length)
        }
      });
    }

    return NextResponse.json({ error: 'Invalid orderType specified.' }, { status: 400 });
  } catch (err: any) {
    logger.error('Unhandled exception in create-order endpoint', { module: 'payment' }, err);
    return NextResponse.json({ error: 'Internal server error while initializing order.' }, { status: 500 });
  }
}
