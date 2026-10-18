import { NextRequest, NextResponse } from 'next/server';
import { checkAndReconcileOrderPayment } from '@/lib/ebook/orders';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId parameter.' },
        { status: 400 }
      );
    }

    // 1. Authenticate and verify customer identity
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.message, code: authResult.code },
        { status: authResult.status }
      );
    }
    const customer = authResult.customer;

    // 2. Enforce payment verification rate limits (20 attempts per 5 mins per customer)
    const rateLimitKey = `pay_check_status:${customer.userId}`;
    const rl = await checkRateLimit(rateLimitKey, RATE_LIMIT_POLICIES.PAYMENT_VERIFY);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    // 3. Reconcile payment status against Razorpay Gateway API using stored provider order ID
    const result = await checkAndReconcileOrderPayment(orderId, customer.userId);

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    logger.error('Error in check-status recovery action', err, {
      module: 'ebook_orders_api',
    });

    const isClientError =
      err.message?.includes('not found') ||
      err.message?.includes('Unauthorized') ||
      err.message?.includes('Missing');

    return NextResponse.json(
      { error: err.message || 'Payment status check failed.' },
      { status: isClientError ? 400 : 500 }
    );
  }
}
