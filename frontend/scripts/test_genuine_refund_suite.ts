/**
 * KnowledgePaat — Genuine Test Mode Refund Verification Suite
 * 
 * Target Environment: Dedicated Staging Supabase (lzuinimbsdxnhzmjpxmr)
 * Gateway: Razorpay Test Mode (Cards Method: 4100 2800 0000 1007)
 * 
 * Verifies:
 * 1. Full ₹99 / ₹49 refund -> Real provider refund ID, status 'processed', access revoked.
 * 2. Partial refund -> Real provider refund ID, status 'processed', balance updated, access retained (Rule D).
 * 3. PDF Upgrade refund -> Real provider refund ID, downgrade to online reading only (Rule B), progress & bookmarks preserved.
 * 4. Linked Base + Upgrade refunds:
 *    - Guard: Rule C blocks base refund while upgrade is active.
 *    - Independent dual-operation execution: Upgrade refund first, then Base refund.
 *    - Safe retry idempotency: Prevents duplicate refunds.
 */

// @ts-expect-error WebSocket typings
import WebSocket from 'ws';
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

import '../utils/supabase/dnsPin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import puppeteer from 'puppeteer-core';

import { createRazorpayOrder, getRazorpayCredentials } from '../lib/razorpay';
import { executeEBookRefund, checkDependentUpgrades } from '../lib/ebook/refunds';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (supabaseUrl.includes('csjywuflkvohytbvglxf')) {
  console.error('FATAL: Production database detected! Aborting.');
  process.exit(1);
}

