/**
 * KnowledgePaat — Phase 8: Authoritative Refund Orchestration & Policies
 * 
 * Implements two-phase durable refund execution with provider idempotency,
 * strict cumulative balance validation, atomic database finalization,
 * and the 5 explicit business policy rules:
 * - Rule A: Full ₹99 purchase refund -> revokes access
 * - Rule B: Full ₹50 upgrade refund -> downgrades to online reading only
 * - Rule C: Base ₹49 purchase with active upgrade -> blocks standalone refund unless dependent upgrade resolved
 * - Rule D: Partial or goodwill refund -> explicit access retention policy
 * - Rule E: Multi-book order -> isolated item and grant allocation
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import {
  createRazorpayRefund,
  fetchRazorpayRefund,
  fetchRazorpayPaymentRefunds,
  RazorpayRefundResult
} from '@/lib/razorpay';
import {
  EBookRefund,
  EBookRefundType,
  EBookRefundAccessAction
} from '@/types/ebook';

export interface InitiateRefundParams {
  orderId: string;
  amountInPaise?: number; // Optional for full refund
  reason: string;
  refundType: EBookRefundType;
  accessAction: EBookRefundAccessAction;
  allocatedItems?: { item_id: string; amount_paise: number }[];
  adminId?: string | null;
  idempotencyKey?: string;
  forceAllowDependentUpgrade?: boolean; // Set true only if admin explicitly chose to refund base alongside upgrade
  gatewayProvider?: { createRefund: typeof createRazorpayRefund };
}

export interface RefundExecutionResult {
  success: boolean;
  refundId?: string;
  orderId: string;
  gatewayRefundId?: string | null;
  status: 'processed' | 'pending' | 'failed';
  amountPaise: number;
  orderPaymentStatus?: string;
  orderRefundStatus?: string;
  message: string;
  isUncertainTimeout?: boolean;
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

/**
 * Check for dependent upgrades linked to an order.
 * Rule C: An original ₹49 base purchase cannot be refunded standalone if an active
 * paid upgrade exists for the same customer and edition.
 */
export async function checkDependentUpgrades(orderId: string, supabaseClient?: any) {
  const supabase = supabaseClient || getServiceSupabase();

  // 1. Fetch the target order and items
  const { data: order, error: orderErr } = await supabase
    .from('ebook_orders')
    .select(`
      id,
      order_number,
      customer_id,
      total_amount_paise,
      order_type,
      payment_status,
      items:ebook_order_items (
        id,
        ebook_id,
        edition_id,
        plan,
        price_paise,
        title
      )
    `)
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  // If this order itself is already an upgrade order, it has no dependent upgrades
  if (order.order_type === 'upgrade') {
    return { hasDependentUpgrade: false, dependentOrders: [] };
  }

  // 2. Query for any upgrade orders linked to this order or customer's editions
  const editionIds = (order.items || []).map((i: any) => i.edition_id);

  const { data: dependentOrders, error: depErr } = await supabase
    .from('ebook_orders')
    .select(`
      id,
      order_number,
      order_type,
      total_amount_paise,
      payment_status,
      original_order_id,
      created_at,
      items:ebook_order_items (
        id,
        ebook_id,
        edition_id,
        plan,
        price_paise
      )
    `)
    .eq('customer_id', order.customer_id)
    .eq('order_type', 'upgrade')
    .in('payment_status', ['paid', 'pending']);

  if (depErr) {
    logger.error('Failed to check dependent upgrades', depErr, { orderId });
    return { hasDependentUpgrade: false, dependentOrders: [] };
  }

  // Filter upgrades that explicitly reference this order OR target the same editions
  const matchingUpgrades = (dependentOrders || []).filter((dep: any) => {
    if (dep.original_order_id === orderId) return true;
    return (dep.items || []).some((item: any) => editionIds.includes(item.edition_id));
  });

  return {
    hasDependentUpgrade: matchingUpgrades.length > 0,
    dependentOrders: matchingUpgrades,
  };
}

/**
 * Execute a complete, two-phase provider-backed refund.
 */
