import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { logger } from '@/lib/logger';
import { checkDependentUpgrades } from '@/lib/ebook/refunds';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'admin_order_detail');
    if (!auth.authorized) return auth.response!;

    const { orderId } = await params;

    // 1. Fetch Order and Line Items
    const { data: order, error: orderErr } = await auth.supabase
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
        gateway_signature,
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
          edition_label,
          created_at
        )
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr) {
      logger.error('Failed to fetch admin order detail', orderErr, { orderId });
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Fetch Customer Entitlements linked to this order's editions
    const editionIds = (order.items || []).map((i: any) => i.edition_id);
    const { data: entitlements } = await auth.supabase
      .from('ebook_entitlements')
      .select('*')
      .eq('customer_id', order.customer_id)
      .in('edition_id', editionIds);

    // 3. Fetch Refunds for this order
    const { data: refunds } = await auth.supabase
      .from('ebook_refunds')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    // 4. Fetch Audit Events for this order
    const { data: auditEvents } = await auth.supabase
      .from('ebook_audit_logs')
      .select('*')
      .eq('entity_id', orderId)
      .order('created_at', { ascending: false });

    // 5. Linked Orders navigation (original ₹49 base purchase vs ₹50 upgrade)
    let originalOrder = null;
    let upgradeOrders: any[] = [];

    if (order.order_type === 'upgrade' && order.original_order_id) {
      const { data: orig } = await auth.supabase
        .from('ebook_orders')
        .select('id, order_number, total_amount_paise, payment_status, created_at')
        .eq('id', order.original_order_id)
        .maybeSingle();
      originalOrder = orig;
    } else {
      const depCheck = await checkDependentUpgrades(order.id, auth.supabase);
      upgradeOrders = depCheck.dependentOrders;
    }

    // 6. Check Receipt Outbox
    const { data: receiptOutbox } = await auth.supabase
      .from('ebook_receipt_outbox')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        entitlements: entitlements || [],
        refunds: refunds || [],
        auditEvents: auditEvents || [],
        receiptOutbox: receiptOutbox || null,
        linkedOrders: {
          originalOrder,
          upgradeOrders,
        },
      },
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    logger.error('Unexpected error in admin order detail endpoint', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
