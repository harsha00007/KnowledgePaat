import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { logger } from '@/lib/logger';
import { getEBookAdminReport } from '@/lib/ebook/reports';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req, 'admin_reports');
    if (!auth.authorized) return auth.response!;

    const rl = await checkRateLimit(
      `admin_reports:${auth.user.id}`,
      RATE_LIMIT_POLICIES.ADMIN_EXPORT
    );
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

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
