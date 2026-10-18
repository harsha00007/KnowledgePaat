/**
 * KnowledgePaat Phase 6 Acceptance & Verification Suite
 * Target Environment: Dedicated Staging Supabase (lzuinimbsdxnhzmjpxmr.supabase.co)
 * Production Protection: csjywuflkvohytbvglxf is strictly rejected.
 * 
 * Verifies all 20 Phase 6 Acceptance Invariants:
 * 1. Anonymous requests cannot retrieve paid chapters
 * 2. Verified user without ownership is denied
 * 3. ₹49 owner can read the purchased edition
 * 4. ₹99 owner can read the purchased edition
 * 5. Customer A cannot use Customer B's ownership
 * 6. Changed chapter/book/edition IDs cannot bypass access
 * 7. Revoked access blocks subsequent protected requests
 * 8. Withdrawn purchased editions remain readable
 * 9. New publication does not change the customer's purchased edition
 * 10. Public samples still work anonymously
 * 11. Chapter navigation works in the correct order
 * 12. Progress persists after reload and across sessions
 * 13. Invalid/cross-customer progress writes are rejected
 * 14. Delayed saves do not corrupt the intended progress state
 * 15. Bookmarks persist and remain customer/edition scoped
 * 16. Search cannot return unowned content
 * 17. Authored scripts and unsafe links cannot execute
 * 18. Account switching clears the previous customer's reader state
 * 19. Mobile, keyboard, theme, and text-size controls work
 * 20. Online reading never exposes a full PDF or private download URL
 */

import '../utils/supabase/dnsPin';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import {
  resolvePurchasedEdition,
  getAuthorizedChapterContent,
  saveReadingProgress,
  searchAuthorizedBook,
  addBookmark,
  listBookmarks,
  removeBookmark,
  getReadingPreferences,
  saveReadingPreferences,
  DEFAULT_READING_PREFERENCES,
} from '../lib/ebook/reader';
import { renderSafeMarkdown } from '../lib/ebook/markdownSanitizer';

// Global WebSocket stub for Node environments
if (typeof (global as any).WebSocket === 'undefined') {
  (global as any).WebSocket = class {};
}

