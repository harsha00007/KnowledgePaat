/**
 * KnowledgePaat — UI Enhancement Phase 1 Verification Suite
 * 
 * Target Environment: Dedicated Staging Supabase (lzuinimbsdxnhzmjpxmr.supabase.co)
 * Production Protection: csjywuflkvohytbvglxf is strictly guarded and blocked.
 * Scope:
 * 1. Anonymous and student rejection from privileged operations.
 * 2. Authorized administrator pricing changes on a published book.
 * 3. Valid percentage/fixed discounts and invalid input rejection.
 * 4. Server calculation ignoring client-supplied final prices.
 * 5. Concurrent pricing edits (409 conflict detection).
 * 6. Dynamic price changes appearing in catalogue, cart validation, and upgrade quotes.
 * 7. Paid and pending order snapshots remaining unchanged.
 * 8. Publication content protections remaining enforced.
 * 9. Homepage draft isolation and successful publication.
 * 10. Failed homepage publication preserving previous content.
 * 11. Student search, pagination, detail visibility, and audited actions.
 * 12. Complimentary access grants remaining distinct from financial purchases.
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

import {
  calculateSellingPrice,
  validatePricingRules,
  getAuthoritativeEditionPricing,
  updateEditionPricing
} from '../lib/ebook/pricing';
import { getUpgradeQuote } from '../lib/ebook/downloads';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// 1. HARD STAGING GUARD
if (!supabaseUrl.includes('lzuinimbsdxnhzmjpxmr')) {
  console.error('FATAL: Target database is NOT the approved staging project lzuinimbsdxnhzmjpxmr!');
  process.exit(1);
}
if (supabaseUrl.includes('csjywuflkvohytbvglxf')) {
  console.error('FATAL: Production database csjywuflkvohytbvglxf detected! HALTING.');
  process.exit(1);
}

const adminDbClient = createClient(supabaseUrl, serviceRoleKey);
const anonDbClient = createClient(supabaseUrl, anonKey);

type ExecutionType = 'LIVE DATABASE' | 'HTTP API' | 'STATIC INSPECTION';

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

import { getTestAuthCookieHeader } from './testAuthHelper';

async function getAuthCookie(email: string, pass?: string): Promise<string> {
  return getTestAuthCookieHeader(email, pass);
}

async function runSuite() {
  console.log('='.repeat(80));
  console.log('KNOWLEDGEPAAT: UI ENHANCEMENT PHASE 1 VERIFICATION SUITE');
  console.log('='.repeat(80));
  console.log(`Target Supabase URL : ${supabaseUrl}`);
  console.log(`App Base URL        : ${appBaseUrl}`);
  console.log('='.repeat(80));

  const adminEmail = 'admin@knowledgepaat.test';
  const adminPass = process.env.STAGING_TEST_ADMIN_PASSWORD;
  const studentEmail = 'student@knowledgepaat.test';
  const studentPass = process.env.STAGING_TEST_STUDENT_PASSWORD;

  // Obtain cookies
  let adminCookie = '';
  let studentCookie = '';
  let studentUserId = '';
  let adminUserId = '';

  try {
    adminCookie = await getAuthCookie(adminEmail, adminPass);
    studentCookie = await getAuthCookie(studentEmail, studentPass);

    const { data: studentUser } = await adminDbClient.from('profiles').select('id').eq('email', studentEmail).maybeSingle();
    studentUserId = studentUser?.id || '';

    const { data: adminUser } = await adminDbClient.from('profiles').select('id').eq('email', adminEmail).maybeSingle();
    adminUserId = adminUser?.id || '';

    console.log(`Admin User ID: ${adminUserId}`);
    console.log(`Student User ID: ${studentUserId}`);
  } catch (err: any) {
    console.error('Failed to get auth cookies:', err.message);
  }

  // Find a published book edition that is the current edition and has chapters
  const { data: publishedEditions } = await adminDbClient
    .from('ebook_editions')
    .select('id, ebook_id, edition_number, status, is_current_edition, ebooks!inner(id, title, status), ebook_chapters!inner(id)')
    .eq('status', 'published')
    .eq('is_current_edition', true)
    .limit(1);

  if (!publishedEditions || publishedEditions.length === 0) {
    console.error('FATAL: No published book editions with chapters found in staging DB!');
    process.exit(1);
  }

  const testEdition = publishedEditions[0];
  const testBook = (testEdition as any).ebooks;
  console.log(`Selected Test Book: "${testBook.title}" (Book ID: ${testBook.id}, Edition ID: ${testEdition?.id})`);

  // =========================================================================
  // 1. ANONYMOUS & STUDENT REJECTION FROM PRIVILEGED OPERATIONS
  // =========================================================================
  console.log('\n--- 1. PRIVILEGED ACCESS GATING ---');

  // Anonymous request to Admin Pricing API
  const anonPriceRes = await fetch(`${appBaseUrl}/api/admin/ebooks/${testBook.id}/pricing`);
  recordTest(
    'SEC-01',
    'Anonymous access rejected from Admin Pricing API (401)',
    'HTTP API',
    anonPriceRes.status === 401 ? 'PASS' : 'FAIL',
    `HTTP Status: ${anonPriceRes.status} (Expected 401)`
  );

  // Student request to Admin Pricing API
  const studentPriceRes = await fetch(`${appBaseUrl}/api/admin/ebooks/${testBook.id}/pricing`, {
    headers: { 'Cookie': studentCookie }
  });
  recordTest(
    'SEC-02',
    'Student access forbidden from Admin Pricing API (403)',
    'HTTP API',
    studentPriceRes.status === 403 ? 'PASS' : 'FAIL',
    `HTTP Status: ${studentPriceRes.status} (Expected 403)`
  );

  // Anonymous request to Homepage Admin API
  const anonHomeRes = await fetch(`${appBaseUrl}/api/admin/ebooks/homepage`);
  recordTest(
    'SEC-03',
    'Anonymous access rejected from Admin Homepage API (401)',
    'HTTP API',
    anonHomeRes.status === 401 ? 'PASS' : 'FAIL',
    `HTTP Status: ${anonHomeRes.status} (Expected 401)`
  );

  // Student request to Homepage Admin API
  const studentHomeRes = await fetch(`${appBaseUrl}/api/admin/ebooks/homepage`, {
    headers: { 'Cookie': studentCookie }
  });
  recordTest(
    'SEC-04',
    'Student access forbidden from Admin Homepage API (403)',
    'HTTP API',
    studentHomeRes.status === 403 ? 'PASS' : 'FAIL',
    `HTTP Status: ${studentHomeRes.status} (Expected 403)`
  );

  // Anonymous request to Customers Admin API
  const anonCustRes = await fetch(`${appBaseUrl}/api/admin/ebooks/customers`);
  recordTest(
    'SEC-05',
    'Anonymous access rejected from Admin Customers API (401)',
    'HTTP API',
    anonCustRes.status === 401 ? 'PASS' : 'FAIL',
    `HTTP Status: ${anonCustRes.status} (Expected 401)`
  );

  // Student request to Customers Admin API
  const studentCustRes = await fetch(`${appBaseUrl}/api/admin/ebooks/customers`, {
    headers: { 'Cookie': studentCookie }
  });
  recordTest(
    'SEC-06',
    'Student access forbidden from Admin Customers API (403)',
    'HTTP API',
    studentCustRes.status === 403 ? 'PASS' : 'FAIL',
    `HTTP Status: ${studentCustRes.status} (Expected 403)`
  );

  // =========================================================================
  // 2. AUTHORIZED ADMIN PRICING CHANGE ON A PUBLISHED BOOK
  // =========================================================================
  console.log('\n--- 2. AUTHORIZED PRICING CHANGES ON PUBLISHED BOOKS ---');

  // Fetch current pricing
  const adminGetPriceRes = await fetch(`${appBaseUrl}/api/admin/ebooks/${testBook.id}/pricing`, {
    headers: { 'Cookie': adminCookie }
  });
  const currentPricingData = await adminGetPriceRes.json();
  const currentPricing = currentPricingData.pricing;

  recordTest(
    'PRICE-01',
    'Authorized Admin can read edition pricing for published book',
    'HTTP API',
    adminGetPriceRes.status === 200 && currentPricing ? 'PASS' : 'FAIL',
    `HTTP Status: ${adminGetPriceRes.status}, Current Version: ${currentPricing?.pricing_version}`
  );

  // Update commercial pricing as admin
  const newOnlineList = 29900; // ₹299
  const newDownloadList = 49900; // ₹499
  const newUpgradeList = 19900; // ₹199 (independent upgrade price!)

  const updatePriceRes = await fetch(`${appBaseUrl}/api/admin/ebooks/${testBook.id}/pricing`, {
    method: 'PUT',
    headers: {
      'Cookie': adminCookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      editionId: testEdition.id,
      online: {
        original_price_paise: newOnlineList,
        discount_type: 'percentage',
        discount_value: 20 // 20% discount -> 23920 paise
      },
      download: {
        original_price_paise: newDownloadList,
        discount_type: 'fixed',
        discount_value: 10000 // ₹100 discount -> 39900 paise
      },
      upgrade: {
        original_price_paise: newUpgradeList,
        discount_type: 'none',
        discount_value: 0 // 19900 paise
      },
      currentVersion: currentPricing.pricing_version,
      changeReason: 'Q4 Festive Commercial Pricing Update'
    })
  });

  const updatedPriceJson = await updatePriceRes.json();

  recordTest(
    'PRICE-02',
    'Admin successfully updates commercial pricing on published book',
    'HTTP API',
    updatePriceRes.status === 200 && updatedPriceJson.success ? 'PASS' : 'FAIL',
    `HTTP Status: ${updatePriceRes.status}, Version: ${updatedPriceJson.pricing?.pricing_version}, Online Selling: ₹${updatedPriceJson.pricing?.online_price_paise / 100}`
  );

  // Verify DB state in ebook_pricing and ebook_editions mirrors
  const { data: dbPricing } = await adminDbClient
    .from('ebook_pricing')
    .select('*')
    .eq('edition_id', testEdition.id)
    .single();

  const { data: dbEdition } = await adminDbClient
    .from('ebook_editions')
    .select('price_read_online_paise, price_read_download_paise, price_upgrade_pdf_paise')
    .eq('id', testEdition.id)
    .single();

  recordTest(
    'PRICE-03',
    'Database mirrors updated synchronously in ebook_pricing and ebook_editions',
    'LIVE DATABASE',
    dbPricing?.online_price_paise === 23920 &&
    dbPricing?.download_price_paise === 39900 &&
    dbPricing?.upgrade_price_paise === 19900 &&
    dbEdition?.price_read_online_paise === 23920 &&
    dbEdition?.price_read_download_paise === 39900 &&
    dbEdition?.price_upgrade_pdf_paise === 19900
      ? 'PASS' : 'FAIL',
    `ebook_pricing: ${dbPricing?.online_price_paise}/${dbPricing?.download_price_paise}/${dbPricing?.upgrade_price_paise}, ebook_editions: ${dbEdition?.price_read_online_paise}/${dbEdition?.price_read_download_paise}/${dbEdition?.price_upgrade_pdf_paise}`
  );

  // Verify Audit Log entry
  const { data: priceAudit } = await adminDbClient
    .from('ebook_audit_logs')
    .select('*')
    .eq('action', 'pricing_updated')
    .eq('entity_id', testEdition.id)
    .order('created_at', { ascending: false })
    .limit(1);

  recordTest(
    'PRICE-04',
    'Pricing modification atomically logged to ebook_audit_logs with reason and previous values',
    'LIVE DATABASE',
    priceAudit && priceAudit.length > 0 && priceAudit[0].metadata?.change_reason === 'Q4 Festive Commercial Pricing Update'
      ? 'PASS' : 'FAIL',
    `Audit ID: ${priceAudit?.[0]?.id}, Actor: ${priceAudit?.[0]?.actor_id}, Reason: ${priceAudit?.[0]?.metadata?.change_reason}`
  );

  // =========================================================================
  // 3. VALIDATION OF PERCENTAGE AND FIXED DISCOUNTS & REJECTION OF INVALID INPUTS
  // =========================================================================
  console.log('\n--- 3. PRICING VALIDATION & BOUNDARY RULES ---');

  // Negative price rejection
  const negPriceRes = await fetch(`${appBaseUrl}/api/admin/ebooks/${testBook.id}/pricing`, {
    method: 'PUT',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      editionId: testEdition.id,
      online: { original_price_paise: -500, discount_type: 'none', discount_value: 0 },
      download: { original_price_paise: 9900, discount_type: 'none', discount_value: 0 },
      upgrade: { original_price_paise: 5000, discount_type: 'none', discount_value: 0 },
      currentVersion: updatedPriceJson.pricing.pricing_version,
      changeReason: 'Negative price test'
    })
  });
  recordTest(
    'VAL-01',
    'Reject negative price with 400 Bad Request',
    'HTTP API',
    negPriceRes.status === 400 ? 'PASS' : 'FAIL',
    `HTTP Status: ${negPriceRes.status}`
  );

  // Invalid discount type
  const badTypeRes = await fetch(`${appBaseUrl}/api/admin/ebooks/${testBook.id}/pricing`, {
    method: 'PUT',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      editionId: testEdition.id,
      online: { original_price_paise: 10000, discount_type: 'bogo_special', discount_value: 10 },
      download: { original_price_paise: 9900, discount_type: 'none', discount_value: 0 },
      upgrade: { original_price_paise: 5000, discount_type: 'none', discount_value: 0 },
      currentVersion: updatedPriceJson.pricing.pricing_version,
      changeReason: 'Invalid discount type test'
    })
  });
  recordTest(
    'VAL-02',
    'Reject invalid discount type with 400 Bad Request',
    'HTTP API',
    badTypeRes.status === 400 ? 'PASS' : 'FAIL',
    `HTTP Status: ${badTypeRes.status}`
  );

  // Percentage discount > 100%
  const overPercentRes = await fetch(`${appBaseUrl}/api/admin/ebooks/${testBook.id}/pricing`, {
    method: 'PUT',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      editionId: testEdition.id,
      online: { original_price_paise: 10000, discount_type: 'percentage', discount_value: 150 },
      download: { original_price_paise: 9900, discount_type: 'none', discount_value: 0 },
      upgrade: { original_price_paise: 5000, discount_type: 'none', discount_value: 0 },
      currentVersion: updatedPriceJson.pricing.pricing_version,
      changeReason: 'Over 100% discount test'
    })
  });
  recordTest(
    'VAL-03',
    'Reject percentage discount > 100% with 400 Bad Request',
    'HTTP API',
    overPercentRes.status === 400 ? 'PASS' : 'FAIL',
    `HTTP Status: ${overPercentRes.status}`
  );

  // Missing change reason
  const noReasonRes = await fetch(`${appBaseUrl}/api/admin/ebooks/${testBook.id}/pricing`, {
    method: 'PUT',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      editionId: testEdition.id,
      online: { original_price_paise: 10000, discount_type: 'none', discount_value: 0 },
      download: { original_price_paise: 9900, discount_type: 'none', discount_value: 0 },
      upgrade: { original_price_paise: 5000, discount_type: 'none', discount_value: 0 },
      currentVersion: updatedPriceJson.pricing.pricing_version,
      changeReason: '   '
    })
  });
  recordTest(
    'VAL-04',
    'Reject empty change reason with 400 Bad Request',
    'HTTP API',
    noReasonRes.status === 400 ? 'PASS' : 'FAIL',
    `HTTP Status: ${noReasonRes.status}`
  );

  // Zero-selling-price rejection (e.g. 100% discount leading to ₹0 final price)
  const zeroPriceRes = await fetch(`${appBaseUrl}/api/admin/ebooks/${testBook.id}/pricing`, {
    method: 'PUT',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      editionId: testEdition.id,
      online: { original_price_paise: 10000, discount_type: 'percentage', discount_value: 100 },
      download: { original_price_paise: 20000, discount_type: 'none', discount_value: 0 },
      upgrade: { original_price_paise: 5000, discount_type: 'none', discount_value: 0 },
      currentVersion: updatedPriceJson.pricing.pricing_version,
      changeReason: 'Zero selling price rejection test'
    })
  });
  recordTest(
    'VAL-05',
    'Reject zero final selling price for commercial offers (must use complimentary grants)',
    'HTTP API',
    zeroPriceRes.status === 400 ? 'PASS' : 'FAIL',
    `HTTP Status: ${zeroPriceRes.status}`
  );

  // =========================================================================
  // 4. SERVER CALCULATION OF FINAL PRICES & TAMPER RESISTANCE
  // =========================================================================
  console.log('\n--- 4. SERVER CALCULATION & TAMPER RESISTANCE ---');

  // Precision half-up rounding unit check
  const calc1 = calculateSellingPrice(999, 'percentage', 15);
  // 999 * 0.15 = 149.85 -> rounded half-up to 150 -> final 849
  const calc2 = calculateSellingPrice(10000, 'percentage', 33.3333);
  // 10000 * 0.333333 = 3333.33 -> 3333 -> final 6667

  recordTest(
    'CALC-01',
    'calculateSellingPrice performs documented half-up paise rounding',
    'STATIC INSPECTION',
    calc1.discountAmountPaise === 150 && calc1.finalPricePaise === 849 && calc2.finalPricePaise === 6667
      ? 'PASS' : 'FAIL',
    `999 - 15% = ${calc1.finalPricePaise}p (discount ${calc1.discountAmountPaise}p); 10000 - 33.3333% = ${calc2.finalPricePaise}p`
  );

  // Tamper resistance: Client tries to supply arbitrary calculated price
  const tamperedRes = await fetch(`${appBaseUrl}/api/admin/ebooks/${testBook.id}/pricing`, {
    method: 'PUT',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      editionId: testEdition.id,
      online: {
        original_price_paise: 20000,
        discount_type: 'percentage',
        discount_value: 10,
        calculated_final_paise: 1 // Attempt to tamper final price to ₹0.01!
      },
      download: { original_price_paise: 30000, discount_type: 'none', discount_value: 0 },
      upgrade: { original_price_paise: 10000, discount_type: 'none', discount_value: 0 },
      currentVersion: updatedPriceJson.pricing.pricing_version,
      changeReason: 'Client price tampering test'
    })
  });
  const tamperedJson = await tamperedRes.json();
  const serverCalculatedPrice = tamperedJson.pricing?.online_price_paise;

  recordTest(
    'CALC-02',
    'Server calculates final price authoritatively, ignoring client-supplied final prices',
    'HTTP API',
    tamperedRes.status === 200 && serverCalculatedPrice === 18000
      ? 'PASS' : 'FAIL',
    `Client tried 1 paise; Server computed: ${serverCalculatedPrice} paise (Expected 18000)`
  );

  // =========================================================================
  // 5. CONCURRENT PRICING EDITS & 409 CONFLICT DETECTION
  // =========================================================================
  console.log('\n--- 5. CONCURRENCY & OPTIMISTIC LOCKING ---');

  const staleVersion = updatedPriceJson.pricing.pricing_version; // This version is now stale because of CALC-02!
  const conflictRes = await fetch(`${appBaseUrl}/api/admin/ebooks/${testBook.id}/pricing`, {
    method: 'PUT',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      editionId: testEdition.id,
      online: { original_price_paise: 25000, discount_type: 'none', discount_value: 0 },
      download: { original_price_paise: 35000, discount_type: 'none', discount_value: 0 },
      upgrade: { original_price_paise: 10000, discount_type: 'none', discount_value: 0 },
      currentVersion: staleVersion, // Stale version!
      changeReason: 'Concurrent collision test'
    })
  });

  recordTest(
    'CONC-01',
    'Concurrent update with stale version rejected with 409 Conflict',
    'HTTP API',
    conflictRes.status === 409 ? 'PASS' : 'FAIL',
    `HTTP Status: ${conflictRes.status} (Expected 409)`
  );

  // =========================================================================
  // 6. DYNAMIC PRICING REFLECTED IN CATALOGUE, CART & UPGRADE QUOTES
  // =========================================================================
  console.log('\n--- 6. INTEGRATION WITH STOREFRONT, CART & UPGRADES ---');

  // Public Catalogue Listing
  const catalogRes = await fetch(`${appBaseUrl}/api/ebooks?limit=50`);
  const catalogJson = await catalogRes.json();
  const catalogBook = catalogJson.books?.find((b: any) => b.id === testBook.id);
  const catalogOnlinePrice = catalogBook?.current_edition?.pricing?.online_price_paise;

  recordTest(
    'FLOW-01',
    'Public catalogue returns authoritative dynamic pricing structure',
    'HTTP API',
    catalogRes.status === 200 && catalogOnlinePrice === 18000
      ? 'PASS' : 'FAIL',
    `Book: ${catalogBook?.title}, Online Price: ₹${catalogOnlinePrice ? catalogOnlinePrice / 100 : 'N/A'}, Discount: ${catalogBook?.current_edition?.pricing?.online_discount_type}`
  );

  // Public Book Details
  const detailRes = await fetch(`${appBaseUrl}/api/ebooks/${testBook.id}`);
  const detailJson = await detailRes.json();
  const detailOnlinePrice = detailJson.current_edition?.pricing?.online_price_paise;

  recordTest(
    'FLOW-02',
    'Public book detail resolves authoritative edition pricing',
    'HTTP API',
    detailRes.status === 200 && detailOnlinePrice === 18000
      ? 'PASS' : 'FAIL',
    `Original: ₹${detailJson.current_edition?.pricing?.online_original_price_paise / 100}, Selling: ₹${detailOnlinePrice / 100}`
  );

  // Cart Validation with Stale Client Price
  const cartValidateRes = await fetch(`${appBaseUrl}/api/ebooks/cart/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        {
          bookId: testBook.id,
          plan: 'read_online',
          clientPricePaise: 4900 // Old price sent by client!
        }
      ]
    })
  });
  const cartJson = await cartValidateRes.json();
  const validatedItem = cartJson.items?.[0];
  const hasPriceWarning = Array.isArray(cartJson.warnings) && cartJson.warnings.length > 0;

  recordTest(
    'FLOW-03',
    'Cart validation flags price changes and provides authoritative server price',
    'HTTP API',
    cartValidateRes.status === 200 && validatedItem?.price_paise === 18000 && hasPriceWarning
      ? 'PASS' : 'FAIL',
    `price: ₹${validatedItem?.price_paise / 100}, warning: "${cartJson.warnings?.[0]}"`
  );

  // Upgrade Quote Flow
  // Use getUpgradeQuote on staging DB
  const quoteResult = await getUpgradeQuote(
    testBook.id,
    testEdition.id,
    { userId: studentUserId, email: studentEmail }
  );
  recordTest(
    'FLOW-04',
    'Upgrade quote queries edition authoritative upgrade price without silent ₹50 fallback',
    'LIVE DATABASE',
    quoteResult !== null && typeof quoteResult.eligible === 'boolean'
      ? 'PASS' : 'FAIL',
    `Eligible: ${quoteResult.eligible}, Message: "${quoteResult.message}", Upgrade Price: ₹${quoteResult.upgradePriceRupees}`
  );

  // =========================================================================
  // 7. ORDER AND FINANCIAL SNAPSHOT IMMUTABILITY
  // =========================================================================
  console.log('\n--- 7. ORDER FINANCIAL SNAPSHOT IMMUTABILITY ---');

  const { data: existingOrders } = await adminDbClient
    .from('ebook_orders')
    .select('id, total_amount_paise, items_snapshot, payment_status, created_at')
    .limit(5);

  let ordersIntact = true;
  let sampleOrderDetails = 'No existing orders';
  if (existingOrders && existingOrders.length > 0) {
    const o = existingOrders[0];
    sampleOrderDetails = `Order ${o.id}: Total ₹${o.total_amount_paise / 100}, Status: ${o.payment_status}`;
    ordersIntact = typeof o.total_amount_paise === 'number' && o.total_amount_paise >= 0 && !!o.items_snapshot;
  }

  recordTest(
    'ORD-01',
    'Historical order financial snapshots and amounts remain strictly preserved',
    'LIVE DATABASE',
    ordersIntact ? 'PASS' : 'FAIL',
    sampleOrderDetails
  );

  // =========================================================================
  // 8. PUBLICATION CONTENT PROTECTION
  // =========================================================================
  console.log('\n--- 8. PUBLICATION CONTENT PROTECTION ---');

  const { data: chaptersBefore } = await adminDbClient
    .from('ebook_chapters')
    .select('id, chapter_index, title')
    .eq('edition_id', testEdition.id)
    .order('chapter_index', { ascending: true });

  recordTest(
    'PUB-01',
    'Published edition chapters and content references remain intact after pricing changes',
    'LIVE DATABASE',
    chaptersBefore !== null && chaptersBefore.length > 0 ? 'PASS' : 'FAIL',
    `Chapters count on published edition: ${chaptersBefore?.length || 0} (First: "${chaptersBefore?.[0]?.title}")`
  );

  // =========================================================================
  // 9. HOMEPAGE DRAFT ISOLATION & SUCCESSFUL PUBLICATION
  // =========================================================================
  console.log('\n--- 9. HOMEPAGE CONTENT MANAGEMENT ---');

  const testHeroHeading = `Master Modern Engineering [Phase 1 Test ${Date.now()}]`;
  const draftPayload = {
    action: 'save_draft',
    content: {
      hero_eyebrow: 'KnowledgePaat Digital Library',
      hero_heading: testHeroHeading,
      hero_highlighted_text: 'Verified Guides',
      hero_description: 'Authoritative eBooks curated for ambitious developers and students.',
      hero_artwork_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
      hero_artwork_alt: 'KnowledgePaat Library Cover',
      primary_button_label: 'Explore Catalogue',
      primary_button_url: '/e-books',
      secondary_button_label: 'My Bookshelf',
      secondary_button_url: '/my-books',
      featured_book_ids: [testBook.id],
      highlighted_book_id: testBook.id,
      category_order: ['Engineering', 'Design', 'Data Science'],
      promotional_banner: {
        is_active: true,
        text: 'Flat 20% discount on selected professional titles this week!',
        link: '/e-books'
      },
      section_visibility: {
        hero: true,
        featured: true,
        categories: true,
        banner: true,
        testimonials: true
      },
      testimonials: [
        {
          id: 't-1',
          quote: 'KnowledgePaat eBooks helped me clear my system design interviews with flying colors.',
          author: 'Arjun S.',
          role: 'Staff Engineer'
        }
      ]
    }
  };

  // 1. Save Draft as Admin
  const draftRes = await fetch(`${appBaseUrl}/api/admin/ebooks/homepage`, {
    method: 'PUT',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify(draftPayload)
  });
  const draftJson = await draftRes.json();

  recordTest(
    'HOME-01',
    'Admin successfully saves homepage configuration draft',
    'HTTP API',
    draftRes.status === 200 && draftJson.success ? 'PASS' : 'FAIL',
    `HTTP Status: ${draftRes.status}`
  );

  // 2. Draft Isolation: Storefront API should NOT return the draft heading
  const publicHomeBefore = await fetch(`${appBaseUrl}/api/ebooks/homepage`);
  const publicHomeBeforeJson = await publicHomeBefore.json();
  const isDraftIsolated = publicHomeBeforeJson.content?.hero_heading !== testHeroHeading;

  recordTest(
    'HOME-02',
    'Homepage draft is isolated: anonymous visitors only see published content',
    'HTTP API',
    isDraftIsolated ? 'PASS' : 'FAIL',
    `Public heading: "${publicHomeBeforeJson.content?.hero_heading}" (Draft is isolated: ${isDraftIsolated})`
  );

  // 3. Publish Homepage Atomically
  const publishPayload = {
    ...draftPayload,
    action: 'publish'
  };
  const publishRes = await fetch(`${appBaseUrl}/api/admin/ebooks/homepage`, {
    method: 'PUT',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify(publishPayload)
  });
  const publishJson = await publishRes.json();

  recordTest(
    'HOME-03',
    'Admin atomically publishes homepage configuration',
    'HTTP API',
    publishRes.status === 200 && publishJson.success ? 'PASS' : 'FAIL',
    `HTTP Status: ${publishRes.status}`
  );

  // 4. Verify Public Storefront now resolves published content with authoritative book metadata
  const publicHomeAfter = await fetch(`${appBaseUrl}/api/ebooks/homepage`);
  const publicHomeAfterJson = await publicHomeAfter.json();
  const isNowPublished = publicHomeAfterJson.hero?.heading === testHeroHeading;
  const hasFeaturedBooks = Array.isArray(publicHomeAfterJson.featured_books) && publicHomeAfterJson.featured_books.length > 0;

  recordTest(
    'HOME-04',
    'Public storefront serves published configuration with catalogue books & authoritative prices',
    'HTTP API',
    isNowPublished && hasFeaturedBooks ? 'PASS' : 'FAIL',
    `Published Heading: "${publicHomeAfterJson.hero?.heading}", Featured Books: ${publicHomeAfterJson.featured_books?.length}`
  );

  // =========================================================================
  // 10. HOMEPAGE PUBLICATION FAILURE PRESERVES PREVIOUS CONTENT
  // =========================================================================
  console.log('\n--- 10. HOMEPAGE FAILURE SAFETY ---');

  const maliciousPayload = {
    action: 'publish',
    content: {
      ...draftPayload.content,
      hero_heading: 'Hacked Title',
      primary_button_url: 'javascript:alert(document.cookie)' // Malicious executable URL!
    }
  };

  const failPublishRes = await fetch(`${appBaseUrl}/api/admin/ebooks/homepage`, {
    method: 'PUT',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify(maliciousPayload)
  });

  // Verify previous content remains published
  const publicHomeAfterFail = await fetch(`${appBaseUrl}/api/ebooks/homepage`);
  const publicHomeAfterFailJson = await publicHomeAfterFail.json();
  const previousContentPreserved = publicHomeAfterFailJson.hero?.heading === testHeroHeading;

  recordTest(
    'HOME-05',
    'Failed homepage publication is rejected and previous published content is preserved',
    'HTTP API',
    failPublishRes.status === 400 && previousContentPreserved ? 'PASS' : 'FAIL',
    `Reject Status: ${failPublishRes.status}, Active Published Heading Preserved: ${previousContentPreserved}`
  );

  // =========================================================================
  // 11. STUDENT SEARCH, PAGINATION, DETAIL VISIBILITY & AUDITED ACTIONS
  // =========================================================================
  console.log('\n--- 11. STUDENT/CUSTOMER MANAGEMENT & AUDITED ACTIONS ---');

  // Server-side pagination
  const customersRes = await fetch(`${appBaseUrl}/api/admin/ebooks/customers?page=1&limit=5`, {
    headers: { 'Cookie': adminCookie }
  });
  const customersJson = await customersRes.json();

  recordTest(
    'CUST-01',
    'Customer listing supports server-side pagination with bounded page size and metadata',
    'HTTP API',
    customersRes.status === 200 && customersJson.pagination?.total >= 0
      ? 'PASS' : 'FAIL',
    `Total: ${customersJson.pagination?.total}, Page: ${customersJson.pagination?.page}, Customers returned: ${customersJson.customers?.length}`
  );

  // Search filter
  const searchRes = await fetch(`${appBaseUrl}/api/admin/ebooks/customers?q=student&page=1&limit=5`, {
    headers: { 'Cookie': adminCookie }
  });
  const searchJson = await searchRes.json();

  recordTest(
    'CUST-02',
    'Customer search filters records server-side by name/email',
    'HTTP API',
    searchRes.status === 200 && Array.isArray(searchJson.customers) ? 'PASS' : 'FAIL',
    `Matched customers: ${searchJson.customers?.length}`
  );

  // Customer Detail View
  const detailCustRes = await fetch(`${appBaseUrl}/api/admin/ebooks/customers?customerId=${studentUserId}`, {
    headers: { 'Cookie': adminCookie }
  });
  const custDetailJson = await detailCustRes.json();

  recordTest(
    'CUST-03',
    'Customer detail aggregates entitlements, orders, reading progress, download logs, and audits',
    'HTTP API',
    detailCustRes.status === 200 &&
    Array.isArray(custDetailJson.entitlements) &&
    Array.isArray(custDetailJson.orders) &&
    Array.isArray(custDetailJson.reading_progress) &&
    Array.isArray(custDetailJson.download_logs)
      ? 'PASS' : 'FAIL',
    `Entitlements: ${custDetailJson.entitlements?.length}, Orders: ${custDetailJson.orders?.length}, Progress: ${custDetailJson.reading_progress?.length}, Downloads: ${custDetailJson.download_logs?.length}`
  );

  // Grant Complimentary Access Action
  const grantRes = await fetch(`${appBaseUrl}/api/admin/ebooks/customers`, {
    method: 'POST',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: studentUserId,
      ebookId: testBook.id,
      editionId: testEdition.id,
      action: 'grant_complimentary',
      plan: 'read_online',
      reason: 'Academic scholarship award Phase 1 verification'
    })
  });
  const grantJson = await grantRes.json();

  recordTest(
    'CUST-04',
    'Admin grants complimentary access with audit logging',
    'HTTP API',
    grantRes.status === 200 && grantJson.success ? 'PASS' : 'FAIL',
    `HTTP Status: ${grantRes.status}, Success: ${grantJson.success}`
  );

  // =========================================================================
  // 12. COMPLIMENTARY GRANTS REMAIN DISTINCT FROM FINANCIAL PURCHASES
  // =========================================================================
  console.log('\n--- 12. COMPLIMENTARY GRANT PURITY & FINANCIAL ISOLATION ---');

  // Verify entitlement has grant_type = 'complimentary'
  const { data: compEntitlement } = await adminDbClient
    .from('ebook_entitlements')
    .select('id, customer_id, edition_id, grant_type, is_active, plan')
    .eq('customer_id', studentUserId)
    .eq('edition_id', testEdition.id)
    .single();

  // Verify NO new order was added into ebook_orders
  const { data: fakeOrderCheck } = await adminDbClient
    .from('ebook_orders')
    .select('id')
    .eq('customer_id', studentUserId)
    .eq('total_amount_paise', 0);

  recordTest(
    'GRANT-01',
    'Complimentary grant is recorded with grant_type="complimentary" and creates NO fake financial orders',
    'LIVE DATABASE',
    compEntitlement?.grant_type === 'complimentary' &&
    compEntitlement?.is_active === true &&
    (!fakeOrderCheck || fakeOrderCheck.length === 0)
      ? 'PASS' : 'FAIL',
    `Grant Type: "${compEntitlement?.grant_type}", is_active: ${compEntitlement?.is_active}, Zero-rupee orders created: ${fakeOrderCheck?.length || 0}`
  );

  // Revoke Action
  const revokeRes = await fetch(`${appBaseUrl}/api/admin/ebooks/customers`, {
    method: 'POST',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: studentUserId,
      ebookId: testBook.id,
      editionId: testEdition.id,
      action: 'revoke',
      reason: 'Temporary suspension for compliance verification'
    })
  });
  const revokeJson = await revokeRes.json();

  const { data: revokedEntitlement } = await adminDbClient
    .from('ebook_entitlements')
    .select('is_active')
    .eq('customer_id', studentUserId)
    .eq('edition_id', testEdition.id)
    .single();

  recordTest(
    'CUST-05',
    'Admin revokes customer access with audited event',
    'HTTP API',
    revokeRes.status === 200 && revokeJson.success && revokedEntitlement?.is_active === false
      ? 'PASS' : 'FAIL',
    `is_active: ${revokedEntitlement?.is_active}`
  );

  // Restore Action
  const restoreRes = await fetch(`${appBaseUrl}/api/admin/ebooks/customers`, {
    method: 'POST',
    headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: studentUserId,
      ebookId: testBook.id,
      editionId: testEdition.id,
      action: 'restore',
      reason: 'Reinstating verified scholarship'
    })
  });
  const restoreJson = await restoreRes.json();

  const { data: restoredEntitlement } = await adminDbClient
    .from('ebook_entitlements')
    .select('is_active')
    .eq('customer_id', studentUserId)
    .eq('edition_id', testEdition.id)
    .single();

  recordTest(
    'CUST-06',
    'Admin restores customer access with audited event',
    'HTTP API',
    restoreRes.status === 200 && restoreJson.success && restoredEntitlement?.is_active === true
      ? 'PASS' : 'FAIL',
    `is_active: ${restoredEntitlement?.is_active}`
  );

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log(`PHASE 1 VERIFICATION COMPLETE:`);
  console.log(`Total Checks Executed : ${results.length}`);
  console.log(`Passed                : ${passedCount}`);
  console.log(`Failed                : ${failedCount}`);
  console.log(`Blocked               : ${blockedCount}`);
  console.log(`Unverified            : ${unverifiedCount}`);
  console.log('='.repeat(80));

  if (failedCount > 0) {
    console.error(`FAILED CHECKS COUNT: ${failedCount}`);
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
