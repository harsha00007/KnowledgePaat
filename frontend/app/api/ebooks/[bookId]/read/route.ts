import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { resolvePurchasedEdition } from '@/lib/ebook/reader';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const url = new URL(req.url);
    const editionId = url.searchParams.get('editionId') || undefined;

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

    // Resolve purchased edition
    const resolution = await resolvePurchasedEdition(
      customer.userId,
      bookId,
      editionId
    );

    if (!resolution.authorized || !resolution.edition || !resolution.book) {
      return NextResponse.json(
        {
          success: false,
          error: resolution.reason || 'Unauthorized access.',
        },
        {
          status: resolution.status,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    const supabase = await createClient();

    // Check reading progress for last read chapter
    const { data: progress } = await supabase
      .from('ebook_reading_progress')
      .select('last_chapter_id, scroll_percent, completed_at')
      .eq('customer_id', customer.userId)
      .eq('edition_id', resolution.edition.id)
      .maybeSingle();

    let targetChapterId = progress?.last_chapter_id;

    // Verify last_chapter_id still exists in this edition
    if (targetChapterId) {
      const { data: validChapter } = await supabase
        .from('ebook_chapters')
        .select('id')
        .eq('id', targetChapterId)
        .eq('edition_id', resolution.edition.id)
        .eq('status', 'ready')
        .maybeSingle();

      if (!validChapter) {
        targetChapterId = null;
      }
    }

    // If no previous progress, pick the first chapter (chapter_index = 1)
    if (!targetChapterId) {
      const { data: firstChapter } = await supabase
        .from('ebook_chapters')
        .select('id')
        .eq('edition_id', resolution.edition.id)
        .eq('status', 'ready')
        .order('chapter_index', { ascending: true })
        .limit(1)
        .maybeSingle();

      targetChapterId = firstChapter?.id || null;
    }

    return NextResponse.json(
      {
        success: true,
        book: resolution.book,
        edition: resolution.edition,
        targetChapterId,
        progress: progress
          ? {
              scrollPercent: Number(progress.scroll_percent) || 0,
              lastChapterId: progress.last_chapter_id,
              completedAt: progress.completed_at,
            }
          : null,
        ownedEditions: resolution.ownedEditions,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error resolving entry chapter:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An internal error occurred resolving book entry.',
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
