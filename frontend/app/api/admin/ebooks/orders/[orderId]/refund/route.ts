import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { logger } from '@/lib/logger';
import { executeEBookRefund, executeRefundBothOrders } from '@/lib/ebook/refunds';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'admin_order_refund');
    if (!auth.authorized) return auth.response!;

    const { orderId } = await params;
    const body = await req.json().catch(() => ({}));

    const {
      action,
      upgrade_order_id,
      amount_paise,
      reason,
      refund_type = 'full',
      access_action = 'revoke',
      allocated_items = [],
      force_allow_dependent_upgrade = false,
    } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'A mandatory administrative reason of at least 5 characters is required.' },
        { status: 400 }
      );
    }

    // Handle linked "Refund Both Orders"
    if (action === 'refund_both' && upgrade_order_id) {
      const bothResult = await executeRefundBothOrders({
        baseOrderId: orderId,
        upgradeOrderId: upgrade_order_id,
        reason: reason.trim(),
        adminId: auth.user.id,
      });

      return NextResponse.json({
        success: bothResult.overallStatus === 'both_processed',
        bothResult,
      }, {
        status: bothResult.overallStatus === 'both_processed' ? 200 : 207,
      });
    }

    if (!['full', 'partial', 'goodwill'].includes(refund_type)) {
      return NextResponse.json(
        { error: 'Invalid refund_type. Must be full, partial, or goodwill.' },
        { status: 400 }
      );
    }

    if (!['revoke', 'downgrade_to_online', 'retain', 'custom'].includes(access_action)) {
      return NextResponse.json(
        { error: 'Invalid access_action. Must be revoke, downgrade_to_online, or retain.' },
        { status: 400 }
      );
    }

    const result = await executeEBookRefund({
      orderId,
      amountInPaise: typeof amount_paise === 'number' ? amount_paise : undefined,
      reason: reason.trim(),
      refundType: refund_type,
      accessAction: access_action,
      allocatedItems: allocated_items,
      adminId: auth.user.id,
      forceAllowDependentUpgrade: Boolean(force_allow_dependent_upgrade),
    });

    return NextResponse.json({
      success: result.success,
      refund: result,
    }, {
      status: result.success ? 200 : (result.isUncertainTimeout ? 202 : 400),
    });
  } catch (err: any) {
    logger.error('Error executing admin refund', err);
    return NextResponse.json(
      {
        error: err.message || 'Failed to execute refund.',
        code: err.code,
        dependentOrders: err.dependentOrders,
      },
      { status: err.code === 'DEPENDENT_UPGRADE_EXISTS' ? 409 : 500 }
    );
  }
}
