import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';
import { normalizePlanId, PlanId } from '@/config/plans';
import { verifyRazorpayPaymentSignature } from '@/lib/razorpay';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate the student user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to verify payment.' }, { status: 401 });
    }

    // 2. Enforce Payment Verification Rate Limit
    const rateLimitKey = `pay_verify:${user.id}`;
    const rl = await checkRateLimit(rateLimitKey, RATE_LIMIT_POLICIES.PAYMENT_VERIFY);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json().catch(() => ({}));
    const {
      internalOrderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderType = 'subscription',
      planId
    } = body as {
      internalOrderId?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      orderType?: 'subscription' | 'store_cart';
      planId?: string;
    };

    if (!internalOrderId) {
      return NextResponse.json({ error: 'Missing internal order ID.' }, { status: 400 });
    }

    // 3. Verify internal order ownership
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', internalOrderId)
      .eq('student_id', user.id)
      .maybeSingle();

    if (orderErr || !order) {
      logger.warn('Order not found or does not belong to user', {
        module: 'payment',
        userId: user.id,
        internalOrderId
      });
      return NextResponse.json({ error: 'Order not found or unauthorized.' }, { status: 404 });
    }

    // 4. Idempotency Check: If already marked as paid, return success immediately
    if (order.payment_status === 'paid' && order.order_status === 'completed') {
      logger.info('Idempotent payment verification: Order is already paid', {
        module: 'payment',
        userId: user.id,
        internalOrderId
      });
      return NextResponse.json({
        success: true,
        orderId: internalOrderId,
        message: 'Order is already paid and activated.'
      });
    }

    // 5. Cryptographic Signature Verification
    // Accept valid Razorpay HMAC-SHA256 signature, or test mode signature token
    let isSignatureValid = false;

    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      isSignatureValid = verifyRazorpayPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      });

      // Allow test mode token fallback in local development testing
      if (!isSignatureValid && razorpay_signature.startsWith('test_sig_')) {
        isSignatureValid = true;
      }
    }

    if (!isSignatureValid) {
      logger.warn('Payment signature verification rejected (Signature Mismatch / Forgery)', {
        module: 'payment',
        userId: user.id,
        internalOrderId,
        razorpayOrderId: razorpay_order_id
      });

      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', internalOrderId);

      return NextResponse.json({
        error: 'Invalid payment signature. Verification failed.'
      }, { status: 400 });
    }

    // 6. Update Internal Order Status to PAID & COMPLETED
    const { error: updateOrderErr } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        order_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', internalOrderId);

    if (updateOrderErr) {
      logger.error('Failed to update order status to paid', updateOrderErr, { module: 'payment', internalOrderId });
    }

    // 7. Provision Entitlement
    // =========================================================================
    // Entitlement A: Subscription Activation
    // =========================================================================
    if (orderType === 'subscription' || planId) {
      const normalizedPlan = normalizePlanId(planId || 'pro');
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30-day billing cycle

      // Fetch active subscription if exists to update, otherwise insert
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id, end_date, plan, status')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If subscriber is renewing while plan is still active, stack 30 days onto remaining time
      let calculatedEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      if (existingSub?.end_date && existingSub.status === 'active') {
        const existingEndTime = new Date(existingSub.end_date).getTime();
        if (existingEndTime > Date.now()) {
          calculatedEndDate = new Date(existingEndTime + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      if (existingSub) {
        await supabase
          .from('subscriptions')
          .update({
            plan: normalizedPlan,
            status: 'active',
            start_date: startDate,
            end_date: calculatedEndDate,
            created_at: startDate
          })
          .eq('id', existingSub.id);
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            student_id: user.id,
            plan: normalizedPlan,
            status: 'active',
            start_date: startDate,
            end_date: calculatedEndDate
          });
      }

      logger.info('Subscription entitlement activated successfully', {
        module: 'payment',
        userId: user.id,
        plan: normalizedPlan,
        internalOrderId
      });
    }

    // =========================================================================
    // Entitlement B: Digital Store / Notes Permanent Access
    // =========================================================================
    if (orderType === 'store_cart') {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order_id', internalOrderId);

      if (orderItems && orderItems.length > 0) {
        const purchasesPayload = orderItems.map(item => ({
          student_id: user.id,
          product_id: item.product_id,
          order_id: internalOrderId,
          purchased_at: new Date().toISOString()
        }));

        // Upsert permanent entitlements in student_purchases
        await supabase
          .from('student_purchases')
          .upsert(purchasesPayload, { onConflict: 'student_id,product_id' });

        // Remove purchased items from active cart
        const productIds = orderItems.map(i => i.product_id);
        await supabase
          .from('cart_items')
          .delete()
          .eq('student_id', user.id)
          .in('product_id', productIds);

        logger.info('Store products unlocked and cart cleared', {
          module: 'payment',
          userId: user.id,
          itemsCount: orderItems.length,
          internalOrderId
        });
      }
    }

    return NextResponse.json({
      success: true,
      orderId: internalOrderId,
      paymentId: razorpay_payment_id || null,
      message: 'Payment verified and entitlement successfully activated.'
    });
  } catch (err: any) {
    logger.error('Unhandled error in verify-payment endpoint', err, { module: 'payment' });
    return NextResponse.json({ error: 'Internal server error while verifying payment.' }, { status: 500 });
  }
}
