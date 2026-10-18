import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { logger } from '@/lib/logger';
import { generateOrdersCsv } from '@/lib/ebook/reports';

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

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = format === 'csv' 
      ? 1000 
      : Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
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

    if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus);
    }

    if (orderStatus && orderStatus !== 'all') {
      query = query.eq('order_status', orderStatus);
    }

    if (orderType && orderType !== 'all') {
      query = query.eq('order_type', orderType);
    }

    if (refundStatus && refundStatus !== 'all') {
      query = query.eq('refund_status', refundStatus);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_email.ilike.%${search}%,customer_name.ilike.%${search}%,gateway_order_id.ilike.%${search}%,gateway_payment_id.ilike.%${search}%`
      );
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: orders, count, error } = await query;

    if (error) {
      logger.error('Failed to query admin ebook orders', error, { module: 'admin_ebook_orders' });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format: CSV Export
    if (format === 'csv') {
      // Audit log the export
      await auth.supabase.from('ebook_audit_logs').insert({
        actor_id: auth.user.id,
        action: 'admin_orders_csv_export',
        entity_type: 'ebook_orders',
        entity_id: 'bulk',
        metadata: {
          exportedCount: orders?.length || 0,
          search,
          paymentStatus,
          orderStatus,
          orderType,
        },
      });

      const csvContent = await generateOrdersCsv(orders || []);
      const filename = `knowledgepaat-orders-${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }

    // Standard JSON Response
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