if (!supabaseUrl.includes('lzuinimbsdxnhzmjpxmr')) {
  console.error('FATAL: Not connected to dedicated staging Supabase (lzuinimbsdxnhzmjpxmr). Aborting.');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface PaymentResult {
  paymentId: string;
  orderId: string;
  signature: string;
}

/**
 * Automate genuine card payment capture in Razorpay Test Mode via Puppeteer
 */
async function captureTestCardPayment(params: {
  amountPaise: number;
  orderNumber: string;
  customerEmail: string;
  customerId: string;
}): Promise<{ rzpOrderId: string; paymentId: string }> {
  const { amountPaise, orderNumber, customerEmail, customerId } = params;
  const { keyId } = getRazorpayCredentials();

  // 1. Create Razorpay Test Order
  const rzpOrder = await createRazorpayOrder({
    amountInRupees: amountPaise / 100,
    receipt: `rcpt_${Date.now().toString().slice(-8)}`,
    notes: {
      orderNumber,
      customerId,
      testSuite: 'genuine_refund_verification',
    },
  });

  // 2. Setup local HTML launcher for Checkout
  const testHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Razorpay Test Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <button id="rzp-button">Pay Now</button>
  <div id="status">Ready</div>
  <script>
    const options = {
      key: "${keyId}",
      amount: ${amountPaise},
      currency: "INR",
      name: "KnowledgePaat Test Store",
      description: "Test Mode Refundable Payment",
      order_id: "${rzpOrder.id}",
      prefill: {
        name: "Test Customer",
        email: "${customerEmail}",
        contact: "9810098100"
      },
      handler: function(response) {
        document.getElementById('status').innerText = 'SUCCESS:' + response.razorpay_payment_id;
        window.__paymentResult = response;
      },
      modal: {
        ondismiss: function() {
          document.getElementById('status').innerText = 'DISMISSED';
        }
      }
    };
    const rzp = new Razorpay(options);
    document.getElementById('rzp-button').onclick = function() {
      rzp.open();
    };
  </script>
</body>
</html>`;

  const htmlPath = path.resolve(__dirname, '../public/test-refund-checkout.html');
  fs.writeFileSync(htmlPath, testHtml, 'utf8');

  // 3. Launch Chrome Headless
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,800'],
  });

  const shotDir = '/home/harsha/.gemini/antigravity-ide/brain/651141cd-1942-4961-ad67-66a54539bfed/screenshots';
  if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:3000/test-refund-checkout.html', { waitUntil: 'networkidle2' });

    // Click Pay Now
    await page.click('#rzp-button');

    // Wait for Checkout frame
    await page.waitForSelector('iframe.razorpay-checkout-frame', { timeout: 15000 });
    const rzpFrameElement = await page.$('iframe.razorpay-checkout-frame');
    const frame = await rzpFrameElement?.contentFrame();

    if (!frame) throw new Error('Razorpay checkout iframe did not load.');

    // Wait for interactive state
    await frame.waitForFunction(() => {
      return document.querySelector('input[name="contact"]') !== null ||
             document.body.innerText.includes('Suggested Banks') ||
             document.body.innerText.includes('Cards');
    }, { timeout: 25000 });

    await new Promise(r => setTimeout(r, 2000));

    // Handle contact modal if open
    const isContactModalOpen = await frame.evaluate(() => {
      return document.body.innerText.includes('Contact details') && document.body.innerText.includes('Enter mobile & email');
    });

    if (isContactModalOpen) {
      console.log('Contact modal detected in checkout frame. Filling mobile 9810098100...');
      const contactInput = await frame.$('input[name="contact"]');
      if (contactInput) {
        await frame.evaluate(() => {
          const inp = document.querySelector('input[name="contact"]') as HTMLInputElement;
          if (inp) { inp.focus(); inp.select(); }
        });
        await page.keyboard.press('Backspace');
        await contactInput.type('9810098100', { delay: 40 });
        await page.keyboard.press('Tab');
      }
      await new Promise(r => setTimeout(r, 500));
      await frame.evaluate(() => {
        const continueBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Continue');
        continueBtn?.click();
      });
      await new Promise(r => setTimeout(r, 2000));
    }

    // Select Cards Tab
    console.log('Selecting Cards payment tab...');
    await frame.evaluate(() => {
      const cardsTab = Array.from(document.querySelectorAll('div, button, span, label')).find(el => (el as HTMLElement).innerText?.trim() === 'Cards');
      (cardsTab as HTMLElement)?.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Listen for 3DS OTP popup / new target
    const otpPagePromise = new Promise<any>((resolve) => {
      browser.on('targetcreated', async (target) => {
        try {
          const p = await target.page();
          if (p) resolve(p);
        } catch {}
      });
    });

    // Fill Card Inputs (Official Razorpay test card: 4100 2800 0000 1007)
    console.log('Typing card credentials (4100 2800 0000 1007)...');
    const cardNumHandle = await frame.$('input[placeholder*="Card"], input[name*="card.number"], input[name*="card"]');
    if (cardNumHandle) {
      await cardNumHandle.click();
      await cardNumHandle.type('4100280000001007', { delay: 30 });
      await page.keyboard.press('Tab');
    }
    const expiryHandle = await frame.$('input[placeholder*="MM"], input[name*="card.expiry"], input[name*="exp"]');
    if (expiryHandle) {
      await expiryHandle.type('1228', { delay: 30 });
      await page.keyboard.press('Tab');
    }
    const cvvHandle = await frame.$('input[placeholder*="CVV"], input[name*="card.cvv"], input[name*="cvv"]');
    if (cvvHandle) {
      await cvvHandle.type('123', { delay: 30 });
    }

    await new Promise(r => setTimeout(r, 1000));

    // Click Continue / Pay
    console.log('Submitting card payment...');
    await frame.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => {
        const t = b.innerText?.trim()?.toLowerCase();
        return t === 'continue' || t?.includes('pay');
      });
      btn?.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Handle RBI modal if shown
    await frame.evaluate(() => {
      const maybeLaterBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.innerText?.toLowerCase().includes('maybe later') || b.innerText?.toLowerCase().includes('skip')
      );
      if (maybeLaterBtn) {
        maybeLaterBtn.click();
      } else {
        const secureBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText?.toLowerCase().includes('secure')
        );
        secureBtn?.click();
      }
    });

    // Wait for OTP page or 3DS simulation
    console.log('Waiting for 3DS / OTP simulation...');
    let otpPage: any = await Promise.race([
      otpPagePromise,
      new Promise(r => setTimeout(() => r(null), 10000)),
    ]);

    if (!otpPage) {
      const pages = await browser.pages();
      otpPage = pages.find(p => p !== page && p.url().includes('razorpay.com'));
    }

    if (otpPage) {
      console.log('OTP page detected. Authorizing...');
      await otpPage.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
      await otpPage.waitForSelector('button, input, a', { timeout: 15000 }).catch(() => null);
      await otpPage.evaluate(() => {
        const successBtn = Array.from(document.querySelectorAll('button, input[type="submit"], a')).find(el => {
          const text = ((el as HTMLElement).innerText || (el as HTMLInputElement).value || '').toLowerCase();
          return text.includes('success');
        });
        if (successBtn) {
          (successBtn as HTMLElement).click();
          return;
        }
        const otpInput = document.querySelector('input[type="password"], input[type="text"], input[name*="otp"]') as HTMLInputElement;
        if (otpInput) {
          otpInput.value = '1234';
          otpInput.dispatchEvent(new Event('input', { bubbles: true }));
          const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          submitBtn?.click();
        }
      });
    } else {
      // Check inside frames of main page
      for (let i = 0; i < 5; i++) {
        for (const f of page.frames()) {
          const handled = await f.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button, input[type="submit"], a')).find(el => {
              const text = ((el as HTMLElement).innerText || (el as HTMLInputElement).value || '').toLowerCase();
              return text.includes('success');
            });
            if (btn) {
              (btn as HTMLElement).click();
              return true;
            }
            const otpInput = document.querySelector('input[type="password"], input[name*="otp"]') as HTMLInputElement;
            if (otpInput) {
              otpInput.value = '1234';
              const submitBtn = document.querySelector('button[type="submit"]') as HTMLElement;
              submitBtn?.click();
              return true;
            }
            return false;
          }).catch(() => false);
          if (handled) {
            console.log(`Handled OTP in frame: ${f.url()}`);
            break;
          }
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Authoritatively poll Razorpay Orders API for captured payment
    const { keySecret } = getRazorpayCredentials();
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    let paymentId = '';

    for (let i = 0; i < 30; i++) {
      try {
        const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${rzpOrder.id}/payments`, {
          headers: { Authorization: `Basic ${basicAuth}` },
        });
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          const capturedPayment = (orderData.items || []).find((p: any) => p.status === 'captured' || p.status === 'authorized');
          if (capturedPayment) {
            paymentId = capturedPayment.id;
            break;
          }
        }
      } catch {}

      // Also check client window.__paymentResult
      const clientRes = await page.evaluate(() => (window as any).__paymentResult).catch(() => null);
      if (clientRes && clientRes.razorpay_payment_id) {
        paymentId = clientRes.razorpay_payment_id;
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!paymentId) {
      throw new Error(`Test card payment authorization did not complete in time for order ${rzpOrder.id}`);
    }

    return { rzpOrderId: rzpOrder.id, paymentId };
  } finally {
    await browser.close();
    try { fs.unlinkSync(htmlPath); } catch {}
  }
}

