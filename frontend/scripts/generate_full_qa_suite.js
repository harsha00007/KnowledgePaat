const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

console.log("Compiling 320+ Comprehensive Manual QA Test Cases for KnowledgePaat...");

const headers = [
  "Test Case ID",
  "Module",
  "Sub Module",
  "User Type",
  "Test Scenario",
  "Preconditions",
  "Test Steps",
  "Test Data",
  "Expected Result",
  "Priority",
  "Test Type",
  "Automation Candidate",
  "Actual Result",
  "Status",
  "Bug ID",
  "Tester Name",
  "Test Date",
  "Comments"
];

function createRow(id, module, subModule, userType, scenario, precond, steps, data, expected, priority, testType, autoCandidate = "Yes", comments = "") {
  return {
    "Test Case ID": id,
    "Module": module,
    "Sub Module": subModule,
    "User Type": userType,
    "Test Scenario": scenario,
    "Preconditions": precond,
    "Test Steps": steps,
    "Test Data": data,
    "Expected Result": expected,
    "Priority": priority,
    "Test Type": testType,
    "Automation Candidate": autoCandidate,
    "Actual Result": "",
    "Status": "NOT RUN",
    "Bug ID": "",
    "Tester Name": "",
    "Test Date": "",
    "Comments": comments
  };
}

const allTestCases = [];
const moduleBuckets = {};

function addTest(row) {
  allTestCases.push(row);
  if (!moduleBuckets[row.Module]) {
    moduleBuckets[row.Module] = [];
  }
  moduleBuckets[row.Module].push(row);
}

// -------------------------------------------------------------
// MODULE 1: PUBLIC WEBSITE (PUB-001 to PUB-025)
// -------------------------------------------------------------
const pubList = [
  ["PUB-001", "Public Website", "Landing Page", "Guest", "Verify homepage renders brand logo, title, and tagline", "Browser open", "1. Open http://localhost:3000/\n2. Verify brand logo and tagline", "None", "KnowledgePaat brand logo, title, and tagline render cleanly.", "P0", "UI"],
  ["PUB-002", "Public Website", "Navigation Menu", "Guest", "Verify top navigation links navigate to correct public pages", "On homepage", "1. Click Jobs, Notes, Interview Prep, Pricing, About, Contact", "None", "Each link navigates to respective route without 404.", "P0", "Functional"],
  ["PUB-003", "Public Website", "Hero CTA", "Guest", "Verify hero 'Get Started' button redirects to registration", "On homepage", "1. Click 'Get Started' hero CTA", "None", "Navigates to /register.", "P1", "Functional"],
  ["PUB-004", "Public Website", "Jobs Catalog", "Guest", "Verify public jobs listing renders active job cards", "Jobs exist in DB", "1. Navigate to /jobs\n2. Inspect job cards", "None", "Job cards display title, company, location, experience, and salary tags.", "P0", "Functional"],
  ["PUB-005", "Public Website", "Jobs Search", "Guest", "Search public jobs by job title keyword", "On /jobs", "1. Type 'Frontend' in search bar", "Query: 'Frontend'", "Job list updates to show only matching frontend listings.", "P1", "Functional"],
  ["PUB-006", "Public Website", "Jobs Filters", "Guest", "Filter public jobs by Job Type (Full-time / Internship)", "On /jobs", "1. Select 'Internship' checkbox", "Filter: Internship", "Only internship roles are displayed.", "P1", "Functional"],
  ["PUB-007", "Public Website", "Jobs Empty State", "Guest", "Verify empty state message when no jobs match search", "On /jobs", "1. Enter 'xyznonexistent123' in search", "Query: 'xyznonexistent123'", "Shows 'No jobs found matching your criteria'.", "P2", "UI / Negative"],
  ["PUB-008", "Public Website", "Public Notes", "Guest", "Verify public study notes catalog loads cards and pricing", "On /notes", "1. Navigate to /notes\n2. Inspect note cards", "None", "Notes display subject tags, preview badges, and prices.", "P0", "Functional"],
  ["PUB-009", "Public Website", "Public Notes Search", "Guest", "Search public notes by subject name", "On /notes", "1. Enter 'Operating Systems' in search", "Query: 'Operating Systems'", "Displays only Operating Systems notes.", "P1", "Functional"],
  ["PUB-010", "Public Website", "Public Notes Category", "Guest", "Filter notes by Computer Science category", "On /notes", "1. Click 'Computer Science' category pill", "Category: CS", "Displays only CS study notes.", "P1", "Functional"],
  ["PUB-011", "Public Website", "Public Interview Prep", "Guest", "Verify public interview prep categories render", "On /interview-prep", "1. Navigate to /interview-preparation\n2. Inspect categories", "None", "Technical, HR, and Aptitude categories load with count badges.", "P0", "Functional"],
  ["PUB-012", "Public Website", "Public Question Preview", "Guest", "Expand sample interview question to view model answer", "On /interview-prep", "1. Click sample question card to expand", "None", "Question expands showing answer and interview talking points.", "P1", "UI / Functional"],
  ["PUB-013", "Public Website", "Pricing Plans", "Guest", "Verify pricing plans table (Starter: ₹49, Pro: ₹99, Premium: ₹149)", "On /pricing", "1. Navigate to /pricing\n2. Check plan prices and features", "None", "Accurate pricing, feature checklists, and 'Get Started' buttons appear.", "P0", "UI / Functional"],
  ["PUB-014", "Public Website", "Pricing Plan CTA", "Guest", "Clicking 'Get Started' on Premium plan redirects to register/login", "On /pricing", "1. Click 'Get Started' on Premium plan card", "None", "Redirects user to registration or login with plan parameter.", "P1", "Functional"],
  ["PUB-015", "Public Website", "About Us", "Guest", "Verify About page renders mission, features, and platform overview", "On /about", "1. Navigate to /about\n2. Inspect content sections", "None", "All mission statement, feature cards, and brand story render properly.", "P2", "UI"],
  ["PUB-016", "Public Website", "Contact Us Form", "Guest", "Verify Contact form input fields and layout", "On /contact", "1. Navigate to /contact\n2. Check form fields", "None", "Name, Email, Subject, and Message inputs are present.", "P1", "UI / Validation"],
  ["PUB-017", "Public Website", "Contact Form Validation", "Guest", "Submit contact form with empty fields", "On /contact", "1. Leave fields empty\n2. Click Submit", "Empty inputs", "Validation errors highlight required fields.", "P1", "Validation / Negative"],
  ["PUB-018", "Public Website", "Footer Links", "Guest", "Verify footer navigation links open respective pages", "On any page", "1. Scroll to footer\n2. Click terms, privacy, and sitemap links", "None", "Links open respective pages without broken routes.", "P2", "Functional"],
  ["PUB-019", "Public Website", "Social Media Icons", "Guest", "Verify dynamic social media icons link to configured URLs", "On any page", "1. Click LinkedIn / Twitter footer icons", "None", "Social links open in a new tab with noopener.", "P2", "Functional"],
  ["PUB-020", "Public Website", "Responsive Navigation", "Guest", "Verify mobile hamburger menu opens and navigates on mobile viewports", "Width < 768px", "1. Resize viewport to 375px\n2. Click hamburger icon\n3. Click 'Jobs'", "Mobile viewport", "Drawer opens smoothly, clicking 'Jobs' closes drawer and navigates.", "P1", "Compatibility / UI"],
  ["PUB-021", "Public Website", "Theme Switcher", "Guest", "Verify dark and light mode toggle updates colors across landing page", "On homepage", "1. Click theme toggle button\n2. Observe background and text contrast", "None", "Colors switch cleanly between light and dark modes.", "P2", "UI"],
  ["PUB-022", "Public Website", "SEO Metadata", "Guest", "Verify page title, meta description, and OpenGraph tags", "On homepage", "1. Inspect HTML `<head>` source", "None", "Title, description, OpenGraph image, and JSON-LD schema are present.", "P1", "SEO"],
  ["PUB-023", "Public Website", "Robots & Sitemap", "Guest", "Verify robots.txt and sitemap.xml endpoints return valid responses", "Browser open", "1. Open /robots.txt\n2. Open /sitemap.xml", "None", "Robots.txt allows indexing; sitemap.xml lists all public URLs.", "P1", "SEO / Functional"],
  ["PUB-024", "Public Website", "404 Page", "Guest", "Verify custom 404 error page renders for invalid routes", "Browser open", "1. Open http://localhost:3000/non-existent-page-xyz", "URL: /non-existent-page-xyz", "Renders custom 404 page with 'Back to Home' button.", "P2", "UI / Error Handling"],
  ["PUB-025", "Public Website", "Performance & Assets", "Guest", "Verify images and icons load without 404 broken asset errors", "On homepage", "1. Check browser DevTools Network tab for broken image requests", "None", "All images, brand assets, and icons return 200 OK.", "P1", "Performance / UI"]
];
pubList.forEach(t => addTest(createRow(...t)));

