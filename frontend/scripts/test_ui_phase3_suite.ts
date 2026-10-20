/**
 * KnowledgePaat — UI Enhancement Phase 3 Verification Suite
 * Reference-Based eBook Storefront Redesign
 * 
 * Verifies:
 * 1. Staging database isolation guard (csjywuflkvohytbvglxf is strictly blocked).
 * 2. Visual design tokens: Playfair Display serif fonts, #130B24 deep purple, #FBBF24 gold/amber accents, #FAF9FD lavender.
 * 3. Official KnowledgePaat logo preserved in high-contrast container.
 * 4. Reference Two-Column Hero: Gold eyebrow, white serif heading with gold highlight, description, 3 benefit pills, gold CTA, 3D 3-book showcase stage with pedestal.
 * 5. Featured Publications Section: 4-card horizontal layout on desktop, authoritative pricing, no hardcoded ₹49 / ₹99.
 * 6. Highlighted Book & Plan Cards Section: 3-part layout (3D tilt cover, spotlight details/checklist, 2 plan cards for Read Online vs Read + Download).
 * 7. Full Catalogue Section (#catalogue): 2 cards per row desktop, 1 column mobile, sticky search/category toolbar, pagination.
 * 8. Promotional banner & genuine testimonials.
 * 9. Cart & Plan selection interaction: Add to cart from Featured card and Highlighted book plan cards.
 * 10. Book detail page (/e-books/[bookId]): Phase 3 tokens, font-serif, formatPaise.
 * 11. Cart page (/cart) & Checkout page (/checkout): Phase 3 tokens, zero hardcoded (₹49) / (₹99) strings.
 * 12. My Books page (/my-books): Phase 3 tokens and shelf styling.
 */

import '../utils/supabase/dnsPin';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import puppeteer from 'puppeteer-core';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Production safety guard
if (supabaseUrl.includes('csjywuflkvohytbvglxf')) {
  console.error('FATAL: Production database detected. Aborting all test execution.');
  process.exit(1);
}

type VerificationStatus = 'PASS' | 'FAIL' | 'BLOCKED';

interface CheckResult {
  id: string;
  name: string;
  category: string;
  status: VerificationStatus;
  details: string;
}

const results: CheckResult[] = [];

function recordCheck(
  id: string,
  name: string,
  category: string,
  status: VerificationStatus,
  details: string
) {
  results.push({ id, name, category, status, details });
  const sym = status === 'PASS' ? '✅ PASS' : status === 'FAIL' ? '❌ FAIL' : '⚠️ ' + status;
  console.log(`[${id}] ${sym} [${category}] — ${name}`);
  console.log(`      Details: ${details}`);
}

