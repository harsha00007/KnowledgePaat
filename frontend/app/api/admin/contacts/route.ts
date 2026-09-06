import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate & Authorize Administrator
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in as an administrator.' }, { status: 401 });
    }

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profErr || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    // 2. Parse Query Parameters
    const url = new URL(req.url);
    const sourceType = url.searchParams.get('source_type'); // 'external' | 'student' | null
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const priority = url.searchParams.get('priority');
    const plan = url.searchParams.get('plan');
    const search = (url.searchParams.get('search') || '').trim();
    const sortOrder = url.searchParams.get('sort') === 'oldest' ? true : false; // default newest (false = desc)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '15', 10)));

    const includeMetrics = url.searchParams.get('include_metrics') !== 'false';

    // 3. Compute Dynamic Metrics Across All Inquiries (Filtering out soft-deleted records)
    let metrics: {
      total: number;
      external: number;
      students: number;
      newCount: number;
      inProgressCount: number;
      urgentCount: number;
    } | null = null;

    if (includeMetrics) {
      metrics = {
        total: 0,
        external: 0,
        students: 0,
        newCount: 0,
        inProgressCount: 0,
        urgentCount: 0,
      };

      try {
        // First attempt with soft-delete filter
        const [
          { count: totalCount, error: err1 },
          { count: extCount },
          { count: stuCount },
          { count: newCnt },
          { count: inProgCnt },
          { count: urgCnt }
        ] = await Promise.all([
          supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }).eq('source_type', 'external').is('deleted_at', null),
          supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }).eq('source_type', 'student').is('deleted_at', null),
          supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }).eq('status', 'new').is('deleted_at', null),
          supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }).eq('status', 'in_progress').is('deleted_at', null),
          supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }).eq('priority', 'urgent').is('deleted_at', null)
        ]);

        if (err1 && (err1.code === '42703' || err1.code === 'PGRST204' || err1.message?.includes('deleted_at'))) {
          // Fallback without deleted_at check if column does not exist
          const [
            { count: fallbackTotal },
            { count: fallbackExt },
            { count: fallbackStu },
            { count: fallbackNew },
            { count: fallbackInProg },
            { count: fallbackUrg }
          ] = await Promise.all([
            supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }),
            supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }).eq('source_type', 'external'),
            supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }).eq('source_type', 'student'),
            supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
            supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
            supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }).eq('priority', 'urgent')
          ]);

          metrics = {
            total: fallbackTotal || 0,
            external: fallbackExt || 0,
            students: fallbackStu || 0,
            newCount: fallbackNew || 0,
            inProgressCount: fallbackInProg || 0,
            urgentCount: fallbackUrg || 0,
          };
        } else {
          metrics = {
            total: totalCount || 0,
            external: extCount || 0,
            students: stuCount || 0,
            newCount: newCnt || 0,
            inProgressCount: inProgCnt || 0,
            urgentCount: urgCnt || 0,
          };
        }
      } catch (mErr) {
        console.warn('Metrics query error:', mErr);
      }
    }

    // 4. Helper to build query with or without deleted_at check
    const buildQuery = (withDeletedAtFilter: boolean) => {
      let q = supabase.from('contact_inquiries').select('*', { count: 'exact' });

      if (withDeletedAtFilter) {
        q = q.is('deleted_at', null);
      }

      if (sourceType === 'external' || sourceType === 'student') {
        q = q.eq('source_type', sourceType);
      }

      if (status && status !== 'all') {
        q = q.eq('status', status);
      }

      if (category && category !== 'all') {
        q = q.eq('category', category);
      }

      if (priority && priority !== 'all') {
        q = q.eq('priority', priority);
      }

      if (plan && plan !== 'all' && sourceType === 'student') {
        q = q.eq('subscription_plan', plan);
      }

      if (search) {
        const s = `%${search}%`;
        q = q.or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s},subject.ilike.${s},reference_code.ilike.${s}`);
      }

      return q;
    };

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // First attempt query with soft-delete filter
    let { data: inquiries, count, error: qErr } = await buildQuery(true)
      .order('created_at', { ascending: sortOrder })
      .range(from, to);

    // If deleted_at column does not exist (code 42703 / PGRST204), fallback without filter
    if (qErr && (qErr.code === '42703' || qErr.code === 'PGRST204' || qErr.message?.includes('deleted_at'))) {
      const fallbackResult = await buildQuery(false)
        .order('created_at', { ascending: sortOrder })
        .range(from, to);
      inquiries = fallbackResult.data;
      count = fallbackResult.count;
      qErr = fallbackResult.error;
    }

    if (qErr) {
      if (qErr.code === 'PGRST205') {
        // Table not created yet
        return NextResponse.json({
          inquiries: [],
          totalCount: 0,
          page,
          pageSize,
          metrics,
          warning: 'contact_inquiries table not found. Please run supabase_contact_inquiries_setup.sql.'
        });
      }
      throw qErr;
    }

    return NextResponse.json({
      inquiries: inquiries || [],
      totalCount: count || 0,
      page,
      pageSize,
      metrics,
    });
  } catch (err: any) {
    logger.error('Error fetching admin contact inquiries', err, { module: 'admin_contacts' });
    return NextResponse.json({ error: 'Failed to retrieve contact inquiries.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate & Authorize Administrator
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in as an administrator.' }, { status: 401 });
    }

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profErr || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, status, priority, admin_notes, assigned_admin_id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Inquiry ID is required.' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status && ['new', 'in_progress', 'resolved', 'closed'].includes(status)) {
      updatePayload.status = status;
      if (status === 'resolved') {
        updatePayload.resolved_at = new Date().toISOString();
      }
    }

    if (priority && ['low', 'normal', 'high', 'urgent'].includes(priority)) {
      updatePayload.priority = priority;
    }

    if (typeof admin_notes === 'string') {
      updatePayload.admin_notes = admin_notes.trim();
    }

    if (assigned_admin_id !== undefined) {
      updatePayload.assigned_admin_id = assigned_admin_id || null;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('contact_inquiries')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      throw updateErr;
    }

    logger.info('Contact inquiry updated by admin', {
      module: 'admin_contacts',
      inquiryId: id,
      adminId: user.id,
      updates: Object.keys(updatePayload),
    });

    return NextResponse.json({
      success: true,
      inquiry: updated,
    });
  } catch (err: any) {
    logger.error('Error updating admin contact inquiry', err, { module: 'admin_contacts' });
    return NextResponse.json({ error: 'Failed to update contact inquiry.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate & Authorize Administrator Server-Side
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in as an administrator.' }, { status: 401 });
    }

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profErr || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    // 2. Parse & Validate Target IDs
    const body = await req.json().catch(() => ({}));
    let targetIds: string[] = [];

    if (body.id && typeof body.id === 'string' && body.id.trim()) {
      targetIds = [body.id.trim()];
    } else if (Array.isArray(body.ids)) {
      targetIds = body.ids.filter((id: any) => typeof id === 'string' && id.trim()).map((id: string) => id.trim());
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'At least one valid contact inquiry ID is required for deletion.' }, { status: 400 });
    }

    // 3. Execute Deletion: Strict Soft-Delete (sets deleted_at and deleted_by)
    const now = new Date().toISOString();

    const { error: softErr } = await supabase
      .from('contact_inquiries')
      .update({
        deleted_at: now,
        deleted_by: user.id,
      })
      .in('id', targetIds);

    if (softErr) {
      if (softErr.code === '42703' || softErr.code === 'PGRST204' || softErr.message?.includes('deleted_at')) {
        logger.error('Database migration required: deleted_at column is missing on contact_inquiries', softErr, { module: 'admin_contacts' });
        return NextResponse.json({
          error: 'Database migration required before deletion: deleted_at column is missing. Please apply supabase_contact_inquiries_setup.sql.'
        }, { status: 500 });
      }
      throw softErr;
    }

    logger.info('Contact inquiries soft-deleted by admin', {
      module: 'admin_contacts',
      adminId: user.id,
      count: targetIds.length,
      ids: targetIds,
    });

    return NextResponse.json({
      success: true,
      count: targetIds.length,
      deletedIds: targetIds,
      softDeleted: true,
      message: targetIds.length === 1 
        ? 'Contact inquiry deleted successfully.' 
        : `${targetIds.length} contact inquiries deleted successfully.`
    });
  } catch (err: any) {
    logger.error('Error deleting contact inquiries', err, { module: 'admin_contacts' });
    return NextResponse.json({ 
      error: 'This contact inquiry could not be deleted because it is currently linked to other records or a database error occurred.' 
    }, { status: 500 });
  }
}
