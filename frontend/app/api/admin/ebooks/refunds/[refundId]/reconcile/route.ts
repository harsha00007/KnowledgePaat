import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { logger } from '@/lib/logger';
import { syncRefundStatusWithGateway } from '@/lib/ebook/refunds';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ refundId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'admin_refund_reconcile');
    if (!auth.authorized) return auth.response!;

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
