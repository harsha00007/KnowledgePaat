import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { validateChapterPayload, isEditionContentLocked, UUID_REGEX } from '@/lib/ebook/validation';
import { logAdminAuditEvent } from '@/lib/ebook/audit';

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

    // Verify edition belongs to book
    const { data: edition, error: edErr } = await auth.supabase
      .from('ebook_editions')
      .select('id, edition_number, status')
      .eq('id', editionId)
      .eq('ebook_id', bookId)
      .maybeSingle();

    if (edErr || !edition) {
      return NextResponse.json({ error: 'Edition not found for this book.' }, { status: 404 });
    }

    const { data: chapters, error } = await auth.supabase
      .from('ebook_chapters')
      .select('*')
      .eq('edition_id', editionId)
      .order('chapter_index', { ascending: true });

    if (error) {
      console.error('Error fetching chapters:', error);
      return NextResponse.json({ error: 'Failed to fetch chapters.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, chapters: chapters || [] });
  } catch (err: any) {
    console.error('Unhandled error in get chapters GET:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; editionId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'create_chapter');
    if (!auth.authorized) return auth.response!;

    const { bookId, editionId } = await params;
    if (!UUID_REGEX.test(bookId) || !UUID_REGEX.test(editionId)) {
      return NextResponse.json({ error: 'Invalid UUID provided.' }, { status: 400 });
    }

    // Verify edition belongs to book
    const { data: edition, error: edErr } = await auth.supabase
      .from('ebook_editions')
      .select('id, edition_number, status, published_at')
      .eq('id', editionId)
      .eq('ebook_id', bookId)
      .maybeSingle();

    if (edErr || !edition) {
      return NextResponse.json({ error: 'Edition not found for this book.' }, { status: 404 });
    }

    if (isEditionContentLocked(edition)) {
      return NextResponse.json({
        error: 'Cannot add chapters to a published or historical edition. Content must remain immutable to protect reader access. Please create a new draft edition revision to add chapters.'
      }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateChapterPayload(body);

    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const chapterData = validation.data!;

    // Check slug uniqueness within this edition
    const { data: existingSlug } = await auth.supabase
      .from('ebook_chapters')
      .select('id')
      .eq('edition_id', editionId)
      .eq('slug', chapterData.slug)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json({ error: `The slug "${chapterData.slug}" is already in use in this edition.` }, { status: 400 });
    }

    // Calculate next chapter_index
    const { data: lastChapter } = await auth.supabase
      .from('ebook_chapters')
      .select('chapter_index')
      .eq('edition_id', editionId)
      .order('chapter_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextIndex = (lastChapter?.chapter_index || 0) + 1;

    const { data: createdChapter, error: chErr } = await auth.supabase
      .from('ebook_chapters')
      .insert({
        ebook_id: bookId,
        edition_id: editionId,
        chapter_index: nextIndex,
        title: chapterData.title,
        slug: chapterData.slug,
        content_body: chapterData.content_body,
        word_count: chapterData.word_count,
        status: chapterData.status,
        is_free_sample: chapterData.is_free_sample,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (chErr || !createdChapter) {
      console.error('Error creating chapter:', chErr);
      return NextResponse.json({ error: chErr?.message || 'Failed to create chapter.' }, { status: 500 });
    }

    await logAdminAuditEvent(auth.supabase, {
      actorId: auth.user.id,
      action: 'chapter_created',
      entityType: 'chapter',
      entityId: createdChapter.id,
      metadata: {
        bookId,
        editionId,
        chapterIndex: nextIndex,
        title: createdChapter.title,
        isFreeSample: createdChapter.is_free_sample
      }
    });

    return NextResponse.json({ success: true, chapter: createdChapter });
  } catch (err: any) {
    console.error('Unhandled error in create chapter POST:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
