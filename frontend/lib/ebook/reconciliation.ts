/**
 * KnowledgePaat — Phase 8: Authoritative Financial Reconciliation
 * 
 * Reconciles local database orders, payments, and refunds with official
 * Razorpay Gateway state to detect discrepancies without side-channel mutators.
 * 
 * Detected Discrepancies:
 * 1. captured_pending_local: Gateway reports payment captured, but local order is still pending.
 * 2. local_paid_missing_provider: Local order marked paid, but Gateway payment is missing, failed, or unauthorized.
 * 3. provider_refund_missing_local: Gateway shows processed refund, but local order has no recorded refund.
 * 4. amount_mismatch: Discrepancy between local total and gateway captured amount.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import {
  fetchRazorpayPayment,
  fetchRazorpayPaymentRefunds,
  fetchRazorpaySettlements
} from '@/lib/razorpay';
import { EBookReconciliationReport, EBookReconciliationItem } from '@/types/ebook';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

/**
 * Execute read-only reconciliation across recent orders and refunds.
 */
export async function runFinancialReconciliation(limit: number = 50): Promise<EBookReconciliationReport> {
  const supabase = getServiceSupabase();
  const discrepancies: EBookReconciliationItem[] = [];
  let providerReachable = true;

  // 1. Fetch recent local orders
  const { data: orders, error: ordersErr } = await supabase
    .from('ebook_orders')
    .select(`
      id,
      order_number,
      customer_email,
      total_amount_paise,
      currency,
      payment_status,
      order_status,
      refund_status,
      refunded_amount_paise,
      gateway_payment_id,
      gateway_order_id,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (ordersErr) {
    logger.error('Failed to query orders for reconciliation', ordersErr);
    throw new Error('Failed to query orders for reconciliation.');
  }

  // 2. Fetch local refunds for reference
  const { data: refunds } = await supabase
    .from('ebook_refunds')
    .select('id, order_id, amount_paise, status, gateway_refund_id, gateway_payment_id');

  const localRefundsByPayment = new Map<string, any[]>();
  for (const rf of refunds || []) {
    const list = localRefundsByPayment.get(rf.gateway_payment_id) || [];
    list.push(rf);
    localRefundsByPayment.set(rf.gateway_payment_id, list);
  }

  // 3. Inspect each order against Razorpay Gateway
  for (const order of orders || []) {
    // Only inspect orders that have a gateway payment ID
    if (!order.gateway_payment_id) {
      if (order.payment_status === 'paid') {
        discrepancies.push({
          id: order.id,
          type: 'order',
          referenceId: order.id,
          orderNumber: order.order_number,
          customerEmail: order.customer_email || 'N/A',
          localStatus: order.payment_status,
          localAmountPaise: order.total_amount_paise,
          gatewayPaymentId: null,
          providerStatus: null,
          discrepancyType: 'local_paid_missing_provider',
          discrepancyDescription: 'Order is marked paid locally, but contains no gateway payment ID.',
          actionRequired: 'Investigate missing transaction reference.',
        });
      }
      continue;
    }

    try {
      const providerPayment = await fetchRazorpayPayment(order.gateway_payment_id);

      if (!providerPayment) {
        if (order.payment_status === 'paid') {
          discrepancies.push({
            id: order.id,
            type: 'order',
            referenceId: order.id,
            orderNumber: order.order_number,
            customerEmail: order.customer_email || 'N/A',
            localStatus: order.payment_status,
            localAmountPaise: order.total_amount_paise,
            gatewayPaymentId: order.gateway_payment_id,
            providerStatus: 'not_found',
            discrepancyType: 'local_paid_missing_provider',
            discrepancyDescription: `Payment ${order.gateway_payment_id} was not found on Razorpay.`,
            actionRequired: 'Verify gateway payment ID or check environment credentials.',
          });
        }
        continue;
      }

      // Check Case 1: Provider captured, but local order is pending
      if (providerPayment.captured && order.payment_status === 'pending') {
        discrepancies.push({
          id: order.id,
          type: 'order',
          referenceId: order.id,
          orderNumber: order.order_number,
          customerEmail: order.customer_email || 'N/A',
          localStatus: order.payment_status,
          localAmountPaise: order.total_amount_paise,
          gatewayPaymentId: order.gateway_payment_id,
          providerStatus: providerPayment.status,
          providerAmountPaise: providerPayment.amount,
          discrepancyType: 'captured_pending_local',
          discrepancyDescription: 'Payment was captured on Razorpay, but local order is still pending.',
          actionRequired: 'Trigger payment recovery finalization.',
        });
      }

      // Check Case 2: Local order paid, but provider not captured
      if (order.payment_status === 'paid' && !providerPayment.captured) {
        discrepancies.push({
          id: order.id,
          type: 'order',
          referenceId: order.id,
          orderNumber: order.order_number,
          customerEmail: order.customer_email || 'N/A',
          localStatus: order.payment_status,
          localAmountPaise: order.total_amount_paise,
          gatewayPaymentId: order.gateway_payment_id,
          providerStatus: providerPayment.status,
          providerAmountPaise: providerPayment.amount,
          discrepancyType: 'local_paid_missing_provider',
          discrepancyDescription: `Local order is marked paid, but Razorpay status is '${providerPayment.status}'.`,
          actionRequired: 'Investigate payment authorization and capture state.',
        });
      }

      // Check Case 4: Amount mismatch
      if (providerPayment.captured && order.total_amount_paise !== providerPayment.amount) {
        discrepancies.push({
          id: order.id,
          type: 'order',
          referenceId: order.id,
          orderNumber: order.order_number,
          customerEmail: order.customer_email || 'N/A',
          localStatus: order.payment_status,
          localAmountPaise: order.total_amount_paise,
          gatewayPaymentId: order.gateway_payment_id,
          providerStatus: providerPayment.status,
          providerAmountPaise: providerPayment.amount,
          discrepancyType: 'amount_mismatch',
          discrepancyDescription: `Local total is ${order.total_amount_paise} paise, but provider amount is ${providerPayment.amount} paise.`,
          actionRequired: 'Investigate price or currency discrepancy.',
        });
      }

      // Check Case 3: Gateway refunds vs local refunds
      const gatewayRefunds = await fetchRazorpayPaymentRefunds(order.gateway_payment_id);
      const localRefunds = localRefundsByPayment.get(order.gateway_payment_id) || [];

      for (const gwRef of gatewayRefunds) {
        const matchingLocal = localRefunds.find(lr => lr.gateway_refund_id === gwRef.id || lr.status === 'processed');
        if (!matchingLocal) {
          discrepancies.push({
            id: gwRef.id,
            type: 'refund',
            referenceId: order.id,
            orderNumber: order.order_number,
            customerEmail: order.customer_email || 'N/A',
            localStatus: order.refund_status || 'none',
            localAmountPaise: order.refunded_amount_paise || 0,
            gatewayPaymentId: order.gateway_payment_id,
            gatewayRefundId: gwRef.id,
            providerStatus: gwRef.status,
            providerAmountPaise: gwRef.amount,
            discrepancyType: 'provider_refund_missing_local',
            discrepancyDescription: `Razorpay processed refund ${gwRef.id} for ₹${(gwRef.amount / 100).toFixed(2)}, but no matching local processed refund was recorded.`,
            actionRequired: 'Run refund reconciliation sync to finalize local entitlement state.',
          });
        }
      }

    } catch (err: any) {
      providerReachable = false;
      logger.warn('Error querying Razorpay during reconciliation', {
        orderId: order.id,
        paymentId: order.gateway_payment_id,
        error: err.message,
      });
    }
  }

  // 4. Fetch Settlement Details (read-only)
  let settlementDetails: Record<string, any> = {
    status: 'Test Mode Sandbox — Real settlements unexercised',
    source: 'Razorpay API',
  };

  try {
    const settlements = await fetchRazorpaySettlements();
    settlementDetails = {
      ...settlementDetails,
      totalCount: settlements.total,
      recentItems: settlements.items,
    };
  } catch {
    // Expected in test sandbox
  }

  return {
    timestamp: new Date().toISOString(),
    totalOrdersInspected: (orders || []).length,
    discrepanciesCount: discrepancies.length,
    discrepancies,
    providerReachable,
    settlementDetails,
  };
}
