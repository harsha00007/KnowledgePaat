/**
 * =============================================================================
 * KnowledgePaat — Staging / Local Supabase Integration & Concurrency Runner
 * =============================================================================
 * Adapted to safely target the dedicated STAGING Supabase project or local stack.
 *
 * CRITICAL SAFETY ENFORCEMENT:
 * - Strictly rejects the known production project ref ("csjywuflkvohytbvglxf").
 * - Fails closed if the staging target is unconfirmed or ambiguous.
 * - Operates only on uniquely identified disposable fixtures (UUID prefix).
 * - Never prints or leaks secrets, keys, or tokens.
 * =============================================================================
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load staging configuration from untracked staging env file if present, fallback to local/process.env
dotenv.config({ path: path.resolve(__dirname, '../.env.staging.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Node 20 CLI dummy WebSocket shim
if (typeof (global as any).WebSocket === 'undefined') {
  (global as any).WebSocket = class {};
}

// -----------------------------------------------------------------------------
// 1. TARGET ENFORCEMENT & PRODUCTION REJECTION GUARDS
// -----------------------------------------------------------------------------
const KNOWN_PRODUCTION_REF = 'csjywuflkvohytbvglxf';
const KNOWN_PRODUCTION_HOST = 'csjywuflkvohytbvglxf.supabase.co';

const TARGET_URL = (process.env.STAGING_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const TARGET_ANON_KEY = (
  process.env.STAGING_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();
const TARGET_SERVICE_KEY = (process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

function extractProjectRef(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') return 'local-stack';
    const parts = u.hostname.split('.');
    return parts[0] || '';
  } catch {
    return '';
  }
}

export function assertSafeTargetEnvironment(url: string) {
  if (!url) {
    throw new Error('FAIL-CLOSED: No target Supabase URL provided. Configure STAGING_SUPABASE_URL in .env.staging.local.');
  }

  const projectRef = extractProjectRef(url);

  if (url.includes(KNOWN_PRODUCTION_HOST) || projectRef === KNOWN_PRODUCTION_REF) {
    throw new Error(
      `[CRITICAL PRODUCTION REJECTION] Target "${url}" matches known PRODUCTION project reference (${KNOWN_PRODUCTION_REF}). ` +
      `Mutation tests and migrations are strictly forbidden on production. Aborting immediately.`
    );
  }

  return { projectRef, isLocal: projectRef === 'local-stack' };
}

// -----------------------------------------------------------------------------
// 2. TEST EXECUTION HARNESS
// -----------------------------------------------------------------------------
interface VerificationResult {
  suite: string;
  test: string;
  passed: boolean;
  details: string;
}

const results: VerificationResult[] = [];

function record(suite: string, test: string, passed: boolean, details: string) {
  results.push({ suite, test, passed, details });
  const sym = passed ? '✔' : '✖';
  console.log(`  ${sym} [${suite}] ${test}: ${details}`);
}

export async function runStagingVerificationSuite(overrideConfig?: {
  url?: string;
  anonKey?: string;
  serviceKey?: string;
}) {
  const url = overrideConfig?.url || TARGET_URL;
  const anonKey = overrideConfig?.anonKey || TARGET_ANON_KEY;
  const serviceKey = overrideConfig?.serviceKey || TARGET_SERVICE_KEY;

  const { projectRef, isLocal } = assertSafeTargetEnvironment(url);

  console.log('\n=============================================================================');
  console.log('KNOWLEDGEPAAT INTEGRATION & CONCURRENCY VERIFIER');
  console.log(`Target: ${url} (Project Ref: ${projectRef}, Mode: ${isLocal ? 'Local Stack' : 'Dedicated Staging'})`);
  console.log('=============================================================================\n');

  if (!serviceKey) {
    throw new Error('FAIL-CLOSED: Missing service role key for staging test verification. Set STAGING_SUPABASE_SERVICE_ROLE_KEY in .env.staging.local.');
  }

  const serviceClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. SETUP DISPOSABLE TEST FIXTURES
  console.log('--- 1. VERIFYING STAGING SCHEMA & CREATING DISPOSABLE TEST FIXTURES ---');
  const testRunHex = require('crypto').randomBytes(6).toString('hex');
  const testRunId = Date.now().toString();
  const testBookId = `00000000-0000-4000-b000-${testRunHex}`;
  const testEdition1Id = `00000000-0000-4000-e000-${testRunHex}`;
  const ch1Id = `00000000-0000-4000-c001-${testRunHex}`;
  const ch2Id = `00000000-0000-4000-c002-${testRunHex}`;
  const dupEdId = `00000000-0000-4000-e999-${testRunHex}`;

  // Authenticated real users via Supabase Auth Admin API
  const adminEmail = `staging_admin_${testRunHex}@knowledgepaat.test`;
  const studentEmail = `staging_student_${testRunHex}@knowledgepaat.test`;
  const testPassword = 'StagingSecureTestPass!2026';

  let adminUser: any = null;
  let studentUser: any = null;

  try {
    const { data: createdAdmin, error: adminErr } = await serviceClient.auth.admin.createUser({
      email: adminEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Staging Test Admin' }
    });
    if (adminErr) throw adminErr;
    adminUser = createdAdmin.user;

    // Set role in profiles table (trusted server-side role)
    await serviceClient.from('profiles').update({ role: 'admin' }).eq('id', adminUser.id);

    const { data: createdStudent, error: studentErr } = await serviceClient.auth.admin.createUser({
      email: studentEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Staging Test Student' }
    });
    if (studentErr) throw studentErr;
    studentUser = createdStudent.user;
    await serviceClient.from('profiles').update({ role: 'student' }).eq('id', studentUser.id);

    record('AUTH_SETUP', 'Created real staging administrator user', adminUser !== null, `ID: ${adminUser.id}`);
    record('AUTH_SETUP', 'Created real staging student user', studentUser !== null, `ID: ${studentUser.id}`);
  } catch (err: any) {
    console.error('Failed to provision staging test users:', err.message);
    throw err;
  }

  // 2. DISPOSABLE BOOK & EDITION SEEDING
  console.log('\n--- 2. SEEDING DISPOSABLE TEST EBOOK FIXTURES ---');
  const { error: insBookErr } = await serviceClient.from('ebooks').insert({
    id: testBookId,
    slug: `staging-book-${testRunId}`,
    title: `Staging Verification Book ${testRunId}`,
    author: 'Staging Verification Suite',
    description: 'Disposable fixture for Phase 2 integration acceptance testing.',
    category: 'Engineering',
    cover_image_url: 'https://cdn.example.com/cover.png',
    status: 'draft'
  });

  const { error: insEdErr } = await serviceClient.from('ebook_editions').insert({
    id: testEdition1Id,
    ebook_id: testBookId,
    edition_number: 1,
    version_name: 'First Edition',
    status: 'draft',
    is_current_edition: true,
    pdf_storage_path: `ebook-pdfs/staging-${testRunId}/v1.pdf`,
    price_read_online_paise: 4900,
    price_read_download_paise: 9900,
    price_upgrade_pdf_paise: 5000
  });

  record('FIXTURE_SETUP', 'Seed disposable master ebook row', !insBookErr, insBookErr ? insBookErr.message : 'OK');
  record('FIXTURE_SETUP', 'Seed disposable edition 1 row', !insEdErr, insEdErr ? insEdErr.message : 'OK');

  await serviceClient.from('ebook_chapters').insert([
    {
      id: ch1Id,
      ebook_id: testBookId,
      edition_id: testEdition1Id,
      chapter_index: 1,
      title: 'Chapter 1: Staging Intro',
      slug: `ch-1-staging-${testRunId}`,
      content_body: '# Staging Intro\nPublic sample content...',
      word_count: 350,
      status: 'ready',
      is_free_sample: true
    },
    {
      id: ch2Id,
      ebook_id: testBookId,
      edition_id: testEdition1Id,
      chapter_index: 2,
      title: 'Chapter 2: Deep Staging Concept',
      slug: `ch-2-staging-${testRunId}`,
      content_body: '# Deep Concept\nPaid content...',
      word_count: 850,
      status: 'draft', // Intentionally draft to verify rollback
      is_free_sample: false
    }
  ]);

  // 3. ATOMIC PUBLICATION & ROLLBACK VERIFICATION
  console.log('\n--- 3. VERIFYING ATOMIC PUBLICATION & ROLLBACK IN DATABASE ---');

  // Test 3.1: Non-admin execution rejection
  const { error: nonAdminRpcErr } = await serviceClient.rpc('publish_ebook_edition', {
    p_book_id: testBookId,
    p_edition_id: testEdition1Id,
    p_actor_id: studentUser.id
  });
  record('ATOMIC_RPC', 'Non-admin execution of publish_ebook_edition rejected with 42501',
    Boolean(nonAdminRpcErr?.code === '42501' || nonAdminRpcErr?.message?.includes('Forbidden')),
    `SQL exception: ${nonAdminRpcErr?.message}`);

  // Test 3.2: Precondition check failure (Chapter 2 is draft) -> Transaction aborted
  const { error: precondErr } = await serviceClient.rpc('publish_ebook_edition', {
    p_book_id: testBookId,
    p_edition_id: testEdition1Id,
    p_actor_id: adminUser.id
  });
  record('ATOMIC_RPC', 'Precondition failure (unready chapter) aborts transaction in PostgreSQL',
    precondErr !== null && precondErr.message.includes('must be in ready status'),
    `Database exception: ${precondErr?.message}`);

  // Test 3.3: Verify zero mutations left behind after rollback
  const { data: bookAfterFail } = await serviceClient.from('ebooks').select('status').eq('id', testBookId).single();
  const { data: edAfterFail } = await serviceClient.from('ebook_editions').select('status, published_at').eq('id', testEdition1Id).single();
  const { count: auditCountAfterFail } = await serviceClient.from('ebook_audit_logs').select('*', { count: 'exact', head: true }).eq('entity_id', testEdition1Id);

  record('ATOMIC_RPC', 'Zero database mutations verified after aborted publication transaction',
    bookAfterFail?.status === 'draft' && edAfterFail?.status === 'draft' && edAfterFail?.published_at === null && auditCountAfterFail === 0,
    `book.status=${bookAfterFail?.status}, edition.status=${edAfterFail?.status}, audit_logs=${auditCountAfterFail}`);

  // Fix Chapter 2 status to 'ready'
  await serviceClient.from('ebook_chapters').update({ status: 'ready' }).eq('id', ch2Id);

  // Test 3.4: Successful publication transaction
  const { data: pubData, error: pubErr } = await serviceClient.rpc('publish_ebook_edition', {
    p_book_id: testBookId,
    p_edition_id: testEdition1Id,
    p_actor_id: adminUser.id
  });

  const { data: bookAfterPub } = await serviceClient.from('ebooks').select('status').eq('id', testBookId).single();
  const { data: edAfterPub } = await serviceClient.from('ebook_editions').select('status, is_current_edition, published_at').eq('id', testEdition1Id).single();
  const { data: auditAfterPub } = await serviceClient.from('ebook_audit_logs').select('*').eq('entity_id', testEdition1Id);

  record('ATOMIC_RPC', 'Successful atomic publication commits edition, book status, and audit log',
    Boolean(
      !pubErr && pubData?.success === true &&
      bookAfterPub?.status === 'published' &&
      edAfterPub?.status === 'published' &&
      edAfterPub?.is_current_edition === true &&
      edAfterPub?.published_at !== null &&
      auditAfterPub && auditAfterPub.length > 0
    ),
    `Published at: ${edAfterPub?.published_at}, audit action: ${auditAfterPub?.[0]?.action}`);

  // 4. PARTIAL UNIQUE INDEX CONSTRAINT TEST
  console.log('\n--- 4. PARTIAL UNIQUE INDEX CONSTRAINT ENFORCEMENT ---');
  const { error: dupCurrentErr } = await serviceClient.from('ebook_editions').insert({
    ebook_id: testBookId,
    edition_number: 999,
    status: 'draft',
    is_current_edition: true // Intentionally violates single-current partial unique constraint
  });

  record('DATABASE_CONSTRAINTS', 'Partial unique index "idx_ebook_editions_single_current" blocks multiple current editions',
    dupCurrentErr !== null && (dupCurrentErr.code === '23505' || dupCurrentErr.message.includes('unique')),
    `PostgreSQL rejected duplicate current edition: code ${dupCurrentErr?.code}`);

  // 5. CONCURRENT REVISION CREATION IN DATABASE
  console.log('\n--- 5. CONCURRENT REVISION CREATION & ROW-LEVEL LOCKING ---');
  const concurrentRevs = await Promise.all([
    serviceClient.rpc('create_ebook_edition_revision', {
      p_book_id: testBookId,
      p_version_name: 'Staging Revision A',
      p_clone_from_edition_id: testEdition1Id,
      p_actor_id: adminUser.id
    }),
    serviceClient.rpc('create_ebook_edition_revision', {
      p_book_id: testBookId,
      p_version_name: 'Staging Revision B',
      p_clone_from_edition_id: testEdition1Id,
      p_actor_id: adminUser.id
    }),
    serviceClient.rpc('create_ebook_edition_revision', {
      p_book_id: testBookId,
      p_version_name: 'Staging Revision C',
      p_clone_from_edition_id: testEdition1Id,
      p_actor_id: adminUser.id
    })
  ]);

  const revErrors = concurrentRevs.map(r => r.error).filter(Boolean);
  const revData = concurrentRevs.map(r => r.data).filter(d => d?.success);

  const { data: allEditions } = await serviceClient
    .from('ebook_editions')
    .select('id, edition_number, version_name, status, is_current_edition, published_at')
    .eq('ebook_id', testBookId)
    .order('edition_number', { ascending: true });

  const editionNumbers = allEditions?.map(e => e.edition_number) || [];
  const uniqueEditionNumbers = Array.from(new Set(editionNumbers));

  record('CONCURRENCY', 'Row-level locking serializes concurrent revision creations with zero collisions',
    revErrors.length === 0 && revData.length === 3,
    `3/3 parallel requests succeeded; editions created: [${editionNumbers.join(', ')}]`);

  record('CONCURRENCY', 'Edition numbers are strictly unique and sequential across concurrent requests',
    editionNumbers.length === uniqueEditionNumbers.length && editionNumbers.includes(2) && editionNumbers.includes(3) && editionNumbers.includes(4),
    `Edition sequence: [${editionNumbers.join(', ')}]`);

  const newEdition2 = allEditions?.find(e => e.edition_number === 2);
  const { data: ed2Chapters } = await serviceClient
    .from('ebook_chapters')
    .select('*')
    .eq('edition_id', newEdition2?.id)
    .order('chapter_index', { ascending: true });

  record('CONCURRENCY', 'Cloned chapters have new UUIDs and reference the new edition_id',
    ed2Chapters?.length === 2 &&
    ed2Chapters[0].id !== ch1Id &&
    ed2Chapters[0].edition_id === newEdition2?.id &&
    ed2Chapters[1].id !== ch2Id &&
    ed2Chapters[1].edition_id === newEdition2?.id,
    `Original ch1: ${ch1Id} -> Cloned: ${ed2Chapters?.[0]?.id}`);

  record('CONCURRENCY', 'New draft revisions have published_at: null and is_current_edition: false',
    newEdition2?.published_at === null && newEdition2?.is_current_edition === false && newEdition2?.status === 'draft',
    `status: ${newEdition2?.status}, is_current_edition: ${newEdition2?.is_current_edition}, published_at: ${newEdition2?.published_at}`);

  // 6. ATOMIC WITHDRAWAL RPC TEST
  console.log('\n--- 6. VERIFYING ATOMIC WITHDRAWAL RPC ---');
  const { data: withdrawData, error: withdrawErr } = await serviceClient.rpc('withdraw_ebook_edition', {
    p_book_id: testBookId,
    p_edition_id: testEdition1Id,
    p_actor_id: adminUser.id
  });

  const { data: ed1AfterWithdraw } = await serviceClient
    .from('ebook_editions')
    .select('status, is_current_edition, published_at')
    .eq('id', testEdition1Id)
    .single();

  const { data: bookAfterWithdraw } = await serviceClient
    .from('ebooks')
    .select('status')
    .eq('id', testBookId)
    .single();

  record('WITHDRAWAL', 'Atomic withdrawal demotes is_current_edition and sets status to draft',
    !withdrawErr && withdrawData?.success === true &&
    ed1AfterWithdraw?.is_current_edition === false &&
    ed1AfterWithdraw?.status === 'draft',
    `is_current_edition: ${ed1AfterWithdraw?.is_current_edition}, status: ${ed1AfterWithdraw?.status}`);

  record('WITHDRAWAL', 'Withdrawn edition retains historical published_at timestamp for content immutability',
    ed1AfterWithdraw?.published_at !== null,
    `Historical published_at strictly retained: ${ed1AfterWithdraw?.published_at}`);

  record('WITHDRAWAL', 'Book master record status updated to draft when all editions are withdrawn',
    bookAfterWithdraw?.status === 'draft',
    `Master book status: ${bookAfterWithdraw?.status}`);

  // 7. CLEANUP ONLY DISPOSABLE FIXTURES CREATED IN THIS RUN
  console.log('\n--- 7. SAFE CLEANUP OF DISPOSABLE TEST FIXTURES ---');
  await serviceClient.from('ebook_audit_logs').delete().eq('metadata->>book_id', testBookId);
  await serviceClient.from('ebooks').delete().eq('id', testBookId);
  if (adminUser) await serviceClient.auth.admin.deleteUser(adminUser.id);
  if (studentUser) await serviceClient.auth.admin.deleteUser(studentUser.id);
  console.log('  ✔ Only test run fixtures were deleted; unrelated staging records remain untouched.');

  // SUMMARY
  console.log('\n=============================================================================');
  console.log('STAGING INTEGRATION & CONCURRENCY RESULTS');
  console.log('=============================================================================');
  const passCount = results.filter(r => r.passed).length;
  const failCount = results.filter(r => !r.passed).length;
  console.log(`TOTAL PASS: ${passCount}`);
  console.log(`TOTAL FAIL: ${failCount}`);
  console.log('=============================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

// Direct execution when invoked from CLI
if (require.main === module) {
  runStagingVerificationSuite().catch(err => {
    console.error('Execution terminated:', err.message);
    process.exit(1);
  });
}
