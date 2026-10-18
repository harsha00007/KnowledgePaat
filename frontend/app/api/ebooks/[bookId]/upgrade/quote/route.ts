import { NextRequest, NextResponse } from 'next/server';
import { getUpgradeQuote } from '@/lib/ebook/downloads';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.message, code: authResult.code },
        { status: authResult.status }
      );
    }

    const { bookId } = await params;
    if (!bookId) {
      return NextResponse.json(
        { success: false, error: 'Book ID is required.' },
        { status: 400 }
      );
    }

    const editionId = req.nextUrl.searchParams.get('editionId');
    const quote = await getUpgradeQuote(bookId, editionId, authResult.customer);

    return NextResponse.json(
      {
        success: true,
        quote,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (err: any) {
    logger.error('Error fetching eBook upgrade quote', err, {
      module: 'ebook_upgrade_api',
    });

    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Unable to retrieve upgrade quote.',
      },
      { status: 500 }
    );
  }
}
