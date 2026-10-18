import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { renderSafeMarkdown } from '@/lib/ebook/markdownSanitizer';
import { UUID_REGEX } from '@/lib/ebook/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; editionId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) return auth.response!;

    const { bookId, editionId } = await params;
    if (!UUID_REGEX.test(bookId) || !UUID_REGEX.test(editionId)) {
      return NextResponse.json({ error: 'Invalid UUID provided.' }, { status: 400 });
    }

    // Fetch book and edition
    const { data: book, error: bookErr } = await auth.supabase
      .from('ebooks')
      .select('*')
      .eq('id', bookId)
      .maybeSingle();

    if (bookErr || !book) {
      return NextResponse.json({ error: 'eBook not found.' }, { status: 404 });
    }

    const { data: edition, error: edErr } = await auth.supabase
      .from('ebook_editions')
      .select('*')
      .eq('id', editionId)
      .eq('ebook_id', bookId)
      .maybeSingle();

    if (edErr || !edition) {
      return NextResponse.json({ error: 'Edition not found for this book.' }, { status: 404 });
    }

    const { data: chapters, error: chErr } = await auth.supabase
      .from('ebook_chapters')
      .select('*')
      .eq('edition_id', editionId)
      .order('chapter_index', { ascending: true });

    if (chErr) {
      return NextResponse.json({ error: 'Failed to fetch chapters for preview.' }, { status: 500 });
    }

    // Safely render Markdown for each chapter for preview
    const renderedChapters = (chapters || []).map((ch: any) => ({
      ...ch,
      rendered_html: renderSafeMarkdown(ch.content_body || '')
    }));

    return NextResponse.json({
      success: true,
      book,
      edition,
      chapters: renderedChapters
    });
  } catch (err: any) {
    console.error('Unhandled error in admin preview GET:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
