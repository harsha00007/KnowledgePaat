const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env.local');
const env = dotenv.parse(fs.readFileSync(envPath));

const APP_URL = 'http://localhost:3000';
const DOCS_SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/ebooks/screenshots');
const ARTIFACTS_DIR = '/home/harsha/.gemini/antigravity-ide/brain/16956734-b806-44c3-aa7c-21831130a5e2/screenshots';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();

    // ───────────────────────────────────────────────────────────────────────────
    // 1. MOBILE FILTER & SORT BOTTOM SHEET INSPECTION
    // ───────────────────────────────────────────────────────────────────────────
    console.log('1. Capturing Mobile Filter & Sort Bottom Sheet (390x844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#catalogue article', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    const filterBtn = await page.$('button[aria-label="Open filter and sort sheet"]');
    if (filterBtn) {
      console.log('Clicking filter button...');
      await filterBtn.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      await new Promise((r) => setTimeout(r, 800));

      const filterSheetPath = path.join(DOCS_SCREENSHOTS_DIR, 'mobile_390_filter_sheet.png');
      await page.screenshot({ path: filterSheetPath });
      fs.copyFileSync(filterSheetPath, path.join(ARTIFACTS_DIR, 'mobile_390_filter_sheet.png'));
      console.log(`Saved: ${filterSheetPath}`);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // 2. ADMIN AUTHENTICATION
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n2. Authenticating as Admin (admin@knowledgepaat.test)...');
    await page.goto(`${APP_URL}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));

    await page.type('input[type="email"], input[id*="email"]', 'admin@knowledgepaat.test', { delay: 15 });
    await page.type('input[type="password"], input[id*="password"]', env.STAGING_TEST_ADMIN_PASSWORD, { delay: 15 });
    
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
        submitBtn.click(),
      ]);
    }
    await new Promise((r) => setTimeout(r, 2000));
    console.log('Current URL after login:', page.url());

    // ───────────────────────────────────────────────────────────────────────────
    // 3. ADMIN E-BOOKS (390 x 844 Mobile Record Cards)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n3. Capturing Admin E-Books (Mobile Cards)...');
    await page.goto(`${APP_URL}/admin/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait until loading message disappears
    await page.waitForFunction(() => !document.body.innerText.includes('Loading eBook catalog...'), { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));

    const adminEbooksPath = path.join(DOCS_SCREENSHOTS_DIR, 'admin_ebooks_mobile_cards.png');
    await page.screenshot({ path: adminEbooksPath });
    fs.copyFileSync(adminEbooksPath, path.join(ARTIFACTS_DIR, 'admin_ebooks_mobile_cards.png'));
    console.log(`Saved: ${adminEbooksPath}`);

    // ───────────────────────────────────────────────────────────────────────────
    // 4. ADMIN E-BOOK CUSTOMERS (390 x 844 Mobile Record Cards)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n4. Capturing Admin E-Book Customers (Mobile Cards)...');
    await page.goto(`${APP_URL}/admin/e-book-customers`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !document.body.innerText.includes('Loading customer directory...'), { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));

    const adminCustomersPath = path.join(DOCS_SCREENSHOTS_DIR, 'admin_customers_mobile_cards.png');
    await page.screenshot({ path: adminCustomersPath });
    fs.copyFileSync(adminCustomersPath, path.join(ARTIFACTS_DIR, 'admin_customers_mobile_cards.png'));
    console.log(`Saved: ${adminCustomersPath}`);

    // ───────────────────────────────────────────────────────────────────────────
    // 5. ADMIN E-BOOK ORDERS (390 x 844 Mobile Record Cards)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n5. Capturing Admin E-Book Orders (Mobile Cards)...');
    await page.goto(`${APP_URL}/admin/e-book-orders`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !document.body.innerText.includes('Loading orders...'), { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));

    const adminOrdersPath = path.join(DOCS_SCREENSHOTS_DIR, 'admin_orders_mobile_cards.png');
    await page.screenshot({ path: adminOrdersPath });
    fs.copyFileSync(adminOrdersPath, path.join(ARTIFACTS_DIR, 'admin_orders_mobile_cards.png'));
    console.log(`Saved: ${adminOrdersPath}`);

    console.log('\nAll targeted mobile screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Targeted capture failed:', err);
  process.exit(1);
});
