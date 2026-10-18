import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { validateBookPayload, UUID_REGEX } from '@/lib/ebook/validation';
import { logAdminAuditEvent } from '@/lib/ebook/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) return auth.response!;

    const { bookId } = await params;
    if (!UUID_REGEX.test(bookId)) {
      return NextResponse.json({ error: 'Invalid book UUID.' }, { status: 400 });
    }

    // Fetch book with all editions, chapters, and assets
    const { data: book, error } = await auth.supabase
      .from('ebooks')
      .select(`
        *,
        editions:ebook_editions (
          *,
          chapters:ebook_chapters (*)
        ),
        assets:ebook_assets (*)
      `)
      .eq('id', bookId)
      .maybeSingle();

    if (error || !book) {
      return NextResponse.json({ error: 'eBook not found.' }, { status: 404 });
    }

    // Sort chapters by chapter_index ASC in each edition
    if (book.editions) {
      for (const ed of book.editions) {
        if (ed.chapters) {
          ed.chapters.sort((a: any, b: any) => a.chapter_index - b.chapter_index);
        }
      }
    }

    return NextResponse.json({ success: true, book });
  } catch (err: any) {
    console.error('Unhandled error in admin book detail GET:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'update');
    if (!auth.authorized) return auth.response!;

    const { bookId } = await params;
    if (!UUID_REGEX.test(bookId)) {
      return NextResponse.json({ error: 'Invalid book UUID.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateBookPayload(body);

    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const updateData = validation.data!;

    // Check slug uniqueness across other books
    const { data: existingSlug } = await auth.supabase
      .from('ebooks')
      .select('id')
      .eq('slug', updateData.slug)
      .neq('id', bookId)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json({ error: `The slug "${updateData.slug}" is already taken by another book.` }, { status: 400 });
    }

    const { data: updatedBook, error: updateErr } = await auth.supabase
      .from('ebooks')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookId)
      .select()
      .single();

    if (updateErr || !updatedBook) {
      console.error('Error updating book:', updateErr);
      return NextResponse.json({ error: updateErr?.message || 'Failed to update eBook.' }, { status: 500 });
    }

    await logAdminAuditEvent(auth.supabase, {
      actorId: auth.user.id,
      action: 'book_updated',
      entityType: 'ebook',
      entityId: bookId,
      metadata: { title: updatedBook.title, slug: updatedBook.slug }
    });

    return NextResponse.json({ success: true, book: updatedBook });
  } catch (err: any) {
    console.error('Unhandled error in admin book detail PUT:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'archive');
    if (!auth.authorized) return auth.response!;

    const { bookId } = await params;
    if (!UUID_REGEX.test(bookId)) {
      return NextResponse.json({ error: 'Invalid book UUID.' }, { status: 400 });
    }

    // Archive book safely (soft-archive) to preserve edition and historical references
    const { data: archivedBook, error: archErr } = await auth.supabase
      .from('ebooks')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookId)
      .select()
      .single();

    if (archErr || !archivedBook) {
      console.error('Error archiving book:', archErr);
      return NextResponse.json({ error: archErr?.message || 'Failed to archive eBook.' }, { status: 500 });
    }

    // Also mark editions as archived
    await auth.supabase
      .from('ebook_editions')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('ebook_id', bookId);

    await logAdminAuditEvent(auth.supabase, {
      actorId: auth.user.id,
      action: 'book_archived',
      entityType: 'ebook',
      entityId: bookId,
      metadata: { title: archivedBook.title }
    });

    return NextResponse.json({
      success: true,
      message: `eBook "${archivedBook.title}" has been archived successfully.`,
      book: archivedBook
    });
  } catch (err: any) {
    console.error('Unhandled error in admin book detail DELETE:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
