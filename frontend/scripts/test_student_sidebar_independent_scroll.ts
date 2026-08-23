export {};

import * as fs from 'fs';
import * as path from 'path';

console.log('====================================================');
console.log('GRADZENX: STUDENT SIDEBAR INDEPENDENT SCROLL SUITE');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

const studentLayoutPath = path.resolve(__dirname, '../layouts/StudentLayout.tsx');
const adminLayoutPath = path.resolve(__dirname, '../layouts/AdminLayout.tsx');
const globalsCssPath = path.resolve(__dirname, '../app/globals.css');

const studentLayoutContent = fs.readFileSync(studentLayoutPath, 'utf8');
const adminLayoutContent = fs.readFileSync(adminLayoutPath, 'utf8');
const globalsCssContent = fs.readFileSync(globalsCssPath, 'utf8');

// ── TEST 1: Student Layout Root Viewport Shell ─────────────────────────────
console.log('--- TEST 1: Student Layout Root Viewport Shell ---');
assert(studentLayoutContent.includes('h-screen') && studentLayoutContent.includes('overflow-hidden'), 'StudentLayout root shell restricts height to viewport and hides window-level overflow');
assert(studentLayoutContent.includes('h-[100dvh]'), 'StudentLayout root shell supports dynamic viewport height (100dvh)');
assert(!studentLayoutContent.includes('<div className="min-h-screen flex'), 'StudentLayout does not allow root container to expand unboundedly via min-h-screen');

// ── TEST 2: Sidebar Independent Vertical Scroll ────────────────────────────
console.log('\n--- TEST 2: Sidebar Independent Vertical Scroll ---');
assert(studentLayoutContent.includes('w-64') && studentLayoutContent.includes('md:h-screen'), 'Sidebar has fixed desktop width and full desktop viewport height');
assert(studentLayoutContent.includes('overflow-y-auto') && studentLayoutContent.includes('aria-label="Student Navigation"'), 'Sidebar nav element is an independent vertical scroll container');
assert(studentLayoutContent.includes('overflow-x-hidden'), 'Sidebar nav prevents unwanted horizontal overflow');

// ── TEST 3: Main Content Independent Vertical Scroll ───────────────────────
console.log('\n--- TEST 3: Main Content Independent Vertical Scroll ---');
assert(studentLayoutContent.includes('min-w-0') && studentLayoutContent.includes('flex-1'), 'Main area has min-w-0 to prevent flex blowout and flex-1 to fill space');
assert(studentLayoutContent.includes('overflow-y-auto') && studentLayoutContent.includes('{children}'), 'Page content wrapper contains {children} within an independent overflow-y-auto container');

// ── TEST 4: Navigation Item Completeness & Accessibility ───────────────────
console.log('\n--- TEST 4: Navigation Item Completeness & Accessibility ---');
const requiredNavItems = [
  'Dashboard',
  'My Profile',
  'Resume',
  'Jobs',
  'Career Progress',
  'Career Intelligence',
  'Interview Prep',
  'Mock Interviews',
  'Notes',
  'Store',
  'My Purchases',
  'Subscription'
];

requiredNavItems.forEach(item => {
  assert(studentLayoutContent.includes(`name: '${item}'`) || studentLayoutContent.includes(`'${item}'`), `Nav includes "${item}" item`);
});

// ── TEST 5: Admin Layout Independent Scrolling Consistency ─────────────────
console.log('\n--- TEST 5: Admin Layout Independent Scrolling Consistency ---');
assert(adminLayoutContent.includes('h-screen') && adminLayoutContent.includes('overflow-hidden'), 'AdminLayout root shell is bounded to viewport height');
assert(adminLayoutContent.includes('overflow-y-auto') && adminLayoutContent.includes('aria-label="Admin Navigation"'), 'Admin sidebar nav scrolls independently');

// ── TEST 6: Modern Subtle Scrollbar CSS ────────────────────────────────────
console.log('\n--- TEST 6: Modern Subtle Scrollbar CSS ---');
assert(globalsCssContent.includes('scrollbar-width: thin'), 'CSS includes modern thin scrollbar for Firefox');
assert(globalsCssContent.includes('::-webkit-scrollbar'), 'CSS includes sleek webkit scrollbars for Chrome/Edge/Safari');

console.log('\n====================================================');
console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
console.log('====================================================\n');