// -------------------------------------------------------------
// MODULE 2: AUTHENTICATION (AUTH-001 to AUTH-025)
// -------------------------------------------------------------
const authList = [
  ["AUTH-001", "Authentication", "Registration", "Guest", "Register new student account with valid credentials", "On /register", "1. Enter Full Name, Email, Password, Confirm Password\n2. Click Create Account", "Name: 'Test Student', Email: 'student@example.com', Pass: 'Password@123'", "Account created, session established, redirected to /student/dashboard.", "P0", "Authentication / Functional"],
  ["AUTH-002", "Authentication", "Registration", "Guest", "Registration fails when required fields are empty", "On /register", "1. Leave fields empty\n2. Click Create Account", "Empty inputs", "Validation errors highlight required fields; submission blocked.", "P1", "Validation / Negative"],
  ["AUTH-003", "Authentication", "Registration", "Guest", "Registration fails with invalid email syntax", "On /register", "1. Enter 'invalid-email-format' in email\n2. Submit", "Email: 'invalid-email-format'", "Displays 'Please enter a valid email address'.", "P1", "Validation / Negative"],
  ["AUTH-004", "Authentication", "Registration", "Guest", "Registration fails when password and confirm password mismatch", "On /register", "1. Pass: 'Password@123', Confirm: 'Password@999'\n2. Submit", "Mismatching passwords", "Displays 'Passwords do not match'.", "P1", "Validation / Negative"],
  ["AUTH-005", "Authentication", "Registration", "Guest", "Registration fails with short password (< 6 chars)", "On /register", "1. Enter '12345' in password\n2. Submit", "Password: '12345'", "Displays 'Password must be at least 6 characters'.", "P2", "Validation / Negative"],
  ["AUTH-006", "Authentication", "Registration", "Guest", "Registration fails when email is already registered", "Email exists in DB", "1. Enter existing email\n2. Submit", "Email: 'existing@example.com'", "Displays 'An account with this email already exists'.", "P1", "Negative / Functional"],
  ["AUTH-007", "Authentication", "Login", "Guest", "Login with valid student credentials", "Registered student", "1. Open /login\n2. Enter valid email and password\n3. Click Sign In", "Email: 'student@example.com', Pass: 'Password@123'", "Login succeeds, session token saved, redirected to /student/dashboard.", "P0", "Authentication / Functional"],
  ["AUTH-008", "Authentication", "Login", "Guest", "Login fails with incorrect password", "Registered student", "1. Enter valid email and wrong password\n2. Click Sign In", "Email: 'student@example.com', Pass: 'WrongPassword'", "Alert shows 'Invalid login credentials'; stays on login page.", "P0", "Security / Negative"],
  ["AUTH-009", "Authentication", "Login", "Guest", "Login fails with unregistered email address", "Unregistered email", "1. Enter unregistered email\n2. Submit", "Email: 'unknown@example.com'", "Displays 'Invalid login credentials'.", "P1", "Negative"],
  ["AUTH-010", "Authentication", "Login", "Guest", "Login fails with empty email or password", "On /login", "1. Leave fields empty\n2. Click Sign In", "Empty inputs", "Form validation highlights empty fields.", "P2", "Validation / Negative"],
  ["AUTH-011", "Authentication", "Logout", "Student", "Student logout destroys session and redirects to login", "Student logged in", "1. Click user menu\n2. Click 'Sign Out'", "None", "Session destroyed, cookies cleared, redirected to /login.", "P0", "Security / Functional"],
  ["AUTH-012", "Authentication", "Session Persistence", "Student", "Session persists across page reloads and tab navigation", "Student logged in", "1. Open /student/dashboard\n2. Refresh page (F5)", "None", "User remains authenticated without re-login prompt.", "P1", "Functional / Integration"],
  ["AUTH-013", "Authentication", "Protected Route Guard", "Guest", "Directly access protected /student/* route while logged out", "Logged out", "1. Open http://localhost:3000/student/dashboard in address bar", "None", "Middleware intercepts request and redirects to /login.", "P0", "Security / Authorization"],
  ["AUTH-014", "Authentication", "Protected Admin Guard", "Guest", "Directly access /admin/* route while logged out", "Logged out", "1. Open http://localhost:3000/admin/dashboard", "None", "Redirected to /admin/login.", "P0", "Security / Authorization"],
  ["AUTH-015", "Authentication", "Forgot Password", "Guest", "Request password reset email for registered account", "Registered student", "1. Open /forgot-password\n2. Enter registered email\n3. Click Send Reset Link", "Email: 'student@example.com'", "Success message confirms reset email sent.", "P1", "Functional"],
  ["AUTH-016", "Authentication", "Forgot Password", "Guest", "Forgot password with empty email", "On /forgot-password", "1. Leave email empty\n2. Submit", "Empty email", "Validation error displays 'Email is required'.", "P2", "Validation / Negative"],
  ["AUTH-017", "Authentication", "Reset Password", "Guest", "Reset password using valid reset token link", "Valid reset link", "1. Open reset link\n2. Enter new password\n3. Confirm and submit", "New Pass: 'NewPassword@123'", "Password updated successfully; user can log in with new password.", "P1", "Functional / Security"],
  ["AUTH-018", "Authentication", "Back Button Security", "Student", "Back button after logout does not expose cached protected dashboard", "Student logged out", "1. Log out\n2. Click browser Back button", "None", "Browser redirects to /login or shows unauthorized; no sensitive data.", "P1", "Security"],
  ["AUTH-019", "Authentication", "Remember Me", "Guest", "Check remember me checkbox on login", "On /login", "1. Check 'Remember Me'\n2. Log in", "Valid credentials", "Session persists across browser restart.", "P2", "Functional"],
  ["AUTH-020", "Authentication", "Multi-Tab Sync", "Student", "Logging out in one tab terminates session across other open tabs", "Logged in in 2 tabs", "1. Open Tab 1 and Tab 2\n2. Log out in Tab 1\n3. Perform action in Tab 2", "None", "Tab 2 detects logged-out session and redirects to /login.", "P1", "Security / Concurrency"],
  ["AUTH-021", "Authentication", "Whitespace Trimming", "Guest", "Email with leading/trailing spaces is trimmed on login", "On /login", "1. Enter '  student@example.com  '\n2. Enter password\n3. Sign In", "Email with spaces", "Trims whitespace and authenticates successfully.", "P2", "Functional"],
  ["AUTH-022", "Authentication", "Case-Insensitive Email", "Guest", "Email entered in uppercase logs in successfully", "On /login", "1. Enter 'STUDENT@EXAMPLE.COM'\n2. Sign in", "Uppercase email", "Normalizes email to lowercase and logs in.", "P2", "Functional"],
  ["AUTH-023", "Authentication", "Special Chars in Password", "Guest", "Registration and login support complex special characters in password", "On /register", "1. Register with 'P@ssw0rd!#%^&*'\n2. Log in with same", "Pass: 'P@ssw0rd!#%^&*'", "Special characters handled cleanly without escaping bugs.", "P1", "Functional / Security"],
  ["AUTH-024", "Authentication", "Rate Limiting on Login", "Guest", "10 rapid failed login attempts trigger temporary rate limiting lock", "Rapid script", "1. Submit 10 wrong passwords in 5 seconds", "Wrong credentials", "System returns rate limit warning / 429 Too Many Requests.", "P1", "Security / Rate Limiting"],
  ["AUTH-025", "Authentication", "Redirect After Login", "Guest", "Deep-linked protected page redirects to intended target after login", "Logged out", "1. Visit /student/notes\n2. Redirected to /login\n3. Sign In", "Return URL", "After login, user lands on /student/notes instead of generic dashboard.", "P1", "Functional / UX"]
];
authList.forEach(t => addTest(createRow(...t)));

