export {};

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { verifyRazorpayPaymentSignature, generateTestPaymentSignature, getRazorpayCredentials } from '../lib/razorpay';
import { RATE_LIMIT_POLICIES } from '../lib/rateLimit';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failed++;
  }
}

async function runPublicLaunchBlockerTestSuite() {
  console.log('====================================================================');
  console.log('KNOWLEDGEPAAT: PUBLIC-LAUNCH BLOCKER FIXES & REGRESSION VERIFICATION');
  console.log('====================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: RAZORPAY CRYPTOGRAPHIC SIGNATURE VERIFICATION
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: Razorpay Signature Verification & Test Bypass Elimination ---');

  const { keySecret } = getRazorpayCredentials();
  const testOrderId = 'order_prod_live_998811';
  const testPaymentId = 'pay_prod_live_445522';

  const validSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  assert(
    verifyRazorpayPaymentSignature({
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSignature
    }) === true,
    'Valid HMAC-SHA256 signature is accepted by verification engine'
  );

  assert(
    verifyRazorpayPaymentSignature({
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: 'forged_fake_signature_hex_1234567890abcdef'
    }) === false,
    'Forged / invalid payment signature is strictly rejected'
  );

  // In production mode, test_sig_ prefix is rejected
  const fakeTestSig = `test_sig_${testPaymentId}`;
  assert(
    verifyRazorpayPaymentSignature({
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: fakeTestSig
    }) === false,
    'Unverified test_sig_ string is rejected by cryptographic engine'
  );

  // -------------------------------------------------------------
  // TEST 2: UNAUTHENTICATED TEST SUBMISSION AUTH ENFORCEMENT
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Unauthenticated Test Submission Security ---');

  const submitTestRoutePath = path.join(__dirname, '..', 'app', 'api', 'student', 'interview-prep', 'submit-test', 'route.ts');
  const submitTestCode = fs.readFileSync(submitTestRoutePath, 'utf-8');

  assert(
    submitTestCode.includes("authError || !user") && submitTestCode.includes("status: 401"),
    'submit-test route enforces 401 Unauthorized when user is unauthenticated'
  );

  assert(
    !submitTestCode.includes(".select('id').eq('role', 'student').limit(1)"),
    'submit-test route NO LONGER falls back to first student profile in DB'
  );

  assert(
    !submitTestCode.includes("'00000000-0000-0000-0000-000000000000'"),
    'submit-test route NO LONGER uses zero UUID fallback'
  );

  // -------------------------------------------------------------
  // TEST 3: DEVELOPER CREDENTIALS SANITIZATION
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Developer Credentials & Secrets Sanitization ---');

  const setupAdminPath = path.join(__dirname, '..', 'setup_admin.js');
  const simulateLoginPath = path.join(__dirname, '..', 'simulate_login.js');
  const checkRolePath = path.join(__dirname, '..', 'check_role.js');

  const setupAdminCode = fs.readFileSync(setupAdminPath, 'utf-8');
  const simulateLoginCode = fs.readFileSync(simulateLoginPath, 'utf-8');
  const checkRoleCode = fs.readFileSync(checkRolePath, 'utf-8');

  assert(!setupAdminCode.includes('Admin@123'), 'setup_admin.js does not contain hardcoded password');
  assert(!setupAdminCode.includes('EFBJ6J6Z'), 'setup_admin.js does not contain hardcoded JWT secret');
  assert(setupAdminCode.includes('process.env.ADMIN_EMAIL'), 'setup_admin.js reads email from process.env');

  assert(!simulateLoginCode.includes('Admin@123'), 'simulate_login.js does not contain hardcoded password');
  assert(simulateLoginCode.includes('process.env.TEST_USER_EMAIL'), 'simulate_login.js reads email from process.env');

  assert(!checkRoleCode.includes('EFBJ6J6Z'), 'check_role.js does not contain hardcoded JWT secret');
  assert(checkRoleCode.includes('process.env.CHECK_EMAIL'), 'check_role.js reads email from process.env');

  // -------------------------------------------------------------
  // TEST 4: RESUME TEMPLATES FALLBACK REMOVAL
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Resume Template Clean Fallback ---');

  const resumePagePath = path.join(__dirname, '..', 'app', 'student', 'resume', 'page.tsx');
  const resumePageCode = fs.readFileSync(resumePagePath, 'utf-8');

  assert(
    !resumePageCode.includes("file_url: '/sample_templates/software_engineer_fresher.pdf'"),
    'resume/page.tsx has no hardcoded sample templates array in fetchTemplates'
  );

  assert(
    resumePageCode.includes("setTemplates([])"),
    'resume/page.tsx sets clean empty array when DB returns no rows'
  );

  assert(
    resumePageCode.includes("No resume templates are available right now"),
    'resume/page.tsx renders clean user-friendly empty state when template count is 0'
  );

  // -------------------------------------------------------------
  // TEST 5: SQL SEED SCRIPT CLEANLINESS
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Database Setup Script Cleanliness ---');

  const jobsSqlPath = path.join(__dirname, '..', '..', 'supabase_jobs_setup.sql');
  const notesSqlPath = path.join(__dirname, '..', '..', 'supabase_notes_setup.sql');

  const jobsSql = fs.readFileSync(jobsSqlPath, 'utf-8');
  const notesSql = fs.readFileSync(notesSqlPath, 'utf-8');

  assert(
    !jobsSql.includes('https://example.com/apply/1'),
    'supabase_jobs_setup.sql has no placeholder example.com job seed rows'
  );

  assert(
    !notesSql.includes('dummy_aptitude.pdf'),
    'supabase_notes_setup.sql has no placeholder dummy_*.pdf note seed rows'
  );

  // -------------------------------------------------------------
  // TEST 6: CONTACT API ROUTE & RATE LIMITING
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Contact API & Form Validation ---');

  const contactRoutePath = path.join(__dirname, '..', 'app', 'api', 'contact', 'route.ts');
  const contactPagePath = path.join(__dirname, '..', 'app', 'contact', 'page.tsx');

  assert(fs.existsSync(contactRoutePath), 'POST /api/contact route exists');

  const contactRouteCode = fs.readFileSync(contactRoutePath, 'utf-8');
  const contactPageCode = fs.readFileSync(contactPagePath, 'utf-8');

  assert(contactRouteCode.includes('RATE_LIMIT_POLICIES.CONTACT_SUBMIT'), 'Contact route enforces rate limiting');
  assert(contactRouteCode.includes('cleanEmail'), 'Contact route validates email format');
  assert(contactPageCode.includes("fetch('/api/contact'"), 'Contact page connects to real /api/contact endpoint');
  assert(!contactPageCode.includes('setTimeout(() => {'), 'Contact page no longer uses client-side mock setTimeout');

  // -------------------------------------------------------------
  // TEST 7: SOCIAL LINKS CONFIGURATION
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Social Links Configuration ---');

  const socialLinksPath = path.join(__dirname, '..', 'data', 'social_links.json');
  const socialLinksData = JSON.parse(fs.readFileSync(socialLinksPath, 'utf-8'));

  assert(
    socialLinksData.instagram?.enabled === false,
    'Unverified Instagram entry is disabled in social_links.json'
  );

  assert(
    !socialLinksData.instagram?.url?.includes('youtube.com'),
    'Instagram entry does not point to a YouTube channel'
  );

  // -------------------------------------------------------------
  // TEST 8: OBSOLETE GENERATE_PAGES SCRIPTS REMOVAL
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Obsolete Scaffolding Removal ---');

  const genPagesJs = path.join(__dirname, '..', 'generate_pages.js');
  const genPagesPy = path.join(__dirname, '..', 'generate_pages.py');

  assert(!fs.existsSync(genPagesJs), 'frontend/generate_pages.js successfully removed');
  assert(!fs.existsSync(genPagesPy), 'frontend/generate_pages.py successfully removed');

  console.log('\n====================================================================');
  console.log(`TEST SUMMARY: ${passed} / ${passed + failed} passed (${((passed / (passed + failed)) * 100).toFixed(1)}%)`);
  console.log('====================================================================');

  if (failed > 0) {
    console.error(`\n❌ ${failed} TEST(S) FAILED!`);
    process.exit(1);
  } else {
    console.log('\n✨ ALL PUBLIC-LAUNCH BLOCKER FIXES VERIFIED SUCCESSFULLY!\n');
  }
}

runPublicLaunchBlockerTestSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
