import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req, 'admin_audit');
    if (!auth.authorized) return auth.response!;

    const rl = await checkRateLimit(
      `admin_audit:${auth.user.id}`,
      RATE_LIMIT_POLICIES.ADMIN_SETTINGS
    );
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entity_type')?.trim();
    const action = searchParams.get('action')?.trim();
    const entityId = searchParams.get('entity_id')?.trim();
    const startDate = searchParams.get('start_date')?.trim();
    const endDate = searchParams.get('end_date')?.trim();

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;

    let query = auth.supabase
      .from('ebook_audit_logs')
      .select(`
        id,
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at
      `, { count: 'exact' });

    if (entityType && entityType !== 'all') {
      query = query.eq('entity_type', entityType);
    }
    if (action && action !== 'all') {
      query = query.eq('action', action);
    }
    if (entityId) {
      query = query.eq('entity_id', entityId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: logs, count, error } = await query;

    if (error) {
      if (error.code === 'PGRST103' || String(error.message || '').toLowerCase().includes('range')) {
        const { count: exactTotal } = await auth.supabase
          .from('ebook_audit_logs')
          .select('id', { count: 'exact', head: true });
        const total = exactTotal || 0;
        const totalPages = Math.ceil(total / limit) || 1;
        return NextResponse.json({
          success: true,
          logs: [],
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: false,
          }
        });
      }
      console.error('Error querying audit logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      logs: logs || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (err: any) {
    console.error('Unhandled error in admin audit logs:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
