const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP_URL = 'http://localhost:3000';
const DOCS_DIR = path.resolve(__dirname, '../../docs/ebooks/screenshots');
const ARTIFACTS_DIR = '/home/harsha/.gemini/antigravity-ide/brain/16956734-b806-44c3-aa7c-21831130a5e2/screenshots';

async function run() {
  console.log('='.repeat(80));
  console.log('KNOWLEDGEPAAT — PROMOTIONAL MEDIA CARD VERIFICATION & SCREENSHOT SUITE');
  console.log('='.repeat(80));

  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const results = [];
  function record(name, passed, detail) {
    results.push({ name, passed, detail });
    console.log(`${passed ? '✅ [PASS]' : '❌ [FAIL]'} ${name}: ${detail}`);
  }

  try {
    const page = await browser.newPage();

    // ──────────────────────────────────────────────────────────────────────────
    // 1. DESKTOP VIEWPORT (1440 x 900)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[1] Testing Desktop Viewport (1440x900)...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('div[aria-label="Promotional Showcase"]', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));

    const desktopMetrics = await page.evaluate(() => {
      const card = document.querySelector('div[aria-label="Promotional Showcase"]');
      if (!card) return null;

      const rect = card.getBoundingClientRect();
      const style = window.getComputedStyle(card);

      const leftCol = card.querySelector('div[class*="lg:w-[53%]"]');
      const rightCol = card.querySelector('div[class*="lg:w-[47%]"]');

      const leftRect = leftCol ? leftCol.getBoundingClientRect() : null;
      const rightRect = rightCol ? rightCol.getBoundingClientRect() : null;

      const ctaBtn = card.querySelector('a.btn-gold, button.btn-gold');
      const ctaRect = ctaBtn ? ctaBtn.getBoundingClientRect() : null;

      const badge = card.querySelector('div[class*="text-[#6F42DD]"]');
      const badgeStyle = badge ? window.getComputedStyle(badge) : null;

      return {
        cardWidth: Math.round(rect.width),
        cardHeight: Math.round(rect.height),
        borderRadius: style.borderRadius,
        borderColor: style.borderColor,
        borderWidth: style.borderWidth,
        leftColWidth: leftRect ? Math.round(leftRect.width) : 0,
        rightColWidth: rightRect ? Math.round(rightRect.width) : 0,
        leftRatio: (leftRect && rightRect) ? (leftRect.width / (leftRect.width + rightRect.width)).toFixed(2) : '0',
        rightRatio: (leftRect && rightRect) ? (rightRect.width / (leftRect.width + rightRect.width)).toFixed(2) : '0',
        ctaWidth: ctaRect ? Math.round(ctaRect.width) : 0,
        ctaHeight: ctaRect ? Math.round(ctaRect.height) : 0,
        ctaText: ctaBtn ? ctaBtn.textContent.trim() : '',
        badgeText: badge ? badge.textContent.trim() : '',
        badgeColor: badgeStyle ? badgeStyle.color : '',
      };
    });

    console.log('Desktop MediaCard Metrics:', desktopMetrics);

    record(
      'Desktop Proportions (~53% / ~47%)',
      parseFloat(desktopMetrics.leftRatio) >= 0.50 && parseFloat(desktopMetrics.leftRatio) <= 0.56,
      `Left Ratio: ${desktopMetrics.leftRatio}, Right Ratio: ${desktopMetrics.rightRatio}`
    );

    record(
      'Desktop Card Border Radius (~24px)',
      parseInt(desktopMetrics.borderRadius) >= 20,
      `Border Radius: ${desktopMetrics.borderRadius}`
    );

    record(
      'Desktop Primary CTA Touch Target (>= 44px)',
      desktopMetrics.ctaHeight >= 44,
      `CTA Dimensions: ${desktopMetrics.ctaWidth}x${desktopMetrics.ctaHeight}px`
    );

    // Capture Desktop Card Element Screenshot
    const mediaCardElement = await page.$('div[aria-label="Promotional Showcase"]');
    const desktopCardPath = path.join(DOCS_DIR, 'media_card_desktop.png');
    const artifactDesktopCardPath = path.join(ARTIFACTS_DIR, 'media_card_desktop.png');
    if (mediaCardElement) {
      await mediaCardElement.screenshot({ path: desktopCardPath });
      fs.copyFileSync(desktopCardPath, artifactDesktopCardPath);
      console.log(`Saved: ${desktopCardPath}`);
    }

    // Capture Desktop Full Top Section
    const desktopTopPath = path.join(DOCS_DIR, 'storefront_desktop_media_card.png');
    const artifactDesktopTopPath = path.join(ARTIFACTS_DIR, 'storefront_desktop_media_card.png');
    await page.screenshot({ path: desktopTopPath });
    fs.copyFileSync(desktopTopPath, artifactDesktopTopPath);
    console.log(`Saved: ${desktopTopPath}`);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. MOBILE VIEWPORT (390 x 844 - iPhone 14/15)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[2] Testing Mobile Viewport (390x844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 600));
    await page.waitForSelector('div[aria-label="Promotional Showcase"]', { timeout: 10000 });

    const mobileMetrics = await page.evaluate(() => {
      const card = document.querySelector('div[aria-label="Promotional Showcase"]');
      if (!card) return null;

      const rect = card.getBoundingClientRect();
      const ctaBtn = card.querySelector('a.btn-gold, button.btn-gold');
      const ctaRect = ctaBtn ? ctaBtn.getBoundingClientRect() : null;

      return {
        cardWidth: Math.round(rect.width),
        cardHeight: Math.round(rect.height),
        ctaWidth: ctaRect ? Math.round(ctaRect.width) : 0,
        ctaHeight: ctaRect ? Math.round(ctaRect.height) : 0,
        hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
      };
    });

    console.log('Mobile MediaCard Metrics:', mobileMetrics);

    record(
      'Mobile No Horizontal Overflow',
      !mobileMetrics.hasHorizontalOverflow,
      `scrollWidth <= innerWidth (${mobileMetrics.cardWidth}px card on 390px viewport)`
    );

    record(
      'Mobile Primary CTA Touch Target (>= 44px)',
      mobileMetrics.ctaHeight >= 44,
      `Mobile CTA Dimensions: ${mobileMetrics.ctaWidth}x${mobileMetrics.ctaHeight}px`
    );

    const mobileCardElement = await page.$('div[aria-label="Promotional Showcase"]');
    const mobileCardPath = path.join(DOCS_DIR, 'media_card_mobile.png');
    const artifactMobileCardPath = path.join(ARTIFACTS_DIR, 'media_card_mobile.png');
    if (mobileCardElement) {
      await mobileCardElement.screenshot({ path: mobileCardPath });
      fs.copyFileSync(mobileCardPath, artifactMobileCardPath);
      console.log(`Saved: ${mobileCardPath}`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. TABLET VIEWPORT (768 x 1024 - iPad)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[3] Testing Tablet Viewport (768x1024)...');
    await page.setViewport({ width: 768, height: 1024 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 600));
    await page.waitForSelector('div[aria-label="Promotional Showcase"]', { timeout: 10000 });

    const tabletMetrics = await page.evaluate(() => {
      return {
        hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
      };
    });

    record(
      'Tablet No Horizontal Overflow',
      !tabletMetrics.hasHorizontalOverflow,
      'Viewport 768px'
    );

    const tabletCardPath = path.join(DOCS_DIR, 'media_card_tablet.png');
    const artifactTabletCardPath = path.join(ARTIFACTS_DIR, 'media_card_tablet.png');
    const tabletElement = await page.$('div[aria-label="Promotional Showcase"]');
    if (tabletElement) {
      await tabletElement.screenshot({ path: tabletCardPath });
      fs.copyFileSync(tabletCardPath, artifactTabletCardPath);
      console.log(`Saved: ${tabletCardPath}`);
    }

    console.log('\n' + '='.repeat(80));
    const passCount = results.filter((r) => r.passed).length;
    console.log(`SUMMARY: ${passCount} / ${results.length} assertions passed.`);
    console.log('='.repeat(80));
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await browser.close();
  }
}

run();
