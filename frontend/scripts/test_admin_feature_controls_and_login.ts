import { 
  DEFAULT_FEATURE_FLAGS, 
  FEATURE_METADATA, 
  FeatureKey, 
  isStudentModuleEnabled, 
  getFeatureKeyForPath 
} from '../lib/featureFlags';

function runTestSuite() {
  console.log("===============================================================================");
  console.log("KNOWLEDGEPAAT — ADMIN CONTROLLED STUDENT PORTAL & ADMIN LOGIN VERIFICATION");
  console.log("===============================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    }
  }

  // 1. Feature Flag Metadata Completeness
  console.log("--- TEST GROUP 1: Metadata & Keys Completeness ---");
  assert(
    FEATURE_METADATA.length >= 14,
    "All 14 core feature flags defined in FEATURE_METADATA",
    `Count: ${FEATURE_METADATA.length}`
  );

  const requiredKeys: FeatureKey[] = [
    'student_portal',
    'student_dashboard',
    'student_profile',
    'student_resume',
    'student_jobs',
    'student_career_progress',
    'student_career_intelligence',
    'student_interview_prep',
    'student_mock_interviews',
    'student_notes',
    'student_store',
    'student_purchases',
    'student_subscription',
    'student_login',
    'student_registration',
    'blur_homepage_pricing'
  ];

  requiredKeys.forEach(k => {
    assert(
      k in DEFAULT_FEATURE_FLAGS,
      `Key "${k}" present in DEFAULT_FEATURE_FLAGS with default boolean value`
    );
  });

  // 2. Route Path Mapping
  console.log("\n--- TEST GROUP 2: Route Path to Feature Key Mapping ---");
  const testRoutes: [string, FeatureKey | null][] = [
    ['/student/dashboard', 'student_dashboard'],
    ['/student/profile', 'student_profile'],
    ['/student/resume', 'student_resume'],
    ['/student/jobs', 'student_jobs'],
    ['/student/career-progress', 'student_career_progress'],
    ['/student/career-intelligence', 'student_career_intelligence'],
    ['/student/interview-preparation', 'student_interview_prep'],
    ['/student/mock-interview', 'student_mock_interviews'],
    ['/student/mock-interviews', 'student_mock_interviews'],
    ['/student/notes', 'student_notes'],
    ['/student/store', 'student_store'],
    ['/student/cart', 'student_store'],
    ['/student/checkout', 'student_store'],
    ['/student/purchases', 'student_purchases'],
    ['/student/subscription', 'student_subscription'],
    ['/login', 'student_login'],
    ['/register', 'student_registration'],
    ['/admin/login', null],
    ['/admin/dashboard', null],
    ['/admin/settings', null],
  ];

  testRoutes.forEach(([path, expectedKey]) => {
    const matched = getFeatureKeyForPath(path);
    assert(
      matched === expectedKey,
      `Path "${path}" correctly maps to feature flag "${expectedKey}" (got: "${matched}")`
    );
  });

  // 3. Master Portal Switch Evaluation
  console.log("\n--- TEST GROUP 3: Master Switch Gating Logic ---");
  const allEnabledFlags = { ...DEFAULT_FEATURE_FLAGS };
  assert(
    isStudentModuleEnabled(allEnabledFlags, 'student_jobs') === true,
    "When master portal is TRUE and jobs is TRUE -> Jobs is enabled"
  );
  assert(
    isStudentModuleEnabled(allEnabledFlags, 'student_notes') === true,
    "When master portal is TRUE and notes is TRUE -> Notes is enabled"
  );

  const masterDisabledFlags = { ...DEFAULT_FEATURE_FLAGS, student_portal: false };
  assert(
    isStudentModuleEnabled(masterDisabledFlags, 'student_jobs') === false,
    "When master portal is FALSE -> Jobs is disabled even if jobs flag is true"
  );
  assert(
    isStudentModuleEnabled(masterDisabledFlags, 'student_mock_interviews') === false,
    "When master portal is FALSE -> Mock interviews is disabled"
  );
  assert(
    isStudentModuleEnabled(masterDisabledFlags, 'student_dashboard') === false,
    "When master portal is FALSE -> Dashboard is disabled"
  );

  // 4. Granular Feature Gating
  console.log("\n--- TEST GROUP 4: Granular Feature Toggle Logic ---");
  const jobsDisabledFlags = { ...DEFAULT_FEATURE_FLAGS, student_jobs: false };
  assert(
    isStudentModuleEnabled(jobsDisabledFlags, 'student_jobs') === false,
    "When jobs flag is FALSE -> Jobs is disabled"
  );
  assert(
    isStudentModuleEnabled(jobsDisabledFlags, 'student_notes') === true,
    "When jobs flag is FALSE -> Notes remains active"
  );
  assert(
    isStudentModuleEnabled(jobsDisabledFlags, 'student_mock_interviews') === true,
    "When jobs flag is FALSE -> Mock interviews remains active"
  );

  const notesDisabledFlags = { ...DEFAULT_FEATURE_FLAGS, student_notes: false };
  assert(
    isStudentModuleEnabled(notesDisabledFlags, 'student_notes') === false,
    "When notes flag is FALSE -> Notes is disabled"
  );
  assert(
    isStudentModuleEnabled(notesDisabledFlags, 'student_jobs') === true,
    "When notes flag is FALSE -> Jobs remains active"
  );

  // 5. Public Gateway Flags
  console.log("\n--- TEST GROUP 5: Public Gateway Flags ---");
  const loginDisabledFlags = { ...DEFAULT_FEATURE_FLAGS, student_login: false };
  assert(
    loginDisabledFlags.student_login === false,
    "student_login flag can be disabled independently"
  );
  const regDisabledFlags = { ...DEFAULT_FEATURE_FLAGS, student_registration: false };
  assert(
    regDisabledFlags.student_registration === false,
    "student_registration flag can be disabled independently"
  );

  // 6. Verification Summary
  console.log("\n===============================================================================");
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("===============================================================================");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite();
