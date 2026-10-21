/**
 * KnowledgePaat — Phase 5: eBook Order Management & Payment Processing
 * - Server-authoritative order creation, pricing validation, and Razorpay Test Mode integration.
 * - Cryptographic HMAC signature verification and timing-safe checks.
 * - Durable, idempotent payment finalization via PostgreSQL atomic stored procedure.
 * - Prevents double-purchases, preserves edition pinning, and updates digital library rights.
 */

import { createClient, createAdminClient } from '@/utils/supabase/server';
import { getVerifiedCustomer, VerifiedCustomer } from './customerAuth';
import { evaluatePurchaseIntent } from './entitlements';
import { getAuthoritativeEditionPricing } from './pricing';
import {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  getRazorpayCredentials,
  fetchRazorpayPayment,
  fetchRazorpayOrderPayments,
  RazorpayPaymentDetails,
} from '@/lib/razorpay';
import { processOrderReceiptOutbox } from './receipts';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import {
  EBookAccessPlan,
  EBookOrder,
  EBookOrderItem,
} from '@/types/ebook';
import crypto from 'crypto';

export interface CreateOrderRequestItem {
  bookId: string;
  plan: EBookAccessPlan;
}

export interface CreateEBookOrderResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  amountPaise: number;
  amountRupees: number;
  currency: string;
  keyId: string;
  items: Array<{
    bookId: string;
    editionId: string;
    title: string;
    plan: EBookAccessPlan;
    pricePaise: number;
    priceRupees: number;
  }>;
}

export const PENDING_ORDER_EXPIRY_MINUTES = 15;

/**
 * Authoritatively creates a pending eBook order on the server.
 * Strict pricing: ignores any browser-supplied prices and recomputes from published editions.
 * Reuses existing active pending order if created within PENDING_ORDER_EXPIRY_MINUTES.
 */
