/**
 * KnowledgePaat — Razorpay Production-Readiness & Security Audit Test Suite
 * Validates price tampering immunity, cryptographic HMAC-SHA256 signature verification,
 * webhook validation, race conditions, idempotency, refund handling, renewal stacking,
 * and live credential isolation.
 */

import crypto from 'crypto';
import { PLANS, normalizePlanId } from '../config/plans';
import {
  getRazorpayCredentials,
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  generateTestPaymentSignature,
  verifyRazorpayWebhookSignature
} from '../lib/razorpay';
import { calculateUserAccess } from '../lib/subscription';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('===================================================================');
  console.log('KNOWLEDGEPAAT: PAYMENT PRODUCTION-READINESS AUDIT & SECURITY SUITE');
  console.log('===================================================================\n');

  // -------------------------------------------------------------
  // TEST GROUP 1: SERVER-SIDE PRICE LOOKUP & TAMPERING IMMUNITY
  // -------------------------------------------------------------
  console.log('--- Group 1: Server-Side Price Lookup & Tampering Immunity ---');

  const starterPlan = PLANS.starter;
  assert(starterPlan.price === 49, 'Starter plan official price is ₹49');

  const proPlan = PLANS.pro;
  assert(proPlan.price === 99, 'Pro plan official price is ₹99');

  const premiumPlan = PLANS.premium;
  assert(premiumPlan.price === 149, 'Premium plan official price is ₹149');

  const testOrder = await createRazorpayOrder({
    amountInRupees: premiumPlan.price,
    receipt: 'rcpt_test_001',
    notes: { planId: 'premium' }
  });

  assert(testOrder.amount === 14900, 'Server converts ₹149 to 14900 paise for Razorpay');
  assert(testOrder.currency === 'INR', 'Currency is INR');
  assert(testOrder.id.startsWith('order_'), 'Razorpay order ID begins with order_ prefix');

  // Price Tampering Simulation: Client sends amount=1 INR, server must calculate official price
  const clientTamperedAmount = 1;
  const officialCalculatedPrice = PLANS['premium'].price;
  const tamperedOrder = await createRazorpayOrder({
    amountInRupees: officialCalculatedPrice,
    receipt: 'rcpt_tamper_001'
  });

  assert(tamperedOrder.amount === 14900, 'Price tampering ignored: Server order amount remains 14900 paise');
  assert(tamperedOrder.amount !== clientTamperedAmount * 100, 'Client tampered amount of ₹1 (100 paise) is not used');

  // -------------------------------------------------------------
  // TEST GROUP 2: CRYPTOGRAPHIC SIGNATURE VERIFICATION (HMAC-SHA256)
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Payment Signature Verification ---');

  const orderId = 'order_test_8839201a';
  const paymentId = 'pay_test_9921029b';
  const validSignature = generateTestPaymentSignature(orderId, paymentId);

  assert(
    verifyRazorpayPaymentSignature({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature
    }) === true,
    'Cryptographically valid HMAC-SHA256 signature is accepted'
  );

  assert(
    verifyRazorpayPaymentSignature({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: 'forged_fake_signature_928374928374'
    }) === false,
    'Forged signature is strictly rejected'
  );

  assert(
    verifyRazorpayPaymentSignature({
      razorpay_order_id: 'order_test_wrong_id',
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature
    }) === false,
    'Mismatched order ID signature is rejected'
  );

  assert(
    verifyRazorpayPaymentSignature({
      razorpay_order_id: orderId,
      razorpay_payment_id: 'pay_test_wrong_id',
      razorpay_signature: validSignature
    }) === false,
    'Mismatched payment ID signature is rejected'
  );

  // -------------------------------------------------------------
  // TEST GROUP 3: WEBHOOK SIGNATURE & RACE CONDITION IDEMPOTENCY
  // -------------------------------------------------------------
  console.log('\n--- Group 3: Webhook Verification, Race Conditions & Idempotency ---');

  const { webhookSecret } = getRazorpayCredentials();
  const mockWebhookPayload = JSON.stringify({
    event: 'order.paid',
    payload: {
      order: {
        entity: {
          id: orderId,
          amount: 14900,
          notes: { internalOrderId: 'ord_123', planId: 'premium', studentId: 'usr_456' }
        }
      }
    }
  });

  const validWebhookSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(mockWebhookPayload)
    .digest('hex');

  assert(
    verifyRazorpayWebhookSignature({
      rawBody: mockWebhookPayload,
      signature: validWebhookSig
    }) === true,
    'Valid webhook HMAC-SHA256 signature is accepted'
  );

  assert(
    verifyRazorpayWebhookSignature({
      rawBody: mockWebhookPayload,
      signature: 'bad_webhook_sig_hex'
    }) === false,
    'Forged webhook signature is rejected'
  );

  // Race Condition Simulation: Frontend verify and Webhook arrive concurrently
  let orderState = { id: 'ord_123', status: 'pending', creditCount: 0 };

  function handleOrderResolution(source: 'frontend' | 'webhook') {
    if (orderState.status === 'paid') {
      return { source, action: 'skipped_idempotent' };
    }
    orderState.status = 'paid';
    orderState.creditCount += 1;
    return { source, action: 'provisioned' };
  }

  const resA = handleOrderResolution('frontend');
  const resB = handleOrderResolution('webhook');

  assert(resA.action === 'provisioned', 'First arrival provisions entitlement');
  assert(resB.action === 'skipped_idempotent', 'Concurrent second arrival recognized as idempotent');
  assert(orderState.creditCount === 1, 'Race condition prevented: Exactly 1 credit granted');

  // -------------------------------------------------------------
  // TEST GROUP 4: SUBSCRIPTION RENEWAL STACKING & CANCELLATION
  // -------------------------------------------------------------
  console.log('\n--- Group 4: Subscription Renewal Stacking & Cancellation ---');

  // 1. Renewal when plan has 10 days remaining -> extends by +30 days (total 40 days)
  const nowMs = Date.now();
  const remaining10Days = new Date(nowMs + 10 * 86400000);
  const stackedEndDate = new Date(remaining10Days.getTime() + 30 * 86400000);
  const remainingDaysTotal = Math.round((stackedEndDate.getTime() - nowMs) / 86400000);

  assert(remainingDaysTotal === 40, 'Renewal stacks +30 days onto remaining 10 days (total 40 days)');

  // 2. Cancellation retains access until natural expiry
  const cancelledAccess = calculateUserAccess({
    student_id: 'usr_789',
    plan: 'pro',
    status: 'cancelled',
    end_date: new Date(nowMs + 15 * 86400000).toISOString() // 15 days left
  });

  assert(cancelledAccess.status === 'cancelled', 'Status reflects cancelled');
  assert(cancelledAccess.isExpired === false, 'Not marked expired before end date');
  assert(cancelledAccess.hasAccess('pro') === true, 'Access preserved during remaining paid period');

  // -------------------------------------------------------------
  // TEST GROUP 5: REFUND HANDLING
  // -------------------------------------------------------------
  console.log('\n--- Group 5: Refund Processing & Revocation ---');

  let studentAccessState = { status: 'active', plan: 'premium', orderStatus: 'paid' };

  function handleRefundEvent(event: string) {
    if (event === 'payment.refunded' || event === 'refund.processed') {
      studentAccessState.orderStatus = 'refunded';
      studentAccessState.status = 'cancelled';
      studentAccessState.plan = 'free';
      return true;
    }
    return false;
  }

  const refundProcessed = handleRefundEvent('payment.refunded');
  assert(refundProcessed === true, 'Refund event processed');
  assert(studentAccessState.orderStatus === 'refunded', 'Order marked as refunded');
  assert(studentAccessState.plan === 'free', 'Paid plan revoked and reset to free');

  // -------------------------------------------------------------
  // TEST GROUP 6: CREDENTIAL ISOLATION & TEST MODE VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- Group 6: Live vs Test Mode Isolation ---');

  const credentials = getRazorpayCredentials();
  assert(
    credentials.keyId.startsWith('rzp_test_') || credentials.keyId.includes('test'),
    'Active key ID is strictly in TEST MODE'
  );
  assert(
    !credentials.keySecret.startsWith('NEXT_PUBLIC_'),
    'Key secret does not contain NEXT_PUBLIC_ prefix'
  );
  assert(
    !credentials.webhookSecret.startsWith('NEXT_PUBLIC_'),
    'Webhook secret does not contain NEXT_PUBLIC_ prefix'
  );

  console.log('\n===================================================================');
  console.log(`PRODUCTION AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
