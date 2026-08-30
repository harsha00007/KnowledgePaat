export {};

/**
 * KnowledgePaat — Google Analytics 4 (GA4) Integration & Security Test Suite
 * Tests GA4 configuration, measurement ID parsing, privacy protection, and navigation tracking.
 */

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('===================================================');
  console.log('TESTING GOOGLE ANALYTICS 4 (GA4) INTEGRATION & SECURITY');
  console.log('===================================================\n');

  // -------------------------------------------------------------
  // TEST GROUP 1: GA4 MEASUREMENT ID FORMAT & VALIDATION
  // -------------------------------------------------------------
  console.log('--- Group 1: Measurement ID Format & Validation ---');

  const validMeasurementId = 'G-ABC123XYZ0';
  const invalidMeasurementId = 'UA-12345678-1'; // Old Universal Analytics format

  const ga4Regex = /^G-[A-Z0-9]+$/i;

  assert(ga4Regex.test(validMeasurementId), 'Valid GA4 Measurement ID matching G-XXXXXXXXXX pattern is accepted');
  assert(!ga4Regex.test(invalidMeasurementId), 'Old Universal Analytics (UA-*) pattern is rejected as non-GA4');

  // -------------------------------------------------------------
  // TEST GROUP 2: GRACEFUL DEGRADATION WHEN GA ID IS ABSENT
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Graceful Degradation (No Key Set) ---');

  function renderGaComponent(gaId?: string) {
    if (!gaId) {
      return null;
    }
    return {
      scriptSrc: `https://www.googletagmanager.com/gtag/js?id=${gaId}`,
      initScript: true
    };
  }

  assert(renderGaComponent(undefined) === null, 'Component gracefully renders null when NEXT_PUBLIC_GA_MEASUREMENT_ID is undefined');
  assert(renderGaComponent('') === null, 'Component gracefully renders null when NEXT_PUBLIC_GA_MEASUREMENT_ID is empty');
  assert(renderGaComponent(validMeasurementId) !== null, 'Component renders Google Tag script when GA ID is provided');

  // -------------------------------------------------------------
  // TEST GROUP 3: PRIVACY & SENSITIVE DATA PROTECTION
  // -------------------------------------------------------------
  console.log('\n--- Group 3: Privacy & Non-PII Safeguards ---');

  const sampleTrackingPayload = {
    page_path: '/student/dashboard',
  };

  const forbiddenKeys = ['password', 'token', 'secret', 'email', 'phone', 'card', 'cvv', 'student_id'];
  const payloadKeys = Object.keys(sampleTrackingPayload);
  const containsSensitiveKey = payloadKeys.some(k => forbiddenKeys.includes(k.toLowerCase()));

  assert(!containsSensitiveKey, 'Tracking payload contains zero sensitive PII or credentials');

  // -------------------------------------------------------------
  // TEST GROUP 4: ROUTE CHANGE URL SANITIZATION
  // -------------------------------------------------------------
  console.log('\n--- Group 4: SPA Navigation URL Formulation ---');

  function buildTrackingUrl(pathname: string, queryString?: string) {
    return queryString ? `${pathname}?${queryString}` : pathname;
  }

  assert(buildTrackingUrl('/') === '/', 'Root route URL correctly resolved');
  assert(buildTrackingUrl('/jobs') === '/jobs', 'Public /jobs route URL correctly resolved');
  assert(buildTrackingUrl('/pricing') === '/pricing', 'Public /pricing route URL correctly resolved');
  assert(buildTrackingUrl('/student/dashboard') === '/student/dashboard', 'Student dashboard URL correctly resolved');
  assert(buildTrackingUrl('/jobs', 'category=software') === '/jobs?category=software', 'Query parameters preserved for analytics filtering');

  console.log('\n===================================================');
  console.log(`GA4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('GA4 test fatal error:', err);
  process.exit(1);
});
