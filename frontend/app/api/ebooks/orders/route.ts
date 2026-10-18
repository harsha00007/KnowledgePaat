import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { getCustomerEBookOrders } from '@/lib/ebook/orders';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.message, code: authResult.code },
        { status: authResult.status }
      );
    }
    const customer = authResult.customer;

    const orders = await getCustomerEBookOrders(customer.userId);

    return NextResponse.json({
      success: true,
      orders,
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    logger.error('Failed to fetch customer orders', err, {
      module: 'ebook_orders_api',
    });
    return NextResponse.json(
      { error: 'Failed to retrieve order history.' },
      { status: 500 }
    );
  }
}
