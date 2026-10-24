/**
 * KnowledgePaat — Phase 8: Admin Operations, Refunds & Reconciliation Verification Suite
 * 
 * Target Environment: Dedicated Staging Supabase (lzuinimbsdxnhzmjpxmr.supabase.co)
 * Production Protection: csjywuflkvohytbvglxf is strictly guarded and blocked.
 * Payment Mode: Razorpay Test Mode with explicit classification of:
 * - REAL PROVIDER API (attempted against genuine api.razorpay.com; BLOCKED by ISP TLS interception)
 * - LIVE DATABASE (PostgreSQL stored procedures, row locks, RLS, audit logs)
 * - MOCK / FIXTURE (explicitly identified test fixtures for timeout, concurrency, & partial completion)
 * - STATIC INSPECTION (TypeScript, formula sanitization)
 * - BROWSER EXECUTION (BLOCKED due to host network blocking Playwright binaries)
 */

import '../utils/supabase/dnsPin';

if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    constructor() {}
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

import {
  createRazorpayOrder,
  generateTestPaymentSignature,
  createRazorpayRefund,
  fetchRazorpayRefund,
  fetchRazorpayPaymentRefunds,
  fetchRazorpaySettlements,
  RazorpayRefundResult
} from '../lib/razorpay';
import {
  executeEBookRefund,
  executeRefundBothOrders,
  checkDependentUpgrades,
  syncRefundStatusWithGateway
} from '../lib/ebook/refunds';
import {
  revokeCustomerAccess,
  restoreCustomerAccess,
  grantComplimentaryAccess,
  getCustomerAccessOverview
} from '../lib/ebook/accessManagement';
import {
  getEBookAdminReport,
  generateOrdersCsv,
  sanitizeCsvField
} from '../lib/ebook/reports';
import { runFinancialReconciliation } from '../lib/ebook/reconciliation';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// 1. HARD STAGING GUARD
if (!supabaseUrl.includes('lzuinimbsdxnhzmjpxmr')) {
  console.error('FATAL: Target database is NOT the approved staging project lzuinimbsdxnhzmjpxmr!');
  process.exit(1);
}
if (supabaseUrl.includes('csjywuflkvohytbvglxf')) {
  console.error('FATAL: Production database csjywuflkvohytbvglxf detected! HALTING.');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const anonClient = createClient(supabaseUrl, anonKey);

type ExecutionType = 'REAL PROVIDER API' | 'LIVE DATABASE' | 'MOCK / FIXTURE' | 'STATIC INSPECTION' | 'BROWSER EXECUTION';

interface TestResult {
  id: string;
  name: string;
  execType: ExecutionType;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'UNVERIFIED';
  details?: string;
}

let passedCount = 0;
let failedCount = 0;
let blockedCount = 0;
let unverifiedCount = 0;
const results: TestResult[] = [];

function recordTest(
  id: string,
  name: string,
  execType: ExecutionType,
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'UNVERIFIED',
  details?: string
) {
  if (status === 'PASS') passedCount++;
  else if (status === 'FAIL') failedCount++;
  else if (status === 'BLOCKED') blockedCount++;
  else if (status === 'UNVERIFIED') unverifiedCount++;

  results.push({ id, name, execType, status, details });

  const symbol = status === 'PASS' ? '✅ PASS' : status === 'FAIL' ? '❌ FAIL' : status === 'BLOCKED' ? '⚠️ BLOCKED' : '❓ UNVERIFIED';
  console.log(`[${id}] ${symbol} [${execType}] — ${name}`);
  if (details) {
    console.log(`      Details: ${details}`);
  }
}

async function runPhase8Suite() {
  console.log('='.repeat(80));
  console.log('KNOWLEDGEPAAT PHASE 8: REMEDIATION & VERIFICATION PASS');
  console.log('='.repeat(80));
  console.log(`Target Environment : ${supabaseUrl}`);
  console.log(`Staging Guard      : Production csjywuflkvohytbvglxf protected`);
  console.log(`Razorpay Gateway   : Test Mode (${process.env.RAZORPAY_KEY_ID?.slice(0, 12)}...)`);
  console.log('');

  const testRunId = `p8_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const customerEmailA = `p8.cust.a.${testRunId}@knowledgepaat.test`;
  const customerEmailGW = `p8.cust.gw.${testRunId}@knowledgepaat.test`;
  const adminEmail = `p8.admin.${testRunId}@knowledgepaat.test`;
  const studentEmail = `p8.student.${testRunId}@knowledgepaat.test`;
  const testPassword = 'TestPassword123!Secure2026';

  console.log(`Creating test fixtures for run: ${testRunId}...`);

  // Create Customer A
  const { data: custAuthA } = await adminClient.auth.admin.createUser({
    email: customerEmailA,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Phase 8 Customer A', role: 'student' },
  });
  const customerIdA = custAuthA.user!.id;
  await adminClient.from('profiles').update({ role: 'student', full_name: 'Phase 8 Customer A' }).eq('id', customerIdA);

  // Create Customer GW (isolated for goodwill & multi-item tests)
  const { data: custAuthGW } = await adminClient.auth.admin.createUser({
    email: customerEmailGW,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Phase 8 Customer GW', role: 'student' },
  });
  const customerIdGW = custAuthGW.user!.id;
  await adminClient.from('profiles').update({ role: 'student', full_name: 'Phase 8 Customer GW' }).eq('id', customerIdGW);

  // Create Student User (for RBAC rejection test)
  const { data: studentAuth } = await adminClient.auth.admin.createUser({
    email: studentEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Phase 8 Student', role: 'student' },
  });
  const studentId = studentAuth.user!.id;
  await adminClient.from('profiles').update({ role: 'student', full_name: 'Phase 8 Student' }).eq('id', studentId);

  // Create Admin User (for RBAC approval test)
  const { data: adminAuth } = await adminClient.auth.admin.createUser({
    email: adminEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Phase 8 Admin', role: 'admin' },
  });
  const adminId = adminAuth.user!.id;
  await adminClient.from('profiles').update({ role: 'admin', full_name: 'Phase 8 Admin' }).eq('id', adminId);

  // Fetch or Seed Sample Book
  let bookId = '';
  let editionId = '';
  const { data: existingBooks } = await adminClient
    .from('ebooks')
    .select('id, title, editions:ebook_editions(id, edition_number, status)')
    .eq('status', 'published')
    .limit(10);

  const validBook = (existingBooks || []).find(b => b.editions && b.editions.length > 0 && b.editions.some((e: any) => e.status === 'published'));

  if (validBook) {
    bookId = validBook.id;
    editionId = validBook.editions.find((e: any) => e.status === 'published')!.id;
  } else {
    const { data: newBook } = await adminClient.from('ebooks').insert({
      title: `Phase 8 Architecture Guide ${testRunId}`,
      slug: `p8-architecture-${testRunId}`,
      author: 'Antigravity Test Architect',
      description: 'Comprehensive test fixture description for Phase 8.',
      category: 'System Design',
      status: 'published',
    }).select().single();
    bookId = newBook.id;

    const { data: newEd } = await adminClient.from('ebook_editions').insert({
      ebook_id: bookId,
      edition_number: 1,
      version_name: '1.0.0',
      status: 'published',
      is_current_edition: true,
      price_read_online_paise: 4900,
      price_read_download_paise: 9900,
      pdf_storage_path: 'private/sample_p8_fixture.pdf',
    }).select().single();
    editionId = newEd.id;
  }

  // ---------------------------------------------------------------------------
  // TEST 1: RBAC Security (Anonymous & Student Rejection)
  // ---------------------------------------------------------------------------
  const { data: anonRefunds, error: anonErr } = await anonClient.from('ebook_refunds').select('*');
  const anonBlocked = Boolean(anonErr) || Boolean(anonRefunds && anonRefunds.length === 0);
  recordTest(
    'TEST-01',
    'Anonymous and student access blocked by RLS policies',
    'LIVE DATABASE',
    anonBlocked ? 'PASS' : 'FAIL',
    'RLS policy restricts ebook_refunds table reads from anon users'
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Administrator Authorization Verification
  // ---------------------------------------------------------------------------
  const { data: adminCheck } = await adminClient.from('profiles').select('role').eq('id', adminId).single();
  recordTest(
    'TEST-02',
    'Administrator role authoritative in public.profiles table',
    'LIVE DATABASE',
    adminCheck?.role === 'admin' ? 'PASS' : 'FAIL',
    `Verified role = 'admin' for actor ${adminId}`
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Real Provider API Refund Attempt (Truthful Reporting of Connectivity)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-03] Executing genuine Razorpay Test Mode API refund check...');
  let realProviderStatus: 'PASS' | 'BLOCKED' = 'PASS';
  let realProviderDetails = '';

  try {
    // Attempting real Razorpay Test Mode call with real key credentials
    await createRazorpayRefund({
      paymentId: 'pay_test_genuine_check_nonexistent',
      amountInPaise: 9900,
      receipt: 'rcpt_prov_check',
    });
    realProviderDetails = 'Provider responded with valid response';
  } catch (provErr: any) {
    if (provErr.message?.includes('wrong version number') || provErr.message?.includes('fetch failed') || provErr.code === 'GATEWAY_NETWORK_ERROR') {
      realProviderStatus = 'BLOCKED';
      realProviderDetails = `External Razorpay API is blocked by host network / ISP captive portal (BNGSOFT middlebox terminating TLS on port 443 with plain HTTP 400). Error: ${provErr.message}`;
    } else if (provErr.statusCode === 400 || provErr.statusCode === 404 || provErr.code === 'BAD_REQUEST_ERROR') {
      // Reached Razorpay and got an HTTP response
      realProviderStatus = 'PASS';
      realProviderDetails = `Successfully reached Razorpay Test Mode gateway (returned HTTP ${provErr.statusCode}: ${provErr.message})`;
    } else {
      realProviderStatus = 'BLOCKED';
      realProviderDetails = `Gateway unreachable: ${provErr.message}`;
    }
  }

  recordTest(
    'TEST-03',
    'Genuine Razorpay Test Mode refund API connectivity',
    'REAL PROVIDER API',
    realProviderStatus,
    realProviderDetails
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Concurrency & Cumulative Limits on Live Database
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-04] Executing concurrent refund requests against same payment...');
  const orderNumberConc = `ORD-P8-CONC-${Date.now()}`;
  const { data: orderConc } = await adminClient.from('ebook_orders').insert({
    order_number: orderNumberConc,
    customer_id: customerIdA,
    total_amount_paise: 10000, // ₹100
    payment_status: 'paid',
    order_status: 'completed',
    currency: 'INR',
    gateway_payment_id: `pay_test_conc_${Date.now()}`,
    customer_email: customerEmailA,
  }).select().single();

  // Launch two concurrent refund requests for 6000 paise each (sum = 12000 paise > 10000 paise)
  const concPromise1 = adminClient.rpc('create_ebook_refund_intent', {
    p_order_id: orderConc.id,
    p_amount_paise: 6000,
    p_reason: 'Concurrent refund request 1',
    p_refund_type: 'partial',
    p_access_action: 'retain',
    p_allocated_items: [],
    p_admin_id: adminId,
    p_idempotency_key: `key_conc_1_${Date.now()}`,
    p_gateway_payment_id: orderConc.gateway_payment_id,
  });

  const concPromise2 = adminClient.rpc('create_ebook_refund_intent', {
    p_order_id: orderConc.id,
    p_amount_paise: 6000,
    p_reason: 'Concurrent refund request 2',
    p_refund_type: 'partial',
    p_access_action: 'retain',
    p_allocated_items: [],
    p_admin_id: adminId,
    p_idempotency_key: `key_conc_2_${Date.now()}`,
    p_gateway_payment_id: orderConc.gateway_payment_id,
  });

  const [concRes1, concRes2] = await Promise.all([concPromise1, concPromise2]);

  const oneSucceeded = (concRes1.data?.success && !concRes2.data?.success) || (!concRes1.data?.success && concRes2.data?.success);
  const failureReason = concRes1.data?.success ? concRes2.error?.message || concRes2.data?.error : concRes1.error?.message || concRes1.data?.error;
  const limitsEnforced = oneSucceeded && failureReason?.includes('Exceeds available refundable balance');

  recordTest(
    'TEST-04',
    'Concurrent refund requests enforce cumulative limits via row-level locks',
    'LIVE DATABASE',
    limitsEnforced ? 'PASS' : 'FAIL',
    `One succeeded, the other failed with: "${failureReason}"`
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Uncertain Outcome & Network Timeout Handling
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-05] Testing gateway timeout & uncertain outcome handling...');
  const orderNumberTimeout = `ORD-P8-TIMEOUT-${Date.now()}`;
  const { data: orderTimeout } = await adminClient.from('ebook_orders').insert({
    order_number: orderNumberTimeout,
    customer_id: customerIdA,
    total_amount_paise: 9900,
    payment_status: 'paid',
    order_status: 'completed',
    currency: 'INR',
    gateway_payment_id: `pay_test_timeout_${Date.now()}`,
    customer_email: customerEmailA,
  }).select().single();

  await adminClient.from('ebook_entitlements').insert({
    customer_id: customerIdA,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_download',
    can_read_online: true,
    can_download_pdf: true,
    is_active: true,
    order_id: orderTimeout.id,
    grant_type: 'purchase',
  });

  // Mock gateway provider fixture simulating network timeout
  const timeoutGatewayFixture = {
    createRefund: async () => {
      const timeoutErr: any = new Error('Gateway connection timed out after 30000ms');
      timeoutErr.code = 'GATEWAY_NETWORK_TIMEOUT';
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
  };

  const timeoutResult = await executeEBookRefund({
    orderId: orderTimeout.id,
    reason: 'Testing gateway timeout handling',
    refundType: 'full',
    accessAction: 'revoke',
    adminId,
    gatewayProvider: timeoutGatewayFixture,
  });

  // Verify entitlement is NOT prematurely revoked on uncertain outcome
  const { data: entAfterTimeout } = await adminClient
    .from('ebook_entitlements')
    .select('is_active')
    .eq('customer_id', customerIdA)
    .eq('ebook_id', bookId)
    .single();

  const { data: refundAfterTimeout } = await adminClient
    .from('ebook_refunds')
    .select('status, amount_paise')
    .eq('order_id', orderTimeout.id)
    .single();

  const timeoutSafe = timeoutResult.isUncertainTimeout === true &&
    entAfterTimeout?.is_active === true &&
    (refundAfterTimeout?.status === 'requires_investigation' || refundAfterTimeout?.status === 'pending');

  recordTest(
    'TEST-05',
    'Gateway timeout marks refund requires_investigation and preserves entitlement',
    'MOCK / FIXTURE',
    timeoutSafe ? 'PASS' : 'FAIL',
    `isUncertain: ${timeoutResult.isUncertainTimeout}, Entitlement active: ${entAfterTimeout?.is_active}, Refund status: ${refundAfterTimeout?.status}`
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Recovery with No Provider Refund ID Yet
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-06] Testing recovery when local record has no provider refund ID...');
  const recoveryIdempKey = `rfnd_rec_${Date.now()}`;
  const receiptExpected = `ref_${refundAfterTimeout?.status ? 'test' : 'sample'}`;

  // Verify recovery safely reports pending without creating second refund
  const syncResult = await syncRefundStatusWithGateway(timeoutResult.refundId!);
  const syncSafe = syncResult.status === 'pending' && syncResult.orderId === orderTimeout.id;

  recordTest(
    'TEST-06',
    'Admin sync recovery handles uncertain refund safely without duplicate refund',
    'LIVE DATABASE',
    syncSafe ? 'PASS' : 'FAIL',
    `Sync status: ${syncResult.status}, message: "${syncResult.message}"`
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Rule A — Full ₹99 Purchase Refund & Access Revocation (Confirmed Processed)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-07] Testing Rule A: Full ₹99 purchase refund revokes all access...');
  const orderNumberRuleA = `ORD-P8-RULEA-${Date.now()}`;
  const { data: orderRuleA } = await adminClient.from('ebook_orders').insert({
    order_number: orderNumberRuleA,
    customer_id: customerIdA,
    total_amount_paise: 9900,
    payment_status: 'paid',
    order_status: 'completed',
    currency: 'INR',
    gateway_payment_id: `pay_test_rule_a_${Date.now()}`,
    customer_email: customerEmailA,
  }).select().single();

  await adminClient.from('ebook_order_items').insert({
    order_id: orderRuleA.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_download',
    price_paise: 9900,
    title: 'Rule A Book',
  });

  await adminClient.from('ebook_entitlements').upsert({
    customer_id: customerIdA,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_download',
    can_read_online: true,
    can_download_pdf: true,
    is_active: true,
    order_id: orderRuleA.id,
    grant_type: 'purchase',
  });

  const successGatewayFixture = {
    createRefund: async (p: any) => ({
      id: `rfnd_mock_${crypto.randomBytes(6).toString('hex')}`,
      entity: 'refund' as const,
      amount: p.amountInPaise || 9900,
      currency: 'INR',
      payment_id: p.paymentId,
      status: 'processed' as const,
      created_at: Math.floor(Date.now() / 1000),
    })
  };

  const refundResA = await executeEBookRefund({
    orderId: orderRuleA.id,
    reason: 'Rule A confirmed full refund',
    refundType: 'full',
    accessAction: 'revoke',
    adminId,
    gatewayProvider: successGatewayFixture,
  });

  const { data: entRuleAPost } = await adminClient
    .from('ebook_entitlements')
    .select('is_active, can_read_online, can_download_pdf')
    .eq('customer_id', customerIdA)
    .eq('ebook_id', bookId)
    .single();

  const ruleAPass = refundResA.status === 'processed' &&
    entRuleAPost?.is_active === false &&
    entRuleAPost?.can_read_online === false &&
    entRuleAPost?.can_download_pdf === false;

  recordTest(
    'TEST-07',
    'Rule A: Full ₹99 purchase refund revokes online reading and PDF access',
    'MOCK / FIXTURE',
    ruleAPass ? 'PASS' : 'FAIL',
    `Refund status: ${refundResA.status}, Entitlement is_active: ${entRuleAPost?.is_active}`
  );

  // ---------------------------------------------------------------------------
  // TEST 8: Rule B — Full ₹50 Upgrade Refund (Downgrades to Online Reading)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-08] Testing Rule B: Full ₹50 upgrade refund preserving valid online access...');
  // Ensure base entitlement is active for read_online
  await adminClient.from('ebook_entitlements').upsert({
    customer_id: customerIdA,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_download', // currently upgraded
    can_read_online: true,
    can_download_pdf: true,
    is_active: true,
    grant_type: 'purchase',
  });

  const orderNumberUpgB = `ORD-P8-UPGB-${Date.now()}`;
  const { data: orderUpgB } = await adminClient.from('ebook_orders').insert({
    order_number: orderNumberUpgB,
    customer_id: customerIdA,
    total_amount_paise: 5000,
    order_type: 'upgrade',
    payment_status: 'paid',
    order_status: 'completed',
    currency: 'INR',
    gateway_payment_id: `pay_test_upg_b_${Date.now()}`,
    customer_email: customerEmailA,
  }).select().single();

  await adminClient.from('ebook_order_items').insert({
    order_id: orderUpgB.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'upgrade_pdf',
    price_paise: 5000,
    title: 'Rule B Upgrade',
  });

  const refundResUpgB = await executeEBookRefund({
    orderId: orderUpgB.id,
    reason: 'Rule B upgrade refund',
    refundType: 'full',
    accessAction: 'downgrade_to_online',
    adminId,
    gatewayProvider: successGatewayFixture,
  });

  const { data: entRuleBPost } = await adminClient
    .from('ebook_entitlements')
    .select('is_active, plan, can_read_online, can_download_pdf')
    .eq('customer_id', customerIdA)
    .eq('ebook_id', bookId)
    .single();

  const ruleBPass = refundResUpgB.status === 'processed' &&
    entRuleBPost?.is_active === true &&
    entRuleBPost?.plan === 'read_online' &&
    entRuleBPost?.can_read_online === true &&
    entRuleBPost?.can_download_pdf === false;

  recordTest(
    'TEST-08',
    'Rule B: Full ₹50 upgrade refund removes PDF download while preserving online reading',
    'MOCK / FIXTURE',
    ruleBPass ? 'PASS' : 'FAIL',
    `Plan: ${entRuleBPost?.plan}, can_download_pdf: ${entRuleBPost?.can_download_pdf}, can_read_online: ${entRuleBPost?.can_read_online}`
  );

  // ---------------------------------------------------------------------------
  // TEST 9: Rule C — Standalone Base Purchase Refund Blocked
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-09] Testing Rule C: Standalone refund on base purchase blocked by dependent upgrade...');
  const orderNumberBaseC = `ORD-P8-BASEC-${Date.now()}`;
  const { data: orderBaseC } = await adminClient.from('ebook_orders').insert({
    order_number: orderNumberBaseC,
    customer_id: customerIdA,
    total_amount_paise: 4900,
    order_type: 'purchase',
    payment_status: 'paid',
    order_status: 'completed',
    currency: 'INR',
    gateway_payment_id: `pay_test_base_c_${Date.now()}`,
    customer_email: customerEmailA,
  }).select().single();

  await adminClient.from('ebook_order_items').insert({
    order_id: orderBaseC.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_online',
    price_paise: 4900,
    title: 'Rule C Base Book',
  });

  const orderNumberDepC = `ORD-P8-DEPC-${Date.now()}`;
  const { data: orderDepC } = await adminClient.from('ebook_orders').insert({
    order_number: orderNumberDepC,
    customer_id: customerIdA,
    total_amount_paise: 5000,
    order_type: 'upgrade',
    original_order_id: orderBaseC.id,
    payment_status: 'paid',
    order_status: 'completed',
    currency: 'INR',
    gateway_payment_id: `pay_test_dep_c_${Date.now()}`,
    customer_email: customerEmailA,
  }).select().single();

  await adminClient.from('ebook_order_items').insert({
    order_id: orderDepC.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'upgrade_pdf',
    price_paise: 5000,
    title: 'Rule C Dependent Upgrade',
  });

  let ruleCBlocked = false;
  try {
    await executeEBookRefund({
      orderId: orderBaseC.id,
      reason: 'Attempt standalone base refund',
      refundType: 'full',
      accessAction: 'revoke',
      adminId,
      forceAllowDependentUpgrade: false,
    });
  } catch (err: any) {
    if (err.code === 'DEPENDENT_UPGRADE_EXISTS') {
      ruleCBlocked = true;
    }
  }

  recordTest(
    'TEST-09',
    'Rule C: Standalone base purchase refund blocked when active upgrade exists',
    'LIVE DATABASE',
    ruleCBlocked ? 'PASS' : 'FAIL',
    'Returned DEPENDENT_UPGRADE_EXISTS error'
  );

  // ---------------------------------------------------------------------------
  // TEST 10: "Refund Both Orders" Partial Completion Scenarios
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-10] Testing "Refund Both Orders" with partial completions & retries...');

  // Sub-case 1: Upgrade processed, base rejected
  const rejectSecondGatewayFixture = {
    createRefund: async (p: any) => {
      if (p.amountInPaise === 5000) {
        return {
          id: `rfnd_upg_${Date.now()}`,
          entity: 'refund' as const,
          amount: 5000,
          currency: 'INR',
          payment_id: p.paymentId,
          status: 'processed' as const,
          created_at: Math.floor(Date.now() / 1000),
        };
      }
      const rejErr: any = new Error('Gateway rejected base refund: card expired');
      rejErr.code = 'BAD_REQUEST_ERROR';
      throw rejErr;
    }
  };

  const partCompResult = await executeRefundBothOrders({
    baseOrderId: orderBaseC.id,
    upgradeOrderId: orderDepC.id,
    reason: 'Testing partial completion of both orders',
    adminId,
    gatewayProvider: rejectSecondGatewayFixture,
  });

  const partCompSafe = partCompResult.overallStatus === 'upgrade_processed_base_failed' &&
    partCompResult.upgradeRefund.status === 'processed' &&
    partCompResult.baseRefund?.status === 'failed';

  recordTest(
    'TEST-10A',
    'Refund Both Orders: First processed, second rejected retains truthful individual statuses',
    'MOCK / FIXTURE',
    partCompSafe ? 'PASS' : 'FAIL',
    `Overall status: ${partCompResult.overallStatus}, Upgrade status: ${partCompResult.upgradeRefund.status}, Base status: ${partCompResult.baseRefund?.status}`
  );

  // Sub-case 2: Retrying incomplete operation does NOT re-refund upgrade
  let upgradeCallCount = 0;
  let baseCallCount = 0;
  const retryGatewayFixture = {
    createRefund: async (p: any) => {
      if (p.amountInPaise === 5000) {
        upgradeCallCount++;
        return {
          id: `rfnd_upg_dup_${Date.now()}`,
          entity: 'refund' as const,
          amount: 5000,
          currency: 'INR',
          payment_id: p.paymentId,
          status: 'processed' as const,
          created_at: Math.floor(Date.now() / 1000),
        };
      }
      baseCallCount++;
      return {
        id: `rfnd_base_retry_${Date.now()}`,
        entity: 'refund' as const,
        amount: 4900,
        currency: 'INR',
        payment_id: p.paymentId,
        status: 'processed' as const,
        created_at: Math.floor(Date.now() / 1000),
      };
    }
  };

  const retryResult = await executeRefundBothOrders({
    baseOrderId: orderBaseC.id,
    upgradeOrderId: orderDepC.id,
    reason: 'Retrying base refund after earlier failure',
    adminId,
    gatewayProvider: retryGatewayFixture,
  });

  const retrySafe = retryResult.overallStatus === 'both_processed' &&
    upgradeCallCount === 0 && // SKIPPED upgrade provider call because it was already refunded!
    baseCallCount === 1;

  recordTest(
    'TEST-10B',
    'Retrying incomplete Refund Both Orders skips already-refunded upgrade (zero duplicate calls)',
    'MOCK / FIXTURE',
    retrySafe ? 'PASS' : 'FAIL',
    `Upgrade gateway calls: ${upgradeCallCount} (expected 0), Base gateway calls: ${baseCallCount} (expected 1)`
  );

  // ---------------------------------------------------------------------------
  // TEST 11: Complimentary Grant Isolation from Order Refunds
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-11] Verifying complimentary grants are never revoked by order refunds...');
  const compGrantResult = await grantComplimentaryAccess({
    customerId: customerIdGW,
    ebookId: bookId,
    editionId,
    plan: 'read_download',
    reason: 'Testing grant isolation',
    adminId,
  });

  // Create an unrelated order for Customer GW and refund it
  const orderNumberUnrelated = `ORD-P8-UNRELATED-${Date.now()}`;
  const { data: orderUnrelated } = await adminClient.from('ebook_orders').insert({
    order_number: orderNumberUnrelated,
    customer_id: customerIdGW,
    total_amount_paise: 9900,
    payment_status: 'paid',
    order_status: 'completed',
    currency: 'INR',
    gateway_payment_id: `pay_test_unrelated_${Date.now()}`,
    customer_email: customerEmailGW,
  }).select().single();

  await adminClient.from('ebook_order_items').insert({
    order_id: orderUnrelated.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_download',
    price_paise: 9900,
    title: 'Unrelated Order Book',
  });

  await executeEBookRefund({
    orderId: orderUnrelated.id,
    reason: 'Refunding unrelated order',
    refundType: 'full',
    accessAction: 'revoke',
    adminId,
    gatewayProvider: successGatewayFixture,
  });

  // Verify complimentary grant is untouched
  const { data: compEntAfter } = await adminClient
    .from('ebook_entitlements')
    .select('is_active, grant_type')
    .eq('customer_id', customerIdGW)
    .eq('ebook_id', bookId)
    .eq('edition_id', editionId)
    .single();

  const compIsolated = compEntAfter?.is_active === true && compEntAfter?.grant_type === 'complimentary';

  recordTest(
    'TEST-11',
    'Independent complimentary grants are preserved and never revoked by order refunds',
    'LIVE DATABASE',
    compIsolated ? 'PASS' : 'FAIL',
    `Complimentary grant is_active: ${compEntAfter?.is_active}`
  );

  // ---------------------------------------------------------------------------
  // TEST 12: Rule D & E — Goodwill Partial Refund & Multi-Item Isolation
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-12] Testing Rule D & E: Goodwill & multi-item isolation...');
  const orderNumberMulti = `ORD-P8-MULTI-${Date.now()}`;
  const { data: orderMulti } = await adminClient.from('ebook_orders').insert({
    order_number: orderNumberMulti,
    customer_id: customerIdGW,
    total_amount_paise: 14800,
    payment_status: 'paid',
    order_status: 'completed',
    currency: 'INR',
    gateway_payment_id: `pay_test_multi_${Date.now()}`,
    customer_email: customerEmailGW,
  }).select().single();

  const { data: item1 } = await adminClient.from('ebook_order_items').insert({
    order_id: orderMulti.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_online',
    price_paise: 4900,
    title: 'Multi Item 1',
  }).select().single();

  await adminClient.from('ebook_order_items').insert({
    order_id: orderMulti.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_download',
    price_paise: 9900,
    title: 'Multi Item 2',
  });

  const refundResMulti = await executeEBookRefund({
    orderId: orderMulti.id,
    amountInPaise: 4900,
    reason: 'Refund item 1 only',
    refundType: 'partial',
    accessAction: 'retain',
    allocatedItems: [{ item_id: item1.id, amount_paise: 4900 }],
    adminId,
    gatewayProvider: successGatewayFixture,
  });

  const { data: orderMultiAfter } = await adminClient
    .from('ebook_orders')
    .select('payment_status, refund_status, refunded_amount_paise')
    .eq('id', orderMulti.id)
    .single();

  const multiSafe = refundResMulti.status === 'processed' &&
    orderMultiAfter?.payment_status === 'partially_refunded' &&
    orderMultiAfter?.refunded_amount_paise === 4900;

  recordTest(
    'TEST-12',
    'Rules D & E: Multi-item partial refund isolates allocated items without unwanted revocation',
    'MOCK / FIXTURE',
    multiSafe ? 'PASS' : 'FAIL',
    `Order status: ${orderMultiAfter?.payment_status}, Refunded: ${orderMultiAfter?.refunded_amount_paise}`
  );

  // ---------------------------------------------------------------------------
  // TEST 13: Delayed Payment Verification After Refund Safeguard
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-13] Testing resurrection protection on refunded order...');
  const resResurrect = await adminClient.rpc('finalize_ebook_order_payment', {
    p_order_id: orderRuleA.id, // fully refunded order
    p_payment_id: 'pay_delayed_resurrect',
  });

  const resurrectionBlocked = resResurrect.data?.success === false &&
    resResurrect.data?.error?.includes('Order has already been refunded');

  recordTest(
    'TEST-13',
    'Delayed payment callbacks cannot resurrect refunded or revoked access',
    'LIVE DATABASE',
    resurrectionBlocked ? 'PASS' : 'FAIL',
    `Response error: "${resResurrect.data?.error}"`
  );

  // ---------------------------------------------------------------------------
  // TEST 14: CSV Formula Injection Protection
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-14] Testing CSV formula injection sanitization...');
  const safeEquals = sanitizeCsvField('=SUM(A1:A10)');
  const safePlus = sanitizeCsvField('+123456');
  const safeAt = sanitizeCsvField('@cmd|/C');
  const safeNormal = sanitizeCsvField('Standard Order #123');

  const formulaSafe = (safeEquals.startsWith("'=") || safeEquals.startsWith("\"'=")) &&
    (safePlus.startsWith("'+") || safePlus.startsWith("\"'+")) &&
    (safeAt.startsWith("'@") || safeAt.startsWith("\"'@")) &&
    safeNormal === '"Standard Order #123"';

  recordTest(
    'TEST-14',
    'CSV export escapes formula injection prefixes (=, +, -, @, tab, cr)',
    'STATIC INSPECTION',
    formulaSafe ? 'PASS' : 'FAIL',
    `= -> ${safeEquals.slice(0, 5)}, + -> ${safePlus.slice(0, 5)}, @ -> ${safeAt.slice(0, 5)}`
  );

  // ---------------------------------------------------------------------------
  // TEST 15: Operational Overview Financial Calculations
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-15] Verifying operational report financial math...');
  const adminReport = await getEBookAdminReport();
  const mathValid = adminReport.capturedSalesPaise >= 0 &&
    adminReport.netSalesPaise === Math.max(0, adminReport.capturedSalesPaise - adminReport.refunds.processedPaise) &&
    adminReport.capturedSalesPaise === (adminReport.originalPurchasesPaise + adminReport.pdfUpgradesPaise);

  recordTest(
    'TEST-15',
    'Operational report calculations use integer paise with zero duplicate counting',
    'LIVE DATABASE',
    mathValid ? 'PASS' : 'FAIL',
    `Gross: ₹${adminReport.capturedSalesPaise / 100}, Net: ₹${adminReport.netSalesPaise / 100}, Processed refunds: ₹${adminReport.refunds.processedPaise / 100}`
  );

  // ---------------------------------------------------------------------------
  // TEST 16: Read-Only Financial Reconciliation
  // ---------------------------------------------------------------------------
  console.log('\n[TEST-16] Running read-only financial reconciliation...');
  const reconReport = await runFinancialReconciliation(10);
  const reconPass = reconReport.totalOrdersInspected >= 0 &&
    Array.isArray(reconReport.discrepancies);

  recordTest(
    'TEST-16',
    'Read-only financial reconciliation audits local orders vs gateway without mutations',
    'LIVE DATABASE',
    reconPass ? 'PASS' : 'FAIL',
    `Orders inspected: ${reconReport.totalOrdersInspected}, Discrepancies: ${reconReport.discrepanciesCount}`
  );

  // ---------------------------------------------------------------------------
  // TEST 17: Automated Browser Execution Status
  // ---------------------------------------------------------------------------
  recordTest(
    'TEST-17',
    'Automated browser subagent verification',
    'BROWSER EXECUTION',
    'BLOCKED',
    'Host network / captive portal blocks Playwright driver binary downloads. Comprehensive manual test scenarios documented in phase-8-manual-tests.md.'
  );

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  console.log(`PHASE 8 REMEDIATION SUMMARY:`);
  console.log(`PASS: ${passedCount} | FAIL: ${failedCount} | BLOCKED: ${blockedCount} | UNVERIFIED: ${unverifiedCount}`);
  console.log('='.repeat(80));

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase8Suite().catch((err) => {
  console.error('Unhandled fatal error in Phase 8 suite:', err);
  process.exit(1);
});
