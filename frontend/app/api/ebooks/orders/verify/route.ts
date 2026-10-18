import { NextRequest, NextResponse } from 'next/server';
import { verifyAndFinalizeEBookPayment } from '@/lib/ebook/orders';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate and verify customer identity
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.message, code: authResult.code },
        { status: authResult.status }
      );
    }
    const customer = authResult.customer;

    // 2. Enforce payment rate limits
    const rateLimitKey = `pay_verify_ebook:${customer.userId}`;
    const rl = await checkRateLimit(rateLimitKey, RATE_LIMIT_POLICIES.PAYMENT_VERIFY);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    // 3. Parse and validate body
    const body = await req.json().catch(() => ({}));
    const {
      internalOrderId,
      razorpayOrderId,
      razorpay_order_id,
      razorpayPaymentId,
      razorpay_payment_id,
      razorpaySignature,
      razorpay_signature,
    } = body;

    const resolvedOrderId = razorpayOrderId || razorpay_order_id;
    const resolvedPaymentId = razorpayPaymentId || razorpay_payment_id;
    const resolvedSignature = razorpaySignature || razorpay_signature;

    if (!internalOrderId || !resolvedOrderId || !resolvedPaymentId || !resolvedSignature) {
      return NextResponse.json(
        { error: 'Missing required payment verification fields.' },
        { status: 400 }
      );
    }

    // 4. Verify cryptographic signature and authoritatively finalize order
    const result = await verifyAndFinalizeEBookPayment(
      {
        internalOrderId,
        razorpayOrderId: resolvedOrderId,
        razorpayPaymentId: resolvedPaymentId,
        razorpaySignature: resolvedSignature,
      },
      customer.userId
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    logger.error('Error verifying ebook payment', err, {
      module: 'ebook_orders_api',
    });

    const isClientError =
      err.message?.includes('Invalid payment signature') ||
      err.message?.includes('mismatch') ||
      err.message?.includes('Missing') ||
      err.message?.includes('not captured') ||
      err.message?.includes('Unauthorized') ||
      err.message?.includes('not found') ||
      err.message?.includes('Unable to fetch');

    return NextResponse.json(
      { error: err.message || 'Payment verification failed.' },
      { status: isClientError ? 400 : 500 }
    );
  }
}
