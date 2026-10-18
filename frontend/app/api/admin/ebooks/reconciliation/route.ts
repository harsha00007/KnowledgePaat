import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { logger } from '@/lib/logger';
import { runFinancialReconciliation } from '@/lib/ebook/reconciliation';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req, 'admin_reconciliation');
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const report = await runFinancialReconciliation(limit);

    return NextResponse.json({
      success: true,
      report,
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    logger.error('Error generating financial reconciliation report', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate reconciliation report.' },
      { status: 500 }
    );
  }
}