export async function createEBookServerOrder(
  items: CreateOrderRequestItem[],
  explicitCustomer?: VerifiedCustomer
): Promise<CreateEBookOrderResult> {
  let customer = explicitCustomer;
  if (!customer) {
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      throw new Error(authResult.message);
    }
    customer = authResult.customer;
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Order items cannot be empty.');
  }

  // Prevent duplicate items within the cart
  const bookIdSet = new Set<string>();
  for (const item of items) {
    if (bookIdSet.has(item.bookId)) {
      throw new Error('Cart contains duplicate items for the same book.');
    }
    bookIdSet.add(item.bookId);
    if (item.plan !== 'read_online' && item.plan !== 'read_download') {
      throw new Error(`Unsupported access plan: ${item.plan}`);
    }
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // Validate each item against database and customer ownership
  const validatedItems: Array<{
    bookId: string;
    editionId: string;
    title: string;
    editionLabel: string;
    plan: EBookAccessPlan;
    pricePaise: number;
    priceRupees: number;
  }> = [];

  let totalAmountPaise = 0;

  for (const item of items) {
    // 1. Fetch book master
    const { data: book, error: bookErr } = await supabase
      .from('ebooks')
      .select('id, title, status')
      .eq('id', item.bookId)
      .maybeSingle();

    if (bookErr || !book || book.status !== 'published') {
      throw new Error(`Book "${item.bookId}" is unavailable or not published.`);
    }

    // 2. Fetch current published edition
    const { data: edition, error: editionErr } = await supabase
      .from('ebook_editions')
      .select('*')
      .eq('ebook_id', item.bookId)
      .eq('is_current_edition', true)
      .eq('status', 'published')
      .maybeSingle();

    if (editionErr || !edition) {
      throw new Error(`No published edition currently available for "${book.title}".`);
    }

    // 3. Re-evaluate purchase intent and existing ownership
    const intent = await evaluatePurchaseIntent(customer.userId, item.bookId, item.plan);

    if (intent.status === 'already_owned_complete') {
      throw new Error(`You already own complete access to "${book.title}".`);
    }

    if (intent.status === 'already_owned_online') {
      if (item.plan === 'read_online') {
        throw new Error(`You already own Read Online access to "${book.title}".`);
      }
      if (item.plan === 'read_download') {
        throw new Error(
          `You already own online access for "${book.title}". Standalone edition upgrades (+₹50) will be available in Phase 7. Full re-purchase of ₹99 is prevented.`
        );
      }
    }

    // Authoritative pricing lookup (rejecting silent fallbacks)
    const authoritativePricing = await getAuthoritativeEditionPricing(edition.id, supabase);
    if (!authoritativePricing) {
      throw new Error(`Pricing information for "${book.title}" is currently unavailable. Please retry shortly.`);
    }

    const pricePaise =
      item.plan === 'read_online'
        ? authoritativePricing.online_price_paise
        : authoritativePricing.download_price_paise;

    if (typeof pricePaise !== 'number' || pricePaise < 0) {
      throw new Error(`Invalid pricing configuration for "${book.title}".`);
    }

    totalAmountPaise += pricePaise;

    validatedItems.push({
      bookId: book.id,
      editionId: edition.id,
      title: book.title,
      editionLabel: `Edition ${edition.edition_number} (${edition.version_name})`,
      plan: item.plan,
      pricePaise,
      priceRupees: Math.round(pricePaise / 100),
    });
  }

  if (totalAmountPaise <= 0) {
    throw new Error('Total order amount must be greater than zero.');
  }

  // Check if an active pending base order for this customer with identical amount exists within 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - PENDING_ORDER_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const { data: existingPendingOrders } = await supabase
    .from('ebook_orders')
    .select('id, order_number, gateway_order_id, total_amount_paise, currency, created_at')
    .eq('customer_id', customer.userId)
    .eq('payment_status', 'pending')
    .eq('order_status', 'pending')
    .neq('order_type', 'upgrade')
    .eq('total_amount_paise', totalAmountPaise)
    .gte('created_at', fifteenMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingPendingOrders && existingPendingOrders.length > 0 && existingPendingOrders[0].gateway_order_id) {
    const pending = existingPendingOrders[0];
    const { keyId } = getRazorpayCredentials();
    logger.info('Reusing existing active pending order to prevent duplicate gateway sessions', {
      module: 'ebook_orders',
      orderId: pending.id,
      orderNumber: pending.order_number,
      customerId: customer.userId,
    });
    return {
      success: true,
      orderId: pending.id,
      orderNumber: pending.order_number,
      razorpayOrderId: pending.gateway_order_id,
      amountPaise: pending.total_amount_paise,
      amountRupees: Math.round(pending.total_amount_paise / 100),
      currency: pending.currency || 'INR',
      keyId,
      items: validatedItems,
    };
  }

  // Generate unique order number (e.g. EB-20261018-A1B2C3D4)
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  const orderNumber = `EB-${dateStr}-${randomSuffix}`;

  // 4. Persist internal pending order in Supabase
  const { data: newOrder, error: orderInsertErr } = await supabase
    .from('ebook_orders')
    .insert({
      order_number: orderNumber,
      customer_id: customer.userId,
      total_amount_paise: totalAmountPaise,
      currency: 'INR',
      payment_gateway: 'razorpay',
      payment_status: 'pending',
      order_status: 'pending',
      customer_email: customer.email,
      customer_name: customer.fullName,
      notes: {
        orderType: 'ebook',
        customerId: customer.userId,
        itemsCount: validatedItems.length,
      },
    })
    .select()
    .single();

  if (orderInsertErr || !newOrder) {
    logger.error('Failed to create internal ebook_orders record', orderInsertErr, {
      module: 'ebook_orders',
      customerId: customer.userId,
    });
    throw new Error('Unable to initialize order in database. Please try again.');
  }

  // 5. Persist order items with pinned edition snapshots
  const orderItemRows = validatedItems.map((item) => ({
    order_id: newOrder.id,
    ebook_id: item.bookId,
    edition_id: item.editionId,
    plan: item.plan,
    price_paise: item.pricePaise,
    title: item.title,
    edition_label: item.editionLabel,
  }));

  const { error: itemsInsertErr } = await supabase
    .from('ebook_order_items')
    .insert(orderItemRows);

  if (itemsInsertErr) {
    logger.error('Failed to insert ebook_order_items', itemsInsertErr, {
      module: 'ebook_orders',
      orderId: newOrder.id,
    });
    throw new Error('Unable to record order items. Please try again.');
  }

  // 6. Create Razorpay Test Mode Order
  const amountInRupees = totalAmountPaise / 100;
  const razorpayOrder = await createRazorpayOrder({
    amountInRupees,
    receipt: orderNumber.slice(0, 40),
    notes: {
      internalOrderId: newOrder.id,
      orderNumber,
      customerId: customer.userId,
      orderType: 'ebook',
    },
  });

  // 7. Associate gateway order ID with internal order
  await supabase
    .from('ebook_orders')
    .update({ gateway_order_id: razorpayOrder.id })
    .eq('id', newOrder.id);

  const { keyId } = getRazorpayCredentials();

  logger.info('eBook order successfully initialized', {
    module: 'ebook_orders',
    orderId: newOrder.id,
    orderNumber,
    razorpayOrderId: razorpayOrder.id,
    totalPaise: totalAmountPaise,
    customerId: customer.userId,
  });

  return {
    success: true,
    orderId: newOrder.id,
    orderNumber,
    razorpayOrderId: razorpayOrder.id,
    amountPaise: totalAmountPaise,
    amountRupees: amountInRupees,
    currency: 'INR',
    keyId,
    items: validatedItems,
  };
}

