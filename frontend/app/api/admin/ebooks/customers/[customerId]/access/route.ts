import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { logger } from '@/lib/logger';
import {
  getCustomerAccessOverview,
  revokeCustomerAccess,
  restoreCustomerAccess,
  grantComplimentaryAccess
} from '@/lib/ebook/accessManagement';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'admin_customer_access');
    if (!auth.authorized) return auth.response!;

    const { customerId } = await params;
    const access = await getCustomerAccessOverview(customerId);

    return NextResponse.json({
      success: true,
      customerId,
      access,
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    logger.error('Error fetching customer access overview', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch customer access.' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'admin_customer_access_manage');
    if (!auth.authorized) return auth.response!;

    const { customerId } = await params;
    const body = await req.json().catch(() => ({}));

    const {
      action, // 'revoke' | 'restore' | 'grant_complimentary'
      ebook_id,
      edition_id,
      plan = 'read_online',
      reason,
    } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'A mandatory administrative reason of at least 5 characters is required.' },
        { status: 400 }
      );
    }

    if (!ebook_id || !edition_id) {
      return NextResponse.json(
        { error: 'ebook_id and edition_id are required.' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'revoke') {
      result = await revokeCustomerAccess({
        customerId,
        ebookId: ebook_id,
        editionId: edition_id,
        reason: reason.trim(),
        adminId: auth.user.id,
      });
    } else if (action === 'restore') {
      result = await restoreCustomerAccess({
        customerId,
        ebookId: ebook_id,
        editionId: edition_id,
        reason: reason.trim(),
        adminId: auth.user.id,
      });
    } else if (action === 'grant_complimentary') {
      result = await grantComplimentaryAccess({
        customerId,
        ebookId: ebook_id,
        editionId: edition_id,
        plan,
        reason: reason.trim(),
        adminId: auth.user.id,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be revoke, restore, or grant_complimentary.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    logger.error('Error managing customer access', err);
    return NextResponse.json(
      { error: err.message || 'Failed to manage customer access.' },
      { status: 500 }
    );
  }
}
