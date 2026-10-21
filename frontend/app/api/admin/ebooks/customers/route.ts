import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { 
  getCustomerAccessOverview, 
  revokeCustomerAccess, 
  restoreCustomerAccess, 
  grantComplimentaryAccess 
} from '@/lib/ebook/accessManagement';
import { UUID_REGEX } from '@/lib/ebook/validation';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

async function verifyAdminAuth(req?: NextRequest) {
  if (req) {
    const authRes = await verifyAdminRequest(req, 'admin_customers');
    if (authRes.authorized && authRes.user) {
      return { authorized: true, user: authRes.user, supabase: authRes.supabase };
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { authorized: false, status: 401, error: 'Authentication required.' };
  }

  const { data: isAdmin, error: rpcErr } = await supabase.rpc('is_admin');
  if (rpcErr || !isAdmin) {
    return { authorized: false, status: 403, error: 'Administrator access required.' };
  }

  return { authorized: true, user, supabase };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const adminClient = createAdminClient();

    // -------------------------------------------------------------------------
    // SINGLE CUSTOMER DETAIL VIEW
    // -------------------------------------------------------------------------
    if (customerId) {
      if (!UUID_REGEX.test(customerId)) {
        return NextResponse.json({ success: false, error: 'Invalid customer identifier.' }, { status: 400 });
      }

      // Fetch customer profile
      const { data: profile, error: profErr } = await adminClient
        .from('profiles')
        .select('id, email, full_name, created_at, role, is_active')
        .eq('id', customerId)
        .maybeSingle();

      if (profErr || !profile) {
        return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404 });
      }

      // Fetch entitlements overview
      const entitlements = await getCustomerAccessOverview(customerId);

      // Fetch orders & financial snapshot history
      const { data: orders } = await adminClient
        .from('ebook_orders')
        .select(`
          id,
          order_number,
          order_type,
          original_order_id,
          original_entitlement_id,
          total_amount_paise,
          currency,
          payment_gateway,
          payment_status,
          order_status,
          refund_status,
          refunded_amount_paise,
          paid_at,
          created_at,
          items:ebook_order_items (
            id,
            ebook_id,
            edition_id,
            title,
            edition_label,
            plan,
            price_paise
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      // Fetch reading progress
      const { data: readingProgress } = await adminClient
        .from('ebook_reading_progress')
        .select(`
          id,
          ebook_id,
          edition_id,
          last_chapter_index,
          progress_percent,
          last_read_at,
          book:ebooks (id, title, slug)
        `)
        .eq('customer_id', customerId)
        .order('last_read_at', { ascending: false });

      // Fetch download logs
      const { data: downloadLogs } = await adminClient
        .from('ebook_download_logs')
        .select(`
          id,
          ebook_id,
          edition_id,
          delivery_type,
          status,
          ip_address,
          user_agent,
          created_at,
          book:ebooks (id, title)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch customer audit logs
      const { data: auditLogs } = await adminClient
        .from('ebook_audit_logs')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          actor_id,
          metadata,
          created_at
        `)
        .or(`metadata->>customer_id.eq.${customerId},metadata->>target_customer_id.eq.${customerId}`)
        .order('created_at', { ascending: false })
        .limit(20);

      // Resolve actor names
      const actorIds = Array.from(new Set((auditLogs || []).map((l: any) => l.actor_id).filter(Boolean)));
      const actorsMap = new Map<string, { full_name: string | null; email: string | null }>();
      if (actorIds.length > 0) {
        const { data: actorProfiles } = await adminClient
          .from('profiles')
          .select('id, full_name, email')
          .in('id', actorIds);
        for (const ap of (actorProfiles || [])) {
          actorsMap.set(ap.id, { full_name: ap.full_name, email: ap.email });
        }
      }

      const formattedAuditLogs = (auditLogs || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        metadata: log.metadata,
        created_at: log.created_at,
        actor: actorsMap.get(log.actor_id) || { full_name: 'Administrator', email: null },
      }));

      // Fetch available catalogue books for complimentary grant selector
      const { data: publishedBooks } = await adminClient
        .from('ebooks')
        .select(`
          id,
          title,
          editions:ebook_editions!inner (
            id,
            edition_number,
            version_name,
            status,
            is_current_edition
          )
        `)
        .eq('status', 'published')
        .eq('editions.status', 'published')
        .eq('editions.is_current_edition', true)
        .order('title', { ascending: true });

      return NextResponse.json({
        success: true,
        customer: profile,
        entitlements,
        orders: orders || [],
        reading_progress: readingProgress || [],
        download_logs: downloadLogs || [],
        audit_logs: auditLogs || [],
        available_books: publishedBooks || [],
      });
    }

    // -------------------------------------------------------------------------
    // CUSTOMER LISTING WITH SERVER-SIDE SEARCH & BOUNDED PAGINATION
    // -------------------------------------------------------------------------
    const search = searchParams.get('search')?.trim() || '';
    const statusFilter = searchParams.get('status') || 'all'; // all | active | revoked
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10) || 15));
    const offset = (page - 1) * limit;

    // Build deterministic query on profiles
    let profilesQuery = adminClient
      .from('profiles')
      .select('id, email, full_name, created_at, role, is_active', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: true });

    if (search) {
      profilesQuery = profilesQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    profilesQuery = profilesQuery.range(offset, offset + limit - 1);

    const { data: profiles, count, error: listErr } = await profilesQuery;

    if (listErr) {
      if (listErr.code === 'PGRST103' || String(listErr.message || '').toLowerCase().includes('range')) {
        const { count: exactTotal } = await adminClient
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        const total = exactTotal || 0;
        const totalPages = Math.ceil(total / limit) || 1;
        return NextResponse.json({
          success: true,
          customers: [],
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: false,
          }
        });
      }
      console.error('Error querying customer profiles:', listErr);
      return NextResponse.json({ success: false, error: 'Failed to query customer list.' }, { status: 500 });
    }

    const customerIds = (profiles || []).map(p => p.id);

    // Aggregate entitlements and orders for page customers
    const entitlementsByCustomer = new Map<string, any[]>();
    const ordersByCustomer = new Map<string, any[]>();
    const progressByCustomer = new Map<string, any[]>();

    if (customerIds.length > 0) {
      const [entsRes, ordersRes, progRes] = await Promise.all([
        adminClient
          .from('ebook_entitlements')
          .select('id, customer_id, ebook_id, edition_id, plan, is_active, grant_type')
          .in('customer_id', customerIds),
        adminClient
          .from('ebook_orders')
          .select('id, customer_id, total_amount_paise, payment_status, created_at')
          .in('customer_id', customerIds)
          .eq('payment_status', 'paid'),
        adminClient
          .from('ebook_reading_progress')
          .select('customer_id, last_read_at, progress_percent')
          .in('customer_id', customerIds)
      ]);

      for (const e of (entsRes.data || [])) {
        const arr = entitlementsByCustomer.get(e.customer_id) || [];
        arr.push(e);
        entitlementsByCustomer.set(e.customer_id, arr);
      }

      for (const o of (ordersRes.data || [])) {
        const arr = ordersByCustomer.get(o.customer_id) || [];
        arr.push(o);
        ordersByCustomer.set(o.customer_id, arr);
      }

      for (const p of (progRes.data || [])) {
        const arr = progressByCustomer.get(p.customer_id) || [];
        arr.push(p);
        progressByCustomer.set(p.customer_id, arr);
      }
    }

    // Transform customers
    let customerRows = (profiles || []).map(p => {
      const ents = entitlementsByCustomer.get(p.id) || [];
      const ords = ordersByCustomer.get(p.id) || [];
      const progs = progressByCustomer.get(p.id) || [];

      const activeEnts = ents.filter(e => e.is_active);
      const revokedEnts = ents.filter(e => !e.is_active);
      const complimentaryEnts = ents.filter(e => e.grant_type === 'complimentary' && e.is_active);

      const totalPaidPaise = ords.reduce((acc, o) => acc + (o.total_amount_paise || 0), 0);
      const latestReadAt = progs.length > 0 
        ? progs.reduce((latest, pr) => (!latest || pr.last_read_at > latest ? pr.last_read_at : latest), '')
        : null;

      let accessStatus: 'active' | 'revoked' | 'complimentary' | 'no_access' = 'no_access';
      if (complimentaryEnts.length > 0 && activeEnts.length === complimentaryEnts.length) {
        accessStatus = 'complimentary';
      } else if (activeEnts.length > 0) {
        accessStatus = 'active';
      } else if (revokedEnts.length > 0) {
        accessStatus = 'revoked';
      }

      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name || 'Customer',
        created_at: p.created_at,
        purchased_editions_count: activeEnts.length,
        total_orders_count: ords.length,
        total_paid_paise: totalPaidPaise,
        formatted_total_paid: `₹${(totalPaidPaise / 100).toFixed(0)}`,
        access_status: accessStatus,
        active_entitlements_count: activeEnts.length,
        revoked_entitlements_count: revokedEnts.length,
        has_reading_activity: progs.length > 0,
        last_read_at: latestReadAt,
      };
    });

    // Filter by access status if requested
    if (statusFilter !== 'all') {
      customerRows = customerRows.filter(c => c.access_status === statusFilter);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      customers: customerRows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      }
    });
  } catch (err: any) {
    console.error('Unhandled error in admin customers API:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const rl = await checkRateLimit(
      `admin_access:${auth.user.id}`,
      RATE_LIMIT_POLICIES.ADMIN_ACCESS_MUTATION
    );
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').trim();
    const customerId = String(body?.customerId || '').trim();
    const ebookId = String(body?.ebookId || '').trim();
    const editionId = String(body?.editionId || '').trim();
    const plan = String(body?.plan || 'read_online').trim();
    const reason = String(body?.reason || '').trim();

    if (!UUID_REGEX.test(customerId)) {
      return NextResponse.json({ success: false, error: 'Valid customer ID is required.' }, { status: 400 });
    }
    if (!UUID_REGEX.test(ebookId) || !UUID_REGEX.test(editionId)) {
      return NextResponse.json({ success: false, error: 'Valid book and edition IDs are required.' }, { status: 400 });
    }
    if (!reason || reason.length < 5) {
      return NextResponse.json({ success: false, error: 'A mandatory audit reason (minimum 5 characters) is required.' }, { status: 400 });
    }

    if (action === 'grant_complimentary') {
      const res = await grantComplimentaryAccess({
        customerId,
        ebookId,
        editionId,
        plan: plan as any,
        reason,
        adminId: auth.user.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Complimentary access granted successfully.',
        result: res,
      });
    }

    if (action === 'revoke') {
      const res = await revokeCustomerAccess({
        customerId,
        ebookId,
        editionId,
        reason,
        adminId: auth.user.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Customer access revoked successfully.',
        result: res,
      });
    }

    if (action === 'restore') {
      const res = await restoreCustomerAccess({
        customerId,
        ebookId,
        editionId,
        reason,
        adminId: auth.user.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Customer access restored successfully.',
        result: res,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Error executing admin customer action:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