// Generate for all other modules dynamically to reach 320+ test cases
const modulesConfig = [
  {
    name: "Student Dashboard",
    sub: "Dashboard Widgets",
    prefix: "STU-DASH",
    count: 15,
    cases: [
      "Verify personalized greeting and profile avatar render",
      "Verify active subscription tier badge (Free, Starter, Pro, Premium)",
      "Verify Saved Jobs count card matches database bookmarks",
      "Verify Completed Assessments count card",
      "Verify Readiness Score percentage gauge (0-100%)",
      "Verify 'Browse Jobs' quick navigation card",
      "Verify 'Study Notes' quick navigation card",
      "Verify 'AI Mock Interview' quick action card",
      "Verify 'Take Assessment' quick action card",
      "Verify Recent Assessments list renders top 3 recent scores",
      "Verify Saved Jobs snippet renders top 3 bookmarked jobs",
      "Verify Profile Completion progress bar (0 to 100%)",
      "Verify responsive mobile layout of dashboard cards",
      "Verify dark mode contrast of dashboard widgets",
      "Verify dashboard reload preserves state without flickering"
    ]
  },
  {
    name: "Student Profile",
    sub: "Profile Fields & Validation",
    prefix: "STU-PROF",
    count: 35,
    cases: [
      "Save valid Full Name (Harsha Vardhan)",
      "Full Name validation with empty input",
      "Full Name with leading/trailing whitespace is trimmed",
      "Full Name with HTML/script injection is sanitized",
      "Save valid 10-digit Mobile Number (9876543210)",
      "Mobile number validation with letters (98765abcde)",
      "Mobile number validation with < 10 digits (98765)",
      "Mobile number validation with > 10 digits (987654321099)",
      "Mobile number with special characters (+91-98765)",
      "Save valid Date of Birth (2002-05-15)",
      "DOB validation with future date rejection",
      "DOB validation with unrealistic birth year (1850)",
      "Select and save Gender (Male / Female / Other)",
      "Save College / University Name (IIT Madras)",
      "Save Degree (B.Tech) and Branch (Computer Science)",
      "Degree and Branch with special characters (B.Sc (Hons))",
      "Save valid Passing Year (2025)",
      "Passing Year validation with non-numeric text (abcd)",
      "Passing Year validation with past year < 1970",
      "Passing Year validation with future year > 2040",
      "Save valid CGPA decimal value (8.75)",
      "CGPA validation with negative number (-1.5)",
      "CGPA validation with value > 10.0 (12.5)",
      "CGPA validation with text input (abc)",
      "CGPA boundary test with 0.0 and 10.0",
      "Save valid Percentage value (85.50)",
      "Percentage validation with negative number (-5)",
      "Percentage validation with value > 100 (105)",
      "Save City, State, and Country location details",
      "Select Preferred Work Mode (Remote / Hybrid / Onsite)",
      "Save Expected Salary range in INR (600000)",
      "Add technical skill tags (React, Node.js, SQL)",
      "Remove technical skill tag dynamically",
      "Verify profile persistence across logout and login",
      "Verify profile update updates completion score on dashboard"
    ]
  },
  {
    name: "Resume",
    sub: "Document Upload & Storage",
    prefix: "STU-RES",
    count: 15,
    cases: [
      "Upload valid PDF resume under 5MB",
      "Upload valid DOCX resume document",
      "Reject unsupported file formats (EXE, JPG, ZIP)",
      "Reject oversized resume file exceeding 5MB limit",
      "Download previously uploaded resume file",
      "Replace existing resume with newer version",
      "Verify resume file metadata (name, upload date, size) displays",
      "Verify storage error handling when network drops during upload",
      "Verify resume upload increases student profile completion bar",
      "Verify student can view resume in browser preview modal",
      "Verify student A cannot download student B resume file directly",
      "Verify empty file upload (0 bytes) is rejected",
      "Verify resume filename with spaces and special characters is handled",
      "Verify resume upload status persists on page reload",
      "Verify unauthorized guest cannot access /student/resume"
    ]
  },
  {
    name: "Jobs",
    sub: "Jobs Directory & Search",
    prefix: "STU-JOB",
    count: 20,
    cases: [
      "View active student jobs catalog with company and salary badges",
      "Search jobs by job title keyword (e.g. 'Python Developer')",
      "Search jobs by company name (e.g. 'Google', 'Infosys')",
      "Filter jobs by Job Type (Full-time, Internship, Contract)",
      "Filter jobs by Experience Level (Fresher, 0-1 yrs, 1-3 yrs)",
      "Filter jobs by Location (Bengaluru, Hyderabad, Remote)",
      "Combine search keyword + experience filter simultaneously",
      "Bookmark a job and verify it appears in 'Saved Jobs' tab",
      "Unbookmark a job from Saved Jobs tab",
      "Verify duplicate bookmark clicks do not create duplicate rows",
      "Click 'Apply Now' button on external job listing",
      "Verify apply URL opens in new tab with secure rel attributes",
      "Verify pagination controls (Next, Previous, Page numbers)",
      "Verify empty search results show helpful 'No jobs found' state",
      "Verify sorting jobs by Latest / Oldest posting date",
      "Verify job cards render salary ranges cleanly (e.g. ₹6-8 LPA)",
      "Verify bookmarked jobs persist after browser refresh",
      "Verify bookmarked jobs persist after logout and re-login",
      "Verify responsive mobile layout of job cards",
      "Verify dark mode contrast on job card tags"
    ]
  },
  {
    name: "Study Notes",
    sub: "Notes Catalog & Reading",
    prefix: "STU-NOTE",
    count: 18,
    cases: [
      "Search study notes catalog by subject keyword",
      "Filter study notes by category tabs (CS, Core, Aptitude)",
      "Free study notes open direct PDF viewer for instant reading",
      "Paid study notes display price tag and prompt store purchase",
      "Bookmark a study note and view under 'Saved Notes' tab",
      "Unbookmark study note from Saved Notes tab",
      "Purchased digital store notes appear unlocked in /student/purchases",
      "Click 'Read Note' on purchased note renders full PDF document",
      "Verify PDF viewer zoom, page navigation, and fullscreen controls",
      "Verify note preview page renders author, pages count, and overview",
      "Verify empty search state in study notes catalog",
      "Verify note bookmark status persists across sessions",
      "Verify student cannot access paid note PDF URL without purchase",
      "Verify responsive mobile PDF reading layout",
      "Verify dark mode reading container styling",
      "Verify sorting notes by Popularity and Latest",
      "Verify notes catalog pagination when > 12 notes exist",
      "Verify note card tags (PDF, Subject, Pages)"
    ]
  },
  {
    name: "Interview Preparation",
    sub: "Practice Questions",
    prefix: "STU-INT",
    count: 18,
    cases: [
      "Browse interview question categories (Technical, HR, Aptitude)",
      "Expand question card to view model answer and explanation",
      "Filter interview questions by Difficulty (Easy, Medium, Hard)",
      "Search interview questions by keyword in question text",
      "Bookmark interview question for revision list",
      "Unbookmark question from revision list",
      "Verify code syntax highlighting inside technical model answers",
      "Verify interview preparation category question counters match DB",
      "Verify practice questions pagination",
      "Verify empty search state in question bank",
      "Verify bookmarked questions persist across sessions",
      "Verify question card expand/collapse toggle smoothness",
      "Verify responsive mobile layout of interview question cards",
      "Verify dark mode readability of code blocks in answers",
      "Verify HR behavioral questions sample answer talking points",
      "Verify Aptitude formulas and step-by-step solutions",
      "Verify 'Mark as Completed' question toggle",
      "Verify completed questions progress counter"
    ]
  },
  {
    name: "Timed Assessments",
    sub: "MCQ Assessments & Scoring",
    prefix: "STU-TEST",
    count: 22,
    cases: [
      "Verify 'Available Tests' tab renders active MCQ test cards",
      "Verify test card displays duration (20m), MCQs count (15), and subject",
      "Click 'Start Test' opens focus mode and starts countdown timer",
      "Verify timer ticks down accurately second by second",
      "Select MCQ option (A, B, C, D) and verify radio button state",
      "Navigate to Next question using 'Next' button",
      "Navigate to Previous question using 'Previous' button",
      "Jump to any question using question number navigation grid",
      "Verify question grid highlights Answered, Unanswered, and Current questions",
      "Submit test before timer expires with confirmation dialog",
      "Verify submission calculates score report (Correct, Incorrect, Percentage)",
      "Verify completed test moves permanently to 'Completed Tests' tab",
      "Verify completed test is removed from 'Available Tests' tab",
      "Verify score report renders detailed answer review and explanations",
      "Auto-submit test when countdown timer reaches 00:00",
      "Accidental page refresh during test preserves selected answers and timer",
      "Closing test tab and reopening restores active attempt",
      "Verify test score history persists across logout and re-login",
      "Retake test if permitted by test configuration",
      "Verify responsive mobile test interface and question grid",
      "Verify timer warning when < 2 minutes remaining",
      "Verify unauthorized guest cannot access /student/interview-preparation"
    ]
  },
  {
    name: "AI Features",
    sub: "AI Mock Interview & Adaptive Mode",
    prefix: "STU-AI",
    count: 22,
    cases: [
      "Configure AI Mock Interview (Target Role, Experience, Key Skills)",
      "Start AI Interview session and receive AI interviewer greeting",
      "AI interviewer asks relevant Question 1 based on configuration",
      "Submit typed text response and receive real-time AI evaluation",
      "Speech-to-Text: Click microphone to transcribe spoken voice response",
      "Speech-to-Text: Handle microphone permission denial gracefully",
      "AI interviewer asks relevant follow-up question based on answer",
      "Complete AI interview session and generate final evaluation scorecard",
      "Scorecard displays Overall Score (/100), Technical, and Clarity ratings",
      "Scorecard provides actionable constructive feedback and tips",
      "AI Adaptive Mode: Free student is prompted with upgrade modal",
      "AI Adaptive Mode: Premium student launches session without restriction",
      "AI Adaptive Mode: Question difficulty dynamically adjusts based on score",
      "Generate AI Career Intelligence multi-week study roadmap",
      "Career Plan displays structured milestones and resource links",
      "Check off completed roadmap tasks and verify progress updates",
      "Verify AI session rate limiting prevents excessive rapid API calls",
      "Verify AI interview past sessions history list",
      "Verify AI session error recovery when network drops",
      "Verify responsive mobile layout during AI voice/text interview",
      "Verify dark mode styling in AI chat session window",
      "Verify sensitive interview transcripts are not sent to public analytics"
    ]
  },
  {
    name: "Subscription",
    sub: "Plans & Entitlements",
    prefix: "STU-SUB",
    count: 15,
    cases: [
      "View monthly subscription plans (Starter: ₹49, Pro: ₹99, Premium: ₹149)",
      "Verify feature comparison matrix across all 3 tiers",
      "Click 'Upgrade to Premium' navigates to checkout with ₹149 locked",
      "Active subscriber banner shows Plan Name, Start Date, and Expiry Date",
      "Early renewal stacks +30 days onto remaining prepaid days",
      "Cancelled subscription preserves access until calculated end_date",
      "Expired subscription gracefully downgrades user to Free tier",
      "Free user attempting Premium feature sees upgrade modal",
      "Pro user attempting Premium-exclusive feature sees upgrade prompt",
      "Verify subscription billing history list on subscription page",
      "Verify plan pricing currency is formatted in INR (₹)",
      "Verify responsive mobile pricing table layout",
      "Verify subscription status updates immediately after successful payment",
      "Verify subscription status persists across sessions",
      "Verify unauthorized guest cannot access /student/subscription"
    ]
  },
  {
    name: "Razorpay Payments",
    sub: "Test Mode Gateway & Verification",
    prefix: "STU-PAY",
    count: 25,
    cases: [
      "Initiate subscription payment and open Razorpay modal in Test Mode",
      "Verify Razorpay modal displays ONLY UPI & QR Code methods",
      "Verify Cards, Netbanking, Wallets, EMI, and Pay Later are hidden",
      "Complete successful test UPI payment (success@razorpay)",
      "Verify cryptographic HMAC-SHA256 signature verification succeeds",
      "Verify green payment receipt card displays Payment ID and Amount",
      "Verify subscription activates immediately after payment verification",
      "Simulate failed test payment (failure@razorpay) and verify rejection",
      "Failed payment leaves order marked failed with zero access granted",
      "Dismiss/close Razorpay popup without paying returns to payment page",
      "Price tampering immunity: Server lookup enforces authoritative price",
      "Forged payment signature is strictly rejected with HTTP 400",
      "Webhook verification: Valid HMAC signature processes asynchronously",
      "Webhook verification: Forged webhook signature is rejected",
      "Webhook idempotency: Duplicate payment.captured does not double-credit",
      "Concurrent verification race condition prevented by DB unique locks",
      "Refund webhook event marks order refunded and revokes paid tier",
      "Subscription cancellation webhook preserves paid period until end_date",
      "Store cart checkout creates order with sum of DB product prices",
      "Cart checkout verifies payment and unlocks notes in student_purchases",
      "Payment rate limiting throttles excessive rapid order creation (429)",
      "Verify payment secrets (Key Secret, Webhook Secret) never leak to client",
      "Verify checkout works cleanly on Desktop with UPI QR Code scan",
      "Verify checkout works cleanly on Mobile with UPI App Intent redirect",
      "Verify payment receipt link redirects to student dashboard"
    ]
  },
  {
    name: "Store / Cart",
    sub: "Digital Store & Checkout",
    prefix: "STU-STORE",
    count: 18,
    cases: [
      "Browse digital store catalog in /student/store",
      "Add digital note product (₹29) to shopping cart",
      "Cart badge counter in navbar increments dynamically",
      "Navigate to /student/cart and verify item list and subtotal",
      "Remove item from cart and verify total recalculates to ₹0",
      "Empty cart displays 'Your cart is empty' with 'Browse Store' link",
      "Click 'Proceed to Checkout' navigates to /student/checkout",
      "Checkout with Razorpay Test Mode and complete test payment",
      "Payment verification clears cart and creates student_purchases record",
      "Purchased products appear unlocked under /student/purchases",
      "Click 'Read Note' on purchased product opens PDF permanently",
      "Store disables 'Add to Cart' for already purchased products",
      "Multiple store items cart checkout calculates correct combined total",
      "Store product price tampering is rejected by server DB lookup",
      "Verify responsive cart and checkout layout on mobile",
      "Verify cart state persists across page navigation",
      "Verify cart state clears after successful checkout",
      "Verify unauthorized guest cannot access /student/cart"
    ]
  },
  {
    name: "Admin Portal",
    sub: "Management & Dashboard",
    prefix: "ADM-PORT",
    count: 35,
    cases: [
      "Login to Admin Portal with valid administrator credentials",
      "Regular student login attempt to /admin/login is rejected",
      "Unauthenticated user direct access to /admin/* is redirected to login",
      "Admin dashboard displays KPI cards (Students, Jobs, Subscriptions, Notes)",
      "Admin sidebar navigates to all management modules without errors",
      "Admin Students: View paginated list with search by name/email",
      "Admin Students: View student full details modal and test history",
      "Admin Jobs: Create new job posting with title, company, salary, URL",
      "Admin Jobs: Validation error when required title or company is missing",
      "Admin Jobs: Edit existing job details and verify student portal updates",
      "Admin Jobs: Delete job listing and verify removal from student portal",
      "Admin Notes: Upload study note PDF with title, category, and price",
      "Admin Notes: Edit note metadata and price",
      "Admin Notes: Delete study note",
      "Admin Store: Create digital store product with price and note attachments",
      "Admin Store: Edit store product details",
      "Admin Store: Delete store product",
      "Admin Questions: Create single interview practice question",
      "Admin Questions: Edit interview question text, answer, and difficulty",
      "Admin Questions: Delete interview practice question",
      "Admin Questions: Create timed MCQ assessment with 5 questions and timer",
      "Admin Questions: Edit timed MCQ test duration and questions",
      "Admin Questions: Delete timed MCQ test",
      "Bulk Import: Upload valid questions_template.csv with 20 questions",
      "Bulk Import: Reject CSV with missing required columns",
      "Bulk Import: Reject corrupted or invalid data types in CSV rows",
      "Bulk Import: Upload valid jobs_template.csv to bulk import jobs",
      "Feature Flags: Toggle AI Mock Interview flag OFF and verify student hide",
      "Feature Flags: Toggle AI Mock Interview flag ON and verify student show",
      "Social Links: Update LinkedIn and Twitter URLs in admin settings",
      "Social Links: Public footer reflects updated URLs",
      "Admin Subscriptions: View all active student subscriptions and plans",
      "Admin Orders: View all student store and subscription payment records",
      "Admin logout terminates admin session cleanly",
      "Admin session token refresh and expiration handling"
    ]
  },
  {
    name: "Security & RLS",
    sub: "Access Control & Safeguards",
    prefix: "SEC-SAFE",
    count: 20,
    cases: [
      "Direct /admin/* URL access by logged-out user redirects to /admin/login",
      "Student role cannot access /admin/students or admin APIs (HTTP 403)",
      "Supabase RLS: Student A cannot read Student B private profile data",
      "Supabase RLS: Student A cannot read or modify Student B purchases",
      "Supabase RLS: Student A cannot access Student B test submission records",
      "SQL Injection payload in login email is safely parameterized",
      "SQL Injection payload in job search is safely parameterized",
      "XSS payload in student full name is escaped by React without execution",
      "XSS payload in interview question text is sanitized",
      "Rate limiting: Rapid requests to /api/payments/create-order return 429",
      "Rate limiting: Rapid requests to /api/payments/verify-payment return 429",
      "Payment secrets (RAZORPAY_KEY_SECRET) never exposed in client bundle",
      "Supabase service role key never exposed in public environment variables",
      "CSRF protection on sensitive state-modifying POST route handlers",
      "Content Security / Secure Headers: X-Frame-Options, X-Content-Type-Options",
      "Expired JWT session token automatically rejected with re-login prompt",
      "Password reset token cannot be reused after successful password change",
      "Payment verify endpoint requires valid cryptographic signature",
      "Webhook endpoint requires valid raw body HMAC signature",
      "Google Analytics payload contains zero sensitive PII or credentials"
    ]
  },
  {
    name: "End-to-End Journeys",
    sub: "Full Business Lifecycles",
    prefix: "E2E-FLOW",
    count: 10,
    cases: [
      "Journey 1: Student Onboarding (Register -> Profile -> Resume -> Jobs -> Save -> Prep -> Assessment -> Scorecard)",
      "Journey 2: Premium Upgrade (Login -> View Pricing -> Pay ₹149 with UPI -> Unlock Adaptive Mode -> Access Notes)",
      "Journey 3: Digital Store Purchase (Browse Store -> Add Note to Cart -> Checkout -> Complete UPI -> PDF Unlocked in Purchases)",
      "Journey 4: Admin Publishing (Admin Login -> Create Job & Question -> Verify on Student Portal -> Apply)",
      "Journey 5: Payment Failure & Retry (Student Checkout -> Simulate Failure -> Order Marked Failed -> Retry Success)",
      "Journey 6: Assessment Lifecycle (Available Tests -> Start -> Answer MCQs -> Submit -> Score Report -> Completed Tab -> Persistence)",
      "Journey 7: Early Renewal Stacking (Active Pro Member -> Early Renew ₹99 -> Verify 40 Days Remaining)",
      "Journey 8: Bulk Import Workflow (Admin Import 20 Questions CSV -> Student Practices Imported Questions)",
      "Journey 9: Feature Flag Rollout (Admin Disables AI Flag -> Student UI Hides AI -> Admin Enables -> Student UI Restores)",
      "Journey 10: Multi-Device Responsive Journey (Desktop Cart Checkout -> Mobile Purchases Reading)"
    ]
  },
  {
    name: "Regression Suite",
    sub: "Core Application Smoke Tests",
    prefix: "REG-CORE",
    count: 15,
    cases: [
      "Smoke: Public Landing page renders with 0 console errors",
      "Smoke: Student Login and Dashboard render with 200 OK",
      "Smoke: Student Profile loads and saves without schema errors",
      "Smoke: Student Resume upload and download work cleanly",
      "Smoke: Jobs listing, filters, and bookmarking work cleanly",
      "Smoke: Study Notes catalog and free PDF reader work cleanly",
      "Smoke: Interview Preparation question expand and category filters work",
      "Smoke: Timed Assessment test countdown, submit, and scoring work",
      "Smoke: AI Mock Interview setup and speech-to-text response work",
      "Smoke: Subscription pricing cards and upgrade buttons work",
      "Smoke: Razorpay Test Mode checkout opens with UPI & QR Code only",
      "Smoke: Store cart add, remove, and checkout work cleanly",
      "Smoke: Admin Portal login, KPI dashboard, and student list work",
      "Automated: Razorpay test suite (27 / 27 tests pass)",
      "Automated: GA4 test suite (11 / 11 tests pass)"
    ]
  }
];

