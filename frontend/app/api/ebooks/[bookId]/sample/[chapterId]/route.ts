import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { UUID_REGEX } from '@/lib/ebook/validation';
import { renderSafeMarkdown } from '@/lib/ebook/markdownSanitizer';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; chapterId: string }> }
) {
  try {
    const { bookId, chapterId } = await params;

    if (!bookId || !chapterId) {
      return NextResponse.json({ success: false, error: 'Book and chapter identifiers are required.' }, { status: 400 });
    }

    if (!UUID_REGEX.test(chapterId)) {
      return NextResponse.json({ success: false, error: 'Invalid chapter identifier.' }, { status: 400 });
    }

    const supabase = await createClient();
    const isBookUuid = UUID_REGEX.test(bookId);

    // 1. Verify published book
    let bookQuery = supabase
      .from('ebooks')
      .select('id, slug, title, author, cover_image_url, status')
      .eq('status', 'published');

    if (isBookUuid) {
      bookQuery = bookQuery.eq('id', bookId);
    } else {
      bookQuery = bookQuery.eq('slug', bookId.toLowerCase().trim());
    }

    const { data: book, error: bookError } = await bookQuery.maybeSingle();

    if (bookError || !book) {
      return NextResponse.json({ success: false, error: 'Free sample not found or book is unavailable.' }, { status: 404 });
    }

    // 2. Verify current published edition
    const { data: edition, error: editionError } = await supabase
      .from('ebook_editions')
      .select('id, edition_number, version_name, status, is_current_edition')
      .eq('ebook_id', book.id)
      .eq('status', 'published')
      .eq('is_current_edition', true)
      .maybeSingle();

    if (editionError || !edition) {
      return NextResponse.json({ success: false, error: 'Current published edition is unavailable.' }, { status: 404 });
    }

    // 3. Verify chapter: MUST be in this edition, MUST be ready, and MUST be is_free_sample = true
    // Server-enforced invariant: Manipulating chapterId to a paid chapter ID returns 404
    const { data: chapter, error: chapterError } = await supabase
      .from('ebook_chapters')
      .select(`
        id,
        edition_id,
        chapter_index,
        title,
        slug,
        content_body,
        word_count,
        status,
        is_free_sample
      `)
      .eq('id', chapterId)
      .eq('edition_id', edition.id)
      .eq('status', 'ready')
      .eq('is_free_sample', true)
      .maybeSingle();

    if (chapterError || !chapter) {
      return NextResponse.json({
        success: false,
        error: 'Free sample chapter not found or this chapter is reserved for paid purchasers.'
      }, { status: 404 });
    }

    // 4. Fetch navigation links for all sample chapters in this edition
    const { data: allSampleChapters } = await supabase
      .from('ebook_chapters')
      .select('id, chapter_index, title, slug')
      .eq('edition_id', edition.id)
      .eq('status', 'ready')
      .eq('is_free_sample', true)
      .order('chapter_index', { ascending: true });

    // 5. Server-side XSS sanitization
    const safeHtml = renderSafeMarkdown(chapter.content_body || '');

    return NextResponse.json({
      success: true,
      book: {
        id: book.id,
        slug: book.slug,
        title: book.title,
        author: book.author,
        cover_image_url: book.cover_image_url,
      },
      edition: {
        id: edition.id,
        edition_number: edition.edition_number,
        version_name: edition.version_name,
      },
      chapter: {
        id: chapter.id,
        chapter_index: chapter.chapter_index,
        title: chapter.title,
        slug: chapter.slug,
        word_count: chapter.word_count || 0,
        content_body: chapter.content_body,
        safe_html: safeHtml,
        is_free_sample: true,
      },
      sample_chapters_nav: (allSampleChapters || []).map((sc: any) => ({
        id: sc.id,
        chapter_index: sc.chapter_index,
        title: sc.title,
        slug: sc.slug,
        is_current: sc.id === chapter.id,
      })),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (err: any) {
    console.error('Unhandled error in free sample GET:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
