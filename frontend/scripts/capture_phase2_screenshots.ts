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
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Main KnowledgePaat Header with E-Books button (Desktop)
    console.log('1. Capturing Main Platform Header at /...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
    const shotMainHeader = path.join(screenshotsDir, 'ui_phase2_main_header_with_ebooks.png');
    await page.screenshot({ path: shotMainHeader, clip: { x: 0, y: 0, width: 1440, height: 450 } });
    console.log(`✅ Saved: ${shotMainHeader}`);

    // 2. Dedicated eBook Storefront Desktop Header & Hero
    console.log('2. Capturing Dedicated eBook Storefront at /e-books...');
    await page.goto('http://localhost:3000/e-books', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const shotEbookDesktop = path.join(screenshotsDir, 'ui_phase2_ebook_desktop_header.png');
    await page.screenshot({ path: shotEbookDesktop, clip: { x: 0, y: 0, width: 1440, height: 750 } });
    console.log(`✅ Saved: ${shotEbookDesktop}`);

    // 3. eBook Desktop Categories Dropdown
    console.log('3. Capturing Categories Dropdown on Desktop...');
    try {
      const catButton = await page.$('button[aria-label="eBook Categories"]');
      if (catButton) {
        await catButton.click();
        await new Promise(r => setTimeout(r, 600));
        const shotCatDropdown = path.join(screenshotsDir, 'ui_phase2_ebook_categories_dropdown.png');
        await page.screenshot({ path: shotCatDropdown, clip: { x: 200, y: 0, width: 700, height: 500 } });
        console.log(`✅ Saved: ${shotCatDropdown}`);
        await catButton.click(); // Close
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (e) {
      console.warn('Could not capture categories dropdown:', e);
    }

    // 4. Dedicated eBook Footer
    console.log('4. Capturing Dedicated eBook Footer at /e-books...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1000));
    const shotFooter = path.join(screenshotsDir, 'ui_phase2_ebook_footer.png');
    await page.screenshot({ path: shotFooter });
    console.log(`✅ Saved: ${shotFooter}`);

    // 5. Cart Page using EBookLayout
    console.log('5. Capturing Cart Page at /cart with EBookLayout...');
    await page.goto('http://localhost:3000/cart', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
    const shotCart = path.join(screenshotsDir, 'ui_phase2_cart_page_ebook_layout.png');
    await page.screenshot({ path: shotCart, clip: { x: 0, y: 0, width: 1440, height: 800 } });
    console.log(`✅ Saved: ${shotCart}`);

    // 6. Authenticated Student My Books in EBookLayout
    console.log('6. Capturing Authenticated /my-books in EBookLayout...');
    await setupPuppeteerSession(page, 'student@knowledgepaat.test');
    await page.goto('http://localhost:3000/my-books', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const shotMyBooks = path.join(screenshotsDir, 'ui_phase2_my_books_ebook_layout.png');
    await page.screenshot({ path: shotMyBooks, clip: { x: 0, y: 0, width: 1440, height: 800 } });
    console.log(`✅ Saved: ${shotMyBooks}`);

    // 7. Mobile Viewport & Accessible Navigation Drawer
    console.log('7. Capturing Mobile Viewport & Drawer...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await mobilePage.goto('http://localhost:3000/e-books', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Capture closed mobile header
    const shotMobileHeader = path.join(screenshotsDir, 'ui_phase2_mobile_header_closed.png');
    await mobilePage.screenshot({ path: shotMobileHeader });
    console.log(`✅ Saved: ${shotMobileHeader}`);

    // Click mobile hamburger menu button
    console.log('Opening mobile drawer...');
    const mobileToggle = await mobilePage.$('button[aria-label="Toggle eBook navigation menu"]');
    if (mobileToggle) {
      await mobileToggle.click();
      await new Promise(r => setTimeout(r, 800));
      const shotMobileDrawer = path.join(screenshotsDir, 'ui_phase2_mobile_drawer_open.png');
      await mobilePage.screenshot({ path: shotMobileDrawer });
      console.log(`✅ Saved: ${shotMobileDrawer}`);
    } else {
      console.warn('Could not find mobile menu toggle button');
    }

    await mobilePage.close();
    await page.close();
    console.log('\nAll Phase 2 screenshots successfully captured!');
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Puppeteer capture error:', err);
  process.exit(1);
});
