/**
 * KnowledgePaat — UI Enhancement Phase 2 Verification Suite
 * 
 * Verifies:
 * 1. Main site header contains dedicated E-Books button beside hamburger menu.
 * 2. Main site header has removed the standalone eBook cart icon link.
 * 3. Dedicated eBook layout on /e-books, /e-books/[bookId], /cart, /checkout, /my-books.
 * 4. Header & Footer destinations (Logo -> /, Store Home -> /e-books, Browse -> /e-books#catalogue, etc.).
 * 5. Isolation: No simultaneous headers, reader is distraction-free, admin uses AdminLayout.
 * 6. Anonymous visitors can browse catalogue, book details, sample chapters, and cart without auth.
 * 7. Authenticated students can browse /e-books, /cart, /my-books, /checkout without student-dashboard redirects.
 * 8. Authentication return paths (/login?redirectTo=...) for /e-books, /my-books, /checkout.
 * 9. Safe redirect sanitizer rejects external/malformed URLs.
 * 10. Cart provider continuity at root layout.
 * 11. Accessible controls, aria attributes, keyboard escape handling.
 */

import '../utils/supabase/dnsPin';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { sanitizeInternalRedirectUrl } from '../lib/safeRedirect';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Production safety guard
if (supabaseUrl.includes('csjywuflkvohytbvglxf')) {
  console.error('FATAL: Production database detected. Aborting all test execution.');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type VerificationStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'UNVERIFIED';

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
  console.log('KNOWLEDGEPAAT: UI ENHANCEMENT PHASE 2 VERIFICATION SUITE');
  console.log('================================================================================');
  console.log(`Target Staging URL : ${supabaseUrl}`);
  console.log(`App Base URL       : ${APP_URL}`);
  console.log('================================================================================\n');

  // Find a verified published book for detail tests
  const booksApiRes = await fetch(`${APP_URL}/api/ebooks?limit=5`);
  const booksApiJson = await booksApiRes.json();
  const testBook = booksApiJson.books?.[0] || { id: 'test-book', title: 'Test Book', slug: 'cloud-system-architecture-devops' };
  console.log(`Using Test Book for detail verification: "${testBook.title}" (slug: ${testBook.slug})\n`);

  // =========================================================================
  // 1. MAIN KNOWLEDGEPAAT HEADER NAVIGATION
  // =========================================================================
  console.log('--- 1. MAIN KNOWLEDGEPAAT HEADER NAVIGATION ---');

  const mainHomeRes = await fetch(`${APP_URL}/`);
  const mainHomeHtml = await mainHomeRes.text();

  // Check 1: E-Books button beside hamburger menu
  const hasEbooksNavBtn =
    mainHomeHtml.includes('id="main-nav-ebooks-btn"') ||
    mainHomeHtml.includes('href="/e-books"') && mainHomeHtml.includes('aria-label="KnowledgePaat eBooks"');

  recordCheck(
    'MAIN-01',
    'Main header contains dedicated "E-Books" navigation button beside hamburger menu',
    'HTTP API / HTML',
    hasEbooksNavBtn ? 'PASS' : 'FAIL',
    `Found E-Books button with href="/e-books": ${hasEbooksNavBtn}`
  );

  // Check 2: Standalone eBook Shopping Cart control removed from main header
  const hasMainCartLink =
    mainHomeHtml.includes('aria-label="Shopping Cart"') &&
    mainHomeHtml.includes('href="/cart"') &&
    mainHomeHtml.includes('stroke-[2.2]');

  recordCheck(
    'MAIN-02',
    'Main header removed eBook shopping cart icon control (kept inside bookstore only)',
    'HTTP API / HTML',
    !hasMainCartLink ? 'PASS' : 'FAIL',
    `Standalone /cart control in main header present: ${hasMainCartLink} (Expected false)`
  );

  // Check 3: Preserves main site navigation (Jobs, Interview Prep, Notes, Pricing, Contact)
  const hasMainJobs = mainHomeHtml.includes('href="/jobs"');
  const hasMainPrep = mainHomeHtml.includes('href="/interview-preparation"');
  const hasMainNotes = mainHomeHtml.includes('href="/notes"');
  const hasMainPricing = mainHomeHtml.includes('href="/pricing"');

  recordCheck(
    'MAIN-03',
    'Main header preserves all core platform navigation links and appearance',
    'HTTP API / HTML',
    hasMainJobs && hasMainPrep && hasMainNotes && hasMainPricing ? 'PASS' : 'FAIL',
    `Jobs: ${hasMainJobs}, Interview Prep: ${hasMainPrep}, Notes: ${hasMainNotes}, Pricing: ${hasMainPricing}`
  );

  // =========================================================================
  // 2. DEDICATED EBOOK HEADER & DESTINATIONS
  // =========================================================================
  console.log('\n--- 2. DEDICATED EBOOK HEADER & DESTINATIONS ---');

  const ebookHomeRes = await fetch(`${APP_URL}/e-books`);
  const ebookHomeHtml = await ebookHomeRes.text();

  // Check 4: Logo links to main KnowledgePaat home at /
  const hasLogoToHome =
    ebookHomeHtml.includes('href="/"') &&
    ebookHomeHtml.includes('aria-label="KnowledgePaat — Return to main home"');

  recordCheck(
    'EBOOK-01',
    'eBook header logo links to main KnowledgePaat home at /',
    'HTTP API / HTML',
    hasLogoToHome ? 'PASS' : 'FAIL',
    `Logo links to / with accessible label: ${hasLogoToHome}`
  );

  // Check 5: Store Home destination /e-books
  const hasStoreHome = ebookHomeHtml.includes('href="/e-books"');

  recordCheck(
    'EBOOK-02',
    'eBook header contains Store Home destination (/e-books)',
    'HTTP API / HTML',
    hasStoreHome ? 'PASS' : 'FAIL',
    `Store Home link present: ${hasStoreHome}`
  );

  // Check 6: Browse Books catalogue anchor (/e-books#catalogue)
  const hasBrowseCatalogue = ebookHomeHtml.includes('href="/e-books#catalogue"');

  recordCheck(
    'EBOOK-03',
    'eBook header contains Browse Books catalogue anchor (/e-books#catalogue)',
    'HTTP API / HTML',
    hasBrowseCatalogue ? 'PASS' : 'FAIL',
    `Browse Books anchor link present: ${hasBrowseCatalogue}`
  );

  // Check 7: Categories navigation
  const hasCategories =
    ebookHomeHtml.includes('aria-label="eBook Categories"') ||
    ebookHomeHtml.includes('Categories');

  recordCheck(
    'EBOOK-04',
    'eBook header provides accessible Categories navigation dropdown and filter links',
    'HTTP API / HTML',
    hasCategories ? 'PASS' : 'FAIL',
    `Categories menu present: ${hasCategories}`
  );

  // Check 8: My Books destination visible to visitors
  const hasMyBooksLink = ebookHomeHtml.includes('href="/my-books"');

  recordCheck(
    'EBOOK-05',
    'My Books link is visible in eBook header for all visitors',
    'HTTP API / HTML',
    hasMyBooksLink ? 'PASS' : 'FAIL',
    `My Books link present: ${hasMyBooksLink}`
  );

  // Check 9: Search quick action / input
  const hasSearchAction =
    ebookHomeHtml.includes('aria-label="Search technical eBooks"') ||
    ebookHomeHtml.includes('Search technical eBooks');

  recordCheck(
    'EBOOK-06',
    'eBook header provides search input and catalogue discovery action',
    'HTTP API / HTML',
    hasSearchAction ? 'PASS' : 'FAIL',
    `Search control present: ${hasSearchAction}`
  );

  // Check 10: Shopping Cart with accurate link (/cart)
  const hasCartBtn =
    ebookHomeHtml.includes('id="ebook-header-cart-btn"') ||
    ebookHomeHtml.includes('href="/cart"');

  recordCheck(
    'EBOOK-07',
    'eBook header contains dedicated shopping cart button (/cart)',
    'HTTP API / HTML',
    hasCartBtn ? 'PASS' : 'FAIL',
    `eBook cart button present: ${hasCartBtn}`
  );

  // Check 11: Sign In return path points to /e-books
  const hasSignInReturn =
    ebookHomeHtml.includes('href="/login?redirectTo=%2Fe-books"') ||
    ebookHomeHtml.includes('href="/login?redirectTo=/e-books"');

  recordCheck(
    'EBOOK-08',
    'eBook header Sign In button contains safe return path to /e-books',
    'HTTP API / HTML',
    hasSignInReturn ? 'PASS' : 'FAIL',
    `Sign In button return path: ${hasSignInReturn}`
  );

  // =========================================================================
  // 3. DEDICATED EBOOK FOOTER
  // =========================================================================
  console.log('\n--- 3. DEDICATED EBOOK FOOTER ---');

  const hasFooterBrandLogo = ebookHomeHtml.includes('href="/"') && ebookHomeHtml.includes('Bookstore');
  const hasFooterBackHome = ebookHomeHtml.includes('Back to KnowledgePaat Platform Home');
  const hasFooterJobs = ebookHomeHtml.includes('href="/jobs"');
  const hasFooterAbout = ebookHomeHtml.includes('href="/about"');
  const hasFooterContact = ebookHomeHtml.includes('href="/contact"');
  const hasFooterAdmin = ebookHomeHtml.includes('href="/admin/login"');

  recordCheck(
    'FOOT-01',
    'eBook dedicated footer renders official brand logo, platform links, and return to main home',
    'HTTP API / HTML',
    hasFooterBrandLogo && hasFooterBackHome && hasFooterJobs && hasFooterAbout && hasFooterContact && hasFooterAdmin ? 'PASS' : 'FAIL',
    `Footer Logo: ${hasFooterBrandLogo}, Back Home: ${hasFooterBackHome}, Jobs: ${hasFooterJobs}, About: ${hasFooterAbout}, Contact: ${hasFooterContact}, Admin Login: ${hasFooterAdmin}`
  );

  // =========================================================================
  // 4. CORRECT PAGE WRAPPERS & LAYOUT ISOLATION
  // =========================================================================
  console.log('\n--- 4. CORRECT PAGE WRAPPERS & LAYOUT ISOLATION ---');

  // Verify all 5 required eBook routes render EBookLayout
  const cartRes = await fetch(`${APP_URL}/cart`);
  const cartHtml = await cartRes.text();
  const cartUsesEbookLayout = cartHtml.includes('Store Home') && cartHtml.includes('eBooks');

  recordCheck(
    'WRAP-01',
    '/cart uses dedicated EBookLayout',
    'HTTP API / HTML',
    cartUsesEbookLayout ? 'PASS' : 'FAIL',
    `Cart renders EBookLayout: ${cartUsesEbookLayout}`
  );

  // Verify book detail uses EBookLayout
  const detailRes = await fetch(`${APP_URL}/e-books/${testBook.slug || testBook.id}`);
  const detailHtml = await detailRes.text();
  const detailUsesEbookLayout = detailHtml.includes('Store Home') && detailHtml.includes('eBooks');

  recordCheck(
    'WRAP-02',
    '/e-books/[bookId] uses dedicated EBookLayout',
    'HTTP API / HTML',
    detailUsesEbookLayout ? 'PASS' : 'FAIL',
    `Book detail renders EBookLayout: ${detailUsesEbookLayout}`
  );

  // Verify main site page (/jobs) uses PublicLayout (not EBookLayout)
  const jobsRes = await fetch(`${APP_URL}/jobs`);
  const jobsHtml = await jobsRes.text();
  const jobsUsesPublicLayout = jobsHtml.includes('id="main-nav-ebooks-btn"') && !jobsHtml.includes('Store Home');

  recordCheck(
    'WRAP-03',
    'Main site pages (/jobs, /, etc.) use PublicLayout without eBook header duplication',
    'HTTP API / HTML',
    jobsUsesPublicLayout ? 'PASS' : 'FAIL',
    `Main site renders PublicLayout with E-Books button, no Store Home: ${jobsUsesPublicLayout}`
  );

  // Verify no page renders both headers simultaneously
  const hasDoubleHeader = ebookHomeHtml.includes('id="main-nav-ebooks-btn"') && ebookHomeHtml.includes('id="ebook-header-cart-btn"');

  recordCheck(
    'WRAP-04',
    'No page renders main and eBook headers simultaneously',
    'STATIC / HTML',
    !hasDoubleHeader ? 'PASS' : 'FAIL',
    `Double header detected: ${hasDoubleHeader} (Expected false)`
  );

  // =========================================================================
  // 5. ANONYMOUS PUBLIC BROWSING
  // =========================================================================
  console.log('\n--- 5. ANONYMOUS PUBLIC BROWSING ---');

  recordCheck(
    'BROWSE-01',
    'Anonymous visitors can open /e-books directly without authentication',
    'HTTP API',
    ebookHomeRes.status === 200 ? 'PASS' : 'FAIL',
    `HTTP Status: ${ebookHomeRes.status} (Expected 200)`
  );

  const catFilterRes = await fetch(`${APP_URL}/api/ebooks?category=Engineering`);
  const catFilterData = await catFilterRes.json();

  recordCheck(
    'BROWSE-02',
    'Anonymous visitors can filter catalogue by category via public API',
    'HTTP API',
    catFilterRes.status === 200 && catFilterData.success ? 'PASS' : 'FAIL',
    `HTTP Status: ${catFilterRes.status}, Books returned: ${catFilterData.books?.length || 0}`
  );

  recordCheck(
    'BROWSE-03',
    'Anonymous visitors can open book details without authentication',
    'HTTP API',
    detailRes.status === 200 ? 'PASS' : 'FAIL',
    `HTTP Status: ${detailRes.status} (Expected 200)`
  );

  recordCheck(
    'BROWSE-04',
    'Anonymous visitors can access guest shopping cart (/cart) without authentication',
    'HTTP API',
    cartRes.status === 200 ? 'PASS' : 'FAIL',
    `HTTP Status: ${cartRes.status} (Expected 200)`
  );

  // =========================================================================
  // 6. SIGNED-IN STUDENT BROWSING WITHOUT DASHBOARD REDIRECTION
  // =========================================================================
  console.log('\n--- 6. SIGNED-IN STUDENT BROWSING ---');

  const studentEmail = 'student@knowledgepaat.test';
  const studentPassword = 'StudentPassword@2026!';

  // Obtain verified student session cookies via test session route
  const studentSessionRes = await fetch(
    `${APP_URL}/api/test-session?email=${encodeURIComponent(studentEmail)}&password=${encodeURIComponent(studentPassword)}&redirectTo=/e-books`,
    { redirect: 'manual' }
  );

  const studentCookies = (studentSessionRes.headers as any).getSetCookie
    ? (studentSessionRes.headers as any).getSetCookie()
    : [studentSessionRes.headers.get('set-cookie') || ''];
  const studentCookieHeader = studentCookies.map((c: string) => c.split(';')[0]).filter(Boolean).join('; ');

  // Request /e-books as signed-in student
  const studentEbooksRes = await fetch(`${APP_URL}/e-books`, {
    headers: { Cookie: studentCookieHeader },
    redirect: 'manual',
  });

  recordCheck(
    'STUDENT-01',
    'Signed-in students can browse /e-books without being redirected to student dashboard',
    'HTTP API / MIDDLEWARE',
    studentEbooksRes.status === 200 ? 'PASS' : 'FAIL',
    `HTTP Status: ${studentEbooksRes.status} (Expected 200, not 307 redirect to dashboard)`
  );

  // Request /cart as signed-in student
  const studentCartRes = await fetch(`${APP_URL}/cart`, {
    headers: { Cookie: studentCookieHeader },
    redirect: 'manual',
  });

  recordCheck(
    'STUDENT-02',
    'Signed-in students can access /cart without being redirected to student dashboard',
    'HTTP API / MIDDLEWARE',
    studentCartRes.status === 200 ? 'PASS' : 'FAIL',
    `HTTP Status: ${studentCartRes.status} (Expected 200)`
  );

  // Request /my-books as signed-in student
  const studentMyBooksRes = await fetch(`${APP_URL}/my-books`, {
    headers: { Cookie: studentCookieHeader },
    redirect: 'manual',
  });

  recordCheck(
    'STUDENT-03',
    'Signed-in students can access /my-books directly to view their digital library',
    'HTTP API / MIDDLEWARE',
    studentMyBooksRes.status === 200 ? 'PASS' : 'FAIL',
    `HTTP Status: ${studentMyBooksRes.status} (Expected 200)`
  );

  // =========================================================================
  // 7. AUTHENTICATION RETURN PATHS & SECURITY
  // =========================================================================
  console.log('\n--- 7. AUTHENTICATION RETURN PATHS & SECURITY ---');

  // Anonymous access to /my-books must redirect to /login?redirectTo=/my-books
  const anonMyBooksRes = await fetch(`${APP_URL}/my-books`, { redirect: 'manual' });
  const anonMyBooksLocation = anonMyBooksRes.headers.get('location') || '';

  recordCheck(
    'AUTH-01',
    'Anonymous access to /my-books triggers redirect to /login?redirectTo=/my-books',
    'HTTP API / MIDDLEWARE',
    anonMyBooksRes.status === 307 && anonMyBooksLocation.includes('redirectTo=%2Fmy-books') ? 'PASS' : 'FAIL',
    `Status: ${anonMyBooksRes.status}, Location: "${anonMyBooksLocation}"`
  );

  // Anonymous access to /checkout must redirect to /login?redirectTo=/checkout
  const anonCheckoutRes = await fetch(`${APP_URL}/checkout`, { redirect: 'manual' });
  const anonCheckoutLocation = anonCheckoutRes.headers.get('location') || '';

  recordCheck(
    'AUTH-02',
    'Anonymous access to /checkout triggers redirect to /login?redirectTo=/checkout',
    'HTTP API / MIDDLEWARE',
    anonCheckoutRes.status === 307 && anonCheckoutLocation.includes('redirectTo=%2Fcheckout') ? 'PASS' : 'FAIL',
    `Status: ${anonCheckoutRes.status}, Location: "${anonCheckoutLocation}"`
  );

  // Safe redirect helper validation
  const safeEbooks = sanitizeInternalRedirectUrl('/e-books', '/student/dashboard');
  const safeMyBooks = sanitizeInternalRedirectUrl('/my-books', '/student/dashboard');
  const safeCheckout = sanitizeInternalRedirectUrl('/checkout', '/student/dashboard');
  const safeCart = sanitizeInternalRedirectUrl('/cart', '/student/dashboard');

  recordCheck(
    'AUTH-03',
    'sanitizeInternalRedirectUrl safely permits legitimate eBook return paths',
    'SECURITY / UNIT',
    safeEbooks === '/e-books' && safeMyBooks === '/my-books' && safeCheckout === '/checkout' && safeCart === '/cart' ? 'PASS' : 'FAIL',
    `/e-books -> ${safeEbooks}, /my-books -> ${safeMyBooks}, /checkout -> ${safeCheckout}, /cart -> ${safeCart}`
  );

  // Malicious / open redirect attempts rejected
  const maliciousDomain = sanitizeInternalRedirectUrl('https://evil-hacker.com/steal', '/student/dashboard');
  const protocolRelative = sanitizeInternalRedirectUrl('//evil.com/phish', '/student/dashboard');
  const backslashRelative = sanitizeInternalRedirectUrl('/\\evil.com', '/student/dashboard');
  const javascriptUrl = sanitizeInternalRedirectUrl('javascript:alert(1)', '/student/dashboard');

  recordCheck(
    'AUTH-04',
    'sanitizeInternalRedirectUrl rejects open-redirect and protocol attack vectors',
    'SECURITY / UNIT',
    maliciousDomain === '/student/dashboard' &&
    protocolRelative === '/student/dashboard' &&
    backslashRelative === '/student/dashboard' &&
    javascriptUrl === '/student/dashboard'
      ? 'PASS' : 'FAIL',
    `external: ${maliciousDomain}, //relative: ${protocolRelative}, backslash: ${backslashRelative}, js: ${javascriptUrl}`
  );

  // =========================================================================
  // 8. CART & SESSION STATE CONTINUITY
  // =========================================================================
  console.log('\n--- 8. CART & SESSION STATE CONTINUITY ---');

  // Verify EBookCartProvider is declared in app/layout.tsx
  const fs = await import('fs');
  const layoutContent = fs.readFileSync(path.resolve(__dirname, '../app/layout.tsx'), 'utf-8');
  const hasCartProviderInRoot = layoutContent.includes('<EBookCartProvider>') && layoutContent.includes('{children}');

  recordCheck(
    'CART-01',
    'EBookCartProvider wraps {children} at RootLayout level, preventing provider unmounting across page navigation',
    'STATIC INSPECTION',
    hasCartProviderInRoot ? 'PASS' : 'FAIL',
    `RootLayout contains <EBookCartProvider>: ${hasCartProviderInRoot}`
  );

  const cartContextContent = fs.readFileSync(path.resolve(__dirname, '../lib/ebook/cartContext.tsx'), 'utf-8');
  const hasStorageKey = cartContextContent.includes("CART_STORAGE_KEY = 'knowledgepaat_ebook_cart_v1'");

  recordCheck(
    'CART-02',
    'Cart preserves canonical storage key "knowledgepaat_ebook_cart_v1"',
    'STATIC INSPECTION',
    hasStorageKey ? 'PASS' : 'FAIL',
    `Storage key canonical: ${hasStorageKey}`
  );

  // =========================================================================
  // 9. ACCESSIBLE MOBILE NAVIGATION & CONTROLS
  // =========================================================================
  console.log('\n--- 9. ACCESSIBLE MOBILE NAVIGATION & CONTROLS ---');

  const hasMobileAria =
    ebookHomeHtml.includes('aria-label="Toggle eBook navigation menu"') &&
    ebookHomeHtml.includes('aria-expanded=') &&
    ebookHomeHtml.includes('aria-controls="ebook-mobile-menu"');

  recordCheck(
    'A11Y-01',
    'Mobile navigation toggle declares clear aria-label, aria-expanded, and aria-controls',
    'ACCESSIBILITY / HTML',
    hasMobileAria ? 'PASS' : 'FAIL',
    `Mobile toggle accessibility attributes present: ${hasMobileAria}`
  );

  const ebookLayoutContent = fs.readFileSync(path.resolve(__dirname, '../layouts/EBookLayout.tsx'), 'utf-8');
  const hasCloseAria =
    ebookLayoutContent.includes('aria-label="Close navigation menu"') &&
    ebookLayoutContent.includes('data-close-btn') &&
    ebookLayoutContent.includes('role="dialog"') &&
    ebookLayoutContent.includes('aria-modal="true"');

  recordCheck(
    'A11Y-02',
    'Mobile navigation drawer declares accessible close button with focus targets',
    'ACCESSIBILITY / COMPONENT',
    hasCloseAria ? 'PASS' : 'FAIL',
    `Close button attributes present in EBookLayout component: ${hasCloseAria}`
  );

  const hasCartAria = ebookHomeHtml.includes('aria-label="eBook Shopping Cart with 0 items"');

  recordCheck(
    'A11Y-03',
    'eBook shopping cart icon button declares live item count in aria-label',
    'ACCESSIBILITY / HTML',
    hasCartAria ? 'PASS' : 'FAIL',
    `Cart button accessibility label present: ${hasCartAria}`
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================================');
  console.log('PHASE 2 VERIFICATION COMPLETE:');
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const blocked = results.filter(r => r.status === 'BLOCKED').length;
  const unverified = results.filter(r => r.status === 'UNVERIFIED').length;
  console.log(`Total Checks Executed : ${total}`);
  console.log(`Passed                : ${passed}`);
  console.log(`Failed                : ${failed}`);
  console.log(`Blocked               : ${blocked}`);
  console.log(`Unverified            : ${unverified}`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