export interface VerifyPaymentParams {
  internalOrderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface FinalizeOrderResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  alreadyPaid: boolean;
  totalAmountPaise: number;
  message: string;
}

/**
 * Authoritatively verifies Razorpay checkout signature and atomically finalizes purchase.
 * 
 * Rules:
 * 1. Resolve authenticated customer's internal order.
 * 2. Verify signature using the trusted stored provider order ID.
 * 3. Fetch payment details from Razorpay on the server.
 * 4. Verify order association, amount, currency, and captured status.
 * 5. Invoke atomic, idempotent purchase finalisation.
 * 6. Never unlock from browser success alone.
 */
export async function verifyAndFinalizeEBookPayment(
  params: VerifyPaymentParams,
  explicitCustomerId?: string
): Promise<FinalizeOrderResult> {
  const { internalOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

  if (!internalOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new Error('Missing required payment verification parameters.');
  }

  let customerId = explicitCustomerId;
  let customerRole = '';
  if (!customerId) {
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      throw new Error(authResult.message);
    }
    customerId = authResult.customer.userId;
    customerRole = authResult.customer.role;
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // 1. Fetch internal order
  const { data: order, error: orderErr } = await supabase
    .from('ebook_orders')
    .select('*')
    .eq('id', internalOrderId)
    .maybeSingle();

  if (orderErr || !order) {
    throw new Error('Order record not found.');
  }

  // Order ownership validation
  if (order.customer_id !== customerId && customerRole !== 'admin') {
    throw new Error('Unauthorized. You do not have permission to verify this order.');
  }

  // 2. Gateway Order ID match check: resolve trusted stored provider order ID
  const trustedGatewayOrderId = order.gateway_order_id;
  if (!trustedGatewayOrderId) {
    throw new Error('No gateway provider order associated with this internal order.');
  }

  if (razorpayOrderId !== trustedGatewayOrderId) {
    logger.warn('Payment gateway order reference mismatch with stored provider order', {
      module: 'ebook_orders',
      internalOrderId,
      storedGatewayOrderId: trustedGatewayOrderId,
      receivedRazorpayOrderId: razorpayOrderId,
    });
    throw new Error('Payment gateway order reference mismatch with stored provider order.');
  }

  // 3. Cryptographic Signature Verification using trusted stored provider order ID
  const isValidSignature = verifyRazorpayPaymentSignature({
    razorpay_order_id: trustedGatewayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  });

  if (!isValidSignature) {
    logger.warn('Razorpay payment signature verification failed', {
      module: 'ebook_orders',
      internalOrderId,
      trustedGatewayOrderId,
      razorpayPaymentId,
    });
    throw new Error('Invalid payment signature. Cryptographic verification failed.');
  }

  // 4. Fetch authoritative payment details from Razorpay on the server
  const paymentDetails = await fetchRazorpayPayment(razorpayPaymentId);
  if (!paymentDetails) {
    logger.error('Failed to retrieve payment details from Razorpay Gateway API', null, {
      module: 'ebook_orders',
      paymentId: razorpayPaymentId,
    });
    throw new Error(
      `Unable to fetch authoritative payment details from Razorpay Gateway API for payment ID "${razorpayPaymentId}".`
    );
  }

  // 5. Authoritatively verify order association, amount, currency, and captured status
  // Never unlock from browser success alone.
  if (paymentDetails.order_id && paymentDetails.order_id !== trustedGatewayOrderId) {
    logger.warn('Payment gateway order association mismatch', {
      module: 'ebook_orders',
      paymentOrderId: paymentDetails.order_id,
      trustedGatewayOrderId,
    });
    throw new Error(
      `Payment gateway order association mismatch: payment belongs to order "${paymentDetails.order_id}", but stored provider order is "${trustedGatewayOrderId}".`
    );
  }

  if (paymentDetails.amount !== order.total_amount_paise) {
    logger.warn('Payment gateway amount mismatch', {
      module: 'ebook_orders',
      gatewayAmount: paymentDetails.amount,
      orderAmount: order.total_amount_paise,
    });
    throw new Error(
      `Payment gateway amount mismatch: payment amount is ${paymentDetails.amount} paise, but order expects ${order.total_amount_paise} paise.`
    );
  }

  const expectedCurrency = (order.currency || 'INR').toUpperCase();
  if (paymentDetails.currency.toUpperCase() !== expectedCurrency) {
    logger.warn('Payment gateway currency mismatch', {
      module: 'ebook_orders',
      gatewayCurrency: paymentDetails.currency,
      orderCurrency: expectedCurrency,
    });
    throw new Error(
      `Payment gateway currency mismatch: payment currency is "${paymentDetails.currency}", but order expects "${expectedCurrency}".`
    );
  }

  if (paymentDetails.status !== 'captured' || !paymentDetails.captured) {
    logger.warn('Payment is not captured on gateway', {
      module: 'ebook_orders',
      paymentId: paymentDetails.id,
      status: paymentDetails.status,
      captured: paymentDetails.captured,
    });
    throw new Error(
      `Payment is not captured (status: "${paymentDetails.status}"). Entitlements cannot be unlocked until payment is captured.`
    );
  }

  // 6. Atomic Purchase Finalization via PostgreSQL RPC
  const { data: rpcResult, error: rpcErr } = await supabase.rpc(
    'finalize_ebook_order_payment',
    {
      p_order_id: internalOrderId,
      p_payment_id: razorpayPaymentId,
      p_gateway_order_id: trustedGatewayOrderId,
      p_signature: razorpaySignature,
    }
  );

  if (rpcErr || !rpcResult || !rpcResult.success) {
    logger.error('Failed to atomically finalize ebook order payment', rpcErr, {
      module: 'ebook_orders',
      internalOrderId,
      razorpayPaymentId,
    });
    throw new Error(rpcErr?.message || 'Database error during payment finalization.');
  }

  // 7. Trigger receipt outbox processing in background (non-blocking)
  processOrderReceiptOutbox(internalOrderId).catch((err) => {
    logger.warn('Non-blocking receipt processing logged an issue', {
      module: 'ebook_orders',
      orderId: internalOrderId,
      error: err.message,
    });
  });

  return {
    success: true,
    orderId: internalOrderId,
    orderNumber: rpcResult.order_number || order.order_number,
    alreadyPaid: rpcResult.already_paid === true,
    totalAmountPaise: rpcResult.total_amount_paise || order.total_amount_paise,
    message: rpcResult.already_paid
      ? 'Payment was already verified and entitlements unlocked.'
      : 'Payment verified and eBook library access unlocked successfully.',
  };
}

export interface ReconcileOrderResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  paymentStatus: 'paid' | 'pending' | 'authorized' | 'failed' | 'not_found' | 'refunded';
  alreadyPaid: boolean;
  reconciled: boolean;
  paymentId?: string;
  totalAmountPaise: number;
  message: string;
}

