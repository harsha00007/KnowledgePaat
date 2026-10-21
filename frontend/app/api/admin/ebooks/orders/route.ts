import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { logger } from '@/lib/logger';
import { generateOrdersCsv } from '@/lib/ebook/reports';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req, 'admin_orders');
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const paymentStatus = searchParams.get('payment_status')?.trim() || '';
    const orderStatus = searchParams.get('order_status')?.trim() || '';
    const orderType = searchParams.get('order_type')?.trim() || '';
    const refundStatus = searchParams.get('refund_status')?.trim() || '';
    const startDate = searchParams.get('start_date')?.trim() || '';
    const endDate = searchParams.get('end_date')?.trim() || '';
    const format = searchParams.get('format')?.toLowerCase().trim() || 'json';

    // Helper function to apply common filters to queries consistently
    const applyOrderFilters = (q: any) => {
      let filtered = q;
      if (paymentStatus && paymentStatus !== 'all') {
        filtered = filtered.eq('payment_status', paymentStatus);
      }
      if (orderStatus && orderStatus !== 'all') {
        filtered = filtered.eq('order_status', orderStatus);
      }
      if (orderType && orderType !== 'all') {
        filtered = filtered.eq('order_type', orderType);
      }
      if (refundStatus && refundStatus !== 'all') {
        filtered = filtered.eq('refund_status', refundStatus);
      }
      if (startDate) {
        filtered = filtered.gte('created_at', startDate);
      }
      if (endDate) {
        filtered = filtered.lte('created_at', endDate);
      }
      if (search) {
        filtered = filtered.or(
          `order_number.ilike.%${search}%,customer_email.ilike.%${search}%,customer_name.ilike.%${search}%,gateway_order_id.ilike.%${search}%,gateway_payment_id.ilike.%${search}%`
        );
      }
      return filtered;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // CSV Export Flow: Bounded Batched Retrieval (Accounts for PostgREST 1,000 max-rows)
    // ─────────────────────────────────────────────────────────────────────────
    if (format === 'csv') {
      const rl = await checkRateLimit(
        `admin_export:${auth.user.id}`,
        RATE_LIMIT_POLICIES.ADMIN_EXPORT
      );
      if (!rl.success) {
        return rateLimitResponse(rl);
      }

      // 1. Get exact total count of matching filtered records
      let countQuery = auth.supabase
        .from('ebook_orders')
        .select('id', { count: 'exact', head: true });
      countQuery = applyOrderFilters(countQuery);
      const { count: totalMatching, error: countErr } = await countQuery;
      if (countErr) {
        logger.error('Failed to count orders for CSV export', countErr, { module: 'admin_ebook_orders' });
        throw countErr;
      }

      const total = totalMatching || 0;
      const requestedCeiling = process.env.NODE_ENV !== 'production' && searchParams.get('test_ceiling')
        ? parseInt(searchParams.get('test_ceiling')!, 10)
        : NaN;
      const MAX_CSV_EXPORT = !isNaN(requestedCeiling) && requestedCeiling > 0
        ? requestedCeiling
        : parseInt(process.env.MAX_CSV_EXPORT || '10000', 10); // Configured ceiling (default 10,000)

      // Return explicit actionable error if matching records exceed configured ceiling
      // to guarantee that no partial or silently truncated CSV is ever generated.
      if (total > MAX_CSV_EXPORT) {
        return NextResponse.json(
          {
            success: false,
            error: `Export exceeds the maximum supported ceiling of ${MAX_CSV_EXPORT.toLocaleString()} orders (found ${total.toLocaleString()} matching records). To prevent partial or truncated exports, please narrow your filter criteria (e.g. by date range, payment status, or search term).`,
            code: 'EXPORT_CEILING_EXCEEDED',
            totalMatching: total,
            maxExportLimit: MAX_CSV_EXPORT,
          },
          {
            status: 400,
            headers: {
              'X-Total-Count': String(total),
              'X-Max-Export-Limit': String(MAX_CSV_EXPORT),
            },
          }
        );
      }

      const exportTarget = total;
      const BATCH_SIZE = 1000; // PostgREST max rows per request limit

      const allOrders: any[] = [];
      for (let batchOffset = 0; batchOffset < exportTarget; batchOffset += BATCH_SIZE) {
        let batchQuery = auth.supabase
          .from('ebook_orders')
          .select(`
            id,
            order_number,
            order_type,
            original_order_id,
            original_entitlement_id,
            customer_id,
            total_amount_paise,
            refunded_amount_paise,
            currency,
            payment_gateway,
            gateway_order_id,
            gateway_payment_id,
            payment_status,
            order_status,
            refund_status,
            customer_email,
            customer_name,
            notes,
            paid_at,
            created_at,
            updated_at,
            items:ebook_order_items (
              id,
              ebook_id,
              edition_id,
              plan,
              price_paise,
              refunded_paise,
              refund_status,
              title,
              edition_label
            )
          `)
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(batchOffset, batchOffset + BATCH_SIZE - 1);

        batchQuery = applyOrderFilters(batchQuery);
        const { data: batchData, error: batchErr } = await batchQuery;

        if (batchErr) {
          logger.error('Error fetching batch for CSV export', batchErr, { batchOffset, module: 'admin_ebook_orders' });
          throw batchErr;
        }

        if (!batchData || batchData.length === 0) break;
        allOrders.push(...batchData);
      }

      // Audit log the export
      await auth.supabase.from('ebook_audit_logs').insert({
        actor_id: auth.user.id,
        action: 'admin_orders_csv_export',
        entity_type: 'ebook_orders',
        entity_id: 'bulk',
        metadata: {
          exportedCount: allOrders.length,
          totalMatching: total,
          search,
          paymentStatus,
          orderStatus,
          orderType,
        },
      });

      const csvContent = await generateOrdersCsv(allOrders);
      const filename = `knowledgepaat-orders-${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Exported-Count': String(allOrders.length),
          'X-Total-Count': String(total),
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Standard Paginated JSON Response
    // ─────────────────────────────────────────────────────────────────────────
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = auth.supabase
      .from('ebook_orders')
      .select(`
        id,
        order_number,
        order_type,
        original_order_id,
        original_entitlement_id,
        customer_id,
        total_amount_paise,
        refunded_amount_paise,
        currency,
        payment_gateway,
        gateway_order_id,
        gateway_payment_id,
        payment_status,
        order_status,
        refund_status,
        customer_email,
        customer_name,
        notes,
        paid_at,
        created_at,
        updated_at,
        items:ebook_order_items (
          id,
          ebook_id,
          edition_id,
          plan,
          price_paise,
          refunded_paise,
          refund_status,
          title,
          edition_label
        ),
        refunds:ebook_refunds (
          id,
          amount_paise,
          status,
          refund_type,
          gateway_refund_id,
          created_at,
          processed_at
        ),
        receipt_outbox:ebook_receipt_outbox (
          id,
          status,
          retry_count,
          last_error,
          sent_at
        )
      `, { count: 'exact' });

    query = applyOrderFilters(query);
    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: orders, count, error } = await query;

    if (error) {
      if (error.code === 'PGRST103' || String(error.message || '').toLowerCase().includes('range')) {
        let countQuery = auth.supabase
          .from('ebook_orders')
          .select('id', { count: 'exact', head: true });
        countQuery = applyOrderFilters(countQuery);
        const { count: exactTotal } = await countQuery;
        const total = exactTotal || 0;
        const totalPages = Math.ceil(total / limit) || 1;
        return NextResponse.json({
          success: true,
          orders: [],
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: false,
          }
        });
      }
      logger.error('Failed to query admin ebook orders', error, { module: 'admin_ebook_orders' });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    logger.error('Unexpected error in admin ebook orders endpoint', err, {
      module: 'admin_ebook_orders',
    });
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