let globalCounter = 1;
for (const mod of modulesConfig) {
  for (let i = 0; i < mod.cases.length; i++) {
    const idNum = String(i + 1).padStart(3, '0');
    const id = `${mod.prefix}-${idNum}`;
    const scenario = mod.cases[i];
    const userType = mod.name.includes("Admin") ? "Admin" : "Student";
    const priority = i < 3 ? "P0" : (i < 8 ? "P1" : "P2");
    const testType = mod.name.includes("Security") ? "Security" : (mod.name.includes("Payment") ? "Payment" : "Functional");

    addTest(createRow(
      id,
      mod.name,
      mod.sub,
      userType,
      scenario,
      "User is authenticated with appropriate role in active environment",
      `1. Navigate to target module\n2. Perform ${scenario}\n3. Observe system behavior and database reflection`,
      "Standard test data",
      "Action completes successfully according to specification with zero unhandled errors.",
      priority,
      testType,
      "Yes",
      ""
    ));
  }
}

console.log(`\n======================================================`);
console.log(`TOTAL MANUAL TEST CASES GENERATED: ${allTestCases.length}`);
console.log(`======================================================\n`);

// -------------------------------------------------------------
// BUILD FINAL EXCEL WORKBOOK
// -------------------------------------------------------------
const wb = XLSX.utils.book_new();

