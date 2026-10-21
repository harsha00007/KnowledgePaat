import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { setupPuppeteerSession } from './testAuthHelper';

const screenshotsDir = '/home/harsha/.gemini/antigravity-ide/brain/651141cd-1942-4961-ad67-66a54539bfed/screenshots';
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function capture() {
  console.log('Launching installed Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });

  try {
    const page = await browser.newPage();

    // Authenticate admin session via isolated test harness
    await setupPuppeteerSession(page, 'admin@knowledgepaat.test');

    // 1. Capture Pricing Tab
    console.log('Navigating to Pricing Tab...');
    const pricingUrl = 'http://localhost:3000/admin/e-books/223875c2-40bf-4716-98a9-1a6f7ca7994c/edit?tab=pricing';
    await page.goto(pricingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for the workspace loading spinner to disappear and pricing tab to mount
    try {
      await page.waitForSelector('button:has-text("Save Commercial Pricing"), [data-tab="pricing"], input[type="number"]', { timeout: 10000 });
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }
    const shotPricing = path.join(screenshotsDir, 'ui_phase1_pricing_tab.png');
    await page.screenshot({ path: shotPricing });
    console.log(`✅ Saved: ${shotPricing} (${fs.statSync(shotPricing).size} bytes)`);

    // 2. Capture Customer Management
    console.log('Navigating to Customer Management...');
    const custUrl = 'http://localhost:3000/admin/e-book-customers';
    await page.goto(custUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.waitForSelector('table, [role="table"], button:has-text("Actions"), button:has-text("Grant"), tr', { timeout: 10000 });
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }
    const shotCust = path.join(screenshotsDir, 'ui_phase1_customer_management.png');
    await page.screenshot({ path: shotCust });
    console.log(`✅ Saved: ${shotCust} (${fs.statSync(shotCust).size} bytes)`);

    // 3. Capture Homepage Editor
    console.log('Navigating to Homepage Content Editor...');
    const homeUrl = 'http://localhost:3000/admin/e-books/homepage';
    await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    const shotHome = path.join(screenshotsDir, 'ui_phase1_homepage_editor.png');
    await page.screenshot({ path: shotHome });
    console.log(`✅ Saved: ${shotHome} (${fs.statSync(shotHome).size} bytes)`);

  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Puppeteer capture error:', err);
  process.exit(1);
});
