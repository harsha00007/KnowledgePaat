import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { setupPuppeteerSession } from './testAuthHelper';

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
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();

    // ───────────────────────────────────────────────────────────────────────────
    // DESKTOP VERIFICATION (1440 x 900)
    // ───────────────────────────────────────────────────────────────────────────
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    console.log('2. Setting up student session for student@knowledgepaat.test...');
    await setupPuppeteerSession(page, 'student@knowledgepaat.test');

    console.log('3. Navigating to http://localhost:3000/student/dashboard...');
    await page.goto(`${APP_URL}/student/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`Current page URL: ${page.url()}`);
    await new Promise((r) => setTimeout(r, 2000));
    console.log(`Current page URL after wait: ${page.url()}`);

    const currentUrl = page.url();
    if (!currentUrl.includes('/student/dashboard')) {
      const errShot = path.join(ARTIFACTS_DIR, 'debug_redirect.png');
      await page.screenshot({ path: errShot });
      console.log(`Unexpected redirect to: ${currentUrl}. Saved screenshot to ${errShot}`);
    }

    console.log('4. Waiting for header and dashboard heading...');
    const shotBefore = path.join(ARTIFACTS_DIR, 'dashboard_rendered.png');
    await page.screenshot({ path: shotBefore });
    console.log(`Saved screenshot before wait: ${shotBefore}`);

    const htmlDump = await page.evaluate(() => {
      const header = document.querySelector('header');
      return {
        headerHTML: header ? header.outerHTML : 'NO HEADER',
        title: document.title,
        h1: document.querySelector('h1')?.textContent,
      };
    });
    console.log('HTML Dump:', JSON.stringify(htmlDump, null, 2));

    await page.waitForSelector('#student-header-ebooks-link', { timeout: 10000 });
    await page.waitForSelector('h1', { timeout: 10000 });

    // Inspect geometric coordinates and alignment
    const metrics = await page.evaluate(() => {
      const ebookLink = document.querySelector('#student-header-ebooks-link');
      const h1 = document.querySelector('h1');
      const logoLink = document.querySelector('aside a');

      const ebookRect = ebookLink ? ebookLink.getBoundingClientRect() : null;
      const h1Rect = h1 ? h1.getBoundingClientRect() : null;
      const logoRect = logoLink ? logoLink.getBoundingClientRect() : null;

      return {
        ebookLink: {
          exists: !!ebookLink,
          text: ebookLink?.textContent?.trim(),
          href: ebookLink?.getAttribute('href'),
          rect: ebookRect ? { x: ebookRect.x, y: ebookRect.y, width: ebookRect.width, height: ebookRect.height } : null,
        },
        h1: {
          text: h1?.textContent?.trim(),
          rect: h1Rect ? { x: h1Rect.x, y: h1Rect.y, width: h1Rect.width, height: h1Rect.height } : null,
        },
        logo: {
          rect: logoRect ? { x: logoRect.x, y: logoRect.y, width: logoRect.width, height: logoRect.height } : null,
        },
      };
    });

    console.log('\n--- VERIFICATION METRICS ---');
    console.log(JSON.stringify(metrics, null, 2));

    if (!metrics.ebookLink.exists) {
      throw new Error('E-Books link not found in DOM!');
    }

    if (metrics.ebookLink.href !== '/e-books') {
      throw new Error(`Expected href to be /e-books, got: ${metrics.ebookLink.href}`);
    }

    // Geometry validation
    if (metrics.ebookLink.rect && metrics.h1.rect) {
      const isAboveH1 = metrics.ebookLink.rect.y < metrics.h1.rect.y;
      console.log(`✓ Is E-Book option above "Student Dashboard"? ${isAboveH1} (E-Book Y: ${metrics.ebookLink.rect.y}px < H1 Y: ${metrics.h1.rect.y}px)`);
      if (!isAboveH1) throw new Error('E-Book option is not above Student Dashboard heading!');
    }

    if (metrics.ebookLink.rect && metrics.logo.rect) {
      const isNextToLogo = metrics.ebookLink.rect.x > metrics.logo.rect.x && metrics.ebookLink.rect.y < metrics.logo.rect.y + 50;
      console.log(`✓ Is E-Book option next to KnowledgePaat Logo? ${isNextToLogo} (Logo X: ${metrics.logo.rect.x}px, E-Book X: ${metrics.ebookLink.rect.x}px)`);
    }

    // Capture Desktop Screenshot
    const desktopShotPath = path.join(DOCS_SCREENSHOTS_DIR, 'student_dashboard_ebook_desktop.png');
    const artifactDesktopShotPath = path.join(ARTIFACTS_DIR, 'student_dashboard_ebook_desktop.png');
    await page.screenshot({ path: desktopShotPath, fullPage: false });
    fs.copyFileSync(desktopShotPath, artifactDesktopShotPath);
    console.log(`✓ Desktop screenshot saved: ${desktopShotPath}`);

    // ───────────────────────────────────────────────────────────────────────────
    // MOBILE VERIFICATION (390 x 844)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n5. Testing Mobile Viewport (390x844)...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 600));

    const mobileMetrics = await page.evaluate(() => {
      const ebookLink = document.querySelector('#student-header-ebooks-link');
      const mobileLogo = document.querySelector('header a[href="/student/dashboard"]');
      const h1 = document.querySelector('h1');

      const ebookRect = ebookLink ? ebookLink.getBoundingClientRect() : null;
      const logoRect = mobileLogo ? mobileLogo.getBoundingClientRect() : null;
      const h1Rect = h1 ? h1.getBoundingClientRect() : null;

      return {
        ebookRect,
        logoRect,
        h1Rect,
        ebookVisible: ebookRect ? ebookRect.width > 0 && ebookRect.height > 0 : false,
      };
    });

    console.log('Mobile Metrics:', JSON.stringify(mobileMetrics, null, 2));

    const mobileShotPath = path.join(DOCS_SCREENSHOTS_DIR, 'student_dashboard_ebook_mobile.png');
    const artifactMobileShotPath = path.join(ARTIFACTS_DIR, 'student_dashboard_ebook_mobile.png');
    await page.screenshot({ path: mobileShotPath, fullPage: false });
    fs.copyFileSync(mobileShotPath, artifactMobileShotPath);
    console.log(`✓ Mobile screenshot saved: ${mobileShotPath}`);

    // ───────────────────────────────────────────────────────────────────────────
    // 6. CLICK NAVIGATION TEST
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n6. Testing Navigation: Clicking E-Books option...');
    await page.click('#student-header-ebooks-link');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

    const targetUrl = page.url();
    console.log(`✓ Navigated to: ${targetUrl}`);
    if (!targetUrl.includes('/e-books')) {
      throw new Error(`Expected navigation to /e-books, got: ${targetUrl}`);
    }

    console.log('\n🎉 ALL CHECKS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
