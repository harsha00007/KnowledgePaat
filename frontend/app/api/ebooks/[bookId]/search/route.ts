import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { searchAuthorizedBook } from '@/lib/ebook/reader';
import { checkRateLimit, getRealClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const editionId = url.searchParams.get('editionId');

    // 1. Authoritative customer authentication
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.message },
        { status: authResult.status }
      );
    }

    if (!editionId) {
      return NextResponse.json(
        { success: false, error: 'Edition ID is required for search.' },
        { status: 400 }
      );
    }

    // 2. Rate limiting (30 requests per minute per user/IP)
    const clientIp = getRealClientIp(req);
    const rateLimitKey = `search_${authResult.customer.userId || clientIp}`;
    const rateLimit = await checkRateLimit(rateLimitKey, { limit: 30, windowSeconds: 60 });

    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Too many search requests. Please slow down.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 5),
          },
        }
      );
    }

    // 3. Perform authorized search
    const searchResult = await searchAuthorizedBook(
      authResult.customer.userId,
      bookId,
      editionId,
      q
    );

    if (!searchResult.success) {
      return NextResponse.json(
        { success: false, error: searchResult.error },
        { status: searchResult.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        query: q,
        results: searchResult.results || [],
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed.' },
      { status: 500 }
    );
  }
}
