import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { getCustomerEBookOrderById } from '@/lib/ebook/orders';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.message, code: authResult.code },
        { status: authResult.status }
      );
    }
    const customer = authResult.customer;
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await getCustomerEBookOrderById(customer.userId, orderId);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or access denied.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    logger.error('Failed to fetch customer order detail', err, {
      module: 'ebook_orders_api',
    });
    return NextResponse.json(
      { error: 'Failed to retrieve order details.' },
      { status: 500 }
    );
  }
}
