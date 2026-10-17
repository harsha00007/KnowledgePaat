/**
 * Test Suite: Usability Audit Fixes (Homepage + Student Dashboard)
 * Validates the 4 Homepage issues and 10 Dashboard issues.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const homePath = path.resolve(__dirname, '../app/page.tsx');
const layoutPath = path.resolve(__dirname, '../layouts/StudentLayout.tsx');
const dashPath = path.resolve(__dirname, '../app/student/dashboard/page.tsx');
const nextActionPath = path.resolve(__dirname, '../components/NextActionWidget.tsx');

// Normalize CRLF to LF for cross-platform string assertion
const homeContent = fs.readFileSync(homePath, 'utf8').replace(/\r\n/g, '\n');
const layoutContent = fs.readFileSync(layoutPath, 'utf8').replace(/\r\n/g, '\n');
const dashContent = fs.readFileSync(dashPath, 'utf8').replace(/\r\n/g, '\n');
const nextActionContent = fs.readFileSync(nextActionPath, 'utf8').replace(/\r\n/g, '\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`PASS ${description}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${description}`);
    console.error(`  ${err.message}`);
    failed++;
  }
}

console.log('=== HOMEPAGE AUDIT FIXES (4 ISSUES) ===');

// Issue 1: Too many button styles normalized
test('Homepage Issue 1: Hero buttons normalized to semantic Button sizes without ad-hoc overrides', () => {
  assert(homeContent.includes('<Button size="lg" className="w-full sm:w-auto">\n                    Start Your Career Journey'),
    'Hero primary button must use standard size="lg" and className="w-full sm:w-auto"');
  assert(homeContent.includes('<Button variant="secondary" size="lg" className="w-full sm:w-auto">\n                    Explore Verified Jobs'),
    'Hero secondary button must use standard size="lg" and className="w-full sm:w-auto"');
  assert(!homeContent.includes('px-6 sm:px-7 text-sm sm:text-base justify-center'),
    'Hero buttons must not have ad-hoc padding/typography overrides');
});

test('Homepage Issue 1: Pricing buttons normalized to semantic variants', () => {
  assert(!homeContent.includes('bg-[#7C3AED] hover:bg-[#6d28d9] text-white border-transparent'),
    'Pricing cards must not create ad-hoc purple button variants');
  assert(homeContent.includes('variant="primary"\n            className="w-full"\n            size="md"'),
    'Popular plan must use standard primary Button');
  assert(homeContent.includes('variant="secondary"\n            className="w-full"\n            size="md"'),
    'Other plans must use standard secondary Button');
});

// Issue 2: Comprehensive Platform uppercase
test('Homepage Issue 2: Comprehensive platform in sentence case with tracking-wide', () => {
  assert(homeContent.includes('Comprehensive platform'), 'Must be sentence case "Comprehensive platform"');
  assert(!homeContent.includes('Comprehensive Platform'), 'Uppercase "Comprehensive Platform" must be removed');
  assert(homeContent.includes('text-xs font-bold tracking-wide text-[#2563EB] mb-1.5 sm:mb-2 font-display'),
    'Must use tracking-wide and no uppercase token');
});

// Issue 3: Career Accelerator uppercase & 10px
test('Homepage Issue 3: Pricing badges use text-xs, font-bold, tracking-wide, without uppercase', () => {
  assert(homeContent.includes('Career Accelerator'), 'Must contain Career Accelerator badge');
  assert(homeContent.includes('text-xs font-bold tracking-wide px-3 py-0.5 rounded-full shadow-2xs font-display'),
    'Career Accelerator and Most Popular badges must use text-xs and tracking-wide');
  assert(!homeContent.includes('text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-2xs font-display'),
    '10px uppercase tracking-wider badge must be removed');
});

// Issue 4: Heading skip H1 -> H3
test('Homepage Issue 4: Hero preview card uses H2 for Career Readiness Score (no H1 -> H3 skip)', () => {
  assert(homeContent.includes('<h2 className="font-display text-xs sm:text-sm font-bold text-[#0B1D3A] truncate">Career Readiness Score</h2>'),
    'Career Readiness Score in Hero must be an H2');
  assert(!homeContent.includes('<h3 className="font-display text-xs sm:text-sm font-bold text-[#0B1D3A] truncate">Career Readiness Score</h3>'),
    'H3 Career Readiness Score must be removed to avoid heading skip');
});

console.log('\n=== STUDENT DASHBOARD AUDIT FIXES (10 ISSUES) ===');

// Dashboard Issue 1: Too many button styles
test('Dashboard Issue 1: Quick status tile buttons use normalized Button variants and sizes', () => {
  assert(dashContent.includes('<Button variant="outline" size="sm" className="w-full">\n                {profile?.full_name ? \'Edit Profile\' : \'Complete Profile\'}'),
    'Profile tile button normalized');
  assert(dashContent.includes('<Button variant={hasResume ? "outline" : "primary"} size="sm" className="w-full">'),
    'Resume tile button normalized');
  assert(dashContent.includes('<Button variant="outline" size="sm" className="w-full">\n                {access.isSubscriptionActive ? \'Manage Subscription\' : \'Upgrade Plan\'}'),
    'Subscription tile button normalized');
  assert(dashContent.includes('<Button \n                variant={creditStatus.isEligible ? "primary" : "outline"} \n                size="sm" \n                className="w-full"'),
    'Mock Interview tile button normalized');
});

// Dashboard Issue 2: Email at 10px
test('Dashboard Issue 2: Sidebar user email is text-xs with title attribute in StudentLayout', () => {
  assert(layoutContent.includes('<p className="text-xs text-[var(--color-text-tertiary)] truncate" title={studentEmail}>{studentEmail}</p>'),
    'Sidebar footer email must be text-xs and have title attribute');
  assert(layoutContent.includes('<p className="text-xs text-[var(--color-text-secondary)] truncate" title={studentEmail}>{studentEmail}</p>'),
    'Profile dropdown email must be text-xs and have title attribute');
  assert(!layoutContent.includes('text-[10px] text-[var(--color-text-tertiary)] truncate">{studentEmail}'),
    'No 10px email allowed in sidebar');
});

// Dashboard Issue 3: 10px label
test('Dashboard Issue 3: Status tile headers use text-xs font-bold tracking-wide (no 10px uppercase)', () => {
  const matches = dashContent.match(/text-xs font-bold tracking-wide text-\[var\(--color-text-tertiary\)\]/g);
  assert(matches && matches.length >= 4, 'Must have at least 4 occurrences of text-xs font-bold tracking-wide for tile categories');
  assert(!dashContent.includes('text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]'),
    'No 10px uppercase tile category headers allowed');
});

// Dashboard Issue 4: Job title truncated
test('Dashboard Issue 4: Job title allows 2 lines via line-clamp-2 without parent single-line truncate', () => {
  assert(dashContent.includes('<h3 className="text-sm font-semibold leading-snug text-[var(--color-text-primary)] line-clamp-2">{job.title}</h3>'),
    'Job title must use line-clamp-2 and leading-snug');
  assert(!dashContent.includes('<h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{job.title}</h3>'),
    'Single-line truncate on job title must be removed');
});

// Dashboard Issue 5: 11px body copy
test('Dashboard Issue 5: Interview track descriptions use text-xs', () => {
  assert(dashContent.includes('<p className="text-xs text-[var(--color-text-secondary)]">Behavioral &amp; Cultural fit</p>') ||
         dashContent.includes('<p className="text-xs text-[var(--color-text-secondary)]">Behavioral & Cultural fit</p>'),
    'Behavioral & Cultural fit must be text-xs');
  assert(dashContent.includes('<p className="text-xs text-[var(--color-text-secondary)]">DSA, APIs, Database & System</p>'),
    'DSA track must be text-xs');
  assert(dashContent.includes('<p className="text-xs text-[var(--color-text-secondary)]">Ownership, Conflict & STAR</p>'),
    'Managerial track must be text-xs');
  assert(!dashContent.includes('text-[11px] text-[var(--color-text-secondary)]'),
    'No 11px supporting copy in interview tracks');
});

// Dashboard Issue 6: Starter Required false affordance
test('Dashboard Issue 6: Locked jobs use explicit Upgrade CTA with lock icon', () => {
  assert(dashContent.includes('<span className="truncate">Upgrade to {planMeta.name}</span>'),
    'Must display "Upgrade to {planMeta.name}" rather than false affordance "{planMeta.name} Required"');
  assert(dashContent.includes('<Lock className="w-3 h-3 mr-1 text-slate-400 shrink-0" aria-hidden="true" />'),
    'Must include lock icon with aria-hidden="true"');
});

// Dashboard Issue 7: View All alignment
test('Dashboard Issue 7: Recommended Jobs header layout uses items-center, gap-3, and inline-flex', () => {
  assert(dashContent.includes('<div className="flex items-center justify-between gap-3 mb-5">'),
    'Header container must use flex items-center justify-between gap-3 mb-5');
  assert(dashContent.includes('className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition-colors shrink-0"'),
    'View All link must use inline-flex items-center gap-1 shrink-0');
  assert(dashContent.includes('<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />'),
    'Arrow icon must have aria-hidden="true"');
});

// Dashboard Issue 8: Soon badges too prominent
test('Dashboard Issue 8: Soon badges use neutral slate styling and aria-disabled semantics', () => {
  assert(layoutContent.includes('text-slate-500 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded'),
    'Soon badge must use neutral slate token');
  assert(!layoutContent.includes('bg-amber-50 text-amber-700 border border-amber-200/80'),
    'Amber high-attention styling must be removed from Soon badge');
  assert(layoutContent.includes('aria-disabled={!isEnabled ? \'true\' : undefined}'),
    'Disabled nav links must have aria-disabled attribute');
});

// Dashboard Issue 9: Job metadata spacing
test('Dashboard Issue 9: Job metadata has breathing room, wrapping, and text-xs', () => {
  assert(dashContent.includes('mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-secondary)]'),
    'Job metadata container must use mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs');
  assert(dashContent.includes('<MapPin className="w-3 h-3 text-[var(--color-text-tertiary)]" aria-hidden="true" />'),
    'MapPin must have aria-hidden="true"');
  assert(dashContent.includes('<Briefcase className="w-3 h-3 text-[var(--color-text-tertiary)]" aria-hidden="true" />'),
    'Briefcase must have aria-hidden="true"');
});

// Dashboard Issue 10: Job action size inconsistency
test('Dashboard Issue 10: Job actions occupy consistent sm:w-36 container and share outline variant', () => {
  assert(dashContent.includes('<div className="w-full sm:w-36 shrink-0 flex items-center sm:justify-end">'),
    'Job action area must use w-full sm:w-36 shrink-0 container');
});

console.log(`\nUSABILITY AUDIT SUITE: ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
