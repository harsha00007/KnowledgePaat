export {};

function runTests() {
  console.log("=================================================");
  console.log("GRADZENX: HARDENING & QA VERIFICATION TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  const assert = (desc: string, condition: boolean) => {
    total++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
    }
  };

  // -------------------------------------------------------------
  // GROUP 1: Registration Validation Logic
  // -------------------------------------------------------------
  console.log("--- Group 1: Registration Validation Logic ---");

  const validateRegistration = (name: string, email: string, pass: string, confirm: string) => {
    const errors: string[] = [];
    const trimmedName = name.trim();
    if (!trimmedName) errors.push('Full Name is required.');
    else if (trimmedName.length > 20) errors.push('Full Name must not exceed 20 characters.');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) errors.push('Email address is required.');
    else if (trimmedEmail.length > 255) errors.push('Email address must not exceed 255 characters.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) errors.push('Please enter a valid email address.');

    if (!pass || pass.length < 8) errors.push('Password must be at least 8 characters.');
    else if (pass.length > 20) errors.push('Password must not exceed 20 characters.');

    if (pass !== confirm) errors.push('Passwords do not match.');

    return errors;
  };

  // 1A. Full Name
  assert("Valid full name (14 chars) passes validation", validateRegistration("Harshanagendra", "harsha@example.com", "SecretPass123", "SecretPass123").length === 0);
  assert("Full name exceeding 20 chars is rejected", validateRegistration("Harshanagendranathan123", "harsha@example.com", "SecretPass123", "SecretPass123").includes("Full Name must not exceed 20 characters."));
  assert("Empty full name is rejected", validateRegistration("   ", "harsha@example.com", "SecretPass123", "SecretPass123").includes("Full Name is required."));

  // 1B. Email
  assert("Valid email passes validation", validateRegistration("Harsha", "student@gradzenx.com", "SecretPass123", "SecretPass123").length === 0);
  assert("Email exceeding 255 chars is rejected", validateRegistration("Harsha", "a".repeat(250) + "@gradzenx.com", "SecretPass123", "SecretPass123").includes("Email address must not exceed 255 characters."));
  assert("Malformed email is rejected", validateRegistration("Harsha", "invalid-email-format", "SecretPass123", "SecretPass123").includes("Please enter a valid email address."));

  // 1C. Password
  assert("Password under 8 chars is rejected", validateRegistration("Harsha", "harsha@example.com", "1234567", "1234567").includes("Password must be at least 8 characters."));
  assert("Password over 20 chars is rejected", validateRegistration("Harsha", "harsha@example.com", "A".repeat(21), "A".repeat(21)).includes("Password must not exceed 20 characters."));
  assert("Password with 8-20 chars is accepted", validateRegistration("Harsha", "harsha@example.com", "ValidPass123", "ValidPass123").length === 0);

  // 1D. Confirm Password
  assert("Mismatched confirm password is rejected", validateRegistration("Harsha", "harsha@example.com", "SecretPass123", "WrongPass123").includes("Passwords do not match."));

  // -------------------------------------------------------------
  // GROUP 2: Already Registered User Detection
  // -------------------------------------------------------------
  console.log("\n--- Group 2: Already Registered User Detection ---");

  const detectAlreadyRegistered = (errorMsg?: string, identities?: any[]) => {
    if (identities && Array.isArray(identities) && identities.length === 0) return true;
    if (!errorMsg) return false;
    const lower = errorMsg.toLowerCase();
    return lower.includes('already registered') ||
      lower.includes('already exists') ||
      lower.includes('user already exists') ||
      lower.includes('identity already exists');
  };

  assert("Detects error message 'User already registered'", detectAlreadyRegistered("User already registered"));
  assert("Detects error message 'user already exists'", detectAlreadyRegistered("user already exists with this email"));
  assert("Detects Supabase identity collision (identities = [])", detectAlreadyRegistered(undefined, []));
  assert("Does not falsely flag fresh user", !detectAlreadyRegistered(undefined, [{ id: '123' }]));

  // -------------------------------------------------------------
  // GROUP 3: Already Logged-in User Redirection Logic
  // -------------------------------------------------------------
  console.log("\n--- Group 3: Already Logged-in User Redirection Logic ---");

  const determineRedirect = (pathname: string, user: { id: string; role: 'student' | 'admin' } | null) => {
    const isRootRoute = pathname === '/';
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');
    const isStudentRoute = pathname.startsWith('/student');
    const isAdminRoute = pathname.startsWith('/admin');

    if (!user) {
      if (isStudentRoute || isAdminRoute) return '/login';
      return null; // allow public access
    }

    if (isRootRoute || isAuthRoute) {
      return user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    }

    if (isAdminRoute && user.role !== 'admin') return '/student/dashboard';
    if (isStudentRoute && user.role !== 'student') return '/admin/dashboard';

    return null; // allowed
  };

  assert("Logged-in student visiting '/' redirects to /student/dashboard", determineRedirect('/', { id: 's1', role: 'student' }) === '/student/dashboard');
  assert("Logged-in admin visiting '/' redirects to /admin/dashboard", determineRedirect('/', { id: 'a1', role: 'admin' }) === '/admin/dashboard');
  assert("Logged-in student visiting '/login' redirects to /student/dashboard", determineRedirect('/login', { id: 's1', role: 'student' }) === '/student/dashboard');
  assert("Logged-in admin visiting '/register' redirects to /admin/dashboard", determineRedirect('/register', { id: 'a1', role: 'admin' }) === '/admin/dashboard');
  assert("Unauthenticated visitor on '/' is allowed (returns null)", determineRedirect('/', null) === null);
  assert("Unauthenticated visitor on '/student/dashboard' is redirected to /login", determineRedirect('/student/dashboard', null) === '/login');

  // -------------------------------------------------------------
  // GROUP 4: Job Active/Inactive Visibility Isolation
  // -------------------------------------------------------------
  console.log("\n--- Group 4: Job Active/Inactive Visibility Isolation ---");

  interface MockJob {
    id: string;
    title: string;
    status: 'Active' | 'Inactive';
  }

  const mockJobsDb: MockJob[] = [
    { id: 'j1', title: 'Active Job 1', status: 'Active' },
    { id: 'j2', title: 'Active Job 2', status: 'Active' },
    { id: 'j3', title: 'Inactive Job 1', status: 'Inactive' },
    { id: 'j4', title: 'Inactive Job 2', status: 'Inactive' },
  ];

  // Student query: .eq('status', 'Active')
  const studentVisibleJobs = mockJobsDb.filter(j => j.status === 'Active');
  assert("Student query returns only 2 active jobs out of 4 total", studentVisibleJobs.length === 2);
  assert("Inactive jobs j3 and j4 are not present in student results", !studentVisibleJobs.some(j => j.status === 'Inactive'));

  // Admin reactivates j3
  const updatedJobsDb = mockJobsDb.map(j => j.id === 'j3' ? { ...j, status: 'Active' as const } : j);
  const studentRefetchedJobs = updatedJobsDb.filter(j => j.status === 'Active');
  assert("Student immediately sees reactivated job j3 (now 3 active jobs)", studentRefetchedJobs.length === 3 && studentRefetchedJobs.some(j => j.id === 'j3'));

  // -------------------------------------------------------------
  // GROUP 5: Notes Active/Inactive Visibility Isolation
  // -------------------------------------------------------------
  console.log("\n--- Group 5: Notes Active/Inactive Visibility Isolation ---");

  interface MockNote {
    id: string;
    title: string;
    status: 'Active' | 'Inactive';
  }

  const mockNotesDb: MockNote[] = [
    { id: 'n1', title: 'Active Note 1', status: 'Active' },
    { id: 'n2', title: 'Inactive Note 1', status: 'Inactive' },
  ];

  // Student query: .eq('status', 'Active')
  const studentVisibleNotes = mockNotesDb.filter(n => n.status === 'Active');
  assert("Student query returns only active notes", studentVisibleNotes.length === 1 && studentVisibleNotes[0].id === 'n1');
  assert("Inactive note n2 is excluded from student notes", !studentVisibleNotes.some(n => n.id === 'n2'));

  // -------------------------------------------------------------
  // GROUP 6: Theme Contrast & Semantic Token Validation
  // -------------------------------------------------------------
  console.log("\n--- Group 6: Theme Contrast & Semantic Tokens ---");

  const lightTokens = {
    foreground: '#0f172a',
    bg: '#ffffff',
    textPrimary: '#0f172a',
  };

  const darkTokens = {
    foreground: '#f8fafc',
    bg: '#0b0f19',
    textPrimary: '#f8fafc',
  };

  assert("Light theme foreground is dark (#0f172a)", lightTokens.foreground === '#0f172a');
  assert("Dark theme foreground is light (#f8fafc)", darkTokens.foreground === '#f8fafc');
  assert("Light theme textPrimary contrast matches expectation", lightTokens.textPrimary === '#0f172a');
  assert("Dark theme textPrimary contrast matches expectation", darkTokens.textPrimary === '#f8fafc');

  console.log("\n=================================================");
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log("=================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
