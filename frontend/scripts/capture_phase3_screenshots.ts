import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const screenshotsDir = '/home/harsha/.gemini/antigravity-ide/brain/651141cd-1942-4961-ad67-66a54539bfed/screenshots';
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function capture() {
  console.log('Launching installed Chrome via puppeteer-core for Phase 3 visual capture...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
  });

  try {
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1440, height: 900 });

    // Find sample book slug
    const apiRes = await fetch(`${APP_URL}/api/ebooks?limit=5`);
    const apiJson = await apiRes.json();
    const sampleSlug = apiJson.books?.[0]?.slug || 'cloud-system-architecture-devops';

    // 1. Desktop Storefront: Header, Hero & Featured Cards
    console.log('1. Capturing Desktop Storefront Hero & Featured Cards...');
    await desktopPage.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await desktopPage.waitForSelector('article', { timeout: 20000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 2000));

    const shot01 = path.join(screenshotsDir, '01_desktop_storefront_hero_featured.png');
    await desktopPage.screenshot({ path: shot01, clip: { x: 0, y: 0, width: 1440, height: 1150 } });
    console.log(`✅ Saved: ${shot01}`);

    // 2. Desktop Storefront: Highlighted Book & Full Catalogue
    console.log('2. Capturing Desktop Highlighted Book & Catalogue Section...');
    await desktopPage.evaluate(() => {
      const el = document.getElementById('spotlight-publication');
      if (el) {
        window.scrollTo(0, el.offsetTop - 80);
      }
    });
    await new Promise((r) => setTimeout(r, 1500));

    const shot02 = path.join(screenshotsDir, '02_desktop_storefront_highlighted_catalogue.png');
    await desktopPage.screenshot({ path: shot02 });
    console.log(`✅ Saved: ${shot02}`);

    // 3. Desktop Storefront: Footer & Legal Links
    console.log('3. Capturing Desktop Storefront Footer...');
    await desktopPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 1200));

    const shot03 = path.join(screenshotsDir, '03_desktop_storefront_footer.png');
    await desktopPage.screenshot({ path: shot03 });
    console.log(`✅ Saved: ${shot03}`);

    // 4. Book Detail Page
    console.log(`4. Capturing Book Detail Page for "${sampleSlug}"...`);
    await desktopPage.goto(`${APP_URL}/e-books/${sampleSlug}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await desktopPage.waitForSelector('h1', { timeout: 15000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 1500));

    const shot06 = path.join(screenshotsDir, '06_book_detail_phase3.png');
    await desktopPage.screenshot({ path: shot06, clip: { x: 0, y: 0, width: 1440, height: 950 } });
    console.log(`✅ Saved: ${shot06}`);

    // 5. Cart Page
    console.log('5. Capturing Cart Page at /cart...');
    await desktopPage.goto(`${APP_URL}/cart`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    const shot07 = path.join(screenshotsDir, '07_cart_page_phase3.png');
    await desktopPage.screenshot({ path: shot07, clip: { x: 0, y: 0, width: 1440, height: 850 } });
    console.log(`✅ Saved: ${shot07}`);

    // 6. Checkout Page
    console.log('6. Capturing Checkout Page at /checkout...');
    await desktopPage.goto(`${APP_URL}/checkout`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    const shot08 = path.join(screenshotsDir, '08_checkout_page_phase3.png');
    await desktopPage.screenshot({ path: shot08, clip: { x: 0, y: 0, width: 1440, height: 850 } });
    console.log(`✅ Saved: ${shot08}`);

    // 7. My Books Customer Shelf (Authenticated)
    console.log('7. Capturing Authenticated /my-books...');
    const studentUrl = `${APP_URL}/api/test-session?email=student%40knowledgepaat.test&password=StudentPassword%402026!&redirectTo=%2Fmy-books`;
    await desktopPage.goto(studentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await desktopPage.waitForSelector('h1', { timeout: 20000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 1500));

    const shot09 = path.join(screenshotsDir, '09_my_books_phase3.png');
    await desktopPage.screenshot({ path: shot09, clip: { x: 0, y: 0, width: 1440, height: 850 } });
    console.log(`✅ Saved: ${shot09}`);

    // 8. Mobile Viewport Storefront Hero & Catalogue
    console.log('8. Capturing Mobile Storefront (390x844)...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await mobilePage.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await mobilePage.waitForSelector('article', { timeout: 20000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 2000));

    const shot04 = path.join(screenshotsDir, '04_mobile_storefront_hero.png');
    await mobilePage.screenshot({ path: shot04, clip: { x: 0, y: 0, width: 390, height: 844 } });
    console.log(`✅ Saved: ${shot04}`);

    // Scroll to catalogue on mobile
    await mobilePage.evaluate(() => {
      const cat = document.getElementById('catalogue');
      if (cat) {
        window.scrollTo(0, cat.offsetTop);
      }
    });
    await new Promise((r) => setTimeout(r, 1500));

    const shot05 = path.join(screenshotsDir, '05_mobile_storefront_catalogue.png');
    await mobilePage.screenshot({ path: shot05 });
    console.log(`✅ Saved: ${shot05}`);

    console.log('\n🎉 All 9 Phase 3 visual screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Fatal screenshot error:', err);
  process.exit(1);
});
