const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/ebooks/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verify() {
  console.log('='.repeat(70));
  console.log('VERIFYING BOOK CARD IMPROVEMENTS ACROSS VIEWPORTS');
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  const results = [];

  function assert(name, pass, detail) {
    results.push({ name, pass, detail });
    console.log(`${pass ? '✅ [PASS]' : '❌ [FAIL]'} ${name}: ${detail}`);
  }

  try {
    const viewports = [
      { name: 'Mobile 320px', width: 320, height: 700, isMobile: true, file: 'book_card_mobile_320.png' },
      { name: 'Mobile 390px', width: 390, height: 844, isMobile: true, file: 'book_card_mobile_390.png' },
      { name: 'Mobile 430px', width: 430, height: 932, isMobile: true, file: 'book_card_mobile_430.png' },
      { name: 'Tablet 768px', width: 768, height: 1024, isMobile: false, file: 'book_card_tablet_768.png' },
      { name: 'Desktop 1440px', width: 1440, height: 900, isMobile: false, file: 'book_card_desktop_1440.png' },
    ];

    for (const vp of viewports) {
      console.log(`\n--- Testing ${vp.name} (${vp.width}x${vp.height}) ---`);
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
        deviceScaleFactor: 2,
      });

      await page.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#catalogue article', { timeout: 15000 });
      await new Promise(r => setTimeout(r, 1200));

      // 1. Horizontal overflow check
      const overflow = await page.evaluate(() => {
        const docEl = document.documentElement;
        return {
          scrollWidth: docEl.scrollWidth,
          clientWidth: docEl.clientWidth,
          hasOverflow: docEl.scrollWidth > docEl.clientWidth,
        };
      });
      assert(
        `${vp.name} Horizontal Overflow`,
        !overflow.hasOverflow,
        `scrollWidth=${overflow.scrollWidth}px, clientWidth=${overflow.clientWidth}px`
      );

      // 2. Card layout structure inspection
      const cardMetrics = await page.evaluate((isPhone) => {
        const cards = Array.from(document.querySelectorAll('#catalogue article'));
        if (cards.length === 0) return { error: 'No cards found' };

        const firstCard = cards[0];
        const cardRect = firstCard.getBoundingClientRect();

        // Check upper row
        const upperRow = firstCard.firstElementChild;
        const upperChildren = upperRow ? Array.from(upperRow.children) : [];
        const coverWrapper = upperChildren[0];
        const coverRect = coverWrapper ? coverWrapper.getBoundingClientRect() : null;

        // Check fallback cover content
        const fallbackCover = firstCard.querySelector('.aspect-\\[2\\/3\\]');
        const fallbackText = fallbackCover ? fallbackCover.textContent.trim() : '';

        // Check bottom row
        const bottomRow = firstCard.children[1];
        const bottomRect = bottomRow ? bottomRow.getBoundingClientRect() : null;

        // Check touch target for actions
        const buttons = Array.from(firstCard.querySelectorAll('button'));
        const buttonMetrics = buttons.map(b => {
          const r = b.getBoundingClientRect();
          return { text: b.textContent.trim(), width: r.width, height: r.height };
        });

        // Check grid columns (how many cards in row 1)
        const topOffsets = cards.map(c => Math.round(c.getBoundingClientRect().top));
        const firstRowCards = topOffsets.filter(top => Math.abs(top - topOffsets[0]) < 8).length;

        // Check edition badge presence
        const textContent = firstCard.textContent;
        const hasEditionBadge = /Ed\.\s*\d+/i.test(textContent);

        return {
          cardWidth: cardRect.width,
          cardHeight: cardRect.height,
          coverWidth: coverRect ? coverRect.width : null,
          coverHeight: coverRect ? coverRect.height : null,
          bottomRowWidth: bottomRect ? bottomRect.width : null,
          firstRowCards,
          hasEditionBadge,
          fallbackTextSnippet: fallbackText.slice(0, 50),
          buttonMetrics,
        };
      }, vp.width < 640);

      assert(
        `${vp.name} Grid Columns`,
        vp.width < 640 ? cardMetrics.firstRowCards === 1 : cardMetrics.firstRowCards === 2,
        `Expected ${vp.width < 640 ? 1 : 2} cards per row, got ${cardMetrics.firstRowCards}`
      );

      assert(
        `${vp.name} Cover Width`,
        vp.width < 640 ? cardMetrics.coverWidth >= 80 && cardMetrics.coverWidth <= 92 : cardMetrics.coverWidth >= 96,
        `Cover width: ${Math.round(cardMetrics.coverWidth)}px`
      );

      assert(
        `${vp.name} Edition Badges Removed`,
        !cardMetrics.hasEditionBadge,
        `Edition badge in card: ${cardMetrics.hasEditionBadge ? 'YES (FAIL)' : 'NO (CLEAN)'}`
      );

      assert(
        `${vp.name} Touch Targets (>= 44px height)`,
        cardMetrics.buttonMetrics.every(b => b.height >= 43.5),
        `Buttons: ${cardMetrics.buttonMetrics.map(b => `${b.text} (${Math.round(b.width)}x${Math.round(b.height)}px)`).join(', ')}`
      );

      // Capture screenshot
      const shotPath = path.join(SCREENSHOT_DIR, vp.file);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`  📸 Screenshot captured: ${shotPath}`);
    }

    // 3. Test pagination navigation
    console.log('\n--- Testing Pagination ---');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#catalogue article');

    const p1Summary = await page.evaluate(() => {
      const el = document.querySelector('p.text-xs.sm\\:text-sm.text-\\[\\#756F99\\]');
      return el ? el.textContent.trim() : '';
    });
    console.log(`Page 1 summary: "${p1Summary}"`);

    const nextBtn = await page.$('button[aria-label="Next page"]');
    if (nextBtn) {
      await nextBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      const p2Summary = await page.evaluate(() => {
        const el = document.querySelector('p.text-xs.sm\\:text-sm.text-\\[\\#756F99\\]');
        return el ? el.textContent.trim() : '';
      });
      console.log(`Page 2 summary: "${p2Summary}"`);
      assert('Pagination Next Click', p2Summary.includes('Showing 11–'), `Summary: "${p2Summary}"`);
    }

    console.log('\n' + '='.repeat(70));
    const allPassed = results.every(r => r.pass);
    if (allPassed) {
      console.log('>>> ALL BOOK CARD VERIFICATIONS PASSED SUCCESSFULLY <<<');
    } else {
      console.log('>>> SOME CHECKS FAILED <<<');
    }
    console.log('='.repeat(70));

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

verify();
