import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate Admin
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

    // 2. Rate limit
    const rl = await checkRateLimit(`admin_orders_bulk:${user.id}`, RATE_LIMIT_POLICIES.ADMIN_SETTINGS);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    // 3. Parse and validate request
    const body = await req.json().catch(() => ({}));
    const { orderIds, action } = body;

    if (action !== 'delete') {
      return NextResponse.json({ error: 'Unsupported action. Supported action: "delete".' }, { status: 400 });
    }

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'No order IDs provided.' }, { status: 400 });
    }

    if (orderIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 orders can be processed per batch.' }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validIds = Array.from(
      new Set(orderIds.filter((id): id is string => typeof id === 'string' && uuidRegex.test(id.trim())))
    );

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'Invalid order IDs format. Valid UUIDs required.' }, { status: 400 });
    }

    // 4. Fetch orders from database to verify status
    const { data: dbOrders, error: fetchErr } = await supabase
      .from('orders')
      .select('id, payment_status, order_status')
      .in('id', validIds);

    if (fetchErr) {
      console.error('Error fetching orders for deletion:', fetchErr);
      return NextResponse.json({ error: 'Database lookup failed.' }, { status: 500 });
    }

    if (!dbOrders || dbOrders.length === 0) {
      return NextResponse.json({ error: 'No matching orders found.' }, { status: 404 });
    }

    // 5. Protected Paid Order Check (Financial & Entitlement Security)
    const paidOrders = dbOrders.filter(o => o.payment_status === 'paid');
    if (paidOrders.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete selected orders: ${paidOrders.length} order(s) are marked as PAID. Paid orders represent completed financial transactions and permanent student entitlements and cannot be deleted.`,
          protectedCount: paidOrders.length,
          protectedIds: paidOrders.map(o => o.id)
        },
        { status: 400 }
      );
    }

    // 6. Delete only unfulfilled orders (pending, failed, cancelled)
    const eligibleIds = dbOrders.map(o => o.id);
    const { error: delErr } = await supabase
      .from('orders')
      .delete()
      .in('id', eligibleIds);

    if (delErr) {
      console.error('Error executing order deletion:', delErr);
      return NextResponse.json({ error: 'Failed to delete orders from database.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: eligibleIds.length,
      message: `${eligibleIds.length} order${eligibleIds.length > 1 ? 's' : ''} deleted successfully.`
    });

  } catch (error) {
    console.error('Unexpected error in admin orders bulk-action route:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
