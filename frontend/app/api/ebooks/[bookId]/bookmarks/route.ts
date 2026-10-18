import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { listBookmarks, addBookmark } from '@/lib/ebook/reader';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const url = new URL(req.url);
    const editionId = url.searchParams.get('editionId');

    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.message },
        { status: authResult.status }
      );
    }

    if (!editionId) {
      return NextResponse.json(
        { success: false, error: 'Edition ID is required.' },
        { status: 400 }
      );
    }

    const res = await listBookmarks(authResult.customer.userId, bookId, editionId);
    return NextResponse.json(res, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.message },
        { status: authResult.status }
      );
    }

    const body = await req.json();
    const { editionId, chapterId, scrollPercent, title } = body;

    if (!editionId || !chapterId) {
      return NextResponse.json(
        { success: false, error: 'editionId and chapterId are required.' },
        { status: 400 }
      );
    }

    const res = await addBookmark(
      authResult.customer.userId,
      bookId,
      editionId,
      chapterId,
      scrollPercent || 0,
      title
    );

    return NextResponse.json(res, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
