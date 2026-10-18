import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { validateEditionPrices, UUID_REGEX } from '@/lib/ebook/validation';
import { logAdminAuditEvent } from '@/lib/ebook/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'create_edition');
    if (!auth.authorized) return auth.response!;

    const { bookId } = await params;
    if (!UUID_REGEX.test(bookId)) {
      return NextResponse.json({ error: 'Invalid book UUID.' }, { status: 400 });
    }

    // Verify book exists
    const { data: book, error: bookErr } = await auth.supabase
      .from('ebooks')
      .select('id, title')
      .eq('id', bookId)
      .maybeSingle();

    if (bookErr || !book) {
      return NextResponse.json({ error: 'eBook not found.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const priceValidation = validateEditionPrices(body);
    if (!priceValidation.isValid) {
      return NextResponse.json({ error: priceValidation.errors.join(' ') }, { status: 400 });
    }
    const prices = priceValidation.data!;
    const cloneFromEditionId = body?.cloneFromEditionId;
    const versionName = body?.version_name ? String(body.version_name).trim() : null;

    // 1. Attempt atomic stored procedure (PostgreSQL row lock on master book)
    try {
      const { data: rpcResult, error: rpcErr } = await auth.supabase.rpc('create_ebook_edition_revision', {
        p_book_id: bookId,
        p_version_name: versionName,
        p_clone_from_edition_id: (cloneFromEditionId && UUID_REGEX.test(cloneFromEditionId)) ? cloneFromEditionId : null,
        p_actor_id: auth.user.id,
        p_price_online: prices.price_read_online_paise,
        p_price_download: prices.price_read_download_paise,
        p_price_upgrade: prices.price_upgrade_pdf_paise
      });

      if (!rpcErr && rpcResult?.success && rpcResult?.edition) {
        return NextResponse.json({
          success: true,
          edition: rpcResult.edition,
          chaptersCloned: rpcResult.chapters_cloned || 0,
          rpcExecuted: true
        });
      }
    } catch {
      // Fall through to resilient application retry loop if RPC is not present
    }

    // 2. Resilient application fallback with unique constraint retry loop
    let createdEdition: any = null;
    let nextEditionNumber = 0;
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Find highest current edition number
      const { data: existingEditions } = await auth.supabase
        .from('ebook_editions')
        .select('edition_number')
        .eq('ebook_id', bookId)
        .order('edition_number', { ascending: false })
        .limit(1);

      nextEditionNumber = (existingEditions?.[0]?.edition_number || 0) + 1;
      const calculatedVersionName = versionName || `Edition ${nextEditionNumber}`;

      const { data: editionData, error: edErr } = await auth.supabase
        .from('ebook_editions')
        .insert({
          ebook_id: bookId,
          edition_number: nextEditionNumber,
          version_name: calculatedVersionName,
          status: 'draft',
          is_current_edition: false, // Remains false until explicitly published
          published_at: null, // Draft revisions MUST NEVER inherit published_at or lock state
          price_read_online_paise: prices.price_read_online_paise,
          price_read_download_paise: prices.price_read_download_paise,
          price_upgrade_pdf_paise: prices.price_upgrade_pdf_paise,
          currency: 'INR',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!edErr && editionData) {
        createdEdition = editionData;
        break;
      }

      // Check if error was due to unique constraint collision on (ebook_id, edition_number)
      const isUniqueCollision = edErr?.code === '23505' ||
        edErr?.message?.toLowerCase().includes('unique') ||
        edErr?.message?.toLowerCase().includes('duplicate');

      if (isUniqueCollision && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 20 * (attempt + 1) + Math.random() * 20));
        continue;
      }

      console.error('Error creating edition:', edErr);
      return NextResponse.json({ error: edErr?.message || 'Failed to create new edition.' }, { status: 500 });
    }

    if (!createdEdition) {
      return NextResponse.json({ error: 'Failed to allocate unique edition number.' }, { status: 500 });
    }

    // Support draft revision workflow: clone chapters from specified existing edition
    let chaptersCloned = 0;
    let clonedChapters: any[] = [];

    if (cloneFromEditionId && UUID_REGEX.test(cloneFromEditionId)) {
      const { data: sourceChapters } = await auth.supabase
        .from('ebook_chapters')
        .select('*')
        .eq('edition_id', cloneFromEditionId)
        .eq('ebook_id', bookId)
        .order('chapter_index', { ascending: true });

      if (sourceChapters && sourceChapters.length > 0) {
        const nowIso = new Date().toISOString();
        // Cloned chapters receive new UUIDs and reference the new edition_id
        const clonedRows = sourceChapters.map((sc: any) => ({
          ebook_id: bookId,
          edition_id: createdEdition.id,
          chapter_index: sc.chapter_index,
          title: sc.title,
          slug: sc.slug,
          content_body: sc.content_body,
          word_count: sc.word_count,
          status: sc.status,
          is_free_sample: sc.is_free_sample,
          created_at: nowIso,
          updated_at: nowIso
        }));

        const { data: insertedRows, error: cloneErr } = await auth.supabase
          .from('ebook_chapters')
          .insert(clonedRows)
          .select();

        if (cloneErr) {
          console.error('Error cloning chapters for draft revision:', cloneErr);
        } else {
          clonedChapters = insertedRows || clonedRows;
          chaptersCloned = clonedChapters.length;
        }
      }
    }

    await logAdminAuditEvent(auth.supabase, {
      actorId: auth.user.id,
      action: 'edition_created',
      entityType: 'edition',
      entityId: createdEdition.id,
      metadata: { 
        bookId, 
        editionNumber: nextEditionNumber, 
        versionName: createdEdition.version_name,
        clonedFrom: cloneFromEditionId || null,
        chaptersCloned
      }
    });

    return NextResponse.json({
      success: true,
      edition: createdEdition,
      chaptersCloned,
      clonedChapters
    });
  } catch (err: any) {
    console.error('Unhandled error in create edition POST:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
