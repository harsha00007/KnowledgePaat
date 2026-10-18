import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { validateChapterReordering, isEditionContentLocked, UUID_REGEX } from '@/lib/ebook/validation';
import { logAdminAuditEvent } from '@/lib/ebook/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; editionId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'reorder_chapters');
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
        error: 'Cannot reorder chapters in a published or historical edition. Content ordering must remain immutable to protect reader access. Please create a new draft edition revision to reorder chapters.'
      }, { status: 403 });
    }

    // Fetch existing chapters in this edition
    const { data: existingChapters, error: fetchErr } = await auth.supabase
      .from('ebook_chapters')
      .select('id, chapter_index')
      .eq('edition_id', editionId);

    if (fetchErr || !existingChapters || existingChapters.length === 0) {
      return NextResponse.json({ error: 'No chapters exist to reorder.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const orderedIds = body?.orderedChapterIds;

    const validation = validateChapterReordering(existingChapters, orderedIds);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const validOrderedIds = validation.data!;
    const nowIso = new Date().toISOString();

    // To prevent unique constraint collision on (edition_id, chapter_index) during renumbering:
    // Step 1: Temporarily shift indexes to negative or large offset (e.g. 10000 + i)
    // Step 2: Set final positive indexes (1, 2, 3...)
    for (let i = 0; i < validOrderedIds.length; i++) {
      const chapterId = validOrderedIds[i];
      await auth.supabase
        .from('ebook_chapters')
        .update({ chapter_index: 10000 + (i + 1), updated_at: nowIso })
        .eq('id', chapterId)
        .eq('edition_id', editionId);
    }

    for (let i = 0; i < validOrderedIds.length; i++) {
      const chapterId = validOrderedIds[i];
      const targetIndex = i + 1;
      const { error: updateErr } = await auth.supabase
        .from('ebook_chapters')
        .update({ chapter_index: targetIndex, updated_at: nowIso })
        .eq('id', chapterId)
        .eq('edition_id', editionId);

      if (updateErr) {
        console.error('Error in chapter index re-assignment:', updateErr);
        return NextResponse.json({ error: 'Failed to complete chapter reordering.' }, { status: 500 });
      }
    }

    await logAdminAuditEvent(auth.supabase, {
      actorId: auth.user.id,
      action: 'chapter_reordered',
      entityType: 'chapter',
      entityId: editionId,
      metadata: {
        bookId,
        editionId,
        reorderedCount: validOrderedIds.length,
        orderedChapterIds: validOrderedIds
      }
    });

    // Fetch updated chapters
    const { data: updatedChapters } = await auth.supabase
      .from('ebook_chapters')
      .select('*')
      .eq('edition_id', editionId)
      .order('chapter_index', { ascending: true });

    return NextResponse.json({
      success: true,
      message: 'Chapters reordered successfully.',
      chapters: updatedChapters
    });
  } catch (err: any) {
    console.error('Unhandled error in chapter reorder POST:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
