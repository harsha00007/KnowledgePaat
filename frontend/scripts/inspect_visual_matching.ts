import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const APP_URL = 'http://localhost:3000';
const DOCS_SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/ebooks/screenshots');

async function run() {
  if (!fs.existsSync(DOCS_SCREENSHOTS_DIR)) {
    fs.mkdirSync(DOCS_SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('Launching headless Chrome to inspect visual layout...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();

    // ───────────────────────────────────────────────────────────────────────────
    // 1. DESKTOP VIEWPORT (1440 x 900)
    // ───────────────────────────────────────────────────────────────────────────
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    console.log('Navigating to http://localhost:3000/e-books on Desktop (1440x900)...');
    await page.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('Waiting for catalogue articles to render (ensuring loading skeleton is gone)...');
    await page.waitForSelector('#catalogue article', { timeout: 15000 });
    // Allow any subtle entrance transitions to settle
    await new Promise((r) => setTimeout(r, 1000));

    // Diagnostic 1: Check for potential obscuring overlays
    const overlays = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const suspicious: any[] = [];
      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (
          (style.position === 'fixed' || style.position === 'absolute') &&
          rect.width > 300 &&
          rect.height > 100 &&
          (style.backgroundColor === 'rgb(255, 255, 255)' || style.backgroundColor === '#ffffff') &&
          parseInt(style.zIndex || '0', 10) > 10
        ) {
          suspicious.push({
            tagName: el.tagName,
            className: el.className,
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
            zIndex: style.zIndex,
          });
        }
      }
      return suspicious;
    });

    console.log('Suspicious high-z-index white overlays:', JSON.stringify(overlays, null, 2));

    // Capture Desktop Top Section (Scroll Y = 0)
    console.log('Capturing Desktop Top Section (01_desktop_top_section.png)...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 500));
    const topShotPath = path.join(DOCS_SCREENSHOTS_DIR, '01_desktop_top_section.png');
    await page.screenshot({ path: topShotPath });
    console.log(`✅ Saved: ${topShotPath} (${fs.statSync(topShotPath).size} bytes)`);

    // Diagnostic 2: Check layout dimensions and spacing
    const layoutInfo = await page.evaluate(() => {
      const mediaCard = document.querySelector('[role="region"][aria-roledescription="carousel"]');
      const catalogue = document.querySelector('#catalogue');
      const pagination = document.querySelector('nav[aria-label="Catalogue pagination"]');
      const bookCards = Array.from(document.querySelectorAll('#catalogue article'));

      return {
        mediaCard: mediaCard ? {
          width: mediaCard.getBoundingClientRect().width,
          height: mediaCard.getBoundingClientRect().height,
          top: mediaCard.getBoundingClientRect().top + window.scrollY,
        } : null,
        catalogue: catalogue ? {
          top: catalogue.getBoundingClientRect().top + window.scrollY,
        } : null,
        bookCardCount: bookCards.length,
        firstCardHeight: bookCards[0] ? bookCards[0].getBoundingClientRect().height : null,
        pagination: pagination ? {
          top: pagination.getBoundingClientRect().top + window.scrollY,
          visible: pagination.getBoundingClientRect().height > 0,
        } : null,
        totalDocHeight: document.documentElement.scrollHeight,
      };
    });

    console.log('Desktop Layout Measurements:', JSON.stringify(layoutInfo, null, 2));

    // Scroll down to the Catalogue Book Grid and Pagination
    console.log('Scrolling down to book grid and pagination...');
    await page.evaluate(() => {
      const pagination = document.querySelector('nav[aria-label="Catalogue pagination"]');
      if (pagination) {
        pagination.scrollIntoView({ behavior: 'instant', block: 'end' });
      } else {
        window.scrollTo(0, document.documentElement.scrollHeight);
      }
    });
    await new Promise((r) => setTimeout(r, 1000));

    console.log('Capturing Desktop Book Grid & Pagination (02_desktop_book_grid_pagination.png)...');
    const gridShotPath = path.join(DOCS_SCREENSHOTS_DIR, '02_desktop_book_grid_pagination.png');
    await page.screenshot({ path: gridShotPath });
    console.log(`✅ Saved: ${gridShotPath} (${fs.statSync(gridShotPath).size} bytes)`);

    // ───────────────────────────────────────────────────────────────────────────
    // 2. MOBILE VIEWPORT (375 x 812)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('Setting mobile viewport (375x812)...');
    await page.setViewport({ width: 375, height: 812, isMobile: true, deviceScaleFactor: 2 });
    await page.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#catalogue article', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Capture Mobile Top Section
    console.log('Capturing Mobile Top Section (03_mobile_top_section.png)...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 500));
    const mobileTopShotPath = path.join(DOCS_SCREENSHOTS_DIR, '03_mobile_top_section.png');
    await page.screenshot({ path: mobileTopShotPath });
    console.log(`✅ Saved: ${mobileTopShotPath} (${fs.statSync(mobileTopShotPath).size} bytes)`);

    // Scroll down to Mobile Book Cards and Pagination
    console.log('Scrolling down on mobile to book cards & pagination...');
    await page.evaluate(() => {
      const pagination = document.querySelector('nav[aria-label="Catalogue pagination"]');
      if (pagination) {
        pagination.scrollIntoView({ behavior: 'instant', block: 'end' });
      } else {
        window.scrollTo(0, document.documentElement.scrollHeight);
      }
    });
    await new Promise((r) => setTimeout(r, 1000));

    console.log('Capturing Mobile Book Cards & Pagination (04_mobile_book_cards_pagination.png)...');
    const mobileGridShotPath = path.join(DOCS_SCREENSHOTS_DIR, '04_mobile_book_cards_pagination.png');
    await page.screenshot({ path: mobileGridShotPath });
    console.log(`✅ Saved: ${mobileGridShotPath} (${fs.statSync(mobileGridShotPath).size} bytes)`);

    // ───────────────────────────────────────────────────────────────────────────
    // 3. BROWSER SCROLLING, BACK/FORWARD & TRANSITION CHECK
    // ───────────────────────────────────────────────────────────────────────────
    console.log('Verifying browser scroll, back/forward navigation and transition...');
    const page2Button = await page.$('button[aria-label="Page 2"]');
    if (page2Button) {
      console.log('Clicking Page 2...');
      await page2Button.click();
      await page.waitForFunction(() => window.location.href.includes('page=2'), { timeout: 5000 });
      await new Promise((r) => setTimeout(r, 1000));

      console.log('Testing Browser Back...');
      await page.goBack();
      await new Promise((r) => setTimeout(r, 1000));
      console.log('Current URL after Back:', page.url());

      console.log('Testing Browser Forward...');
      await page.goForward();
      await new Promise((r) => setTimeout(r, 1000));
      console.log('Current URL after Forward:', page.url());
    }

  } finally {
    await browser.close();
  }
  console.log('All inspections and screenshot captures completed successfully.');
}

run().catch((err) => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