/**
 * Authenticated recovery action: checks stored provider order status directly from
 * Razorpay Gateway API and reconciles pending payments idempotently.
 */
export async function checkAndReconcileOrderPayment(
  orderId: string,
  explicitCustomerId?: string
): Promise<ReconcileOrderResult> {
  let customerId = explicitCustomerId;
  let customerRole = '';
  if (!customerId) {
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      throw new Error(authResult.message);
    }
    customerId = authResult.customer.userId;
    customerRole = authResult.customer.role;
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // 1. Fetch internal order
  const { data: order, error: orderErr } = await supabase
    .from('ebook_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) {
    throw new Error('Order record not found.');
  }

  // Ownership verification
  if (order.customer_id !== customerId && customerRole !== 'admin') {
    throw new Error('Unauthorized to check status of this order.');
  }

  // 2a. Guard: If already refunded or partially refunded, recovery cannot resurrect access
  if (
    order.payment_status === 'refunded' ||
    order.payment_status === 'partially_refunded' ||
    order.refund_status === 'full' ||
    order.refund_status === 'partial'
  ) {
    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: 'refunded',
      alreadyPaid: false,
      reconciled: false,
      paymentId: order.gateway_payment_id || undefined,
      totalAmountPaise: order.total_amount_paise,
      message: 'Order has already been refunded or partially refunded. Entitlements cannot be resurrected.',
    };
  }

  // 2b. If already paid, return early (idempotent)
  if (order.payment_status === 'paid' && order.order_status === 'completed') {
    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: 'paid',
      alreadyPaid: true,
      reconciled: false,
      paymentId: order.gateway_payment_id || undefined,
      totalAmountPaise: order.total_amount_paise,
      message: 'Order is already confirmed and library access is unlocked.',
    };
  }

  // 2c. Guard: Cancelled order without payment cannot create access
  if (order.order_status === 'cancelled' && order.payment_status !== 'paid') {
    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: 'failed',
      alreadyPaid: false,
      reconciled: false,
      totalAmountPaise: order.total_amount_paise,
      message: 'Order was cancelled.',
    };
  }

  const gatewayOrderId = order.gateway_order_id;
  if (!gatewayOrderId) {
    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: 'pending',
      alreadyPaid: false,
      reconciled: false,
      totalAmountPaise: order.total_amount_paise,
      message: 'No payment session initiated yet with payment gateway.',
    };
  }

  // 3. Query Razorpay API for all payments associated with this stored provider order
  const payments = await fetchRazorpayOrderPayments(gatewayOrderId);

  // Look for a captured payment matching amount and currency
  const capturedPayment = payments.find(
    (p: RazorpayPaymentDetails) =>
      p.status === 'captured' &&
      p.captured &&
      p.amount === order.total_amount_paise &&
      p.currency.toUpperCase() === (order.currency || 'INR').toUpperCase()
  );

  if (capturedPayment) {
    // Atomically finalize order using genuine captured payment
    const { data: rpcResult, error: rpcErr } = await supabase.rpc(
      'finalize_ebook_order_payment',
      {
        p_order_id: order.id,
        p_payment_id: capturedPayment.id,
        p_gateway_order_id: gatewayOrderId,
        p_signature: 'reconciled_via_gateway_order_api',
      }
    );

    if (rpcErr || !rpcResult || !rpcResult.success) {
      const errMsg = rpcResult?.error || rpcErr?.message || 'Database error during payment reconciliation.';
      logger.error('Failed to atomically finalize order during payment status reconciliation', rpcErr || new Error(errMsg), {
        orderId: order.id,
        paymentId: capturedPayment.id,
        rpcResult,
      });
      throw new Error(errMsg);
    }

    // Trigger receipt outbox non-blocking
    processOrderReceiptOutbox(order.id).catch(() => {});

    logger.info('Order payment recovered and reconciled via Gateway API', {
      orderId: order.id,
      orderNumber: order.order_number,
      paymentId: capturedPayment.id,
    });

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: 'paid',
      alreadyPaid: rpcResult.already_paid === true,
      reconciled: true,
      paymentId: capturedPayment.id,
      totalAmountPaise: order.total_amount_paise,
      message: 'Payment verified and eBook library access unlocked successfully.',
    };
  }

  // Check if there is an authorized payment awaiting capture
  const authorizedPayment = payments.find((p: RazorpayPaymentDetails) => p.status === 'authorized');
  if (authorizedPayment) {
    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: 'authorized',
      alreadyPaid: false,
      reconciled: false,
      paymentId: authorizedPayment.id,
      totalAmountPaise: order.total_amount_paise,
      message: 'Payment is authorized by your bank and pending capture. Please check again in a few moments.',
    };
  }

  // Check if the most recent payment failed
  const failedPayment = payments.find((p: RazorpayPaymentDetails) => p.status === 'failed');
  if (failedPayment) {
    await supabase
      .from('ebook_orders')
      .update({ payment_status: 'failed' })
      .eq('id', order.id)
      .eq('payment_status', 'pending');

    return {
      success: false,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: 'failed',
      alreadyPaid: false,
      reconciled: false,
      paymentId: failedPayment.id,
      totalAmountPaise: order.total_amount_paise,
      message: failedPayment.error_description || 'Payment was declined or failed at the gateway.',
    };
  }

  // Check if order has expired past the 15-minute pending window without capture
  const orderAgeMs = Date.now() - new Date(order.created_at).getTime();
  const isOrderExpired = orderAgeMs > PENDING_ORDER_EXPIRY_MINUTES * 60 * 1000;

  if (isOrderExpired && order.order_status === 'pending') {
    await supabase
      .from('ebook_orders')
      .update({ order_status: 'cancelled' })
      .eq('id', order.id)
      .eq('order_status', 'pending');

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: 'failed',
      alreadyPaid: false,
      reconciled: false,
      totalAmountPaise: order.total_amount_paise,
      message: `Pending order expired after ${PENDING_ORDER_EXPIRY_MINUTES} minutes without captured payment. Please initiate a new checkout.`,
    };
  }

  // Still pending / no payment attempt recorded
  return {
    success: true,
    orderId: order.id,
    orderNumber: order.order_number,
    paymentStatus: 'pending',
    alreadyPaid: false,
    reconciled: false,
    totalAmountPaise: order.total_amount_paise,
    message: 'No completed payment received yet from gateway. Awaiting completion.',
  };
}