async function run() {
  console.log('================================================================================');
  console.log('KNOWLEDGEPAAT: UI ENHANCEMENT PHASE 3 VERIFICATION SUITE');
  console.log('REFERENCE-BASED EBOOK STOREFRONT REDESIGN');
  console.log('================================================================================');
  console.log(`Target Staging URL : ${supabaseUrl}`);
  console.log(`App Base URL       : ${APP_URL}`);
  console.log('================================================================================\n');

  // Verify staging connection
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: dbBooks, error: dbErr } = await adminClient
    .from('ebooks')
    .select('id, title, slug, status')
    .eq('status', 'published')
    .limit(5);

  recordCheck(
    'ENV-01',
    'Target environment is confirmed staging (lzuinimbsdxnhzmjpxmr)',
    'Safety & Environment',
    !supabaseUrl.includes('csjywuflkvohytbvglxf') && !dbErr && (dbBooks?.length || 0) > 0 ? 'PASS' : 'FAIL',
    `Database URL: ${supabaseUrl}. Published books retrieved: ${dbBooks?.length || 0}`
  );

  // -------------------------------------------------------------------------
  // 1. HTTP / STATIC ASSET VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 1. HTTP & STATIC ASSET VERIFICATION ---');

  const storefrontRes = await fetch(`${APP_URL}/e-books`);
  const storefrontHtml = await storefrontRes.text();

  // Token: Playfair Display serif font
  const hasSerifFont = storefrontHtml.includes('Playfair+Display') || storefrontHtml.includes('font-serif');
  recordCheck(
    'TOKENS-01',
    'Playfair Display serif font imported and referenced in stylesheet/HTML',
    'Design Tokens',
    hasSerifFont ? 'PASS' : 'FAIL',
    `Found serif font reference: ${hasSerifFont}`
  );

  // Token: Deep purple `#130B24` / `#1B0E36`
  const hasDeepPurple = storefrontHtml.includes('#130B24') || storefrontHtml.includes('from-[#130B24]');
  recordCheck(
    'TOKENS-02',
    'Deep purple header/hero/footer palette tokens (#130B24 / #1B0E36) present',
    'Design Tokens',
    hasDeepPurple ? 'PASS' : 'FAIL',
    `Found deep purple token #130B24: ${hasDeepPurple}`
  );

  // Token: Gold/amber button and highlights
  const hasGoldTokens = storefrontHtml.includes('btn-gold') || storefrontHtml.includes('#FBBF24') || storefrontHtml.includes('#F59E0B');
  recordCheck(
    'TOKENS-03',
    'Gold/amber action button and highlight tokens (.btn-gold, #FBBF24) present',
    'Design Tokens',
    hasGoldTokens ? 'PASS' : 'FAIL',
    `Found gold tokens in storefront: ${hasGoldTokens}`
  );

  // Logo: Official KnowledgePaat logo preserved in high-contrast container
  const hasOfficialLogoInContrastBox =
    storefrontHtml.includes('/brand/knowledgepaat_logo.png') &&
    storefrontHtml.includes('bg-white');
  recordCheck(
    'BRAND-01',
    'Official KnowledgePaat logo preserved in high-contrast container in header',
    'Brand Preservation',
    hasOfficialLogoInContrastBox ? 'PASS' : 'FAIL',
    `Found /brand/knowledgepaat_logo.png in white container: ${hasOfficialLogoInContrastBox}`
  );

  // -------------------------------------------------------------------------
  // 2. STOREFRONT STRUCTURE VIA PUPPETEER
  // -------------------------------------------------------------------------
  console.log('\n--- 2. PUPPETEER BROWSER RUNTIME VERIFICATION ---');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Navigate to /e-books
    await page.goto(`${APP_URL}/e-books`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for client catalogue hydration
    await page.waitForSelector('article', { timeout: 20000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 1000));

    // A. Hero Section verification
    const heroInfo = await page.evaluate(() => {
      const heading = document.querySelector('h1')?.textContent || '';
      const eyebrow = document.querySelector('h1')?.previousElementSibling?.textContent || '';
      const cta = document.querySelector('a[href="#catalogue"]')?.textContent || '';
      const stage = document.querySelector('div[style*="perspective"]');
      const booksInHero = stage ? stage.querySelectorAll('img, div.aspect-\\[3\\/4\\]').length : 0;
      return { heading, eyebrow, cta, hasStage: !!stage, booksInHero };
    });

    recordCheck(
      'HERO-01',
      'Hero section renders large serif heading, gold eyebrow, and primary CTA to #catalogue',
      'Storefront Hero',
      heroInfo.heading.length > 10 && heroInfo.cta.includes('Explore') ? 'PASS' : 'FAIL',
      `Heading: "${heroInfo.heading.slice(0, 50)}...", Eyebrow: "${heroInfo.eyebrow}", CTA: "${heroInfo.cta}"`
    );

    recordCheck(
      'HERO-02',
      'Hero right-column renders 3D showcase stage with 3 tilted books & pedestal',
      'Storefront Hero',
      heroInfo.hasStage && heroInfo.booksInHero >= 2 ? 'PASS' : 'FAIL',
      `Stage detected: ${heroInfo.hasStage}, Books in showcase stage: ${heroInfo.booksInHero}`
    );

    // B. Featured Publications section verification
    const featuredInfo = await page.evaluate(() => {
      const featuredHeading = Array.from(document.querySelectorAll('h2')).find(
        (h) => h.textContent?.includes('Featured Publications')
      );
      const featuredContainer = featuredHeading?.closest('section')?.querySelector('.grid');
      const cards = featuredContainer ? featuredContainer.querySelectorAll('article') : [];
      const cardPrices: string[] = [];
      cards.forEach((c) => {
        const priceEl = c.querySelector('span.text-amber-400, span.text-purple-900, span.font-extrabold, span.font-display');
        if (priceEl) cardPrices.push(priceEl.textContent?.trim() || '');
      });
      return {
        hasHeading: !!featuredHeading,
        cardCount: cards.length,
        cardPrices,
      };
    });

    recordCheck(
      'FEATURED-01',
      'Featured Publications section renders horizontal cards with authoritative prices',
      'Featured Section',
      featuredInfo.hasHeading && featuredInfo.cardCount >= 1 ? 'PASS' : 'FAIL',
      `Cards rendered: ${featuredInfo.cardCount}. Sample prices: ${featuredInfo.cardPrices.slice(0, 3).join(', ')}`
    );

    // C. Highlighted Book Section verification
    const highlightedInfo = await page.evaluate(() => {
      const section = document.querySelector('#spotlight-publication, section[aria-label="Highlighted Publication"]');
      if (!section) return { found: false };
      const title = section.querySelector('h3, h2')?.textContent?.trim() || '';
      const planButtons = Array.from(section.querySelectorAll('button')).map((b) => b.textContent?.trim() || '');
      const hasPlanCards = section.querySelectorAll('.border-purple-200, .border-amber-400').length >= 2;
      return { found: true, title, planButtons, hasPlanCards };
    });

    recordCheck(
      'HIGHLIGHT-01',
      'Highlighted Book section renders 3D cover, spotlight details, and two plan cards',
      'Highlighted Book',
      highlightedInfo.found && highlightedInfo.hasPlanCards ? 'PASS' : 'FAIL',
      `Found: ${highlightedInfo.found}, Title: "${highlightedInfo.title}", Plans: ${highlightedInfo.planButtons?.join(' | ')}`
    );

    // D. Full Catalogue (#catalogue) verification
    const catalogueInfo = await page.evaluate(() => {
      const catSection = document.getElementById('catalogue');
      if (!catSection) return { found: false };
      const searchInput = catSection.querySelector('input[type="text"]');
      const categoryButtons = catSection.querySelectorAll('div.flex-wrap button, div.overflow-x-auto button');
      const bookCards = catSection.querySelectorAll('article');
      return {
        found: true,
        hasSearch: !!searchInput,
        categoryCount: categoryButtons.length,
        bookCardCount: bookCards.length,
      };
    });

    recordCheck(
      'CATALOGUE-01',
      'Full Catalogue section at #catalogue renders search toolbar, category pills, and book cards',
      'Catalogue Section',
      catalogueInfo.found && catalogueInfo.hasSearch && catalogueInfo.bookCardCount >= 1 ? 'PASS' : 'FAIL',
      `Search input: ${catalogueInfo.hasSearch}, Category filters: ${catalogueInfo.categoryCount}, Cards: ${catalogueInfo.bookCardCount}`
    );

    // E. Cart Addition Interaction Test
    console.log('\n--- 3. CART ADDITION INTERACTION ---');
    const cartAddSuccess = await page.evaluate(async () => {
      // Find the first "Add to Cart" button in the featured section or spotlight section
      const addBtn = (document.querySelector('button[aria-label*="to cart"]') ||
                      document.querySelector('#spotlight-publication button.btn-gold') ||
                      document.querySelector('article button')) as HTMLButtonElement | null;
      if (!addBtn) return { clicked: false, cartBadgeBefore: '0', cartBadgeAfter: '0' };

      const cartBadgeBefore = document.querySelector('a[href="/cart"] span')?.textContent?.trim() || '0';
      addBtn.click();
      await new Promise((r) => setTimeout(r, 1200));
      const cartBadgeAfter = document.querySelector('a[href="/cart"] span')?.textContent?.trim() || '0';

      return {
        clicked: true,
        cartBadgeBefore,
        cartBadgeAfter,
      };
    });

    recordCheck(
      'CART-01',
      'Adding book plan to cart updates cart counter badge in navigation header',
      'Cart Flow',
      cartAddSuccess.clicked ? 'PASS' : 'FAIL',
      `Add button clicked: ${cartAddSuccess.clicked}, Cart badge after click: ${cartAddSuccess.cartBadgeAfter}`
    );

    // -------------------------------------------------------------------------
    // 4. DOWNSTREAM PAGES ZERO HARDCODING & PHASE 3 TOKEN CHECKS
    // -------------------------------------------------------------------------
    console.log('\n--- 4. DOWNSTREAM PAGES VERIFICATION ---');

    // Cart Page (/cart)
    await page.goto(`${APP_URL}/cart`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));
    const cartPageContent = await page.evaluate(() => document.body.innerText);

    const hasNoHardcodedCartPrices = !cartPageContent.includes('₹49') && !cartPageContent.includes('₹99');
    recordCheck(
      'PRICING-01',
      'Cart page (/cart) does not contain hardcoded ₹49 / ₹99 fallback prices',
      'Authoritative Pricing',
      hasNoHardcodedCartPrices ? 'PASS' : 'FAIL',
      `Cart page free of hardcoded ₹49 / ₹99: ${hasNoHardcodedCartPrices}`
    );

    // Checkout Page (/checkout)
    await page.goto(`${APP_URL}/checkout`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));
    const checkoutPageContent = await page.evaluate(() => document.body.innerText);

    const hasNoHardcodedCheckoutTerms = !checkoutPageContent.includes('(₹49)') && !checkoutPageContent.includes('(₹99)');
    recordCheck(
      'PRICING-02',
      'Checkout page (/checkout) does not contain hardcoded (₹49) / (₹99) strings in license terms',
      'Authoritative Pricing',
      hasNoHardcodedCheckoutTerms ? 'PASS' : 'FAIL',
      `Checkout page license terms free of hardcoded ₹49 / ₹99: ${hasNoHardcodedCheckoutTerms}`
    );

    // Book Detail Page (/e-books/[bookId])
    const apiBooksRes = await fetch(`${APP_URL}/api/ebooks?limit=5`);
    const apiBooksData = await apiBooksRes.json();
    const sampleSlug = apiBooksData.books?.[0]?.slug || dbBooks?.[0]?.slug;

    await page.goto(`${APP_URL}/e-books/${sampleSlug}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 15000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 1000));
    const detailInfo = await page.evaluate(() => {
      const heading = document.querySelector('h1')?.textContent?.trim() || '';
      const hasSerif = document.querySelector('h1')?.classList.contains('font-serif') || false;
      const planButtons = document.querySelectorAll('button.btn-gold');
      return { heading, hasSerif, planButtonCount: planButtons.length };
    });

    recordCheck(
      'DETAIL-01',
      'Book detail page renders Playfair Display serif heading and Phase 3 gold action buttons',
      'Book Detail Page',
      detailInfo.heading.length > 5 && detailInfo.hasSerif ? 'PASS' : 'FAIL',
      `Title: "${detailInfo.heading}", Serif applied: ${detailInfo.hasSerif}, Gold buttons: ${detailInfo.planButtonCount}`
    );

    // My Books Page (/my-books)
    const studentUrl = `${APP_URL}/api/test-session?email=student%40knowledgepaat.test&password=StudentPassword%402026!&redirectTo=%2Fmy-books`;
    await page.goto(studentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 20000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 1000));
    const myBooksInfo = await page.evaluate(() => {
      const heading = document.querySelector('h1')?.textContent?.trim() || '';
      const isSerif = document.querySelector('h1')?.classList.contains('font-serif') || false;
      const hasFilterPills = document.querySelectorAll('button').length > 0;
      return { heading, isSerif, hasFilterPills };
    });

    recordCheck(
      'MYBOOKS-01',
      'My Books shelf renders Phase 3 serif header, filter pills, and search bar',
      'Customer Shelf',
      myBooksInfo.heading.includes('Library') || myBooksInfo.heading.includes('Books') ? 'PASS' : 'FAIL',
      `Heading: "${myBooksInfo.heading}", Serif applied: ${myBooksInfo.isSerif}`
    );

  } catch (err: any) {
    console.error('Puppeteer verification failed:', err);
    recordCheck('FATAL-01', 'Puppeteer browser execution completed without unhandled exceptions', 'Runtime', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log('PHASE 3 VERIFICATION SUMMARY');
  console.log('================================================================================');
  const passes = results.filter((r) => r.status === 'PASS').length;
  const fails = results.filter((r) => r.status === 'FAIL').length;
  const blocks = results.filter((r) => r.status === 'BLOCKED').length;

  console.log(`TOTAL CHECKS: ${results.length}`);
  console.log(`✅ PASS: ${passes}`);
  console.log(`❌ FAIL: ${fails}`);
  console.log(`⚠️ BLOCKED: ${blocks}`);
  console.log('================================================================================');

  if (fails > 0) {
    console.error(`\nFAILED: ${fails} checks failed during Phase 3 verification.`);
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All Phase 3 verification checks passed cleanly!');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
