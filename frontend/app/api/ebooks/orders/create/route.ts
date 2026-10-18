import { NextRequest, NextResponse } from 'next/server';
import { createEBookServerOrder } from '@/lib/ebook/orders';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { DEFAULT_FEATURE_FLAGS } from '@/lib/featureFlags';
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
    const rateLimitKey = `pay_create_ebook:${customer.userId}`;
    const rl = await checkRateLimit(rateLimitKey, RATE_LIMIT_POLICIES.PAYMENT_CREATE);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    // 3. Parse and validate body
    const body = await req.json().catch(() => ({}));
    const { items } = body as { items?: Array<{ bookId: string; plan: any }> };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided for order checkout.' },
        { status: 400 }
      );
    }

    // 4. Create authoritative server order
    const result = await createEBookServerOrder(items);

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    logger.error('Error creating ebook server order', err, {
      module: 'ebook_orders_api',
    });

    const isClientError =
      err.message?.includes('already own') ||
      err.message?.includes('duplicate') ||
      err.message?.includes('unavailable') ||
      err.message?.includes('Unsupported') ||
      err.message?.includes('cannot be empty');

    return NextResponse.json(
      { error: err.message || 'Failed to create order.' },
      { status: isClientError ? 400 : 500 }
    );
  }
}
