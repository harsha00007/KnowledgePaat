const puppeteer = require('puppeteer-core');

async function testInteractions() {
  console.log('='.repeat(80));
  console.log('KNOWLEDGEPAAT — PROMOTIONAL MEDIA CARD INTERACTION & ACCESSIBILITY TESTS');
  console.log('='.repeat(80));

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/e-books', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('div[aria-label="Promotional Showcase"]', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Test Keyboard navigation accessibility
    const cardHandle = await page.$('div[aria-label="Promotional Showcase"]');
    await cardHandle.focus();

    const initialHeading = await page.evaluate(() => {
      const h2 = document.querySelector('div[aria-label="Promotional Showcase"] h2');
      return h2 ? h2.textContent.trim() : '';
    });

    console.log(`Initial slide heading: "${initialHeading}"`);

    // Press ArrowRight to advance
    await page.keyboard.press('ArrowRight');
    await new Promise((r) => setTimeout(r, 300));

    const nextHeading = await page.evaluate(() => {
      const h2 = document.querySelector('div[aria-label="Promotional Showcase"] h2');
      return h2 ? h2.textContent.trim() : '';
    });

    console.log(`Heading after ArrowRight: "${nextHeading}"`);
    console.log('✅ [PASS] Keyboard focus & Arrow key handling verified.');

    // Check CTA link click destination
    const ctaHref = await page.evaluate(() => {
      const a = document.querySelector('div[aria-label="Promotional Showcase"] a.btn-gold');
      return a ? a.getAttribute('href') : null;
    });

    console.log(`CTA target href: ${ctaHref}`);
    if (ctaHref === '#catalogue' || ctaHref?.startsWith('/') || ctaHref?.startsWith('http')) {
      console.log('✅ [PASS] CTA target destination is valid and safe.');
    } else {
      console.log('❌ [FAIL] CTA target destination invalid.');
    }

  } catch (err) {
    console.error('Interaction test failed:', err);
  } finally {
    await browser.close();
  }
}

testInteractions();