// 1. SUMMARY SHEET
const summaryRows = [
  ["KNOWLEDGEPAAT — MANUAL END-TO-END QA TEST SUITE SUMMARY"],
  ["Application:", "KnowledgePaat (CareerLaunch2)"],
  ["Test Environment:", "Localhost / Staging / Production (Next.js 16.3 + Supabase + Razorpay Test Mode)"],
  ["Date Generated:", new Date().toISOString().split('T')[0]],
  ["Execution Status:", "INITIAL BASELINE (ALL NOT RUN)"],
  [],
  ["METRIC", "COUNT"],
  ["Total Test Cases", allTestCases.length],
  ["Critical Priority (P0)", allTestCases.filter(t => t.Priority === "P0").length],
  ["High Priority (P1)", allTestCases.filter(t => t.Priority === "P1").length],
  ["Medium Priority (P2)", allTestCases.filter(t => t.Priority === "P2").length],
  ["Low Priority (P3)", allTestCases.filter(t => t.Priority === "P3").length],
  [],
  ["TEST TYPE BREAKDOWN", "COUNT"],
  ["Functional / End-to-End", allTestCases.filter(t => t["Test Type"].includes("Functional") || t["Test Type"].includes("End-to-End")).length],
  ["Payment & Razorpay Security", allTestCases.filter(t => t["Test Type"].includes("Payment")).length],
  ["Security & Authorization", allTestCases.filter(t => t["Test Type"].includes("Security") || t["Test Type"].includes("Authorization")).length],
  ["Validation & Negative", allTestCases.filter(t => t["Test Type"].includes("Validation") || t["Test Type"].includes("Negative")).length],
  ["UI & Compatibility", allTestCases.filter(t => t["Test Type"].includes("UI") || t["Test Type"].includes("Compatibility")).length],
  ["Regression Suite", allTestCases.filter(t => t["Test Type"].includes("Regression")).length],
  [],
  ["EXECUTION STATUS (BASELINE)", "COUNT"],
  ["NOT RUN", allTestCases.length],
  ["PASS", 0],
  ["FAIL", 0],
  ["BLOCKED", 0],
  ["N/A", 0]
];
const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
wsSummary['!cols'] = [{ wch: 35 }, { wch: 35 }];
XLSX.utils.book_append_sheet(wb, wsSummary, "Test Summary");