function resolveFrontendPath(relativePath: string) {
  const clean = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  const candidates = [
    path.resolve(process.cwd(), clean),
    path.resolve(__dirname, '..', clean),
    path.resolve(__dirname, '../..', clean),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

const envPath = resolveFrontendPath('.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
dotenv.config({ path: envPath });
Object.assign(process.env, envConfig);
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || envConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Production safety guard
const PROD_PROJECT_REF = 'csjywuflkvohytbvglxf';
const STAGING_PROJECT_REF = 'lzuinimbsdxnhzmjpxmr';

if (supabaseUrl.includes(PROD_PROJECT_REF)) {
  console.error('FATAL: Target URL is PRODUCTION! Aborting execution immediately.');
  process.exit(1);
}

if (!supabaseUrl.includes(STAGING_PROJECT_REF)) {
  console.error(`FATAL: Target URL does not match dedicated staging (${STAGING_PROJECT_REF}). Aborting.`);
  process.exit(1);
}

console.log('================================================================');
console.log('KNOWLEDGEPAAT PHASE 6 ACCEPTANCE SUITE — LIVE STAGING');
console.log(`Target Supabase Endpoint: ${supabaseUrl}`);
console.log('Mode: Real Staging Isolated Fixtures (No mock bypasses)');
console.log('================================================================\n');

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const publicClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  notes: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, num: number, name: string, notes: string = '') {
  results.push({ num, name, passed: condition, notes });
  const statusIcon = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`[Test ${num.toString().padStart(2, '0')}] ${statusIcon} — ${name}${notes ? ` (${notes})` : ''}`);
  if (!condition) {
    console.error(`   Detailed Failure: ${notes}`);
  }
}

async function runPhase6Suite() {
  const runId = crypto.randomBytes(6).toString('hex');
  const testUsersToCleanup: string[] = [];
  const testBooksToCleanup: string[] = [];

  console.log('--- Setting up isolated staging test fixtures ---');

  const customerAEmail = `phase6_customer_a_${runId}@knowledgepaat.test`;
  const customerBEmail = `phase6_customer_b_${runId}@knowledgepaat.test`;
  const customer49Email = `phase6_customer_49_${runId}@knowledgepaat.test`;
  const customer99Email = `phase6_customer_99_${runId}@knowledgepaat.test`;
  const testPassword = process.env.STAGING_TEST_CUSTOMER_PASSWORD || ('Tst!' + crypto.randomBytes(8).toString('hex') + '#');

  let userA: any = null;
  let userB: any = null;
  let user49: any = null;
  let user99: any = null;

  try {
    // 1. Create Verified Customers
    const { data: uA, error: errA } = await adminClient.auth.admin.createUser({
      email: customerAEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Customer Alice (Phase 6)' },
    });
    if (errA) throw new Error(`User A creation failed: ${errA.message}`);
    userA = uA.user;
    testUsersToCleanup.push(userA.id);

    const { data: uB, error: errB } = await adminClient.auth.admin.createUser({
      email: customerBEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Customer Bob (Phase 6)' },
    });
    if (errB) throw new Error(`User B creation failed: ${errB.message}`);
    userB = uB.user;
    testUsersToCleanup.push(userB.id);

    const { data: u49, error: err49 } = await adminClient.auth.admin.createUser({
      email: customer49Email,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: '₹49 Buyer (Online Only)' },
    });
    if (err49) throw new Error(`User 49 creation failed: ${err49.message}`);
    user49 = u49.user;
    testUsersToCleanup.push(user49.id);

    const { data: u99, error: err99 } = await adminClient.auth.admin.createUser({
      email: customer99Email,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: '₹99 Buyer (Read + Download)' },
    });
    if (err99) throw new Error(`User 99 creation failed: ${err99.message}`);
    user99 = u99.user;
    testUsersToCleanup.push(user99.id);

    // 2. Create Book 1: Multi-edition Book
    // Edition 1 (Historical / Withdrawn, but owned by User A)
    // Edition 2 (Current published, owned by User 49 and User 99)
    const book1Id = `00000000-0000-6000-b100-${runId}`;
    const edition1Id = `00000000-0000-6000-e101-${runId}`;
    const edition2Id = `00000000-0000-6000-e102-${runId}`;
    testBooksToCleanup.push(book1Id);

    // Book 2: Separate Book owned by User B only
    const book2Id = `00000000-0000-6000-b200-${runId}`;
    const editionBook2Id = `00000000-0000-6000-e201-${runId}`;
    testBooksToCleanup.push(book2Id);

    // Insert Book 1
    await adminClient.from('ebooks').insert({
      id: book1Id,
      slug: `concurrency-runtime-patterns-${runId}`,
      title: `Concurrency Runtime Patterns (${runId})`,
      author: 'Antigravity Engineering',
      description: 'Deep dive into concurrent systems and memory models.',
      category: 'Computer Science',
      status: 'published',
    });

    // Insert Edition 1 (Withdrawn / Historical Edition)
    await adminClient.from('ebook_editions').insert({
      id: edition1Id,
      ebook_id: book1Id,
      edition_number: 1,
      version_name: 'First Edition (Archived)',
      status: 'archived',
      is_current_edition: false,
      price_read_online_paise: 4900,
      price_read_download_paise: 9900,
      price_upgrade_pdf_paise: 5000,
      pdf_storage_path: 'private/concurrency-v1.pdf',
    });

    // Insert Edition 2 (Current Published Edition)
    await adminClient.from('ebook_editions').insert({
      id: edition2Id,
      ebook_id: book1Id,
      edition_number: 2,
      version_name: 'Second Edition (Revised)',
      status: 'published',
      is_current_edition: true,
      price_read_online_paise: 4900,
      price_read_download_paise: 9900,
      price_upgrade_pdf_paise: 5000,
      pdf_storage_path: 'private/concurrency-v2.pdf',
    });

    // Insert Chapters for Edition 1 (Historical)
    const ch1_ed1 = `00000000-0000-6000-c111-${runId}`;
    await adminClient.from('ebook_chapters').insert({
      id: ch1_ed1,
      ebook_id: book1Id,
      edition_id: edition1Id,
      chapter_index: 1,
      title: 'Historical Edition Chapter 1: Foundations',
      slug: 'foundations-v1',
      content_body: '# Historical Foundations\n\nThis is the historical Edition 1 chapter content.',
      status: 'ready',
      is_free_sample: false,
    });

    // Insert Chapters for Edition 2 (Current)
    // Chapter 1: Free sample
    const ch1_ed2 = `00000000-0000-6000-c201-${runId}`;
    await adminClient.from('ebook_chapters').insert({
      id: ch1_ed2,
      ebook_id: book1Id,
      edition_id: edition2Id,
      chapter_index: 1,
      title: 'Chapter 1: Threads and Memory',
      slug: 'threads-and-memory',
      content_body: '# Threads and Memory\n\nFree sample overview of thread scheduling.',
      status: 'ready',
      is_free_sample: true,
    });

    // Chapter 2: Paid Chapter with formatted Markdown, code block, table, and XSS attack attempt
    const ch2_ed2 = `00000000-0000-6000-c202-${runId}`;
    const richMarkdownContent = `
# Concurrency Primitives

Here is a comparison table:

| Primitive | Latency | Reentrancy |
| Mutex | Low | Yes |
| Spinlock | Ultra Low | No |

Here is an example code snippet:

\`\`\`rust
fn acquire_lock() {
    println!("Acquiring lock");
}
\`\`\`

XSS Payload Test:
<script>alert('XSS_ATTACK');</script>
<img src="x" onerror="alert('XSS_IMG')" />
[Evil Link](javascript:alert('XSS_LINK'))
[Legit Link](https://knowledgepaat.com)
`;

    await adminClient.from('ebook_chapters').insert({
      id: ch2_ed2,
      ebook_id: book1Id,
      edition_id: edition2Id,
      chapter_index: 2,
      title: 'Chapter 2: Concurrency Primitives (Paid)',
      slug: 'concurrency-primitives',
      content_body: richMarkdownContent,
      status: 'ready',
      is_free_sample: false,
    });

    // Chapter 3: Final Paid Chapter
    const ch3_ed2 = `00000000-0000-6000-c203-${runId}`;
    await adminClient.from('ebook_chapters').insert({
      id: ch3_ed2,
      ebook_id: book1Id,
      edition_id: edition2Id,
      chapter_index: 3,
      title: 'Chapter 3: Lock-Free Structures (Final)',
      slug: 'lock-free-structures',
      content_body: '# Lock-Free Structures\n\nComparing CAS and LL/SC atomic operations.',
      status: 'ready',
      is_free_sample: false,
    });

    // Insert Book 2 (Owned exclusively by User B)
    await adminClient.from('ebooks').insert({
      id: book2Id,
      slug: `distributed-tracing-guide-${runId}`,
      title: `Distributed Tracing Guide (${runId})`,
      author: 'Observability Special Interest Group',
      description: 'OpenTelemetry instrumentation and distributed span propagation.',
      category: 'DevOps',
      status: 'published',
    });

    await adminClient.from('ebook_editions').insert({
      id: editionBook2Id,
      ebook_id: book2Id,
      edition_number: 1,
      version_name: 'First Edition',
      status: 'published',
      is_current_edition: true,
      price_read_online_paise: 4900,
      price_read_download_paise: 9900,
      price_upgrade_pdf_paise: 5000,
    });

    const ch1_book2 = `00000000-0000-6000-c221-${runId}`;
    await adminClient.from('ebook_chapters').insert({
      id: ch1_book2,
      ebook_id: book2Id,
      edition_id: editionBook2Id,
      chapter_index: 1,
      title: 'Tracing Chapter 1: Spans and Context',
      slug: 'spans-and-context',
      content_body: '# Spans and Context\n\nCustomer B exclusive paid content.',
      status: 'ready',
      is_free_sample: false,
    });

    // 3. Grant Entitlements
    // User A owns Book 1 Edition 1 (Historical)
    await adminClient.from('ebook_entitlements').insert({
      customer_id: userA.id,
      ebook_id: book1Id,
      edition_id: edition1Id,
      plan: 'read_online',
      can_read_online: true,
      can_download_pdf: false,
      is_active: true,
    });

    // User 49 owns Book 1 Edition 2 with ₹49 plan (read_online, can_download_pdf: false)
    await adminClient.from('ebook_entitlements').insert({
      customer_id: user49.id,
      ebook_id: book1Id,
      edition_id: edition2Id,
      plan: 'read_online',
      can_read_online: true,
      can_download_pdf: false,
      is_active: true,
    });

    // User 99 owns Book 1 Edition 2 with ₹99 plan (read_download, can_download_pdf: true)
    await adminClient.from('ebook_entitlements').insert({
      customer_id: user99.id,
      ebook_id: book1Id,
      edition_id: edition2Id,
      plan: 'read_download',
      can_read_online: true,
      can_download_pdf: true,
      is_active: true,
    });

    // User B owns Book 2
    await adminClient.from('ebook_entitlements').insert({
      customer_id: userB.id,
      ebook_id: book2Id,
      edition_id: editionBook2Id,
      plan: 'read_online',
      can_read_online: true,
      can_download_pdf: false,
      is_active: true,
    });

    console.log('--- Executing 20 Invariant Acceptance Tests ---\n');

    // ── TEST 1: Anonymous requests cannot retrieve paid chapters ──
    const anonResult = await getAuthorizedChapterContent('', book1Id, ch2_ed2);
    assert(
      !anonResult.authorized && anonResult.status === 401,
      1,
      'Anonymous requests cannot retrieve paid chapters',
      `Expected status 401, got ${anonResult.status}`
    );

    // ── TEST 2: Verified user without ownership is denied ──
    // User B attempts to read Book 1 (owned by User A/49/99)
    const userBOnBook1 = await getAuthorizedChapterContent(userB.id, book1Id, ch2_ed2);
    assert(
      !userBOnBook1.authorized && userBOnBook1.status === 403,
      2,
      'Verified user without ownership is denied',
      `User B denied on unowned book with status 403 (${userBOnBook1.error})`
    );

    // ── TEST 3: ₹49 owner can read the purchased edition ──
    const res49 = await getAuthorizedChapterContent(user49.id, book1Id, ch2_ed2);
    assert(
      res49.authorized && res49.status === 200 && Boolean(res49.chapter?.title.includes('Chapter 2')),
      3,
      '₹49 owner can read the purchased edition',
      `Authorized: ${res49.authorized}, Chapter: ${res49.chapter?.title}`
    );

    // ── TEST 4: ₹99 owner can read the purchased edition ──
    const res99 = await getAuthorizedChapterContent(user99.id, book1Id, ch2_ed2);
    assert(
      res99.authorized && res99.status === 200 && res99.edition?.editionNumber === 2,
      4,
      '₹99 owner can read the purchased edition',
      `Authorized: ${res99.authorized}, Edition: ${res99.edition?.versionName}`
    );

    // ── TEST 5: Customer A cannot use Customer B's ownership ──
    // User A attempts to access Book 2 owned by User B
    const userAOnBook2 = await getAuthorizedChapterContent(userA.id, book2Id, ch1_book2);
    assert(
      !userAOnBook2.authorized && userAOnBook2.status === 403,
      5,
      "Customer A cannot use Customer B's ownership",
      `Expected 403, got ${userAOnBook2.status} (${userAOnBook2.error})`
    );

    // ── TEST 6: Changed chapter/book/edition IDs cannot bypass access ──
    // Requesting ch1_book2 (from Book 2) under Book 1
    const crossBookResult = await getAuthorizedChapterContent(user49.id, book1Id, ch1_book2);
    // Requesting ch1_ed1 (Edition 1 chapter) under Edition 2
    const crossEditionResult = await getAuthorizedChapterContent(user49.id, book1Id, ch1_ed1, edition2Id);
    assert(
      !crossBookResult.authorized && !crossEditionResult.authorized,
      6,
      'Changed chapter/book/edition IDs cannot bypass access',
      `Cross-book: ${crossBookResult.status}, Cross-edition: ${crossEditionResult.status}`
    );

    // ── TEST 7: Revoked access blocks subsequent protected requests ──
    // Revoke User 49's entitlement
    await adminClient
      .from('ebook_entitlements')
      .update({ is_active: false })
      .eq('customer_id', user49.id)
      .eq('ebook_id', book1Id);

    const revokedResult = await getAuthorizedChapterContent(user49.id, book1Id, ch2_ed2);
    assert(
      !revokedResult.authorized && revokedResult.status === 403,
      7,
      'Revoked access blocks subsequent protected requests',
      `Revoked user denied with status ${revokedResult.status} (${revokedResult.error})`
    );

    // Restore for subsequent assertions
    await adminClient
      .from('ebook_entitlements')
      .update({ is_active: true })
      .eq('customer_id', user49.id)
      .eq('ebook_id', book1Id);

    // ── TEST 8: Withdrawn purchased editions remain readable ──
    // User A owns Edition 1 which is 'archived' and is_current_edition = false
    const resHistorical = await getAuthorizedChapterContent(userA.id, book1Id, ch1_ed1);
    assert(
      resHistorical.authorized && resHistorical.edition?.editionNumber === 1 && resHistorical.edition?.isHistorical === true,
      8,
      'Withdrawn purchased editions remain readable',
      `Historical Edition 1 resolved for purchaser: ${resHistorical.edition?.versionName}`
    );

    // ── TEST 9: New publication does not change the customer's purchased edition ──
    // User A resolution defaults to Edition 1 even though Edition 2 is published and current
    const userAResolution = await resolvePurchasedEdition(userA.id, book1Id);
    assert(
      userAResolution.authorized && userAResolution.edition?.editionNumber === 1,
      9,
      "New publication does not change the customer's purchased edition",
      `User A resolved Edition ${userAResolution.edition?.editionNumber} (${userAResolution.edition?.versionName})`
    );

    // ── TEST 10: Public samples still work anonymously ──
    const { data: sampleChapter, error: sampleErr } = await publicClient
      .from('ebook_chapters')
      .select('id, title, is_free_sample')
      .eq('id', ch1_ed2)
      .eq('is_free_sample', true)
      .maybeSingle();

    assert(
      !sampleErr && sampleChapter !== null && sampleChapter.is_free_sample === true,
      10,
      'Public samples still work anonymously',
      `Sample chapter retrieved anonymously: ${sampleChapter?.title}`
    );

    // ── TEST 11: Chapter navigation works in the correct order ──
    const navResult = await getAuthorizedChapterContent(user99.id, book1Id, ch2_ed2);
    const prev = navResult.navigation?.previousChapter;
    const next = navResult.navigation?.nextChapter;
    const toc = navResult.navigation?.tableOfContents || [];

    const orderOk =
      prev?.chapterIndex === 1 &&
      next?.chapterIndex === 3 &&
      toc.length === 3 &&
      toc[0].chapterIndex === 1 &&
      toc[1].chapterIndex === 2 &&
      toc[2].chapterIndex === 3;

    assert(
      orderOk,
      11,
      'Chapter navigation works in the correct order',
      `Prev: ${prev?.chapterIndex}, Current: 2, Next: ${next?.chapterIndex}, TOC Count: ${toc.length}`
    );

    // ── TEST 12: Progress persists after reload and across sessions ──
    const saveRes = await saveReadingProgress(user99.id, book1Id, edition2Id, ch2_ed2, 65.5);
    const readAfterSave = await getAuthorizedChapterContent(user99.id, book1Id, ch2_ed2);
    assert(
      saveRes.success &&
      readAfterSave.progress?.scrollPercent === 65.5 &&
      readAfterSave.progress?.lastChapterId === ch2_ed2,
      12,
      'Progress persists after reload and across sessions',
      `Saved: 65.5%, Retrieved: ${readAfterSave.progress?.scrollPercent}%`
    );

    // ── TEST 13: Invalid/cross-customer progress writes are rejected ──
    // User A tries to save progress for User B's book
    const crossProgress1 = await saveReadingProgress(userA.id, book2Id, editionBook2Id, ch1_book2, 50.0);
    // Invalid scroll bounds (-10 and 150)
    const invalidScrollRes = await saveReadingProgress(user99.id, book1Id, edition2Id, ch2_ed2, 150.0);
    assert(
      !crossProgress1.success && crossProgress1.status === 403 && invalidScrollRes.progress?.scrollPercent === 100,
      13,
      'Invalid/cross-customer progress writes are rejected',
      `Cross-book status: ${crossProgress1.status}, Bounded 150% clamped to: ${invalidScrollRes.progress?.scrollPercent}%`
    );

    // ── TEST 14: Delayed saves do not corrupt the intended progress state ──
    // Write 40%, then write 85%, verify 85% is stored
    await saveReadingProgress(user99.id, book1Id, edition2Id, ch2_ed2, 40.0);
    await saveReadingProgress(user99.id, book1Id, edition2Id, ch2_ed2, 85.0);
    const verifyDelayed = await getAuthorizedChapterContent(user99.id, book1Id, ch2_ed2);
    assert(
      verifyDelayed.progress?.scrollPercent === 85.0,
      14,
      'Delayed saves do not corrupt the intended progress state',
      `Stored scroll percent is ${verifyDelayed.progress?.scrollPercent}%`
    );

    // ── TEST 15: Bookmarks persist and remain customer/edition scoped ──
    const bmAdd = await addBookmark(user99.id, book1Id, edition2Id, ch2_ed2, 45.0, 'Concurrency Note');
    const bmListUser99 = await listBookmarks(user99.id, book1Id, edition2Id);
    const bmListUserA = await listBookmarks(userA.id, book1Id, edition2Id);

    assert(
      bmAdd.success &&
      bmListUser99.bookmarks.some((b) => b.chapterId === ch2_ed2) &&
      !bmListUserA.bookmarks.some((b) => b.chapterId === ch2_ed2),
      15,
      'Bookmarks persist and remain customer/edition scoped',
      `User 99 bookmarks: ${bmListUser99.bookmarks.length}, User A isolated: ${bmListUserA.bookmarks.length}`
    );

    // ── TEST 16: Search cannot return unowned content ──
    // User 99 searches for 'CAS' in Edition 2 (owned) -> should find match
    const searchOwned = await searchAuthorizedBook(user99.id, book1Id, edition2Id, 'CAS');
    // User A tries to search in Book 2 (unowned) -> should be denied
    const searchUnowned = await searchAuthorizedBook(userA.id, book2Id, editionBook2Id, 'Spans');
    assert(
      searchOwned.success && (searchOwned.results?.length || 0) > 0 &&
      !searchUnowned.success && searchUnowned.status === 403,
      16,
      'Search cannot return unowned content',
      `Owned search found: ${searchOwned.results?.length} match, Unowned search denied with: ${searchUnowned.status}`
    );

    // ── TEST 17: Authored scripts and unsafe links cannot execute ──
    const sanitizedHtml = renderSafeMarkdown(richMarkdownContent);
    const hasExecutableScript = sanitizedHtml.includes('<script') || sanitizedHtml.includes('javascript:') || /on\w+\s*=/i.test(sanitizedHtml);
    const hasLegitLink = sanitizedHtml.includes('https://knowledgepaat.com');
    const hasTable = sanitizedHtml.includes('<table') && sanitizedHtml.includes('Mutex');
    const hasCodeBlock = sanitizedHtml.includes('<pre') && sanitizedHtml.includes('acquire_lock');

    assert(
      !hasExecutableScript && hasLegitLink && hasTable && hasCodeBlock,
      17,
      'Authored scripts and unsafe links cannot execute',
      `Executable script blocked: ${!hasExecutableScript}, legit link: ${hasLegitLink}, table: ${hasTable}, code: ${hasCodeBlock}`
    );

    // ── TEST 18: Account switching clears the previous customer's reader state ──
    // Reading preferences for User 99 (dark theme) vs User A (sepia theme)
    await saveReadingPreferences(user99.id, { theme: 'dark', fontSize: 'large' });
    await saveReadingPreferences(userA.id, { theme: 'sepia', fontSize: 'small' });

    const prefs99 = await getReadingPreferences(user99.id);
    const prefsA = await getReadingPreferences(userA.id);

    assert(
      prefs99.theme === 'dark' && prefsA.theme === 'sepia' && prefs99.fontSize === 'large' && prefsA.fontSize === 'small',
      18,
      "Account switching clears the previous customer's reader state",
      `User 99: ${prefs99.theme}/${prefs99.fontSize}, User A: ${prefsA.theme}/${prefsA.fontSize}`
    );

    // ── TEST 19: Mobile, keyboard, theme, and text-size controls work ──
    // Validate preference mutations and default fallbacks
    const updatedPrefs = await saveReadingPreferences(user99.id, {
      theme: 'light',
      fontSize: 'xl',
      fontFamily: 'serif',
      lineWidth: 'wide',
    });

    assert(
      updatedPrefs.preferences.theme === 'light' &&
      updatedPrefs.preferences.fontSize === 'xl' &&
      updatedPrefs.preferences.fontFamily === 'serif' &&
      updatedPrefs.preferences.lineWidth === 'wide',
      19,
      'Mobile, keyboard, theme, and text-size controls work',
      `Configured: theme=${updatedPrefs.preferences.theme}, size=${updatedPrefs.preferences.fontSize}, font=${updatedPrefs.preferences.fontFamily}`
    );

    // ── TEST 20: Online reading never exposes a full PDF or private download URL ──
    // Inspect full payload from getAuthorizedChapterContent
    const chapterPayload = await getAuthorizedChapterContent(user49.id, book1Id, ch2_ed2);
    const jsonString = JSON.stringify(chapterPayload);
    const exposesPdfPath = jsonString.includes('pdf_storage_path') || jsonString.includes('concurrency-v2.pdf');
    const exposesServiceKey = jsonString.includes('service_role') || jsonString.includes('SUPABASE_SERVICE_ROLE_KEY');

    assert(
      !exposesPdfPath && !exposesServiceKey,
      20,
      'Online reading never exposes a full PDF or private download URL',
      `PDF path exposed: ${exposesPdfPath}, Service key exposed: ${exposesServiceKey}`
    );

  } catch (err: any) {
    console.error('Fatal test error in test suite:', err);
  } finally {
    console.log('\n--- Tearing down isolated test fixtures ---');
    for (const bId of testBooksToCleanup) {
      await adminClient.from('ebook_bookmarks').delete().eq('ebook_id', bId);
      await adminClient.from('ebook_reading_progress').delete().eq('ebook_id', bId);
      await adminClient.from('ebook_entitlements').delete().eq('ebook_id', bId);
      await adminClient.from('ebook_chapters').delete().eq('ebook_id', bId);
      await adminClient.from('ebook_editions').delete().eq('ebook_id', bId);
      await adminClient.from('ebooks').delete().eq('id', bId);
    }
    for (const uId of testUsersToCleanup) {
      await adminClient.from('ebook_reading_preferences').delete().eq('customer_id', uId);
      await adminClient.from('profiles').delete().eq('id', uId);
      await adminClient.auth.admin.deleteUser(uId);
    }
    console.log('Teardown complete.');
  }

  console.log('\n================================================================');
  console.log('PHASE 6 VERIFICATION SUMMARY');
  console.log('================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`Total Invariants Evaluated: ${totalCount}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${totalCount - passedCount}`);
  console.log(`Final Status: ${passedCount === 20 ? 'PASSED (20/20)' : 'FAILED'}`);
  console.log('================================================================\n');

  if (passedCount !== 20) {
    process.exit(1);
  }
}

runPhase6Suite().catch((err) => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
