// @ts-expect-error WebSocket typings
import WebSocket from 'ws';
(global as any).WebSocket = WebSocket;

import '../utils/supabase/dnsPin';

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

import { createRazorpayOrder, getRazorpayCredentials } from '../lib/razorpay';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (supabaseUrl.includes('csjywuflkvohytbvglxf')) {
  console.error('FATAL: Production database detected! Aborting.');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('1. Resolving test customer and book edition...');
  const testCustomerEmail = process.env.STAGING_TEST_CUSTOMER_EMAIL || 'phase5.api.test@knowledgepaat.test';

  const { data: customerProfile } = await adminClient
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', testCustomerEmail)
    .single();

  if (!customerProfile) {
    throw new Error(`Test customer profile not found for ${testCustomerEmail}`);
  }
  const customerId = customerProfile.id;

  const { data: editions } = await adminClient
    .from('ebook_editions')
    .select('id, ebook_id, edition_number, status, price_read_online_paise, ebook:ebooks(id, title, slug)')
    .eq('status', 'published')
    .limit(1);

  if (!editions || editions.length === 0) {
    throw new Error('No published edition found in staging');
  }

  const edition = editions[0];
  const book = {
    bookId: (edition.ebook as any).id,
    editionId: edition.id,
    title: (edition.ebook as any).title,
  };

  const orderNumber = `EB-WH04-${Date.now()}`;
  console.log(`2. Creating Razorpay Test Order for ₹1.00 (orderNumber: ${orderNumber})...`);

  // First create internal order so we have its UUID
  const internalOrderId = crypto.randomUUID();

  const rzpOrder = await createRazorpayOrder({
    amountInRupees: 1,
    receipt: `wh04_${Date.now().toString().slice(-8)}`,
    notes: {
      internalOrderId,
      orderNumber,
      customerId,
      testDomain: 'WH-04',
      orderType: 'ebook',
    },
  });

  console.log(`Created Razorpay Order: ${rzpOrder.id}`);

  const { error: ordErr } = await adminClient.from('ebook_orders').insert({
    id: internalOrderId,
    order_number: orderNumber,
    customer_id: customerId,
    gateway_order_id: rzpOrder.id,
    total_amount_paise: 100,
    currency: 'INR',
    payment_gateway: 'razorpay',
    payment_status: 'pending',
    order_status: 'pending',
    customer_email: testCustomerEmail,
    customer_name: customerProfile.full_name,
  });

  if (ordErr) {
    throw new Error(`Failed to insert ebook_order: ${ordErr.message}`);
  }

  await adminClient.from('ebook_order_items').insert({
    order_id: internalOrderId,
    ebook_id: book.bookId,
    edition_id: book.editionId,
    plan: 'read_online',
    price_paise: 100,
    title: book.title,
  });

  console.log(`3. Created staging order ${internalOrderId}. Setting up Puppeteer test page...`);

  const { keyId } = getRazorpayCredentials();

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Razorpay Test Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body style="font-family: sans-serif; padding: 20px;">
  <h2>Razorpay Checkout Ingress Test</h2>
  <button id="pay-btn" style="padding: 12px 24px; font-size: 16px; cursor: pointer;">Launch Checkout</button>
  <div id="status" style="margin-top: 20px; font-weight: bold;">Ready</div>
  <script>
    document.getElementById('pay-btn').onclick = function() {
      var options = {
        key: '${keyId}',
        amount: 100,
        currency: 'INR',
        name: 'KnowledgePaat',
        description: 'WH-04 Verification eBook Order',
        order_id: '${rzpOrder.id}',
        notes: {
          internalOrderId: '${internalOrderId}',
          orderNumber: '${orderNumber}'
        },
        prefill: {
          name: '${customerProfile.full_name}',
          email: '${testCustomerEmail}',
          contact: '9810098100'
        },
        handler: function(response) {
          document.getElementById('status').innerText = 'SUCCESS:' + response.razorpay_payment_id + ':' + response.razorpay_order_id + ':' + response.razorpay_signature;
        },
        modal: {
          ondismiss: function() {
            document.getElementById('status').innerText = 'DISMISSED';
          }
        }
      };
      var rzp = new Razorpay(options);
      rzp.open();
    };
  </script>
</body>
</html>`;

  const testHtmlPath = path.resolve(__dirname, '../public/test-rzp-checkout.html');
  fs.writeFileSync(testHtmlPath, htmlContent);

  console.log(`4. Saved test checkout HTML at ${testHtmlPath}. Launching Headless Chrome...`);

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,800'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://127.0.0.1:3000/test-rzp-checkout.html', { waitUntil: 'networkidle0' });

  console.log('5. Clicking Launch Checkout button...');
  await page.click('#pay-btn');

  // Wait for Razorpay frame
  console.log('6. Waiting for Razorpay checkout frame...');
  await page.waitForSelector('iframe.razorpay-checkout-frame', { timeout: 15000 });

  const rzpFrameElement = await page.$('iframe.razorpay-checkout-frame');
  const frame = await rzpFrameElement?.contentFrame();

  if (!frame) {
    throw new Error('Could not access Razorpay iframe contentFrame');
  }

  console.log('7. Waiting for Razorpay checkout dialog to be interactive...');

  // Wait until either contact modal or payment options are visible
  await frame.waitForFunction(() => {
    return document.querySelector('input[name="contact"]') !== null ||
           document.body.innerText.includes('Suggested Banks') ||
           document.body.innerText.includes('Cards');
  }, { timeout: 25000 });

  await new Promise(r => setTimeout(r, 2000));

  const shotDir = '/home/harsha/.gemini/antigravity-ide/brain/651141cd-1942-4961-ad67-66a54539bfed/screenshots';
  if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });

  // Check if Contact details modal is open
  const isContactModalOpen = await frame.evaluate(() => {
    return document.body.innerText.includes('Contact details') && document.body.innerText.includes('Enter mobile & email');
  });

  if (isContactModalOpen) {
    console.log('Contact modal is open. Inspecting contact input...');
    const contactInfo = await frame.evaluate(() => {
      const inp = document.querySelector('input[name="contact"]') as HTMLInputElement;
      const em = document.querySelector('input[name="email"]') as HTMLInputElement;
      return {
        contactValue: inp?.value,
        contactPlaceholder: inp?.placeholder,
        contactMaxLength: inp?.maxLength,
        emailValue: em?.value,
        html: inp?.parentElement?.parentElement?.innerHTML?.slice(0, 400),
      };
    });
    console.log('Contact Info before typing:', contactInfo);

    // Focus and select all using evaluate
    await frame.evaluate(() => {
      const inp = document.querySelector('input[name="contact"]') as HTMLInputElement;
      if (inp) {
        inp.focus();
        inp.select();
      }
    });

    const contactInput = await frame.$('input[name="contact"]');
    if (contactInput) {
      await page.keyboard.press('Backspace');
      // Type valid Indian mobile number: 9810098100
      await contactInput.type('9810098100', { delay: 100 });
      await page.keyboard.press('Tab');
    }

    const contactAfter = await frame.evaluate(() => {
      const inp = document.querySelector('input[name="contact"]') as HTMLInputElement;
      const em = document.querySelector('input[name="email"]') as HTMLInputElement;
      return {
        contactValue: inp?.value,
        emailValue: em?.value,
      };
    });
    console.log('Contact Info after typing:', contactAfter);

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(shotDir, 'rzp_step2_contact_filled.png') });

    console.log('Clicking Continue in contact modal...');
    await frame.evaluate(() => {
      const continueBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Continue');
      continueBtn?.click();
    });

    await new Promise(r => setTimeout(r, 2000));

    const errorsAfterContinue = await frame.evaluate(() => {
      return Array.from(document.querySelectorAll('[class*="error"], [class*="red"], span, p'))
        .map(el => (el as HTMLElement).innerText?.trim())
        .filter(t => t && (t.includes('number') || t.includes('valid') || t.includes('email') || t.includes('error')));
    });
    console.log('Errors after clicking Continue:', errorsAfterContinue);
  }

  await page.screenshot({ path: path.join(shotDir, 'rzp_step3_after_contact.png') });

  // Select Cards tab
  console.log('Selecting Cards payment method...');
  await frame.evaluate(() => {
    const cardsTab = Array.from(document.querySelectorAll('div, button, span, label')).find(el => (el as HTMLElement).innerText?.trim() === 'Cards');
    (cardsTab as HTMLElement)?.click();
  });

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(shotDir, 'rzp_step4_cards_form.png') });

  // Dump all inputs in the frame
  const cardInputs = await frame.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(inp => ({
      name: inp.name,
      type: inp.type,
      placeholder: inp.placeholder,
      id: inp.id,
      className: inp.className,
      value: inp.value,
    }));
  });
  console.log('Card Form Inputs:', JSON.stringify(cardInputs, null, 2));
  // Fill card inputs
  console.log('Filling card details (Visa 4111 2222 3333 4444, 12/28, 123)...');

  // Listen for 3D Secure / OTP popup or redirect
  const otpPagePromise = new Promise<any>((resolve) => {
    browser.on('targetcreated', async (target) => {
      console.log('Target created during card flow:', target.url());
      try {
        const p = await target.page();
        if (p) resolve(p);
      } catch (e) {}
    });
  });

  await frame.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const cardNumInput = inputs.find(i => i.placeholder?.toLowerCase().includes('card') || i.name?.includes('card') || i.id?.includes('card'));
    const expiryInput = inputs.find(i => i.placeholder?.toLowerCase().includes('mm') || i.name?.includes('exp') || i.id?.includes('exp'));
    const cvvInput = inputs.find(i => i.placeholder?.toLowerCase().includes('cvv') || i.name?.includes('cvv') || i.id?.includes('cvv'));

    if (cardNumInput) {
      cardNumInput.focus();
    }
  });

  // Type card number with official Razorpay test card
  const cardNumHandle = await frame.$('input[placeholder*="Card"], input[name*="card.number"], input[name*="card"]');
  if (cardNumHandle) {
    await cardNumHandle.click();
    await cardNumHandle.type('4100280000001007', { delay: 40 });
    await page.keyboard.press('Tab');
  }

  // Type expiry
  const expiryHandle = await frame.$('input[placeholder*="MM"], input[name*="card.expiry"], input[name*="exp"]');
  if (expiryHandle) {
    await expiryHandle.type('1228', { delay: 40 });
    await page.keyboard.press('Tab');
  }

  // Type CVV
  const cvvHandle = await frame.$('input[placeholder*="CVV"], input[name*="card.cvv"], input[name*="cvv"]');
  if (cvvHandle) {
    await cvvHandle.type('123', { delay: 40 });
  }

  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(shotDir, 'rzp_step5_card_filled.png') });

  // Click Continue button
  console.log('Clicking Continue button on card form...');
  await frame.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => {
      const t = b.innerText?.trim()?.toLowerCase();
      return t === 'continue' || t?.includes('pay');
    });
    btn?.click();
  });

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(shotDir, 'rzp_step5b_rbi_popup.png') });

  // Handle RBI tokenization popup if it appears
  const hasRbiPopup = await frame.evaluate(() => {
    return document.body.innerText.includes('RBI guidelines') || document.body.innerText.includes('Maybe later');
  });

  if (hasRbiPopup) {
    console.log('RBI tokenization popup detected. Clicking "Maybe later"...');
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
    await new Promise(r => setTimeout(r, 2000));
  }

  // Wait for 3D Secure / OTP simulation popup or frame
  console.log('Waiting for OTP / 3DS simulation...');
  let otpPage: any = await Promise.race([
    otpPagePromise,
    new Promise(r => setTimeout(() => r(null), 12000))
  ]);

  if (!otpPage) {
    const pages = await browser.pages();
    otpPage = pages.find(p => p !== page && p.url().includes('razorpay.com'));
  }

  if (otpPage) {
    console.log('OTP / 3DS page detected:', otpPage.url());
    await otpPage.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    await otpPage.waitForSelector('button, input, a', { timeout: 15000 }).catch(() => null);
    await otpPage.screenshot({ path: path.join(shotDir, 'rzp_step6_otp_page.png') });

    console.log('Interacting with OTP simulation page...');
    await otpPage.evaluate(() => {
      // Look for Success button or submit with OTP
      const successBtn = Array.from(document.querySelectorAll('button, input[type="submit"], a')).find(el => {
        const text = ((el as HTMLElement).innerText || (el as HTMLInputElement).value || '').toLowerCase();
        return text.includes('success');
      });
      if (successBtn) {
        (successBtn as HTMLElement).click();
        return;
      }
      // Or type OTP 1234
      const otpInput = document.querySelector('input[type="password"], input[type="text"], input[name*="otp"]') as HTMLInputElement;
      if (otpInput) {
        otpInput.value = '1234';
        otpInput.dispatchEvent(new Event('input', { bubbles: true }));
        const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
        submitBtn?.click();
      }
    });
    console.log('Submitted OTP / Success on 3DS simulation page!');
  } else {
    // Check inside frames of main page
    console.log('Checking frames for OTP inputs or Success button...');
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
        });
        if (handled) {
          console.log(`Handled OTP in frame: ${f.url()}`);
          break;
        }
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Wait 10 seconds for payment capture and webhook delivery
  console.log('Waiting 10 seconds for Razorpay webhook delivery to ngrok tunnel...');
  await new Promise(r => setTimeout(r, 10000));
  await page.screenshot({ path: path.join(shotDir, 'rzp_step7_final.png') });

  const finalStatus = await page.evaluate(() => document.getElementById('status')?.innerText);
  console.log('Checkout page final status:', finalStatus);

  await browser.close();
  // Remove temporary html file
  if (fs.existsSync(testHtmlPath)) fs.unlinkSync(testHtmlPath);
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