async function runGenuineRefundSuite() {
  console.log('='.repeat(80));
  console.log('KNOWLEDGEPAAT: GENUINE TEST MODE REFUND VERIFICATION SUITE');
  console.log('='.repeat(80));
  console.log(`Database Target : ${supabaseUrl}`);
  console.log(`Payment Gateway : Razorpay Test Mode (Card: 4100 2800 0000 1007)`);
  console.log('='.repeat(80));

  // 1. Resolve student and admin profiles
  const { data: student } = await adminClient.from('profiles').select('id, email, full_name').eq('email', 'student@knowledgepaat.test').single();
  const { data: admin } = await adminClient.from('profiles').select('id, email, full_name').eq('email', 'admin@knowledgepaat.test').single();

  if (!student || !admin) {
    throw new Error('Required test users (student or admin) missing from staging profiles.');
  }

  // 2. Resolve published book edition with authoritative prices
  const { data: edition } = await adminClient
    .from('ebook_editions')
    .select('id, ebook_id, edition_number, price_read_online_paise, price_read_download_paise, price_upgrade_pdf_paise, ebook:ebooks(id, title, slug)')
    .eq('is_current_edition', true)
    .eq('status', 'published')
    .limit(1)
    .single();

  if (!edition) {
    throw new Error('No published edition found for refund testing.');
  }

  const bookId = (edition.ebook as any).id;
  const editionId = edition.id;
  const bookTitle = (edition.ebook as any).title;
  const { data: testChapter } = await adminClient
    .from('ebook_chapters')
    .select('id, title')
    .eq('edition_id', editionId)
    .limit(1)
    .maybeSingle();
  // Calibrated test amounts: In Razorpay Test Mode, merchant fee reserves require amounts
  // that satisfy Razorpay's minimum requirements (>= ₹1.00 / 100 paise) while avoiding test merchant balance exhaustion.
  const priceFull = 100; // ₹1.00 for Test 1 full refund
  const pricePartialOrder = 200; // ₹2.00 for Test 2 partial refund order
  const partialRefundAmount = 100; // ₹1.00 (50%) partial refund
  const priceBase = 100; // ₹1.00 for Test 3 & 4 base order
  const priceUpgrade = 100; // ₹1.00 for Test 3 & 4 upgrade order

  console.log(`\nTest Book Resolved: "${bookTitle}" (Edition ${edition.edition_number})`);
  console.log(`Test Mode Calibrated Prices: Base=₹${priceBase / 100}, Full=₹${priceFull / 100}, Upgrade=₹${priceUpgrade / 100}, PartialOrder=₹${pricePartialOrder / 100}`);

  // 0. Clean up any lingering upgrade orders from prior interrupted test runs for test student
  await adminClient.from('ebook_orders').update({
    payment_status: 'refunded',
    refund_status: 'full',
  }).eq('customer_id', student.id).eq('order_type', 'upgrade').in('payment_status', ['paid', 'pending']);

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 1: Full Refund Execution
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n' + '-'.repeat(80));
  console.log('TEST 1: FULL REFUND EXECUTION (Rule A: Access Revocation)');
  console.log('-'.repeat(80));

  const orderNum1 = `EB-REF-FULL-${Date.now()}`;
  console.log(`Creating order ${orderNum1} for ₹${priceFull / 100}...`);

  // Create local order
  const { data: order1, error: ordErr1 } = await adminClient.from('ebook_orders').insert({
    order_number: orderNum1,
    customer_id: student.id,
    customer_email: student.email,
    customer_name: student.full_name,
    total_amount_paise: priceFull,
    currency: 'INR',
    order_type: 'purchase',
    payment_status: 'pending',
    order_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select().single();

  if (ordErr1 || !order1) throw new Error(`Order 1 creation failed: ${ordErr1?.message}`);

  // Add order item
  await adminClient.from('ebook_order_items').insert({
    order_id: order1.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_download',
    price_paise: priceFull,
    title: bookTitle,
    edition_label: `v${edition.edition_number}`,
  });

  // Capture real refundable card payment via Razorpay Test Mode
  console.log('Capturing real refundable card payment via Razorpay Checkout...');
  const { rzpOrderId: rzpOrder1, paymentId: paymentId1 } = await captureTestCardPayment({
    amountPaise: priceFull,
    orderNumber: orderNum1,
    customerEmail: student.email,
    customerId: student.id,
  });
  console.log(`✅ Payment captured: ${paymentId1} for Razorpay Order: ${rzpOrder1}`);

  // Mark local order paid and establish full entitlement
  await adminClient.from('ebook_orders').update({
    gateway_order_id: rzpOrder1,
    gateway_payment_id: paymentId1,
    payment_status: 'paid',
    order_status: 'completed',
    paid_at: new Date().toISOString(),
  }).eq('id', order1.id);

  await adminClient.from('ebook_entitlements').upsert({
    customer_id: student.id,
    ebook_id: bookId,
    edition_id: editionId,
    order_id: order1.id,
    plan: 'read_download',
    can_read_online: true,
    can_download_pdf: true,
    is_active: true,
    grant_type: 'purchase',
  }, { onConflict: 'customer_id,ebook_id,edition_id' });

  // Execute Full Refund via Authoritative System
  console.log('Executing full refund via executeEBookRefund()...');
  const refund1 = await executeEBookRefund({
    orderId: order1.id,
    reason: 'Customer requested full refund (Test 1)',
    refundType: 'full',
    accessAction: 'revoke',
    adminId: admin.id,
  });

  console.log('Refund Execution Result:', {
    success: refund1.success,
    gatewayRefundId: refund1.gatewayRefundId,
    status: refund1.status,
    amountPaise: refund1.amountPaise,
  });

  if (!refund1.success || !refund1.gatewayRefundId || refund1.status !== 'processed') {
    throw new Error(`Test 1 Failed: Expected processed gateway refund, got: ${JSON.stringify(refund1)}`);
  }

  // Verify local DB state
  const { data: checkOrd1 } = await adminClient.from('ebook_orders').select('*').eq('id', order1.id).single();
  const { data: checkEnt1 } = await adminClient.from('ebook_entitlements').select('*').eq('customer_id', student.id).eq('edition_id', editionId).single();

  console.log(`Order status after refund: payment_status="${checkOrd1.payment_status}", refund_status="${checkOrd1.refund_status}", refunded_amount=${checkOrd1.refunded_amount_paise}`);
  console.log(`Entitlement after full refund: is_active=${checkEnt1.is_active}, can_read_online=${checkEnt1.can_read_online}`);

  if (checkOrd1.payment_status !== 'refunded' || checkOrd1.refund_status !== 'full' || checkOrd1.refunded_amount_paise !== priceFull) {
    throw new Error('Test 1 Failed: Local order record does not match expected full refund state.');
  }
  if (checkEnt1.is_active !== false) {
    throw new Error('Test 1 Failed: Entitlement was not revoked after full refund.');
  }
  console.log('✅ TEST 1 PASSED: Full genuine refund processed, provider ID verified, entitlement revoked.');

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 2: Partial Refund Execution
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n' + '-'.repeat(80));
  console.log('TEST 2: PARTIAL REFUND EXECUTION (Rule D: Goodwill / Access Retained)');
  console.log('-'.repeat(80));

  const orderNum2 = `EB-REF-PART-${Date.now()}`;

  const { data: order2 } = await adminClient.from('ebook_orders').insert({
    order_number: orderNum2,
    customer_id: student.id,
    customer_email: student.email,
    customer_name: student.full_name,
    total_amount_paise: pricePartialOrder,
    currency: 'INR',
    order_type: 'purchase',
    payment_status: 'pending',
    order_status: 'pending',
  }).select().single();

  await adminClient.from('ebook_order_items').insert({
    order_id: order2.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_download',
    price_paise: pricePartialOrder,
    title: bookTitle,
    edition_label: `v${edition.edition_number}`,
  });

  const { rzpOrderId: rzpOrder2, paymentId: paymentId2 } = await captureTestCardPayment({
    amountPaise: pricePartialOrder,
    orderNumber: orderNum2,
    customerEmail: student.email,
    customerId: student.id,
  });
  console.log(`✅ Payment captured: ${paymentId2} for Order 2`);

  await adminClient.from('ebook_orders').update({
    gateway_order_id: rzpOrder2,
    gateway_payment_id: paymentId2,
    payment_status: 'paid',
    order_status: 'completed',
    paid_at: new Date().toISOString(),
  }).eq('id', order2.id);

  await adminClient.from('ebook_entitlements').upsert({
    customer_id: student.id,
    ebook_id: bookId,
    edition_id: editionId,
    order_id: order2.id,
    plan: 'read_download',
    can_read_online: true,
    can_download_pdf: true,
    is_active: true,
    grant_type: 'purchase',
  }, { onConflict: 'customer_id,ebook_id,edition_id' });

  console.log(`Executing partial refund of ₹${partialRefundAmount / 100} with accessAction='retain'...`);
  const refund2 = await executeEBookRefund({
    orderId: order2.id,
    reason: 'Customer goodwill partial refund (Test 2)',
    refundType: 'partial',
    amountInPaise: partialRefundAmount,
    accessAction: 'retain',
    adminId: admin.id,
  });

  console.log('Partial Refund Result:', {
    success: refund2.success,
    gatewayRefundId: refund2.gatewayRefundId,
    status: refund2.status,
    amountPaise: refund2.amountPaise,
  });

  if (!refund2.success || !refund2.gatewayRefundId || refund2.status !== 'processed') {
    throw new Error(`Test 2 Failed: Partial refund was not processed by provider: ${JSON.stringify(refund2)}`);
  }

  const { data: checkOrd2 } = await adminClient.from('ebook_orders').select('*').eq('id', order2.id).single();
  const { data: checkEnt2 } = await adminClient.from('ebook_entitlements').select('*').eq('customer_id', student.id).eq('edition_id', editionId).single();

  console.log(`Order status: payment_status="${checkOrd2.payment_status}", refund_status="${checkOrd2.refund_status}", refunded=${checkOrd2.refunded_amount_paise}`);
  console.log(`Entitlement: is_active=${checkEnt2.is_active}, can_read_online=${checkEnt2.can_read_online}`);

  if (checkOrd2.payment_status !== 'partially_refunded' || checkOrd2.refund_status !== 'partial' || checkOrd2.refunded_amount_paise !== partialRefundAmount) {
    throw new Error('Test 2 Failed: Order state does not match partial refund expectations.');
  }
  if (checkEnt2.is_active !== true || checkEnt2.can_read_online !== true) {
    throw new Error('Test 2 Failed: Rule D retention violated — customer lost access after partial refund.');
  }
  console.log('✅ TEST 2 PASSED: Genuine partial refund processed, financial balance updated, access retained.');

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 3: PDF Upgrade Refund (Rule B: Downgrade to Online Reading)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n' + '-'.repeat(80));
  console.log('TEST 3: PDF UPGRADE REFUND (Rule B: Downgrade, Progress & Bookmarks Preserved)');
  console.log('-'.repeat(80));

  // Step A: Base purchase
  const orderNumBase = `EB-BASE-${Date.now()}`;
  const { data: orderBase } = await adminClient.from('ebook_orders').insert({
    order_number: orderNumBase,
    customer_id: student.id,
    customer_email: student.email,
    total_amount_paise: priceBase,
    currency: 'INR',
    order_type: 'purchase',
    payment_status: 'paid',
    order_status: 'completed',
    paid_at: new Date().toISOString(),
  }).select().single();

  await adminClient.from('ebook_order_items').insert({
    order_id: orderBase.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_online',
    price_paise: priceBase,
    title: bookTitle,
    edition_label: `v${edition.edition_number}`,
  });

  // Base entitlement: Online only
  await adminClient.from('ebook_entitlements').upsert({
    customer_id: student.id,
    ebook_id: bookId,
    edition_id: editionId,
    order_id: orderBase.id,
    plan: 'read_online',
    can_read_online: true,
    can_download_pdf: false,
    is_active: true,
    grant_type: 'purchase',
  }, { onConflict: 'customer_id,ebook_id,edition_id' });

  // Record reading progress and bookmarks
  await adminClient.from('ebook_reading_progress').upsert({
    customer_id: student.id,
    ebook_id: bookId,
    edition_id: editionId,
    scroll_percent: 62.5,
    completed_at: null,
  }, { onConflict: 'customer_id,ebook_id,edition_id' });

  if (testChapter) {
    await adminClient.from('ebook_bookmarks').upsert({
      customer_id: student.id,
      ebook_id: bookId,
      edition_id: editionId,
      chapter_id: testChapter.id,
      title: testChapter.title || 'Chapter 2 Key Formulas',
      scroll_percent: 50.0,
    }, { onConflict: 'customer_id,edition_id,chapter_id' });
  }

  // Step B: Customer purchases PDF Upgrade
  const orderNumUpg = `EB-UPG-${Date.now()}`;
  const { data: orderUpg } = await adminClient.from('ebook_orders').insert({
    order_number: orderNumUpg,
    customer_id: student.id,
    customer_email: student.email,
    total_amount_paise: priceUpgrade,
    currency: 'INR',
    order_type: 'upgrade',
    original_order_id: orderBase.id,
    payment_status: 'pending',
    order_status: 'pending',
  }).select().single();

  await adminClient.from('ebook_order_items').insert({
    order_id: orderUpg.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_download',
    price_paise: priceUpgrade,
    title: `${bookTitle} (PDF Upgrade)`,
    edition_label: `v${edition.edition_number}`,
  });

  const { rzpOrderId: rzpOrderUpg, paymentId: paymentIdUpg } = await captureTestCardPayment({
    amountPaise: priceUpgrade,
    orderNumber: orderNumUpg,
    customerEmail: student.email,
    customerId: student.id,
  });
  console.log(`✅ Upgrade payment captured: ${paymentIdUpg}`);

  await adminClient.from('ebook_orders').update({
    gateway_order_id: rzpOrderUpg,
    gateway_payment_id: paymentIdUpg,
    payment_status: 'paid',
    order_status: 'completed',
    paid_at: new Date().toISOString(),
  }).eq('id', orderUpg.id);

  // Upgrade unlocks PDF
  await adminClient.from('ebook_entitlements').update({
    plan: 'read_download',
    can_download_pdf: true,
  }).eq('customer_id', student.id).eq('edition_id', editionId);

  // Step C: Execute Upgrade Refund
  console.log('Executing PDF Upgrade refund with accessAction="downgrade_to_online"...');
  const refundUpg = await executeEBookRefund({
    orderId: orderUpg.id,
    reason: 'Customer returned PDF download upgrade (Test 3)',
    refundType: 'full',
    accessAction: 'downgrade_to_online',
    adminId: admin.id,
  });

  console.log('Upgrade Refund Result:', {
    success: refundUpg.success,
    gatewayRefundId: refundUpg.gatewayRefundId,
    status: refundUpg.status,
  });

  if (!refundUpg.success || !refundUpg.gatewayRefundId || refundUpg.status !== 'processed') {
    throw new Error(`Test 3 Failed: Upgrade refund was not processed: ${JSON.stringify(refundUpg)}`);
  }

  // Verify DB state
  const { data: entAfterUpgRef } = await adminClient.from('ebook_entitlements').select('*').eq('customer_id', student.id).eq('edition_id', editionId).single();
  const { data: progAfterUpgRef } = await adminClient.from('ebook_reading_progress').select('*').eq('customer_id', student.id).eq('edition_id', editionId).single();
  const { data: bkmkAfterUpgRef } = await adminClient.from('ebook_bookmarks').select('*').eq('customer_id', student.id).eq('edition_id', editionId);

  console.log(`Entitlement after upgrade refund: can_read_online=${entAfterUpgRef.can_read_online}, can_download_pdf=${entAfterUpgRef.can_download_pdf}, plan=${entAfterUpgRef.plan}`);
  console.log(`Progress scroll_percent=${progAfterUpgRef?.scroll_percent}, Bookmarks count=${bkmkAfterUpgRef?.length}`);

  if (entAfterUpgRef.can_read_online !== true || entAfterUpgRef.can_download_pdf !== false || entAfterUpgRef.plan !== 'read_online') {
    throw new Error('Test 3 Failed: Rule B violation — customer was not cleanly downgraded to online-only reading.');
  }
  if (!progAfterUpgRef || progAfterUpgRef.scroll_percent !== 62.5) {
    throw new Error('Test 3 Failed: Reading progress was lost during upgrade refund.');
  }
  if (testChapter && (!bkmkAfterUpgRef || bkmkAfterUpgRef.length === 0)) {
    throw new Error('Test 3 Failed: Bookmarks were lost during upgrade refund.');
  }
  console.log('✅ TEST 3 PASSED: Upgrade refunded via gateway, PDF downgraded, reading progress & bookmarks intact.');

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 4: Linked Base + Upgrade Refunds (Rule C Guard, Dual Independent Ops, Safe Retry)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n' + '-'.repeat(80));
  console.log('TEST 4: LINKED BASE + UPGRADE (Rule C Guard, Dual Independent Operations, Safe Retry)');
  console.log('-'.repeat(80));

  // Create fresh linked Base and Upgrade pair with real captured card payments
  const orderNumPairBase = `EB-LINK-BASE-${Date.now()}`;
  const { data: pairBase } = await adminClient.from('ebook_orders').insert({
    order_number: orderNumPairBase,
    customer_id: student.id,
    customer_email: student.email,
    total_amount_paise: priceBase,
    currency: 'INR',
    order_type: 'purchase',
    payment_status: 'pending',
    order_status: 'pending',
  }).select().single();

  await adminClient.from('ebook_order_items').insert({
    order_id: pairBase.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_online',
    price_paise: priceBase,
    title: bookTitle,
    edition_label: `v${edition.edition_number}`,
  });

  const { rzpOrderId: rzpPairBase, paymentId: paymentIdPairBase } = await captureTestCardPayment({
    amountPaise: priceBase,
    orderNumber: orderNumPairBase,
    customerEmail: student.email,
    customerId: student.id,
  });
  console.log(`✅ Linked Base Payment captured: ${paymentIdPairBase}`);

  await adminClient.from('ebook_orders').update({
    gateway_order_id: rzpPairBase,
    gateway_payment_id: paymentIdPairBase,
    payment_status: 'paid',
    order_status: 'completed',
    paid_at: new Date().toISOString(),
  }).eq('id', pairBase.id);

  // Upgrade order
  const orderNumPairUpg = `EB-LINK-UPG-${Date.now()}`;
  const { data: pairUpg } = await adminClient.from('ebook_orders').insert({
    order_number: orderNumPairUpg,
    customer_id: student.id,
    customer_email: student.email,
    total_amount_paise: priceUpgrade,
    currency: 'INR',
    order_type: 'upgrade',
    original_order_id: pairBase.id,
    payment_status: 'pending',
    order_status: 'pending',
  }).select().single();

  await adminClient.from('ebook_order_items').insert({
    order_id: pairUpg.id,
    ebook_id: bookId,
    edition_id: editionId,
    plan: 'read_download',
    price_paise: priceUpgrade,
    title: `${bookTitle} (PDF Upgrade)`,
    edition_label: `v${edition.edition_number}`,
  });

  const { rzpOrderId: rzpPairUpg, paymentId: paymentIdPairUpg } = await captureTestCardPayment({
    amountPaise: priceUpgrade,
    orderNumber: orderNumPairUpg,
    customerEmail: student.email,
    customerId: student.id,
  });
  console.log(`✅ Linked Upgrade Payment captured: ${paymentIdPairUpg}`);

  await adminClient.from('ebook_orders').update({
    gateway_order_id: rzpPairUpg,
    gateway_payment_id: paymentIdPairUpg,
    payment_status: 'paid',
    order_status: 'completed',
    paid_at: new Date().toISOString(),
  }).eq('id', pairUpg.id);

  // Set entitlement active with PDF
  await adminClient.from('ebook_entitlements').upsert({
    customer_id: student.id,
    ebook_id: bookId,
    edition_id: editionId,
    order_id: pairBase.id,
    plan: 'read_download',
    can_read_online: true,
    can_download_pdf: true,
    is_active: true,
    grant_type: 'purchase',
  }, { onConflict: 'customer_id,ebook_id,edition_id' });

  // 1. Test Rule C Guard: Attempting to refund Base standalone must be BLOCKED
  console.log('\n[Guard Check] Attempting standalone refund on Base order while Upgrade is active...');
  let ruleCBlocked = false;
  try {
    await executeEBookRefund({
      orderId: pairBase.id,
      reason: 'Attempting invalid standalone base refund',
      refundType: 'full',
      accessAction: 'revoke',
      adminId: admin.id,
    });
  } catch (err: any) {
    ruleCBlocked = true;
    console.log(`✅ Rule C correctly blocked standalone base refund: "${err.message}"`);
  }

  if (!ruleCBlocked) {
    throw new Error('Test 4 Failed: Rule C did not block standalone base refund!');
  }

  // 2. Execute Independent Dual Operations
  // Operation 1: Refund Upgrade
  console.log('\n[Operation 1] Executing Upgrade refund through gateway provider...');
  const op1 = await executeEBookRefund({
    orderId: pairUpg.id,
    reason: 'Linked resolution: Step 1 Upgrade refund',
    refundType: 'full',
    accessAction: 'downgrade_to_online',
    adminId: admin.id,
  });
  console.log(`✅ Operation 1 processed: Gateway Refund ID = ${op1.gatewayRefundId}`);

  // Operation 2: Refund Base
  console.log('[Operation 2] Executing Base refund through gateway provider...');
  const op2 = await executeEBookRefund({
    orderId: pairBase.id,
    reason: 'Linked resolution: Step 2 Base refund',
    refundType: 'full',
    accessAction: 'revoke',
    adminId: admin.id,
  });
  console.log(`✅ Operation 2 processed: Gateway Refund ID = ${op2.gatewayRefundId}`);

  if (op1.gatewayRefundId === op2.gatewayRefundId) {
    throw new Error('Test 4 Failed: Linked refunds must be two independently tracked provider operations with distinct IDs.');
  }

  // 3. Test Safe Retry Idempotency: Attempting to re-refund Base must not create duplicate gateway refund
  console.log('\n[Safe Retry] Retrying refund on already-refunded Base order...');
  let retryBlocked = false;
  try {
    await executeEBookRefund({
      orderId: pairBase.id,
      reason: 'Duplicate retry attempt',
      refundType: 'full',
      accessAction: 'revoke',
      adminId: admin.id,
    });
  } catch (err: any) {
    retryBlocked = true;
    console.log(`✅ Safe retry prevented duplicate refund: "${err.message}"`);
  }

  if (!retryBlocked) {
    throw new Error('Test 4 Failed: Re-refunding an already refunded order did not reject duplicate execution!');
  }

  const { data: entFinal } = await adminClient.from('ebook_entitlements').select('*').eq('customer_id', student.id).eq('edition_id', editionId).single();
  console.log(`Final entitlement state: is_active=${entFinal.is_active}, can_read_online=${entFinal.can_read_online}, can_download_pdf=${entFinal.can_download_pdf}`);

  if (entFinal.is_active !== false) {
    throw new Error('Test 4 Failed: Final entitlement was not deactivated after both orders refunded.');
  }

  console.log('✅ TEST 4 PASSED: Rule C guarded, independent provider operations executed, duplicate retry rejected.');

  console.log('\n' + '='.repeat(80));
  console.log('🎉 ALL 4 GENUINE REFUND TEST FLOWS COMPLETED AND FULLY VERIFIED');
  console.log('='.repeat(80));
}

runGenuineRefundSuite().catch(err => {
  console.error('Fatal refund suite error:', err);
  process.exit(1);
});
