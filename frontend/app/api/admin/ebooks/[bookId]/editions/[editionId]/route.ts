import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { validateEditionPrices, isEditionContentLocked, UUID_REGEX } from '@/lib/ebook/validation';
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

    const { data: edition, error } = await auth.supabase
      .from('ebook_editions')
      .select(`
        *,
        book:ebook_id (id, title, slug, status, cover_image_url),
        chapters:ebook_chapters (*)
      `)
      .eq('id', editionId)
      .eq('ebook_id', bookId)
      .maybeSingle();

    if (error || !edition) {
      return NextResponse.json({ error: 'Edition not found for this book.' }, { status: 404 });
    }

    if (edition.chapters) {
      edition.chapters.sort((a: any, b: any) => a.chapter_index - b.chapter_index);
    }

    return NextResponse.json({ success: true, edition });
  } catch (err: any) {
    console.error('Unhandled error in get edition GET:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; editionId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'update_edition');
    if (!auth.authorized) return auth.response!;

    const { bookId, editionId } = await params;
    if (!UUID_REGEX.test(bookId) || !UUID_REGEX.test(editionId)) {
      return NextResponse.json({ error: 'Invalid UUID provided.' }, { status: 400 });
    }

    // Verify edition exists and belongs to book
    const { data: edition, error: edErr } = await auth.supabase
      .from('ebook_editions')
      .select('*')
      .eq('id', editionId)
      .eq('ebook_id', bookId)
      .maybeSingle();

    if (edErr || !edition) {
      return NextResponse.json({ error: 'Edition not found for this book.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const priceValidation = validateEditionPrices({
      price_read_online_paise: body.price_read_online_paise ?? edition.price_read_online_paise,
      price_read_download_paise: body.price_read_download_paise ?? edition.price_read_download_paise,
      price_upgrade_pdf_paise: body.price_upgrade_pdf_paise ?? edition.price_upgrade_pdf_paise
    });

    if (!priceValidation.isValid) {
      return NextResponse.json({ error: priceValidation.errors.join(' ') }, { status: 400 });
    }

    const prices = priceValidation.data!;
    const versionName = (body.version_name || edition.version_name).trim();
    const isCurrent = typeof body.is_current_edition === 'boolean'
      ? body.is_current_edition
      : edition.is_current_edition;

    // If making this current, unset is_current_edition on other editions of this book
    if (isCurrent && !edition.is_current_edition) {
      await auth.supabase
        .from('ebook_editions')
        .update({ is_current_edition: false })
        .eq('ebook_id', bookId);
    }

    const { data: updatedEdition, error: updateErr } = await auth.supabase
      .from('ebook_editions')
      .update({
        version_name: versionName,
        is_current_edition: isCurrent,
        price_read_online_paise: prices.price_read_online_paise,
        price_read_download_paise: prices.price_read_download_paise,
        price_upgrade_pdf_paise: prices.price_upgrade_pdf_paise,
        updated_at: new Date().toISOString()
      })
      .eq('id', editionId)
      .select()
      .single();

    if (updateErr || !updatedEdition) {
      console.error('Error updating edition:', updateErr);
      return NextResponse.json({ error: updateErr?.message || 'Failed to update edition.' }, { status: 500 });
    }

    await logAdminAuditEvent(auth.supabase, {
      actorId: auth.user.id,
      action: 'edition_updated',
      entityType: 'edition',
      entityId: editionId,
      metadata: { bookId, versionName, prices }
    });

    return NextResponse.json({ success: true, edition: updatedEdition });
  } catch (err: any) {
    console.error('Unhandled error in update edition PUT:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; editionId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'delete_edition');
    if (!auth.authorized) return auth.response!;

    const { bookId, editionId } = await params;
    if (!UUID_REGEX.test(bookId) || !UUID_REGEX.test(editionId)) {
      return NextResponse.json({ error: 'Invalid UUID provided.' }, { status: 400 });
    }

    // Fetch target edition
    const { data: edition, error: edErr } = await auth.supabase
      .from('ebook_editions')
      .select('id, edition_number, status, published_at, is_current_edition')
      .eq('id', editionId)
      .eq('ebook_id', bookId)
      .maybeSingle();

    if (edErr || !edition) {
      return NextResponse.json({ error: 'Edition not found for this book.' }, { status: 404 });
    }

    // Strictly block deletion if edition is published or has ever been published
    if (isEditionContentLocked(edition)) {
      return NextResponse.json({
        error: 'Cannot delete a published or historical edition. Content must remain accessible to existing purchasers. You may archive the book or edition instead.'
      }, { status: 403 });
    }

    // Ensure book retains at least one edition
    const { count: editionCount } = await auth.supabase
      .from('ebook_editions')
      .select('*', { count: 'exact', head: true })
      .eq('ebook_id', bookId);

    if ((editionCount || 0) <= 1) {
      return NextResponse.json({
        error: 'Cannot delete the sole edition of an eBook. A book must retain at least one edition.'
      }, { status: 400 });
    }

    // Delete associated draft chapters
    await auth.supabase
      .from('ebook_chapters')
      .delete()
      .eq('edition_id', editionId);

    // Delete draft edition
    const { error: deleteErr } = await auth.supabase
      .from('ebook_editions')
      .delete()
      .eq('id', editionId);

    if (deleteErr) {
      console.error('Error deleting draft edition:', deleteErr);
      return NextResponse.json({ error: deleteErr.message || 'Failed to delete draft edition.' }, { status: 500 });
    }

    await logAdminAuditEvent(auth.supabase, {
      actorId: auth.user.id,
      action: 'edition_deleted',
      entityType: 'edition',
      entityId: editionId,
      metadata: { bookId, editionNumber: edition.edition_number }
    });

    return NextResponse.json({
      success: true,
      message: `Draft Edition ${edition.edition_number} was deleted successfully.`
    });
  } catch (err: any) {
    console.error('Unhandled error in delete edition DELETE:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
