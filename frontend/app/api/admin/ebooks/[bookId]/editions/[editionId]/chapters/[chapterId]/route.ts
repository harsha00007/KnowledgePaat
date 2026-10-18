import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { 
  validateChapterPayload, 
  validateChapterDeletionEligibility, 
  isEditionContentLocked,
  UUID_REGEX 
} from '@/lib/ebook/validation';
import { logAdminAuditEvent } from '@/lib/ebook/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; editionId: string; chapterId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) return auth.response!;

    const { bookId, editionId, chapterId } = await params;
    if (!UUID_REGEX.test(bookId) || !UUID_REGEX.test(editionId) || !UUID_REGEX.test(chapterId)) {
      return NextResponse.json({ error: 'Invalid UUID provided.' }, { status: 400 });
    }

    const { data: chapter, error } = await auth.supabase
      .from('ebook_chapters')
      .select('*')
      .eq('id', chapterId)
      .eq('edition_id', editionId)
      .eq('ebook_id', bookId)
      .maybeSingle();

    if (error || !chapter) {
      return NextResponse.json({ error: 'Chapter not found for this book and edition.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, chapter });
  } catch (err: any) {
    console.error('Unhandled error in get chapter GET:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; editionId: string; chapterId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'update_chapter');
    if (!auth.authorized) return auth.response!;

    const { bookId, editionId, chapterId } = await params;
    if (!UUID_REGEX.test(bookId) || !UUID_REGEX.test(editionId) || !UUID_REGEX.test(chapterId)) {
      return NextResponse.json({ error: 'Invalid UUID provided.' }, { status: 400 });
    }

    // Verify chapter exists and belongs to this book and edition
    const { data: chapter, error: chErr } = await auth.supabase
      .from('ebook_chapters')
      .select('*')
      .eq('id', chapterId)
      .eq('edition_id', editionId)
      .eq('ebook_id', bookId)
      .maybeSingle();

    if (chErr || !chapter) {
      return NextResponse.json({ error: 'Chapter not found for this book and edition.' }, { status: 404 });
    }

    // Verify edition state
    const { data: edition, error: edErr } = await auth.supabase
      .from('ebook_editions')
      .select('id, status, published_at')
      .eq('id', editionId)
      .eq('ebook_id', bookId)
      .maybeSingle();

    if (edErr || !edition) {
      return NextResponse.json({ error: 'Edition not found for this book.' }, { status: 404 });
    }

    if (isEditionContentLocked(edition)) {
      return NextResponse.json({
        error: 'Cannot edit chapter content or sample designation in a published or historical edition. Content must remain immutable to protect reader access. Please create a new draft edition revision to modify chapter text.'
      }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateChapterPayload({
      ...body,
      chapter_index: chapter.chapter_index
    });

    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const updateData = validation.data!;

    // Check slug uniqueness across other chapters in this edition
    const { data: existingSlug } = await auth.supabase
      .from('ebook_chapters')
      .select('id')
      .eq('edition_id', editionId)
      .eq('slug', updateData.slug)
      .neq('id', chapterId)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json({ error: `The slug "${updateData.slug}" is already used by another chapter in this edition.` }, { status: 400 });
    }

    const { data: updatedChapter, error: updateErr } = await auth.supabase
      .from('ebook_chapters')
      .update({
        title: updateData.title,
        slug: updateData.slug,
        content_body: updateData.content_body,
        word_count: updateData.word_count,
        status: updateData.status,
        is_free_sample: updateData.is_free_sample,
        updated_at: new Date().toISOString()
      })
      .eq('id', chapterId)
      .select()
      .single();

    if (updateErr || !updatedChapter) {
      console.error('Error updating chapter:', updateErr);
      return NextResponse.json({ error: updateErr?.message || 'Failed to update chapter.' }, { status: 500 });
    }

    await logAdminAuditEvent(auth.supabase, {
      actorId: auth.user.id,
      action: 'chapter_updated',
      entityType: 'chapter',
      entityId: chapterId,
      metadata: {
        bookId,
        editionId,
        title: updatedChapter.title,
        status: updatedChapter.status,
        isFreeSample: updatedChapter.is_free_sample
      }
    });

    return NextResponse.json({ success: true, chapter: updatedChapter });
  } catch (err: any) {
    console.error('Unhandled error in update chapter PUT:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; editionId: string; chapterId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'delete_chapter');
    if (!auth.authorized) return auth.response!;

    const { bookId, editionId, chapterId } = await params;
    if (!UUID_REGEX.test(bookId) || !UUID_REGEX.test(editionId) || !UUID_REGEX.test(chapterId)) {
      return NextResponse.json({ error: 'Invalid UUID provided.' }, { status: 400 });
    }

    // 1. Verify edition exists and check lifecycle state
    const { data: edition, error: edErr } = await auth.supabase
      .from('ebook_editions')
      .select('id, edition_number, status, published_at')
      .eq('id', editionId)
      .eq('ebook_id', bookId)
      .maybeSingle();

    if (edErr || !edition) {
      return NextResponse.json({ error: 'Edition not found for this book.' }, { status: 404 });
    }

    // 2. Verify chapter exists and strictly matches book & edition
    const { data: chapter, error: chErr } = await auth.supabase
      .from('ebook_chapters')
      .select('id, title, chapter_index')
      .eq('id', chapterId)
      .eq('edition_id', editionId)
      .eq('ebook_id', bookId)
      .maybeSingle();

    if (chErr || !chapter) {
      return NextResponse.json({ error: 'Chapter not found for this book and edition.' }, { status: 404 });
    }

    // 3. Safe Deletion Validation: Block deletion if edition is published or locked
    const eligibility = validateChapterDeletionEligibility(edition, chapter);
    if (!eligibility.isValid) {
      return NextResponse.json({ error: eligibility.errors.join(' ') }, { status: 403 });
    }

    // 4. Delete the chapter
    const { error: deleteErr } = await auth.supabase
      .from('ebook_chapters')
      .delete()
      .eq('id', chapterId);

    if (deleteErr) {
      console.error('Error deleting chapter:', deleteErr);
      return NextResponse.json({ error: deleteErr.message || 'Failed to delete chapter.' }, { status: 500 });
    }

    // 5. Renumber remaining chapters sequentially to keep ordering consistent without gaps
    const { data: remainingChapters } = await auth.supabase
      .from('ebook_chapters')
      .select('id, chapter_index')
      .eq('edition_id', editionId)
      .order('chapter_index', { ascending: true });

    if (remainingChapters && remainingChapters.length > 0) {
      const nowIso = new Date().toISOString();
      for (let i = 0; i < remainingChapters.length; i++) {
        const item = remainingChapters[i];
        const newIndex = i + 1;
        if (item.chapter_index !== newIndex) {
          await auth.supabase
            .from('ebook_chapters')
            .update({ chapter_index: newIndex, updated_at: nowIso })
            .eq('id', item.id);
        }
      }
    }

    // 6. Record Audit Event
    await logAdminAuditEvent(auth.supabase, {
      actorId: auth.user.id,
      action: 'chapter_deleted',
      entityType: 'chapter',
      entityId: chapterId,
      metadata: {
        bookId,
        editionId,
        deletedChapterTitle: chapter.title,
        deletedChapterIndex: chapter.chapter_index
      }
    });

    return NextResponse.json({
      success: true,
      message: `Chapter "${chapter.title}" deleted and remaining chapters re-sequenced successfully.`
    });
  } catch (err: any) {
    console.error('Unhandled error in delete chapter DELETE:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
