import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { logger } from '@/lib/logger';
import { syncRefundStatusWithGateway } from '@/lib/ebook/refunds';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ refundId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'admin_refund_reconcile');
    if (!auth.authorized) return auth.response!;

    const rl = await checkRateLimit(
      `refund_rec:${auth.user.id}`,
      RATE_LIMIT_POLICIES.REFUND_RECONCILE
    );
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const { refundId } = await params;
    const result = await syncRefundStatusWithGateway(refundId);

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (err: any) {
    logger.error('Error in refund recovery endpoint', err);
    return NextResponse.json(
      { error: err.message || 'Failed to reconcile refund status.' },
      { status: 500 }
    );
  }
}