export async function executeEBookRefund(params: InitiateRefundParams): Promise<RefundExecutionResult> {
  const supabase = getServiceSupabase();
  const {
    orderId,
    amountInPaise,
    reason,
    refundType,
    accessAction,
    allocatedItems = [],
    adminId = null,
    forceAllowDependentUpgrade = false,
  } = params;

  if (!reason || reason.trim().length < 5) {
    throw new Error('A detailed administrative refund reason (at least 5 characters) is required.');
  }

  // 1. Fetch authoritative order state
  const { data: order, error: orderErr } = await supabase
    .from('ebook_orders')
    .select(`
      id,
      order_number,
      customer_id,
      total_amount_paise,
      refunded_amount_paise,
      currency,
      payment_gateway,
      gateway_payment_id,
      payment_status,
      refund_status,
      order_type,
      items:ebook_order_items (
        id,
        ebook_id,
        edition_id,
        plan,
        price_paise,
        refunded_paise,
        title
      )
    `)
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  // 0. Upfront Idempotency Check: If this exact idempotency key was already processed, return existing state immediately
  if (params.idempotencyKey) {
    const { data: existingRefundByKey } = await supabase
      .from('ebook_refunds')
      .select('*')
      .eq('idempotency_key', params.idempotencyKey)
      .maybeSingle();

    if (existingRefundByKey && existingRefundByKey.status === 'processed') {
      return {
        success: true,
        refundId: existingRefundByKey.id,
        orderId: existingRefundByKey.order_id,
        gatewayRefundId: existingRefundByKey.gateway_refund_id,
        status: 'processed',
        amountPaise: existingRefundByKey.amount_paise,
        message: 'Refund was already processed previously (idempotent response).',
      };
    }
  }

  if (!['paid', 'partially_refunded'].includes(order.payment_status)) {
    throw new Error(`Order cannot be refunded: Payment status is '${order.payment_status}'.`);
  }

  if (!order.gateway_payment_id) {
    throw new Error(`Cannot process refund: No payment gateway transaction ID found for order ${order.order_number}.`);
  }

  // 2. Rule C: Verify dependent upgrades
  if (order.order_type !== 'upgrade' && !forceAllowDependentUpgrade) {
    const depCheck = await checkDependentUpgrades(orderId, supabase);
    if (depCheck.hasDependentUpgrade) {
      const depNumbers = depCheck.dependentOrders.map((d: any) => d.order_number).join(', ');
      const err: any = new Error(
        `DEPENDENT_UPGRADE_EXISTS: An active paid PDF upgrade exists for this purchase (Order(s): ${depNumbers}). ` +
        `Standalone base purchase refund is blocked. You must resolve or refund the dependent upgrade first.`
      );
      err.code = 'DEPENDENT_UPGRADE_EXISTS';
      err.dependentOrders = depCheck.dependentOrders;
      throw err;
    }
  }

  // Check for an existing pending refund intent on this order (for retries / uncertain outcome resolution)
  const { data: existingPendingRefund } = await supabase
    .from('ebook_refunds')
    .select('*')
    .eq('order_id', order.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Calculate authoritative refund amount
  const availablePaise = order.total_amount_paise - (order.refunded_amount_paise || 0);
  const targetAmountPaise = typeof amountInPaise === 'number' && amountInPaise > 0
    ? amountInPaise
    : (existingPendingRefund?.amount_paise || availablePaise);

  // If retrying an existing pending intent, available balance check is already satisfied by the intent's reservation
  if (!existingPendingRefund && (targetAmountPaise <= 0 || targetAmountPaise > availablePaise)) {
    throw new Error(
      `Invalid refund amount: Requested ${targetAmountPaise} paise, but remaining refundable balance is ${availablePaise} paise.`
    );
  }

  // 4. Stable idempotency key: persist one durable key per refund intent, reuse on retry
  const idempotencyKey = params.idempotencyKey ||
    existingPendingRefund?.idempotency_key ||
    `kp_rfnd_${order.id.slice(0, 8)}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  // 5. PHASE 1: Create or fetch durable pending refund intent in DB (locks row and guards concurrent limit)
  const { data: intentData, error: intentErr } = await supabase.rpc('create_ebook_refund_intent', {
    p_order_id: order.id,
    p_amount_paise: targetAmountPaise,
    p_reason: reason.trim(),
    p_refund_type: refundType,
    p_access_action: accessAction,
    p_allocated_items: allocatedItems,
    p_admin_id: adminId,
    p_idempotency_key: idempotencyKey,
    p_gateway_payment_id: order.gateway_payment_id,
  });

  if (intentErr || !intentData?.success) {
    logger.error('Failed to create durable refund intent', intentErr, { orderId, targetAmountPaise });
    throw new Error(intentData?.error || intentErr?.message || 'Failed to initialize refund intent in database.');
  }

  const refundId = intentData.refund_id;

  // If intent was already processed in a previous attempt, return current state
  if (intentData.already_exists && intentData.status === 'processed') {
    return {
      success: true,
      refundId,
      orderId: order.id,
      gatewayRefundId: intentData.gateway_refund_id,
      status: 'processed',
      amountPaise: targetAmountPaise,
      message: 'Refund was already processed previously.',
    };
  }

  // 6. PHASE 2: Call Razorpay API outside database transaction with stable idempotency key and immutable payload
  let providerRefund: RazorpayRefundResult | null = null;
  let isUncertain = false;
  let providerErrorMessage: string | null = null;

  const refundFn = params.gatewayProvider?.createRefund || createRazorpayRefund;

  const providerPayload = {
    paymentId: order.gateway_payment_id,
    amountInPaise: targetAmountPaise,
    receipt: `ref_${refundId.replace(/-/g, '').slice(0, 30)}`,
    notes: {
      orderId: order.id,
      orderNumber: order.order_number,
      refundId,
      refundType,
      accessAction,
      reason: reason.slice(0, 200),
      idempotencyKey,
    },
    idempotencyKey,
  };

  try {
    providerRefund = await refundFn(providerPayload);
  } catch (err: any) {
    const isUncertainOutcome = Boolean(
      err.isUncertain ||
      err.isTimeout ||
      err.code === 'GATEWAY_NETWORK_TIMEOUT' ||
      err.code === 'GATEWAY_NETWORK_ERROR' ||
      (typeof err.statusCode === 'number' && err.statusCode >= 500)
    );

    if (isUncertainOutcome) {
      // Timeout, connection drop, or ambiguous 5xx is an UNCERTAIN outcome!
      // Do NOT release reservation; keep status = 'pending' and record diagnostic message
      isUncertain = true;
      providerErrorMessage = `UNCERTAIN_GATEWAY_OUTCOME (${err.code || err.statusCode || 'NETWORK_ERROR'}): ${err.message}. Reservation safely retained in pending state.`;
      logger.warn('Razorpay refund returned uncertain outcome. Retaining pending reservation', {
        refundId,
        orderId: order.id,
        error: err.message,
        code: err.code,
        statusCode: err.statusCode,
      });

      // Update refund record keeping status = 'pending' (satisfying DB check constraint) with diagnostic info in error_message
      await supabase
        .from('ebook_refunds')
        .update({
          status: 'pending',
          error_message: providerErrorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', refundId);
    } else {
      // Definitive rejection from gateway (e.g. 4xx BAD_REQUEST_ERROR)
      providerErrorMessage = err.message || 'Refund definitively rejected by gateway.';
      logger.error('Razorpay refund definitively rejected by provider', err, {
        refundId,
        orderId: order.id,
        code: err.code,
        statusCode: err.statusCode,
      });
    }
  }

  // 7. PHASE 3: Atomically finalize local state based on provider response
  if (providerRefund && providerRefund.status === 'processed') {
    // ONLY when provider explicitly confirms 'processed' do we finalize and apply access changes
    const { data: finalizeData, error: finalizeErr } = await supabase.rpc('finalize_ebook_refund', {
      p_refund_id: refundId,
      p_gateway_refund_id: providerRefund.id,
      p_status: 'processed',
      p_error_message: null,
    });

    if (finalizeErr || !finalizeData?.success) {
      logger.error('CRITICAL: Provider refund succeeded but local finalization failed', finalizeErr, {
        refundId,
        providerRefundId: providerRefund.id,
      });
      return {
        success: true,
        refundId,
        orderId: order.id,
        gatewayRefundId: providerRefund.id,
        status: 'pending',
        amountPaise: targetAmountPaise,
        message: 'Refund accepted by Razorpay, but local entitlement finalization requires sync.',
      };
    }

    return {
      success: true,
      refundId,
      orderId: order.id,
      gatewayRefundId: providerRefund.id,
      status: 'processed',
      amountPaise: targetAmountPaise,
      orderPaymentStatus: finalizeData.order_payment_status,
      orderRefundStatus: finalizeData.order_refund_status,
      message: `Refund of ₹${(targetAmountPaise / 100).toFixed(2)} processed successfully.`,
    };
  }

  // If provider accepted the refund but marked it 'pending', keep local status 'pending'
  // and DO NOT prematurely revoke/mutate customer access!
  if (providerRefund && providerRefund.status === 'pending') {
    await supabase
      .from('ebook_refunds')
      .update({
        gateway_refund_id: providerRefund.id,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', refundId);

    return {
      success: true,
      refundId,
      orderId: order.id,
      gatewayRefundId: providerRefund.id,
      status: 'pending',
      amountPaise: targetAmountPaise,
      message: 'Refund accepted by gateway and is pending settlement. Access remains unchanged until processed.',
    };
  }

  if (isUncertain) {
    return {
      success: false,
      refundId,
      orderId: order.id,
      status: 'pending',
      amountPaise: targetAmountPaise,
      isUncertainTimeout: true,
      message: providerErrorMessage || 'Refund submission outcome is uncertain. Verification required.',
    };
  }

  // Definitive failure: finalize as failed in database
  await supabase.rpc('finalize_ebook_refund', {
    p_refund_id: refundId,
    p_gateway_refund_id: null,
    p_status: 'failed',
    p_error_message: providerErrorMessage,
  });

  return {
    success: false,
    refundId,
    orderId: order.id,
    status: 'failed',
    amountPaise: targetAmountPaise,
    message: providerErrorMessage || 'Refund failed.',
  };
}

export interface RefundBothOrdersParams {
  baseOrderId: string;
  upgradeOrderId: string;
  reason: string;
  adminId?: string | null;
  gatewayProvider?: { createRefund: typeof createRazorpayRefund };
}

export interface RefundBothOrdersResult {
  overallStatus: 'both_processed' | 'upgrade_processed_base_failed' | 'upgrade_processed_base_uncertain' | 'upgrade_failed' | 'upgrade_uncertain';
  upgradeRefund: RefundExecutionResult;
  baseRefund?: RefundExecutionResult;
  message: string;
}

/**
 * Orchestrate linked refund of both original base purchase (₹49) and upgrade (₹50).
 * Handles partial completion gracefully:
 * - Upgrade refund executed first.
 * - If upgrade refund succeeds, base refund executed.
 * - Each order retains its own truthful status.
 * - Not described as one single atomic distributed transaction.
 */
export async function executeRefundBothOrders(params: RefundBothOrdersParams): Promise<RefundBothOrdersResult> {
  const supabase = getServiceSupabase();
  const { baseOrderId, upgradeOrderId, reason, adminId, gatewayProvider } = params;

  // 1. Check current upgrade order status (avoid duplicate refund on retry)
  const { data: upOrder } = await supabase
    .from('ebook_orders')
    .select('id, refund_status, payment_status, total_amount_paise, refunded_amount_paise')
    .eq('id', upgradeOrderId)
    .single();

  let upgradeRefund: RefundExecutionResult;

  if (upOrder && (upOrder.refund_status === 'full' || upOrder.payment_status === 'refunded')) {
    upgradeRefund = {
      success: true,
      orderId: upgradeOrderId,
      status: 'processed',
      amountPaise: upOrder.refunded_amount_paise || 5000,
      message: 'Upgrade order was already refunded in a previous operation.',
    };
  } else {
    // Execute refund on the ₹50 upgrade order with access downgrade policy
    upgradeRefund = await executeEBookRefund({
      orderId: upgradeOrderId,
      reason: `Linked refund with base order: ${reason}`,
      refundType: 'full',
      accessAction: 'downgrade_to_online',
      adminId,
      gatewayProvider,
    });
  }

  // If upgrade refund did not process, halt execution
  if (upgradeRefund.status !== 'processed') {
    return {
      overallStatus: upgradeRefund.isUncertainTimeout ? 'upgrade_uncertain' : 'upgrade_failed',
      upgradeRefund,
      message: `Upgrade refund did not complete (${upgradeRefund.status}). Base purchase refund was not initiated.`,
    };
  }

  // 2. Upgrade refund is confirmed processed. Now attempt base purchase refund.
  const { data: baseOrder } = await supabase
    .from('ebook_orders')
    .select('id, refund_status, payment_status, total_amount_paise, refunded_amount_paise')
    .eq('id', baseOrderId)
    .single();

  if (baseOrder && (baseOrder.refund_status === 'full' || baseOrder.payment_status === 'refunded')) {
    return {
      overallStatus: 'both_processed',
      upgradeRefund,
      baseRefund: {
        success: true,
        orderId: baseOrderId,
        status: 'processed',
        amountPaise: baseOrder.refunded_amount_paise || 4900,
        message: 'Base purchase order was already refunded previously.',
      },
      message: 'Both orders have been fully refunded.',
    };
  }

  const baseRefund = await executeEBookRefund({
    orderId: baseOrderId,
    reason: `Linked refund with upgrade: ${reason}`,
    refundType: 'full',
    accessAction: 'revoke',
    forceAllowDependentUpgrade: true,
    adminId,
    gatewayProvider,
  });

  if (baseRefund.status === 'processed') {
    return {
      overallStatus: 'both_processed',
      upgradeRefund,
      baseRefund,
      message: 'Both upgrade and base purchase refunded successfully. Entitlement revoked.',
    };
  }

  if (baseRefund.isUncertainTimeout) {
    return {
      overallStatus: 'upgrade_processed_base_uncertain',
      upgradeRefund,
      baseRefund,
      message: 'Upgrade order refunded (PDF access removed, online reading retained). Base purchase refund outcome is uncertain; sync required.',
    };
  }

  return {
    overallStatus: 'upgrade_processed_base_failed',
    upgradeRefund,
    baseRefund,
    message: 'Upgrade order refunded (PDF access removed, online reading retained). Base purchase refund rejected by provider; actionable retry available.',
  };
}

/**
 * Admin Recovery Action: Sync/reconcile an uncertain or pending refund with Razorpay API.
 */
export async function syncRefundStatusWithGateway(refundId: string): Promise<RefundExecutionResult> {
  const supabase = getServiceSupabase();

  const { data: refund, error: rfErr } = await supabase
    .from('ebook_refunds')
    .select('*')
    .eq('id', refundId)
    .single();

  if (rfErr || !refund) {
    throw new Error(`Refund record not found: ${refundId}`);
  }

  if (refund.status === 'processed') {
    return {
      success: true,
      refundId: refund.id,
      orderId: refund.order_id,
      gatewayRefundId: refund.gateway_refund_id,
      status: 'processed',
      amountPaise: refund.amount_paise,
      message: 'Refund is already finalized and processed.',
    };
  }

  // 1. If we have a gateway_refund_id, fetch it directly
  let gatewayRefund: RazorpayRefundResult | null = null;
  if (refund.gateway_refund_id) {
    const directRefund = await fetchRazorpayRefund(refund.gateway_refund_id);
    if (directRefund) {
      // Validate payment association, amount, and currency on direct lookup
      const matchesPayment = directRefund.payment_id === refund.gateway_payment_id;
      const matchesAmount = directRefund.amount === refund.amount_paise;
      const matchesCurrency = !directRefund.currency || !refund.currency ||
        directRefund.currency.toUpperCase() === refund.currency.toUpperCase();

      if (matchesPayment && matchesAmount && matchesCurrency) {
        gatewayRefund = directRefund;
      } else {
        logger.warn('Direct gateway refund ID found but attributes mismatched', {
          refundId,
          gatewayRefundId: refund.gateway_refund_id,
          expected: { paymentId: refund.gateway_payment_id, amount: refund.amount_paise, currency: refund.currency },
          actual: { paymentId: directRefund.payment_id, amount: directRefund.amount, currency: directRefund.currency },
        });
      }
    }
  }

  // 2. If no valid gateway_refund_id or not found, search paginated payment's refunds
  if (!gatewayRefund && refund.gateway_payment_id) {
    const refunds = await fetchRazorpayPaymentRefunds(refund.gateway_payment_id, { fetchAllPages: true });
    const receiptPrefix = `ref_${refund.id.replace(/-/g, '').slice(0, 30)}`;

    gatewayRefund = refunds.find((r: any) => {
      // Payment association check
      if (r.payment_id !== refund.gateway_payment_id) return false;

      // Exact amount validation (paise)
      if (typeof r.amount === 'number' && r.amount !== refund.amount_paise) return false;

      // Currency validation
      if (r.currency && refund.currency && r.currency.toUpperCase() !== refund.currency.toUpperCase()) return false;

      // Exact intent correlation check:
      // (a) Gateway refund ID matches
      if (refund.gateway_refund_id && r.id === refund.gateway_refund_id) return true;
      // (b) Receipt matches intent receipt prefix
      if (r.receipt && (r.receipt === receiptPrefix || r.receipt.startsWith(receiptPrefix))) return true;
      // (c) Metadata notes correlate with intent ID or idempotency key
      if (r.notes && (r.notes.refundId === refund.id || r.notes.idempotencyKey === refund.idempotency_key)) return true;

      return false;
    }) || null;
  }

  // If no matching refund found on provider, do NOT release reservation!
  // It may be due to gateway processing latency or asynchronous batching.
  // Keep outcome reserved in 'pending' status for subsequent reconciliation.
  if (!gatewayRefund) {
    return {
      success: false,
      refundId: refund.id,
      orderId: refund.order_id,
      status: 'pending',
      amountPaise: refund.amount_paise,
      message: 'No correlating refund record verified on Razorpay gateway yet. Reservation safely retained in pending state.',
    };
  }

  if (gatewayRefund.status === 'processed') {
    const { data: finalizeData } = await supabase.rpc('finalize_ebook_refund', {
      p_refund_id: refund.id,
      p_gateway_refund_id: gatewayRefund.id,
      p_status: 'processed',
      p_error_message: null,
    });

    return {
      success: true,
      refundId: refund.id,
      orderId: refund.order_id,
      gatewayRefundId: gatewayRefund.id,
      status: 'processed',
      amountPaise: refund.amount_paise,
      orderPaymentStatus: finalizeData?.order_payment_status,
      orderRefundStatus: finalizeData?.order_refund_status,
      message: 'Refund successfully reconciled and processed.',
    };
  }

  // Only release reservation if gateway provides authoritative evidence of refund failure
  if (gatewayRefund.status === 'failed') {
    await supabase.rpc('finalize_ebook_refund', {
      p_refund_id: refund.id,
      p_gateway_refund_id: gatewayRefund.id,
      p_status: 'failed',
      p_error_message: gatewayRefund.error?.description || 'Gateway marked refund failed.',
    });

    return {
      success: false,
      refundId: refund.id,
      orderId: refund.order_id,
      status: 'failed',
      amountPaise: refund.amount_paise,
      message: 'Gateway confirmed refund failed.',
    };
  }

  return {
    success: true,
    refundId: refund.id,
    orderId: refund.order_id,
    gatewayRefundId: gatewayRefund.id,
    status: 'pending',
    amountPaise: refund.amount_paise,
    message: `Refund status on gateway is '${gatewayRefund.status}'.`,
  };
}
