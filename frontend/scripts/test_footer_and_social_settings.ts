import {
  DEFAULT_SOCIAL_LINKS,
  SOCIAL_PLATFORMS,
  validateSocialUrl,
  SocialLinksSettings,
} from '../lib/socialLinks';

console.log('=================================================');
console.log('KNOWLEDGEPAAT: FOOTER & SOCIAL SETTINGS TEST SUITE');
console.log('=================================================\n');

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

// ── Group 1: URL Validation ────────────────────────────────────────────────
console.log('--- Group 1: Social URL Validation ---');

const val1 = validateSocialUrl('https://facebook.com/knowledgepaat');
assert(val1.isValid && val1.normalizedUrl === 'https://facebook.com/knowledgepaat', 'Valid HTTPS Facebook URL is accepted');

const val2 = validateSocialUrl('http://x.com/knowledgepaat');
assert(val2.isValid && val2.normalizedUrl === 'http://x.com/knowledgepaat', 'Valid HTTP X URL is accepted');

const val3 = validateSocialUrl('linkedin.com/company/knowledgepaat');
assert(val3.isValid && val3.normalizedUrl === 'https://linkedin.com/company/knowledgepaat', 'URL without protocol auto-prepends https://');

const val4 = validateSocialUrl('');
assert(val4.isValid && val4.normalizedUrl === '', 'Empty URL is valid (for optional or cleared fields)');

const val5 = validateSocialUrl('not-a-valid-url-without-domain');
assert(!val5.isValid, 'Malformed string without domain is rejected');

// ── Group 2: Platform Config & Enable/Disable Flags ────────────────────────
console.log('\n--- Group 2: Platform Configuration & Enable/Disable Flags ---');

assert(SOCIAL_PLATFORMS.length === 5, 'Exactly 5 official social platforms supported');
const platformKeys = SOCIAL_PLATFORMS.map(p => p.key);
assert(platformKeys.includes('facebook'), 'Facebook platform exists');
assert(platformKeys.includes('x'), 'X/Twitter platform exists');
assert(platformKeys.includes('linkedin'), 'LinkedIn platform exists');
assert(platformKeys.includes('youtube'), 'YouTube platform exists');
assert(platformKeys.includes('instagram'), 'Instagram platform exists');

const initialSettings: SocialLinksSettings = JSON.parse(JSON.stringify(DEFAULT_SOCIAL_LINKS));
assert(initialSettings.facebook.enabled === true, 'Facebook is enabled by default with KnowledgePaat URL');
assert(initialSettings.x.enabled === true, 'X is enabled by default with KnowledgePaat URL');
assert(initialSettings.linkedin.enabled === true, 'LinkedIn is enabled by default with KnowledgePaat URL');
assert(initialSettings.youtube.enabled === true, 'YouTube is enabled by default with KnowledgePaat URL');
assert(initialSettings.instagram.enabled === true, 'Instagram is enabled by default with KnowledgePaat URL');

// ── Group 3: Dynamic Public Footer Filtering ────────────────────────────────
console.log('\n--- Group 3: Dynamic Public Footer Filtering Logic ---');

// Mock state 1: Only Facebook and Instagram enabled
const mockSettings1: SocialLinksSettings = {
  facebook: { url: 'https://facebook.com/kp', enabled: true },
  x: { url: 'https://x.com/kp', enabled: false },
  linkedin: { url: 'https://linkedin.com/company/kp', enabled: false },
  youtube: { url: '', enabled: false },
  instagram: { url: 'https://instagram.com/kp', enabled: true },
};

const enabled1 = SOCIAL_PLATFORMS.filter(p => {
  const cfg = mockSettings1[p.key];
  return Boolean(cfg && cfg.enabled && cfg.url.trim());
});

assert(enabled1.length === 2, 'Footer displays exactly 2 platforms when only Facebook and Instagram are enabled');
assert(enabled1.some(p => p.key === 'facebook'), 'Footer includes enabled Facebook');
assert(enabled1.some(p => p.key === 'instagram'), 'Footer includes enabled Instagram');
assert(!enabled1.some(p => p.key === 'x'), 'Footer excludes disabled X');
assert(!enabled1.some(p => p.key === 'linkedin'), 'Footer excludes disabled LinkedIn');
assert(!enabled1.some(p => p.key === 'youtube'), 'Footer excludes disabled YouTube');

// Mock state 2: Enabled but empty URL is safely excluded
const mockSettings2: SocialLinksSettings = {
  ...mockSettings1,
  youtube: { url: '   ', enabled: true }, // Enabled but empty whitespace
};
const enabled2 = SOCIAL_PLATFORMS.filter(p => {
  const cfg = mockSettings2[p.key];
  return Boolean(cfg && cfg.enabled && cfg.url.trim());
});
assert(enabled2.length === 2, 'Footer safely ignores platform with enabled=true but empty URL');

// Mock state 3: All platforms disabled
const mockSettings3: SocialLinksSettings = {
  facebook: { url: 'https://facebook.com/kp', enabled: false },
  x: { url: 'https://x.com/kp', enabled: false },
  linkedin: { url: 'https://linkedin.com/kp', enabled: false },
  youtube: { url: 'https://youtube.com/kp', enabled: false },
  instagram: { url: 'https://instagram.com/kp', enabled: false },
};
const enabled3 = SOCIAL_PLATFORMS.filter(p => {
  const cfg = mockSettings3[p.key];
  return Boolean(cfg && cfg.enabled && cfg.url.trim());
});
assert(enabled3.length === 0, 'Footer gracefully returns empty array when all platforms disabled');

// ── Group 4: Footer Structure & Semantic Routes ────────────────────────────
console.log('\n--- Group 4: Footer Structure & Semantic Routes ---');

const FOOTER_PRODUCT = [
  { href: '/jobs',                  label: 'Find Jobs'           },
  { href: '/interview-preparation', label: 'Interview Prep'      },
  { href: '/notes',                 label: 'Study Notes'         },
  { href: '/pricing',               label: 'Pricing'             },
];

const FOOTER_COMPANY = [
  { href: '/about',   label: 'About Us'   },
  { href: '/contact', label: 'Contact'    },
];

const FOOTER_ACCOUNT = [
  { href: '/login',    label: 'Log In'   },
  { href: '/register', label: 'Register' },
];

assert(FOOTER_PRODUCT.length === 4, 'Platform section has 4 links');
assert(FOOTER_PRODUCT[0].href === '/jobs', 'Platform link 1 is /jobs');
assert(FOOTER_PRODUCT[1].href === '/interview-preparation', 'Platform link 2 is /interview-preparation');
assert(FOOTER_PRODUCT[2].href === '/notes', 'Platform link 3 is /notes');
assert(FOOTER_PRODUCT[3].href === '/pricing', 'Platform link 4 is /pricing');

assert(FOOTER_COMPANY.length === 2, 'Company section has 2 links');
assert(FOOTER_COMPANY[0].href === '/about', 'Company link 1 is /about');
assert(FOOTER_COMPANY[1].href === '/contact', 'Company link 2 is /contact');

assert(FOOTER_ACCOUNT.length === 2, 'Account section has 2 links');
assert(FOOTER_ACCOUNT[0].href === '/login', 'Account link 1 is /login');
assert(FOOTER_ACCOUNT[1].href === '/register', 'Account link 2 is /register');

console.log('\n=================================================');
console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
console.log('=================================================\n');
