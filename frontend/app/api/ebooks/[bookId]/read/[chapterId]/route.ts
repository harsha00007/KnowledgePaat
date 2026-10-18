import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { getAuthorizedChapterContent } from '@/lib/ebook/reader';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; chapterId: string }> }
) {
  try {
    const { bookId, chapterId } = await params;
    const url = new URL(req.url);
    const editionId = url.searchParams.get('editionId') || undefined;

    // 1. Authoritative customer authentication & email verification
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.message,
          code: authResult.code,
        },
        {
          status: authResult.status,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    const customer = authResult.customer;

    // 2. Retrieve authorized chapter content
    const result = await getAuthorizedChapterContent(
      customer.userId,
      bookId,
      chapterId,
      editionId
    );

    if (!result.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        {
          status: result.status,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    // 3. Return protected chapter content with strict no-cache/private headers
    return NextResponse.json(
      {
        success: true,
        book: result.book,
        edition: result.edition,
        chapter: result.chapter,
        navigation: result.navigation,
        progress: result.progress,
        ownedEditions: result.ownedEditions,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error serving protected chapter:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An internal error occurred while retrieving chapter content.',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