export interface WebhookHandlerResult {
  success: boolean;
  status: 'processed' | 'already_processed' | 'ignored' | 'failed';
  message: string;
}

/**
 * Handles incoming Razorpay webhook events securely and idempotently.
 * Strictly fail-closed when RAZORPAY_WEBHOOK_SECRET is unconfigured.
 */
export async function handleEBookWebhook(
  rawBody: string,
  signature: string
): Promise<WebhookHandlerResult> {
  const { webhookSecret } = getRazorpayCredentials();
  if (!webhookSecret) {
    logger.warn('Webhook processing rejected: RAZORPAY_WEBHOOK_SECRET is not configured', {
      module: 'ebook_webhook',
    });
    return {
      success: false,
      status: 'failed',
      message: 'Webhook processing disabled: RAZORPAY_WEBHOOK_SECRET is not configured',
    };
  }

  const isValidSignature = verifyRazorpayWebhookSignature({ rawBody, signature });
  if (!isValidSignature) {
    logger.warn('Unauthorized webhook rejected (bad signature)', {
      module: 'ebook_webhook',
    });
    return {
      success: false,
      status: 'failed',
      message: 'Invalid webhook signature',
    };
  }

  let eventData: any;
  try {
    eventData = JSON.parse(rawBody);
  } catch (err) {
    return {
      success: false,
      status: 'failed',
      message: 'Malformed JSON payload',
    };
  }

  const eventId = eventData.id || `evt_${crypto.randomBytes(8).toString('hex')}`;
  const eventType = eventData.event;
  const paymentEntity = eventData.payload?.payment?.entity;
  const orderEntity = eventData.payload?.order?.entity;

  const notes = paymentEntity?.notes || orderEntity?.notes || {};
  const internalOrderId = notes.internalOrderId;

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // Record webhook event in audit table for idempotency
  const { data: existingEvent } = await supabase
    .from('ebook_webhook_events')
    .select('id, status')
    .eq('event_id', eventId)
    .maybeSingle();

  if (existingEvent && existingEvent.status === 'processed') {
    return {
      success: true,
      status: 'already_processed',
      message: 'Webhook event already processed',
    };
  }

  // Insert or record pending event
  await supabase
    .from('ebook_webhook_events')
    .upsert({
      event_id: eventId,
      event_type: eventType,
      gateway: 'razorpay',
      payload: eventData,
      status: 'pending',
    }, { onConflict: 'event_id' });

  // Handle capture / paid events
  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    if (!internalOrderId) {
      await supabase
        .from('ebook_webhook_events')
        .update({ status: 'ignored', error_message: 'No internalOrderId in notes' })
        .eq('event_id', eventId);
      return {
        success: true,
        status: 'ignored',
        message: 'Event ignored: no internalOrderId',
      };
    }

    const razorpayPaymentId = paymentEntity?.id || 'pay_webhook_captured';
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id || '';

    const { data: rpcResult, error: rpcErr } = await supabase.rpc(
      'finalize_ebook_order_payment',
      {
        p_order_id: internalOrderId,
        p_payment_id: razorpayPaymentId,
        p_gateway_order_id: razorpayOrderId,
      }
    );

    if (rpcErr || !rpcResult || !rpcResult.success) {
      await supabase
        .from('ebook_webhook_events')
        .update({
          status: 'failed',
          error_message: rpcErr?.message || 'Finalization RPC failed',
        })
        .eq('event_id', eventId);

      return {
        success: false,
        status: 'failed',
        message: rpcErr?.message || 'Finalization RPC failed',
      };
    }

    // Mark event processed
    await supabase
      .from('ebook_webhook_events')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId);

    // Non-blocking receipt trigger
    processOrderReceiptOutbox(internalOrderId).catch(() => {});

    return {
      success: true,
      status: 'processed',
      message: 'Payment finalized via webhook successfully',
    };
  }

  // For other events (payment.failed, etc.)
  if (eventType === 'payment.failed') {
    if (internalOrderId) {
      await supabase
        .from('ebook_orders')
        .update({ payment_status: 'failed' })
        .eq('id', internalOrderId)
        .eq('payment_status', 'pending');
    }
    await supabase
      .from('ebook_webhook_events')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId);

    return {
      success: true,
      status: 'processed',
      message: 'Recorded payment failure',
    };
  }

  // Ignored unhandled event types
  await supabase
    .from('ebook_webhook_events')
    .update({ status: 'ignored' })
    .eq('event_id', eventId);

  return {
    success: true,
    status: 'ignored',
    message: `Unhandled event type: ${eventType}`,
  };
}

/**
 * Retrieves all eBook orders placed by a customer.
 */
export async function getCustomerEBookOrders(customerId: string): Promise<EBookOrder[]> {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from('ebook_orders')
    .select(`
      *,
      items:ebook_order_items(*),
      refunds:ebook_refunds(*)
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error || !orders) {
    logger.error('Failed to fetch customer ebook orders', error, { customerId });
    return [];
  }

  return orders as EBookOrder[];
}

/**
 * Retrieves a single customer order by ID with ownership verification.
 */
export async function getCustomerEBookOrderById(
  customerId: string,
  orderId: string
): Promise<EBookOrder | null> {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('ebook_orders')
    .select(`
      *,
      items:ebook_order_items(*)
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) return null;

  // Enforce customer isolation
  if (order.customer_id !== customerId) {
    return null;
  }

  return order as EBookOrder;
}
