import { NextRequest, NextResponse } from 'next/server';
import { createEBookUpgradeOrder } from '@/lib/ebook/downloads';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    // 1. Resolve and authenticate customer
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.message, code: authResult.code },
        { status: authResult.status }
      );
    }
    const customer = authResult.customer;

    // 2. Enforce upgrade creation rate limiting (10 attempts per 5 minutes)
    const rateLimitKey = `ebook_upgrade:${customer.userId}`;
    const rl = await checkRateLimit(rateLimitKey, RATE_LIMIT_POLICIES.EBOOK_UPGRADE);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const { bookId } = await params;
    if (!bookId) {
      return NextResponse.json(
        { success: false, error: 'Book ID is required.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const editionId = body?.editionId || null;

    // 3. Create server-calculated upgrade order with Razorpay Test Mode integration
    const result = await createEBookUpgradeOrder(bookId, editionId);

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    logger.error('Error creating eBook upgrade order', err, {
      module: 'ebook_upgrade_api',
    });

    const isClientError =
      err.message?.includes('not found') ||
      err.message?.includes('already own') ||
      err.message?.includes('revoked') ||
      err.message?.includes('must own') ||
      err.message?.includes('eligible');

    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to initialize upgrade order.',
      },
      { status: isClientError ? 400 : 500 }
    );
  }
}
