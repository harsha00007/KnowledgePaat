import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay';
import { normalizePlanId } from '@/config/plans';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    // 1. Verify cryptographic webhook signature
    const isValidSignature = verifyRazorpayWebhookSignature({ rawBody, signature });
    if (!isValidSignature) {
      logger.warn('Rejected unauthorized webhook request (Invalid Webhook Signature)', {
        module: 'payment_webhook',
        action: 'verify_signature'
      });
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const eventData = JSON.parse(rawBody);
    const eventType = eventData.event;
    const paymentEntity = eventData.payload?.payment?.entity;
    const orderEntity = eventData.payload?.order?.entity;
    const refundEntity = eventData.payload?.refund?.entity;
    const subscriptionEntity = eventData.payload?.subscription?.entity;

    logger.info(`Received verified Razorpay webhook event: ${eventType}`, {
      module: 'payment_webhook',
      event: eventType,
      razorpayPaymentId: paymentEntity?.id || refundEntity?.payment_id,
      razorpayOrderId: paymentEntity?.order_id || orderEntity?.id
    });

    const supabase = await createClient();

    // -------------------------------------------------------------------------
    // 2. Handle Payment Success Events (payment.captured, order.paid)
    // -------------------------------------------------------------------------
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const notes = paymentEntity?.notes || orderEntity?.notes || {};
      const internalOrderId = notes.internalOrderId;

      if (!internalOrderId) {
        logger.warn('Webhook event missing internalOrderId in notes', {
          module: 'payment_webhook',
          razorpayOrderId: paymentEntity?.order_id || orderEntity?.id
        });
        return NextResponse.json({ received: true, note: 'No internal order reference' });
      }

      // Check existing order status for Idempotency
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', internalOrderId)
        .maybeSingle();

      if (!order) {
        logger.warn('Webhook received for non-existent order', {
          module: 'payment_webhook',
          internalOrderId
        });
        return NextResponse.json({ received: true, note: 'Order record not found' });
      }

      // Idempotency: If already completed, skip duplicate provisioning
      if (order.payment_status === 'paid' && order.order_status === 'completed') {
        logger.info('Webhook idempotency: Order already marked as paid', {
          module: 'payment_webhook',
          internalOrderId
        });
        return NextResponse.json({ received: true, status: 'already_processed' });
      }

      // Mark order as paid
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', internalOrderId);

      // Entitlement A: Subscription
      if (notes.orderType === 'subscription' && notes.planId && notes.studentId) {
        const normalizedPlan = normalizePlanId(notes.planId);
        const startDate = new Date().toISOString();

        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id, end_date, status')
          .eq('student_id', notes.studentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Stack 30 days onto remaining active period if renewal
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
              student_id: notes.studentId,
              plan: normalizedPlan,
              status: 'active',
              start_date: startDate,
              end_date: calculatedEndDate
            });
        }
      }

      // Entitlement B: Store Purchases
      if (notes.orderType === 'store_cart' && notes.studentId) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id')
          .eq('order_id', internalOrderId);

        if (orderItems && orderItems.length > 0) {
          const purchasesPayload = orderItems.map(item => ({
            student_id: notes.studentId,
            product_id: item.product_id,
            order_id: internalOrderId,
            purchased_at: new Date().toISOString()
          }));

          await supabase
            .from('student_purchases')
            .upsert(purchasesPayload, { onConflict: 'student_id,product_id' });

          const productIds = orderItems.map(i => i.product_id);
          await supabase
            .from('cart_items')
            .delete()
            .eq('student_id', notes.studentId)
            .in('product_id', productIds);
        }
      }

      logger.info('Webhook processed and entitlement provisioned successfully', {
        module: 'payment_webhook',
        internalOrderId,
        eventType
      });
    }

    // -------------------------------------------------------------------------
    // 3. Handle Refund Events (payment.refunded, refund.processed)
    // -------------------------------------------------------------------------
    if (eventType === 'payment.refunded' || eventType === 'refund.processed') {
      const notes = paymentEntity?.notes || refundEntity?.notes || {};
      const internalOrderId = notes.internalOrderId;

      if (internalOrderId) {
        await supabase
          .from('orders')
          .update({
            payment_status: 'refunded',
            order_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', internalOrderId);

        // Revoke / expire subscription if applicable
        if (notes.orderType === 'subscription' && notes.studentId) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              end_date: new Date().toISOString()
            })
            .eq('student_id', notes.studentId);
        }

        // Revoke store purchases for this order
        if (notes.orderType === 'store_cart' && notes.studentId) {
          await supabase
            .from('student_purchases')
            .delete()
            .eq('order_id', internalOrderId);
        }

        logger.info('Refund event processed and entitlements revoked', {
          module: 'payment_webhook',
          internalOrderId,
          refundId: refundEntity?.id
        });
      }
    }

    // -------------------------------------------------------------------------
    // 4. Handle Subscription Cancellation Events (subscription.cancelled)
    // -------------------------------------------------------------------------
    if (eventType === 'subscription.cancelled') {
      const studentId = subscriptionEntity?.notes?.studentId;
      if (studentId) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled'
          })
          .eq('student_id', studentId);

        logger.info('Subscription marked as cancelled via webhook', {
          module: 'payment_webhook',
          studentId
        });
      }
    }

    // -------------------------------------------------------------------------
    // 5. Handle Payment Failure Events (payment.failed)
    // -------------------------------------------------------------------------
    if (eventType === 'payment.failed') {
      const notes = paymentEntity?.notes || {};
      const internalOrderId = notes.internalOrderId;

      if (internalOrderId) {
        await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', internalOrderId);

        logger.warn('Payment failed webhook event recorded', {
          module: 'payment_webhook',
          internalOrderId,
          reason: paymentEntity?.error_description
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logger.error('Error handling Razorpay webhook', err, { module: 'payment_webhook' });
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
