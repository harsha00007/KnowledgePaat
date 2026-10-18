import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { getAuthoritativeEditionPricing, updateEditionPricing, DiscountType } from '@/lib/ebook/pricing';
import { UUID_REGEX } from '@/lib/ebook/validation';

export const dynamic = 'force-dynamic';

async function verifyAdminAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { authorized: false, status: 401, error: 'Authentication required.' };
  }

  const { data: isAdmin, error: rpcErr } = await supabase.rpc('is_admin');
  if (rpcErr || !isAdmin) {
    return { authorized: false, status: 403, error: 'Administrator privileges required.' };
  }

  return { authorized: true, user, supabase };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const auth = await verifyAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { bookId } = await params;
    if (!bookId) {
      return NextResponse.json({ success: false, error: 'Book identifier required.' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { searchParams } = new URL(req.url);
    const requestedEditionId = searchParams.get('editionId');

    // 1. Fetch book record
    let bookQuery = adminClient
      .from('ebooks')
      .select('id, title, slug, status')
      .eq('id', bookId);

    const { data: book, error: bookErr } = await bookQuery.maybeSingle();
    if (bookErr || !book) {
      return NextResponse.json({ success: false, error: 'Book not found.' }, { status: 404 });
    }

    // 2. Fetch all editions for this book
    const { data: editions, error: edErr } = await adminClient
      .from('ebook_editions')
      .select('id, edition_number, version_name, status, is_current_edition, published_at, price_read_online_paise, price_read_download_paise, price_upgrade_pdf_paise, currency')
      .eq('ebook_id', book.id)
      .order('edition_number', { ascending: false });

    if (edErr || !editions || editions.length === 0) {
      return NextResponse.json({ success: false, error: 'No editions found for this eBook.' }, { status: 404 });
    }

    // Target edition: specified editionId or current published or newest
    const targetEdition = requestedEditionId
      ? editions.find((e: any) => e.id === requestedEditionId) || editions[0]
      : editions.find((e: any) => e.is_current_edition) || editions[0];

    // 3. Fetch authoritative pricing
    const pricing = await getAuthoritativeEditionPricing(targetEdition.id, adminClient);

    // 4. Fetch recent pricing audit logs
    const { data: auditLogs } = await adminClient
      .from('ebook_audit_logs')
      .select(`
        id,
        actor_id,
        action,
        metadata,
        created_at,
        actor:profiles!ebook_audit_logs_actor_id_fkey (
          full_name,
          email
        )
      `)
      .eq('entity_type', 'ebook_edition')
      .eq('entity_id', targetEdition.id)
      .eq('action', 'pricing_updated')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      book,
      editions,
      selected_edition: targetEdition,
      pricing,
      audit_history: (auditLogs || []).map((log: any) => ({
        id: log.id,
        created_at: log.created_at,
        actor_name: log.actor?.full_name || 'Administrator',
        actor_email: log.actor?.email || null,
        change_reason: log.metadata?.change_reason || 'No reason provided',
        previous_version: log.metadata?.previous_version,
        new_version: log.metadata?.new_version,
        previous_values: log.metadata?.previous_values,
        new_values: log.metadata?.new_values,
      }))
    });
  } catch (err: any) {
    console.error('Error in GET admin pricing:', err);
    return NextResponse.json({ success: false, error: 'Internal server error loading pricing.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const auth = await verifyAdminAuth();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { bookId } = await params;
    const body = await req.json().catch(() => ({}));

    const editionId = String(body?.editionId || '').trim();
    if (!UUID_REGEX.test(editionId)) {
      return NextResponse.json({ success: false, error: 'Valid edition ID is required.' }, { status: 400 });
    }

    const currentVersion = Number(body?.currentVersion);
    if (typeof currentVersion !== 'number' || isNaN(currentVersion) || currentVersion < 1) {
      return NextResponse.json({ success: false, error: 'Valid currentVersion is required for concurrency control.' }, { status: 400 });
    }

    const changeReason = String(body?.changeReason || '').trim();
    if (!changeReason) {
      return NextResponse.json({ success: false, error: 'A change reason is required when modifying commercial prices.' }, { status: 400 });
    }

    const online = body?.online || {};
    const download = body?.download || {};
    const upgrade = body?.upgrade || {};

    const result = await updateEditionPricing({
      editionId,
      online: {
        original_price_paise: Number(online.original_price_paise),
        discount_type: online.discount_type as DiscountType,
        discount_value: Number(online.discount_value || 0),
      },
      download: {
        original_price_paise: Number(download.original_price_paise),
        discount_type: download.discount_type as DiscountType,
        discount_value: Number(download.discount_value || 0),
      },
      upgrade: {
        original_price_paise: Number(upgrade.original_price_paise),
        discount_type: upgrade.discount_type as DiscountType,
        discount_value: Number(upgrade.discount_value || 0),
      },
      currentVersion,
      changeReason,
      adminId: auth.user.id,
      adminEmail: auth.user.email,
    });

    if (!result.success) {
      if (result.conflict) {
        return NextResponse.json({ success: false, error: result.error, conflict: true }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Commercial pricing updated successfully.',
      pricing: result.pricing,
    });
  } catch (err: any) {
    console.error('Error in PUT admin pricing:', err);
    return NextResponse.json({ success: false, error: 'Internal server error updating pricing.' }, { status: 500 });
  }
}
