import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const APP_URL = 'http://localhost:3000';
const DOCS_SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/ebooks/screenshots');
const ARTIFACTS_DIR = '/home/harsha/.gemini/antigravity-ide/brain/16956734-b806-44c3-aa7c-21831130a5e2/screenshots';

async function run() {
  if (!fs.existsSync(DOCS_SCREENSHOTS_DIR)) {
    fs.mkdirSync(DOCS_SCREENSHOTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  console.log('1. Launching headless Chrome via /usr/bin/google-chrome...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();

    // ───────────────────────────────────────────────────────────────────────────
    // 1. MOBILE PHONE VIEWPORT (390 x 844 - iPhone 14/15)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('2. Testing Mobile Phone Viewport (390x844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#catalogue article', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Capture mobile top section (header, compact media card, search)
    const mobileTopPath = path.join(DOCS_SCREENSHOTS_DIR, 'mobile_390_top.png');
    await page.screenshot({ path: mobileTopPath });
    console.log(`Saved: ${mobileTopPath}`);

    // Verify Mobile Layout Metrics
    const mobileMetrics = await page.evaluate(() => {
      const firstCard = document.querySelector('#catalogue article');
      const coverDiv = firstCard?.querySelector('div[class*="shrink-0"]');
      const bottomNav = document.querySelector('nav[aria-label="eBook Mobile Bottom Navigation"]');
      const mediaCard = document.querySelector('[role="region"][aria-roledescription="carousel"]');
      const compactPageIndicator = document.querySelector('nav[aria-label="Catalogue pagination"] .sm\\:hidden');

      return {
        cardDisplay: firstCard ? window.getComputedStyle(firstCard).display : null,
        cardFlexDirection: firstCard ? window.getComputedStyle(firstCard).flexDirection : null,
        cardHeight: firstCard?.getBoundingClientRect().height,
        coverWidth: coverDiv?.getBoundingClientRect().width,
        mediaCardHeight: mediaCard?.getBoundingClientRect().height,
        bottomNavVisible: bottomNav !== null && window.getComputedStyle(bottomNav).display !== 'none',
        compactPageIndicatorVisible: compactPageIndicator !== null && window.getComputedStyle(compactPageIndicator).display !== 'none',
        hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    console.log('Mobile 390 Metrics:', JSON.stringify(mobileMetrics, null, 2));

    // Scroll down to cards & pagination
    await page.evaluate(() => {
      const catalogue = document.querySelector('#catalogue');
      if (catalogue) catalogue.scrollIntoView({ behavior: 'instant' });
    });
    await new Promise((r) => setTimeout(r, 800));

    const mobileCardsPath = path.join(DOCS_SCREENSHOTS_DIR, 'mobile_390_cards_pagination.png');
    await page.screenshot({ path: mobileCardsPath });
    console.log(`Saved: ${mobileCardsPath}`);

    // ───────────────────────────────────────────────────────────────────────────
    // 2. ULTRA-COMPACT MOBILE (320 x 568 - iPhone SE / Reflow Check)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('3. Testing Ultra-Compact Viewport (320x568)...');
    await page.setViewport({ width: 320, height: 568, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#catalogue article', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 800));

    const reflowCheck = await page.evaluate(() => {
      return {
        hasHorizontalOverflow: document.documentElement.scrollWidth > 320,
        docWidth: document.documentElement.scrollWidth,
      };
    });
    console.log('320px Reflow Check:', JSON.stringify(reflowCheck, null, 2));

    const mobile320Path = path.join(DOCS_SCREENSHOTS_DIR, 'mobile_320_reflow.png');
    await page.screenshot({ path: mobile320Path });
    console.log(`Saved: ${mobile320Path}`);

    // ───────────────────────────────────────────────────────────────────────────
    // 3. TABLET PORTRAIT (768 x 1024 - iPad Portrait)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('4. Testing Tablet Portrait Viewport (768x1024)...');
    await page.setViewport({ width: 768, height: 1024, isMobile: false, deviceScaleFactor: 1 });
    await page.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#catalogue article', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 800));

    const tablet768Path = path.join(DOCS_SCREENSHOTS_DIR, 'tablet_768_layout.png');
    await page.screenshot({ path: tablet768Path });
    console.log(`Saved: ${tablet768Path}`);

    // ───────────────────────────────────────────────────────────────────────────
    // 4. TABLET AIR (820 x 1180 - iPad Air)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('5. Testing Tablet Air Viewport (820x1180)...');
    await page.setViewport({ width: 820, height: 1180, isMobile: false, deviceScaleFactor: 1 });
    await page.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#catalogue article', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 800));

    const tablet820Path = path.join(DOCS_SCREENSHOTS_DIR, 'tablet_820_layout.png');
    await page.screenshot({ path: tablet820Path });
    console.log(`Saved: ${tablet820Path}`);

    // ───────────────────────────────────────────────────────────────────────────
    // 5. DESKTOP VIEWPORT (1440 x 900)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('6. Testing Desktop Viewport (1440x900)...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#catalogue article', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 800));

    const desktopPath = path.join(DOCS_SCREENSHOTS_DIR, 'desktop_1440_layout.png');
    await page.screenshot({ path: desktopPath });
    console.log(`Saved: ${desktopPath}`);

    // Copy key screenshots to artifacts dir for embedding
    fs.copyFileSync(mobileTopPath, path.join(ARTIFACTS_DIR, 'mobile_390_top.png'));
    fs.copyFileSync(mobileCardsPath, path.join(ARTIFACTS_DIR, 'mobile_390_cards_pagination.png'));
    fs.copyFileSync(tablet768Path, path.join(ARTIFACTS_DIR, 'tablet_768_layout.png'));
    fs.copyFileSync(desktopPath, path.join(ARTIFACTS_DIR, 'desktop_1440_layout.png'));

    console.log('All responsive viewport verifications finished successfully.');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Responsive verification failed:', err);
  process.exit(1);
});
