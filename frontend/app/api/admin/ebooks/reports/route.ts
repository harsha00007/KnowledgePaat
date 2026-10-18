import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { logger } from '@/lib/logger';
import { getEBookAdminReport } from '@/lib/ebook/reports';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req, 'admin_reports');
    if (!auth.authorized) return auth.response!;

    const report = await getEBookAdminReport();

    return NextResponse.json({
      success: true,
      report,
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    logger.error('Error generating admin reports', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate operational report.' },
      { status: 500 }
    );
  }
}
