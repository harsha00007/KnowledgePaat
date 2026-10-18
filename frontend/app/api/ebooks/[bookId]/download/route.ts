import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizedDownloadUrl } from '@/lib/ebook/downloads';
import { checkRateLimit, rateLimitResponse, getRealClientIp, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { DEFAULT_FEATURE_FLAGS } from '@/lib/featureFlags';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    // 1. Feature Flag Check: Ensure PDF download is enabled
    if (!DEFAULT_FEATURE_FLAGS.ebook_pdf_download) {
      return NextResponse.json(
        {
          success: false,
          error: 'PDF download delivery is currently undergoing final staging checks.',
          code: 'FEATURE_DISABLED',
        },
        { status: 503 }
      );
    }

    // 2. Authentication Preflight for Rate Limiting Key
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.message, code: authResult.code },
        {
          status: authResult.status,
          headers: {
            'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
            Pragma: 'no-cache',
          },
        }
      );
    }

    const customer = authResult.customer;
    const clientIp = getRealClientIp(req);
    const userAgent = req.headers.get('user-agent');

    // 3. Enforce Rate Limiting (15 requests per minute per customer)
    const rateLimitKey = `ebook_download:${customer.userId}`;
    const rl = await checkRateLimit(rateLimitKey, RATE_LIMIT_POLICIES.EBOOK_DOWNLOAD);
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

    const editionId = req.nextUrl.searchParams.get('editionId');

    // 4. Resolve Authorized Download URL via Server Service
    const downloadData = await getAuthorizedDownloadUrl(
      bookId,
      editionId,
      clientIp,
      userAgent
    );

    // 5. Return response with strictly un-cached headers to prevent shared caching of signed URLs
    return NextResponse.json(
      downloadData,
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
          Pragma: 'no-cache',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (err: any) {
    logger.error('Error serving authorized eBook download link', err, {
      module: 'ebook_download_api',
    });

    const status = err.status || 500;
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Unable to authorize download.',
        code: err.code || 'DOWNLOAD_ERROR',
      },
      {
        status,
        headers: {
          'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  }
}
