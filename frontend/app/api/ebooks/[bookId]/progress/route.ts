import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { saveReadingProgress } from '@/lib/ebook/reader';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

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
        { success: false, error: 'Edition ID is required to get progress.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: progress } = await supabase
      .from('ebook_reading_progress')
      .select('last_chapter_id, scroll_percent, completed_at, updated_at')
      .eq('customer_id', authResult.customer.userId)
      .eq('ebook_id', bookId)
      .eq('edition_id', editionId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      progress: progress || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
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

    const rl = await checkRateLimit(
      `reader_persist:${authResult.customer.userId}`,
      RATE_LIMIT_POLICIES.READER_PERSIST
    );
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json();
    const { editionId, chapterId, scrollPercent } = body;

    if (!editionId || !chapterId || typeof scrollPercent !== 'number') {
      return NextResponse.json(
        { success: false, error: 'editionId, chapterId, and scrollPercent are required.' },
        { status: 400 }
      );
    }

    const saveResult = await saveReadingProgress(
      authResult.customer.userId,
      bookId,
      editionId,
      chapterId,
      scrollPercent
    );

    if (!saveResult.success) {
      return NextResponse.json(
        { success: false, error: saveResult.error },
        { status: saveResult.status }
      );
    }

    return NextResponse.json({
      success: true,
      progress: saveResult.progress,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