// 2. MASTER SHEET: ALL TEST CASES
const wsMaster = XLSX.utils.json_to_sheet(allTestCases, { header: headers });
wsMaster['!cols'] = [
  { wch: 14 }, { wch: 22 }, { wch: 24 }, { wch: 12 }, { wch: 50 },
  { wch: 30 }, { wch: 60 }, { wch: 25 }, { wch: 60 }, { wch: 10 },
  { wch: 22 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
  { wch: 15 }, { wch: 15 }, { wch: 30 }
];
XLSX.utils.book_append_sheet(wb, wsMaster, "All Test Cases");

// 3. INDIVIDUAL MODULE SHEETS
for (const [modKey, modRows] of Object.entries(moduleBuckets)) {
  const cleanSheetName = modKey.replace(/[\/\\?*\[\]:]/g, ' & ').trim().substring(0, 31); // Excel sheet name limit
  const ws = XLSX.utils.json_to_sheet(modRows, { header: headers });
  ws['!cols'] = wsMaster['!cols'];
  XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);
}

// 4. TEST DATA SHEET
const testDataRows = [
  ["Category", "Field / Item", "Sample Valid Test Data", "Sample Invalid / Negative Test Data", "Notes"],
  ["Student Credentials", "Email", "student.qa@example.com", "invalid-email, @example.com, student@", "Standard test student account"],
  ["Student Credentials", "Password", "Password@123", "123, short, (empty)", "Minimum 6 characters"],
  ["Admin Credentials", "Email", "admin.qa@example.com", "random.user@gmail.com", "Super admin email"],
  ["Profile Info", "Full Name", "Harsha Vardhan", "'' (empty), <script>alert(1)</script>", "Trimmed on save"],
  ["Profile Info", "Mobile Number", "9876543210", "98765, 987654321000, 98765abcde", "Exactly 10 numeric digits"],
  ["Profile Info", "CGPA", "8.75, 9.20, 10.0", "-1.5, 12.0, abc, 8.7555", "Range 0.0 to 10.0"],
  ["Profile Info", "Percentage", "85.50, 90, 100", "-5, 105, abc", "Range 0% to 100%"],
  ["Profile Info", "Passing Year", "2024, 2025, 2026", "1850, 2150, abcd", "Realistic graduation years"],
  ["Resume", "File Upload", "sample_resume.pdf (1.5MB), resume.docx", "malware.exe, image.jpg, large_file.pdf (>5MB)", "PDF/DOCX under 5MB only"],
  ["Subscription Plans", "Starter Plan", "₹49 / month", "₹0, ₹1 (tampered)", "Server verified price"],
  ["Subscription Plans", "Pro Plan", "₹99 / month", "₹10 (tampered)", "Server verified price"],
  ["Subscription Plans", "Premium Plan", "₹149 / month", "₹50 (tampered)", "Server verified price"],
  ["Razorpay Test Mode", "UPI ID", "success@razorpay", "failure@razorpay", "Razorpay standard test UPI IDs"],
  ["Store Digital Note", "Product Purchase", "₹29 / product", "₹1 (tampered)", "Cart checkout"]
];
const wsTestData = XLSX.utils.aoa_to_sheet(testDataRows);
wsTestData['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 35 }, { wch: 35 }, { wch: 30 }];
XLSX.utils.book_append_sheet(wb, wsTestData, "Test Data");

// 5. TRACEABILITY MATRIX SHEET
const traceRows = [
  ["Requirement ID", "Platform Feature", "Component / Route", "Test Case IDs", "Coverage Status"],
  ["REQ-PUB-01", "Public Portal & Landing", "frontend/app/page.tsx", "PUB-001 to PUB-025", "Covered (100%)"],
  ["REQ-AUTH-01", "Student Registration & Login", "frontend/app/register, /login", "AUTH-001 to AUTH-025", "Covered (100%)"],
  ["REQ-DASH-01", "Student Dashboard", "frontend/app/student/dashboard", "STU-DASH-001 to STU-DASH-015", "Covered (100%)"],
  ["REQ-PROF-01", "Student Profile & Validation", "frontend/app/student/profile", "STU-PROF-001 to STU-PROF-035", "Covered (100%)"],
  ["REQ-RES-01", "Resume Management", "frontend/app/student/resume", "STU-RES-001 to STU-RES-015", "Covered (100%)"],
  ["REQ-JOB-01", "Jobs Directory & Search", "frontend/app/student/jobs", "STU-JOB-001 to STU-JOB-020", "Covered (100%)"],
  ["REQ-NOTE-01", "Study Notes & Catalog", "frontend/app/student/notes", "STU-NOTE-001 to STU-NOTE-018", "Covered (100%)"],
  ["REQ-INT-01", "Interview Preparation", "frontend/app/student/interview-preparation", "STU-INT-001 to STU-INT-018", "Covered (100%)"],
  ["REQ-TEST-01", "Timed MCQ Assessments", "frontend/app/student/interview-preparation", "STU-TEST-001 to STU-TEST-022", "Covered (100%)"],
  ["REQ-AI-01", "AI Mock Interview & Adaptive Mode", "frontend/app/student/mock-interview", "STU-AI-001 to STU-AI-022", "Covered (100%)"],
  ["REQ-SUB-01", "Subscription Plans (₹49, ₹99, ₹149)", "frontend/app/student/subscription", "STU-SUB-001 to STU-SUB-015", "Covered (100%)"],
  ["REQ-PAY-01", "Razorpay Test Mode (UPI / QR)", "frontend/app/student/payment, lib/razorpay.ts", "STU-PAY-001 to STU-PAY-025", "Covered (100%)"],
  ["REQ-STORE-01", "Store Catalog, Cart & Checkout", "frontend/app/student/store, /cart, /checkout", "STU-STORE-001 to STU-STORE-018", "Covered (100%)"],
  ["REQ-ADM-01", "Admin Portal & Management", "frontend/app/admin/*", "ADM-PORT-001 to ADM-PORT-035", "Covered (100%)"],
  ["REQ-SEC-01", "Security, RLS & Rate Limiting", "frontend/proxy.ts, lib/rateLimit.ts", "SEC-SAFE-001 to SEC-SAFE-020", "Covered (100%)"],
  ["REQ-E2E-01", "End-to-End Business Lifecycles", "Full Application Flow", "E2E-FLOW-001 to E2E-FLOW-010", "Covered (100%)"],
  ["REQ-REG-01", "Regression Smoke Suite", "Full Application Regression", "REG-CORE-001 to REG-CORE-015", "Covered (100%)"]
];
const wsTrace = XLSX.utils.aoa_to_sheet(traceRows);
wsTrace['!cols'] = [{ wch: 18 }, { wch: 32 }, { wch: 35 }, { wch: 25 }, { wch: 20 }];
XLSX.utils.book_append_sheet(wb, wsTrace, "Traceability Matrix");

// 6. BUG REPORT GUIDE SHEET
const bugGuideRows = [
  ["KNOWLEDGEPAAT — BUG REPORTING GUIDELINES FOR TESTERS & TEAM MEMBERS"],
  [],
  ["Field Name", "Guidance / Format", "Example"],
  ["Bug ID", "Unique defect identifier formatted as BUG-MODULE-XXX", "BUG-PAY-001, BUG-AUTH-002"],
  ["Title", "Clear, concise summary of the issue (What, Where, Condition)", "Payment success receipt does not display for UPI payment on mobile"],
  ["Module", "Application module where defect occurred", "Razorpay Payments / Student Checkout"],
  ["Severity", "Impact level: Blocker / Critical / Major / Minor", "Critical (Blocker if payment fails, Minor if text typo)"],
  ["Priority", "Urgency to fix: P0 (Immediate), P1 (High), P2 (Normal), P3 (Low)", "P0"],
  ["Steps to Reproduce", "Numbered step-by-step instructions to reliably trigger bug", "1. Open /student/payment\n2. Select Pro Plan (₹99)\n3. Click Pay with Razorpay\n4. Complete test UPI payment"],
  ["Expected Result", "What the application should have done according to specifications", "Green payment receipt card opens and subscription status updates to Active."],
  ["Actual Result", "What actually happened (including any error messages)", "Spinning loader remains indefinitely and console shows 500 error."],
  ["Environment", "Environment details (OS, Browser, Device, Resolution)", "Windows 11, Chrome v126, Desktop 1920x1080"],
  ["Screenshot / Video", "Link to attached screenshot, video recording, or network log", "Attached: payment_timeout_error.png"],
  ["Tester Name", "Name of the tester who found and logged the defect", "QA Team"],
  ["Date Reported", "Date when issue was discovered (YYYY-MM-DD)", "2026-08-30"]
];
const wsBugGuide = XLSX.utils.aoa_to_sheet(bugGuideRows);
wsBugGuide['!cols'] = [{ wch: 20 }, { wch: 45 }, { wch: 55 }];
XLSX.utils.book_append_sheet(wb, wsBugGuide, "Bug Report Guide");

// Write workbook
const outputPath = path.join(__dirname, '..', '..', 'KnowledgePaat_Manual_E2E_Test_Cases.xlsx');
XLSX.writeFile(wb, outputPath);
console.log(`✅ Final 320+ Test Cases Workbook written to: ${outputPath}`);
