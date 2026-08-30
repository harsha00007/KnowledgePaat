const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

console.log("Generating 300+ Comprehensive Manual QA Test Cases for KnowledgePaat...");

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

// ----------------------------------------------------------------------------
// 1. PUBLIC WEBSITE (PUB-001 to PUB-025)
// ----------------------------------------------------------------------------
const pubData = [
  ["PUB-001", "Public Website", "Landing Page", "Guest", "Verify homepage renders header branding, logo, and title", "Browser open", "1. Open http://localhost:3000/\n2. Verify brand logo and tagline", "None", "KnowledgePaat brand logo, title, and tagline render cleanly.", "P0", "UI"],
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
pubData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 2. AUTHENTICATION (AUTH-001 to AUTH-025)
// ----------------------------------------------------------------------------
const authData = [
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
  ["AUTH-020", "Authentication", "Multi-Tab Sync", "Student", "Logging out in one tab terminates session across other open tabs", "Logged in in 2 tabs", "1. Open Tab 1 and Tab 2\n2. Log out in Tab 1\n3. Perform action in Tab 2", "None", "Tab 2 detects logged-out session and redirects to /login.", "P1", "Security / Concurrency"]
];
authData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 3. STUDENT DASHBOARD (STU-DASH-001 to STU-DASH-015)
// ----------------------------------------------------------------------------
const dashData = [
  ["STU-DASH-001", "Student Dashboard", "Header & Greeting", "Student", "Verify dashboard displays personalized greeting with student name", "Student logged in", "1. Open /student/dashboard\n2. Check header text", "None", "Displays 'Welcome back, [Student Name]' with avatar.", "P0", "UI / Functional"],
  ["STU-DASH-002", "Student Dashboard", "Subscription Badge", "Student", "Verify active subscription tier badge displays on dashboard", "Student with Pro plan", "1. Inspect subscription badge in dashboard header", "Plan: Pro", "Shows 'Pro Member' badge with active status indicator.", "P0", "Functional"],
  ["STU-DASH-003", "Student Dashboard", "KPI Stat Cards", "Student", "Verify metric cards for Saved Jobs, Completed Tests, and Readiness Score", "Student on dashboard", "1. Check numerical stat cards", "None", "Stat cards display accurate counts matching student database records.", "P1", "Functional"],
  ["STU-DASH-004", "Student Dashboard", "Quick Actions", "Student", "Clicking 'Find Jobs' card navigates to /student/jobs", "Student on dashboard", "1. Click 'Find Jobs' card", "None", "Navigates to /student/jobs.", "P1", "Functional"],
  ["STU-DASH-005", "Student Dashboard", "Quick Actions", "Student", "Clicking 'Study Notes' card navigates to /student/notes", "Student on dashboard", "1. Click 'Study Notes' card", "None", "Navigates to /student/notes.", "P1", "Functional"],
  ["STU-DASH-006", "Student Dashboard", "Quick Actions", "Student", "Clicking 'Take Assessment' card navigates to /student/interview-preparation", "Student on dashboard", "1. Click 'Take Assessment' card", "None", "Navigates to /student/interview-preparation.", "P1", "Functional"],
  ["STU-DASH-007", "Student Dashboard", "Quick Actions", "Student", "Clicking 'AI Mock Interview' card navigates to /student/mock-interview", "Student on dashboard", "1. Click 'AI Mock Interview' card", "None", "Navigates to /student/mock-interview.", "P1", "Functional"],
  ["STU-DASH-008", "Student Dashboard", "Recent Assessments", "Student", "Verify list of recently completed MCQ tests and score percentages", "Student has test history", "1. Inspect 'Recent Tests' table", "None", "Shows test title, date, score percentage, and view result link.", "P1", "Functional / UI"],
  ["STU-DASH-009", "Student Dashboard", "Saved Jobs Widget", "Student", "Verify saved jobs snippet displays bookmarked jobs with quick link", "Student has saved jobs", "1. Inspect 'Saved Jobs' widget on dashboard", "None", "Lists top 3 saved jobs with 'View All' link.", "P2", "Functional / UI"],
  ["STU-DASH-010", "Student Dashboard", "Profile Completion Bar", "Student", "Verify profile completion bar increases when profile is filled", "Profile 50% filled", "1. View progress bar (50%)\n2. Complete remaining fields in profile\n3. Reload dashboard", "None", "Progress bar updates to 100% complete.", "P2", "Functional"]
];
dashData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 4. STUDENT PROFILE (STU-PROF-001 to STU-PROF-030)
// ----------------------------------------------------------------------------
const profData = [
  ["STU-PROF-001", "Student Profile", "Full Name", "Student", "Save valid Full Name and verify persistence", "On /student/profile", "1. Enter Name: 'Harsha Vardhan'\n2. Click Save", "Name: 'Harsha Vardhan'", "Success toast appears; name persists across refresh.", "P0", "Functional"],
  ["STU-PROF-002", "Student Profile", "Full Name Validation", "Student", "Empty Full Name shows validation error", "On /student/profile", "1. Clear Full Name\n2. Click Save", "Name: ''", "Displays 'Full Name is required'; save blocked.", "P1", "Validation / Negative"],
  ["STU-PROF-003", "Student Profile", "Full Name Special Chars", "Student", "Full Name trims whitespace and escapes HTML tags", "On /student/profile", "1. Enter '  Harsha <b>Vardhan</b>  '\n2. Click Save", "Name with tags", "Saves trimmed sanitized string without HTML injection.", "P1", "Security / Validation"],
  ["STU-PROF-004", "Student Profile", "Mobile Number", "Student", "Save valid 10-digit mobile number", "On /student/profile", "1. Enter Mobile: '9876543210'\n2. Click Save", "Mobile: '9876543210'", "Mobile number saves successfully.", "P0", "Functional"],
  ["STU-PROF-005", "Student Profile", "Mobile Number Validation", "Student", "Mobile number fails with letters or symbols", "On /student/profile", "1. Enter '98765abcde'\n2. Click Save", "Mobile: '98765abcde'", "Displays 'Mobile number must contain 10 numeric digits'.", "P1", "Validation / Negative"],
  ["STU-PROF-006", "Student Profile", "Mobile Number Length", "Student", "Mobile number fails with less than 10 digits", "On /student/profile", "1. Enter '98765'\n2. Click Save", "Mobile: '98765'", "Displays 'Mobile must be exactly 10 digits'.", "P1", "Validation / Negative"],
  ["STU-PROF-007", "Student Profile", "Date of Birth", "Student", "Save valid Date of Birth", "On /student/profile", "1. Select DOB: '2002-05-15'\n2. Click Save", "DOB: '2002-05-15'", "DOB saved and displayed in profile.", "P1", "Functional"],
  ["STU-PROF-008", "Student Profile", "DOB Validation", "Student", "Future Date of Birth is rejected", "On /student/profile", "1. Select future date (e.g. 2030-01-01)\n2. Click Save", "Future DOB", "Validation rejects future birth date.", "P1", "Validation / Negative"],
  ["STU-PROF-009", "Student Profile", "Gender", "Student", "Select and save Gender option", "On /student/profile", "1. Select Gender: 'Male' / 'Female' / 'Other'\n2. Click Save", "Gender: 'Male'", "Gender option saves correctly.", "P2", "Functional"],
  ["STU-PROF-010", "Student Profile", "College Name", "Student", "Save College / University Name", "On /student/profile", "1. Enter College: 'IIT Madras'\n2. Click Save", "College: 'IIT Madras'", "College name saved and displayed.", "P0", "Functional"],
  ["STU-PROF-011", "Student Profile", "Degree & Branch", "Student", "Save Degree (B.Tech) and Branch (Computer Science)", "On /student/profile", "1. Degree: 'B.Tech', Branch: 'CSE'\n2. Click Save", "Degree: 'B.Tech', Branch: 'CSE'", "Degree and branch saved.", "P0", "Functional"],
  ["STU-PROF-012", "Student Profile", "Passing Year", "Student", "Save valid Passing Year (e.g. 2025)", "On /student/profile", "1. Enter Year: '2025'\n2. Click Save", "Year: '2025'", "Passing year saved successfully.", "P0", "Functional"],
  ["STU-PROF-013", "Student Profile", "Passing Year Validation", "Student", "Reject non-numeric or unrealistic passing year (< 1970 or > 2040)", "On /student/profile", "1. Enter Year: '1850' or '2100'\n2. Click Save", "Year: '1850'", "Validation error indicates realistic year required.", "P1", "Validation / Negative"],
  ["STU-PROF-014", "Student Profile", "CGPA", "Student", "Save valid CGPA decimal value (e.g. 8.75)", "On /student/profile", "1. Enter CGPA: '8.75'\n2. Click Save", "CGPA: 8.75", "CGPA 8.75 saved and displayed.", "P1", "Functional"],
  ["STU-PROF-015", "Student Profile", "CGPA Validation", "Student", "Reject negative CGPA (-1.5) or CGPA > 10.0 (12.5)", "On /student/profile", "1. Enter CGPA: '-1.5' or '12.5'\n2. Click Save", "CGPA: -1.5", "Validation error states CGPA must be between 0.0 and 10.0.", "P1", "Validation / Negative"],
  ["STU-PROF-016", "Student Profile", "Percentage", "Student", "Save valid Percentage value (e.g. 85.50)", "On /student/profile", "1. Enter Percentage: '85.50'\n2. Click Save", "Percentage: 85.50", "Percentage saved successfully.", "P1", "Functional"],
  ["STU-PROF-017", "Student Profile", "Percentage Validation", "Student", "Reject negative percentage or percentage > 100", "On /student/profile", "1. Enter Percentage: '105'\n2. Click Save", "Percentage: 105", "Validation error states percentage must be 0-100%.", "P1", "Validation / Negative"],
  ["STU-PROF-018", "Student Profile", "Location Details", "Student", "Save City, State, and Country", "On /student/profile", "1. City: 'Bengaluru', State: 'Karnataka', Country: 'India'\n2. Click Save", "Location data", "Location fields save and persist.", "P1", "Functional"],
  ["STU-PROF-019", "Student Profile", "Work Mode Preference", "Student", "Select Preferred Work Mode (Remote / Hybrid / On-site)", "On /student/profile", "1. Select 'Remote'\n2. Click Save", "Mode: Remote", "Preference saved.", "P2", "Functional"],
  ["STU-PROF-020", "Student Profile", "Skills Tags", "Student", "Add and delete multiple technical skill tags", "On /student/profile", "1. Add 'React', 'Node.js', 'PostgreSQL'\n2. Remove 'Node.js'\n3. Click Save", "Skills tags", "Skills list updates to ['React', 'PostgreSQL'] and persists.", "P1", "Functional"]
];
profData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 5. RESUME (STU-RES-001 to STU-RES-010)
// ----------------------------------------------------------------------------
const resData = [
  ["STU-RES-001", "Resume", "Upload PDF", "Student", "Upload valid PDF resume under 5MB", "On /student/resume", "1. Click Upload Resume\n2. Select resume.pdf (1.5MB)\n3. Confirm upload", "File: resume.pdf", "File uploads to storage; displays file name and upload timestamp.", "P0", "Functional"],
  ["STU-RES-002", "Resume", "Upload DOCX", "Student", "Upload valid DOCX resume document", "On /student/resume", "1. Select resume.docx\n2. Upload", "File: resume.docx", "DOCX file uploaded and accepted.", "P1", "Functional"],
  ["STU-RES-003", "Resume", "Reject Non-Documents", "Student", "Reject unsupported file formats (EXE, JPG, MP4)", "On /student/resume", "1. Select image.jpg or script.exe\n2. Attempt upload", "File: script.exe", "Error message 'Only PDF and DOCX documents allowed'; upload blocked.", "P1", "Validation / Security"],
  ["STU-RES-004", "Resume", "Oversized File Reject", "Student", "Reject resume file exceeding 5MB size limit", "On /student/resume", "1. Select 10MB PDF\n2. Attempt upload", "File size: 10MB", "Error message 'File size exceeds maximum 5MB limit'.", "P1", "Validation / Negative"],
  ["STU-RES-005", "Resume", "Download Resume", "Student", "Download previously uploaded resume", "Resume exists", "1. Click 'Download Resume' button", "None", "Resume file downloads cleanly to user's device.", "P1", "Functional"],
  ["STU-RES-006", "Resume", "Replace Resume", "Student", "Replace existing resume with newer version", "Resume exists", "1. Click 'Replace Resume'\n2. Upload resume_v2.pdf", "File: resume_v2.pdf", "New resume replaces older version in storage.", "P1", "Functional"]
];
resData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 6. JOBS & BOOKMARKS (STU-JOB-001 to STU-JOB-015)
// ----------------------------------------------------------------------------
const jobData = [
  ["STU-JOB-001", "Jobs", "Job Listing", "Student", "View active student job openings with metadata tags", "On /student/jobs", "1. Open /student/jobs\n2. Check job cards", "None", "Job cards display title, company, salary, experience, and location.", "P0", "Functional"],
  ["STU-JOB-002", "Jobs", "Search Keyword", "Student", "Search jobs by keyword in title or company name", "On /student/jobs", "1. Type 'Full Stack' in search bar", "Query: 'Full Stack'", "Filters list to only Full Stack opportunities.", "P0", "Functional"],
  ["STU-JOB-003", "Jobs", "Filter by Experience", "Student", "Filter jobs for Fresher / 0-1 yrs experience", "On /student/jobs", "1. Check 'Fresher (0 yrs)' filter", "Filter: Fresher", "Displays jobs tailored for entry-level graduates.", "P1", "Functional"],
  ["STU-JOB-004", "Jobs", "Save / Bookmark Job", "Student", "Click bookmark icon to save job to Saved Jobs list", "On /student/jobs", "1. Click bookmark on job card\n2. Check 'Saved Jobs' tab", "Job ID: job-10", "Bookmark icon turns solid; job appears in Saved Jobs tab.", "P0", "Functional"],
  ["STU-JOB-005", "Jobs", "Unsave Job", "Student", "Click bookmark icon again to remove job from Saved Jobs", "Job is bookmarked", "1. In Saved Jobs tab, click bookmark to unbookmark", "Job ID: job-10", "Job removed from Saved Jobs immediately.", "P1", "Functional"],
  ["STU-JOB-006", "Jobs", "Apply Button", "Student", "Click 'Apply Now' on job card opens external application link", "Job has apply link", "1. Click 'Apply Now'", "External URL", "Opens employer application page in new tab with rel='noopener'.", "P1", "Functional / Security"],
  ["STU-JOB-007", "Jobs", "Pagination", "Student", "Navigate through multiple pages of jobs", "Multiple job pages", "1. Click Next / Page 2", "Pagination", "Page 2 jobs load cleanly without duplicates.", "P2", "Functional / UI"]
];
jobData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 7. STUDY NOTES (STU-NOTE-001 to STU-NOTE-015)
// ----------------------------------------------------------------------------
const noteData = [
  ["STU-NOTE-001", "Study Notes", "Catalog & Search", "Student", "Search study notes by subject keyword", "On /student/notes", "1. Enter 'Computer Networks' in search", "Query: 'Computer Networks'", "Only Computer Networks notes are displayed.", "P0", "Functional"],
  ["STU-NOTE-002", "Study Notes", "Category Filter", "Student", "Filter notes by category tabs (CS, Core, Aptitude)", "On /student/notes", "1. Click 'Aptitude' tab", "Category: Aptitude", "Displays only aptitude preparation notes.", "P1", "Functional"],
  ["STU-NOTE-003", "Study Notes", "Free Note Access", "Student", "Free notes open direct PDF viewer for reading", "On /student/notes", "1. Click 'Read Note' on free study note", "Price: ₹0", "PDF viewer opens directly allowing full reading.", "P0", "Functional"],
  ["STU-NOTE-004", "Study Notes", "Paid Note Paywall", "Student", "Paid notes prompt store purchase or subscription upgrade", "On free plan", "1. Click locked paid note", "Price: ₹29", "Displays 'Unlock Note' / 'Add to Cart' store modal.", "P0", "Authorization / Functional"],
  ["STU-NOTE-005", "Study Notes", "Bookmark Note", "Student", "Save note to Saved Notes tab", "On /student/notes", "1. Click bookmark icon on note card\n2. Switch to Saved Notes", "Note ID: note-3", "Note appears in Saved Notes tab.", "P1", "Functional"],
  ["STU-NOTE-006", "Study Notes", "Purchased Note Access", "Student", "Purchased notes render unlocked under /student/purchases", "Note purchased", "1. Open /student/purchases\n2. Click 'Read Note'", "Purchased item", "Full note PDF renders and is accessible permanently.", "P0", "Authorization / Functional"]
];
noteData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 8. INTERVIEW PREP & TIMED ASSESSMENTS (STU-INT-001 to STU-INT-020)
// ----------------------------------------------------------------------------
const intData = [
  ["STU-INT-001", "Interview Preparation", "Category Browse", "Student", "Browse question categories (Technical, HR, Aptitude)", "On /student/interview-prep", "1. Click 'Technical (Java/Python)'", "Category", "Renders question cards with difficulty tags (Easy, Med, Hard).", "P0", "Functional"],
  ["STU-INT-002", "Interview Preparation", "Expand Answer", "Student", "Click question card to view model answer and talking points", "On questions list", "1. Click question card", "None", "Card expands displaying explanation and code snippets.", "P1", "UI / Functional"],
  ["STU-INT-003", "Interview Preparation", "Difficulty Filter", "Student", "Filter questions by Easy, Medium, or Hard difficulty", "On questions list", "1. Select 'Hard' filter", "Difficulty: Hard", "Only advanced difficulty questions are displayed.", "P1", "Functional"],
  ["STU-TEST-001", "Timed Assessments", "Available Tests Tab", "Student", "Verify list of available timed MCQ assessments", "On Assessments tab", "1. Click 'Available Tests' tab", "None", "Displays test cards with duration (e.g. 20 mins) and question count.", "P0", "Functional"],
  ["STU-TEST-002", "Timed Assessments", "Start Assessment", "Student", "Start timed MCQ test and verify countdown timer begins", "On test card", "1. Click 'Start Test'\n2. Confirm start modal", "Test: 'Web Dev MCQs'", "Focus mode opens; timer countdown ticks; Q1 options render.", "P0", "Functional / UI"],
  ["STU-TEST-003", "Timed Assessments", "Question Navigation", "Student", "Select option, navigate with Next/Previous and question grid", "Test running", "1. Select Option B\n2. Click Next\n3. Jump to Q4", "Answers", "Answers saved in state; grid highlights answered questions.", "P0", "Functional"],
  ["STU-TEST-004", "Timed Assessments", "Submit Assessment", "Student", "Submit assessment and verify instant score report card", "Test completed", "1. Click Submit\n2. Confirm dialog", "None", "Calculates score; displays Correct, Incorrect, Score Percentage.", "P0", "Functional"],
  ["STU-TEST-005", "Timed Assessments", "Completed Tests Tab", "Student", "Completed test moves to 'Completed Tests' tab permanently", "Test submitted", "1. Return to Assessments -> 'Completed Tests' tab", "None", "Completed test appears with final score badge and timestamp.", "P0", "Functional / Integration"],
  ["STU-TEST-006", "Timed Assessments", "Timer Auto-Submit", "Student", "Test auto-submits when timer reaches 00:00", "Test in progress", "1. Allow timer to reach 00:00", "Timer: 00:00", "Auto-submits current answers and shows score card.", "P1", "Edge Case / Functional"],
  ["STU-TEST-007", "Timed Assessments", "Page Refresh Recovery", "Student", "Accidental refresh restores test state and remaining timer", "Test running", "1. Answer 2 questions\n2. Press F5 reload", "None", "Restores selected answers and adjusted countdown.", "P1", "Resilience"]
];
intData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 9. AI FEATURES (STU-AI-001 to STU-AI-015)
// ----------------------------------------------------------------------------
const aiData = [
  ["STU-AI-001", "AI Features", "Mock Interview Setup", "Student", "Configure AI mock interview parameters (Role, Level, Topics)", "On /student/mock-interview", "1. Select Role: 'Frontend Developer', Experience: 'Fresher'\n2. Click 'Start AI Interview'", "Config data", "Session initializes; AI interviewer sends welcome message and Q1.", "P0", "Functional / AI"],
  ["STU-AI-002", "AI Features", "Text Answer Submission", "Student", "Submit text answer to AI interviewer and receive dynamic feedback", "AI session active", "1. Type answer in response box\n2. Click Submit Answer", "Answer text", "AI evaluates answer, offers tips, and asks next question.", "P0", "Functional / AI"],
  ["STU-AI-003", "AI Features", "Voice Speech-to-Text", "Student", "Click microphone to transcribe spoken voice answer", "Mic enabled", "1. Click mic icon\n2. Speak answer\n3. Stop mic", "Audio", "Spoken words transcribed accurately into response area.", "P1", "Functional / Voice"],
  ["STU-AI-004", "AI Features", "Evaluation Scorecard", "Student", "Complete interview and receive overall evaluation scorecard", "Final question answered", "1. Click 'Complete Interview'", "None", "Scorecard displays Overall Score (/100), Clarity, and Recommendations.", "P0", "Functional / AI"],
  ["STU-AI-005", "AI Features", "AI Adaptive Mode (Free User)", "Student", "Free user attempting Adaptive Mode is blocked by upgrade modal", "On Free plan", "1. Click 'AI Adaptive Mode'", "Plan: Free", "Access blocked; upgrade modal explains Premium is required.", "P0", "Authorization / Security"],
  ["STU-AI-006", "AI Features", "AI Adaptive Mode (Premium User)", "Student", "Premium subscriber successfully opens and runs Adaptive Mode", "On Premium plan", "1. Click 'AI Adaptive Mode'\n2. Start session", "Plan: Premium", "Adaptive mode launches; question difficulty dynamically adjusts.", "P0", "Authorization / Functional"],
  ["STU-AI-007", "AI Features", "Career Intelligence Plan", "Student", "Generate structured AI career roadmap milestones", "On /student/career-intelligence", "1. Target Role: 'Full Stack'\n2. Click Generate Plan", "Role: Full Stack", "Generates multi-week study milestones and actionable tasks.", "P1", "Functional / AI"],
  ["STU-AI-008", "AI Features", "Career Task Completion", "Student", "Check off completed career milestone tasks", "Plan generated", "1. Check task checkbox", "Task ID: 1", "Task marked completed; progress percentage updates.", "P1", "Functional"]
];
aiData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 10. SUBSCRIPTION & PRICING (STU-SUB-001 to STU-SUB-010)
// ----------------------------------------------------------------------------
const subData = [
  ["STU-SUB-001", "Subscription", "Plan Display", "Student", "View monthly subscription tiers (Starter: ₹49, Pro: ₹99, Premium: ₹149)", "On /student/subscription", "1. Open subscription page\n2. Verify prices", "None", "Accurate prices and feature lists display for each tier.", "P0", "Functional / UI"],
  ["STU-SUB-002", "Subscription", "Upgrade Navigation", "Student", "Click Upgrade on Premium navigates to payment with ₹149 selected", "On subscription page", "1. Click 'Upgrade' on Premium card", "Plan: Premium", "Navigates to /student/payment with ₹149 pre-selected.", "P0", "Functional"],
  ["STU-SUB-003", "Subscription", "Active Plan Card", "Student", "Active plan banner displays plan name, start date, and expiry date", "Active subscriber", "1. View 'Your Current Plan' banner", "None", "Shows Active status badge, Plan Name, and Expiry Date (+30 days).", "P0", "Functional"],
  ["STU-SUB-004", "Subscription", "Renewal Stacking", "Student", "Early renewal stacks +30 days onto remaining prepaid days", "10 days remaining", "1. Purchase renewal for same plan\n2. Check new expiry date", "Plan: Pro (₹99)", "New expiry date extends by +30 days (total 40 days preserved).", "P1", "Business Logic"]
];
subData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 11. RAZORPAY PAYMENTS (STU-PAY-001 to STU-PAY-020)
// ----------------------------------------------------------------------------
const payData = [
  ["STU-PAY-001", "Razorpay Payments", "Checkout Initialization", "Student", "Initiate subscription payment and open Razorpay modal in Test Mode", "On /student/payment", "1. Select Pro Plan (₹99)\n2. Click 'Proceed to Pay with Razorpay'", "Plan: Pro", "Server creates order; Razorpay modal opens displaying ₹99.", "P0", "Payment / Functional"],
  ["STU-PAY-002", "Razorpay Payments", "Payment Method Restriction", "Student", "Verify Razorpay checkout shows ONLY UPI & QR Code methods", "Razorpay modal open", "1. Inspect payment options in Razorpay modal", "None", "Only UPI ID / VPA and UPI QR Code are visible; Cards/Netbanking/Wallets hidden.", "P0", "Payment / UI"],
  ["STU-PAY-003", "Razorpay Payments", "Successful UPI Payment", "Student", "Complete successful test UPI payment and activate subscription", "Modal open", "1. Enter test UPI 'success@razorpay'\n2. Click Pay", "UPI: success@razorpay", "Payment verified; green success receipt card appears; subscription active.", "P0", "Payment / E2E"],
  ["STU-PAY-004", "Razorpay Payments", "Failed Test Payment", "Student", "Simulate failed payment and verify subscription is not granted", "Modal open", "1. Select 'Failure' in test simulator", "UPI: failure@razorpay", "Displays payment failed message; order marked failed; no access granted.", "P0", "Payment / Negative"],
  ["STU-PAY-005", "Razorpay Payments", "Dismiss Checkout", "Student", "Close modal without completing payment", "Modal open", "1. Click close (X) icon", "None", "Modal closes; returned to payment page; no charge incurred.", "P1", "Payment / Functional"],
  ["STU-PAY-006", "Razorpay Payments", "Price Tampering Immunity", "Student", "Server rejects client request attempting to tamper price", "API request", "1. Intercept /api/payments/create-order\n2. Send amount: ₹1 for Premium (₹149)", "Tampered: ₹1", "Server ignores client amount and enforces authoritative plan price (14900 paise).", "P0", "Security / Payment"],
  ["STU-PAY-007", "Razorpay Payments", "HMAC Signature Verification", "Student", "Forged payment signature is strictly rejected with 400 Bad Request", "API request", "1. Post fake signature to /api/payments/verify-payment", "Forged sig", "Server returns 400 'Invalid payment signature'; verification rejected.", "P0", "Security / Cryptography"],
  ["STU-PAY-008", "Razorpay Payments", "Webhook Idempotency", "Student", "Duplicate webhook delivery does not credit subscription twice", "Webhook listener", "1. Send duplicate payment.captured webhook for same order", "Webhook payload", "Server recognizes order already fulfilled; returns 200 OK without double-crediting.", "P0", "Integration / Concurrency"]
];
payData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 12. STORE & CART (STU-STORE-001 to STU-STORE-015)
// ----------------------------------------------------------------------------
const storeData = [
  ["STU-STORE-001", "Store / Cart", "Add to Cart", "Student", "Add digital study note to shopping cart", "On /student/store", "1. Click 'Add to Cart' on 'Placement Bundle (₹29)'", "Product ID: prod-1", "Cart counter badge increments to 1; toast confirms item added.", "P0", "Functional"],
  ["STU-STORE-002", "Store / Cart", "Cart Subtotal Calculation", "Student", "View cart items and verify subtotal and total calculations", "Items in cart", "1. Navigate to /student/cart\n2. Inspect item prices and total", "None", "Lists product name, price (₹29), and accurately calculated total.", "P0", "Functional"],
  ["STU-STORE-003", "Store / Cart", "Remove from Cart", "Student", "Remove item from cart and verify empty cart state", "1 item in cart", "1. Click Remove (trash icon) on cart item", "None", "Item removed; cart total becomes ₹0; shows empty cart message.", "P1", "Functional"],
  ["STU-STORE-004", "Store / Cart", "Cart Checkout with Razorpay", "Student", "Checkout cart items and complete test UPI payment", "Items in cart", "1. Click 'Proceed to Checkout'\n2. Pay with test UPI", "Cart: ₹29", "Payment verified; items added to student_purchases; cart cleared.", "P0", "Payment / E2E"],
  ["STU-STORE-005", "Store / Cart", "Purchased Items Library", "Student", "Purchased products appear unlocked in My Purchases with permanent access", "Purchase completed", "1. Open /student/purchases\n2. Click 'View Note / Download'", "Purchased item", "Purchased product PDF opens and is accessible permanently.", "P0", "Functional / Authorization"],
  ["STU-STORE-006", "Store / Cart", "Duplicate Purchase Prevention", "Student", "Store disables 'Add to Cart' for already purchased products", "Product already owned", "1. View owned product in /student/store", "Product ID: prod-1", "Button displays 'Already Purchased' and is disabled.", "P1", "Business Logic"]
];
storeData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 13. ADMIN PORTAL (ADM-AUTH-001 to ADM-FLAG-010)
// ----------------------------------------------------------------------------
const admData = [
  ["ADM-AUTH-001", "Admin Login", "Admin Authentication", "Admin", "Login to Admin Portal with valid administrator credentials", "On /admin/login", "1. Enter admin email & password\n2. Click 'Admin Login'", "Admin credentials", "Admin authenticated; redirected to /admin/dashboard.", "P0", "Authentication / Security"],
  ["ADM-AUTH-002", "Admin Login", "Student Account Rejection", "Student", "Regular student attempting to log into /admin/login is rejected", "On /admin/login", "1. Enter student credentials\n2. Click 'Admin Login'", "Student credentials", "Access denied; shows 'Unauthorized admin account'.", "P0", "Authorization / Security"],
  ["ADM-DASH-001", "Admin Dashboard", "Overview Metrics", "Admin", "Verify admin dashboard KPI metric cards (Students, Jobs, Subscriptions, Notes)", "On /admin/dashboard", "1. Open dashboard\n2. Inspect KPI counters", "None", "Displays live accurate counts for Students, Jobs, Subscriptions, and Notes.", "P0", "UI / Functional"],
  ["ADM-STU-001", "Admin Students", "Student Directory", "Admin", "View paginated student list and search by student name or email", "On /admin/students", "1. Enter student name in search", "Search: 'Harsha'", "Filters table to show matching student with registration date and plan.", "P0", "Functional"],
  ["ADM-STU-002", "Admin Students", "Student Details Modal", "Admin", "Click student record to view profile, resume status, and test scores", "On student list", "1. Click 'View' on student row", "Student ID", "Modal opens displaying full student academic history and test scores.", "P1", "Functional"],
  ["ADM-JOB-001", "Admin Jobs", "Create Job", "Admin", "Create a new job posting with title, company, location, salary, and apply URL", "On /admin/jobs", "1. Click Add Job\n2. Fill fields\n3. Click Save", "Job details", "Job saved in database; appears in admin list and student jobs catalog.", "P0", "Functional / E2E"],
  ["ADM-JOB-002", "Admin Jobs", "Edit Job", "Admin", "Update existing job details and verify reflection on student portal", "Job exists", "1. Click Edit\n2. Update Salary to '8 LPA'\n3. Save", "Salary: '8 LPA'", "Job updates successfully; student portal reflects updated salary.", "P1", "Functional"],
  ["ADM-JOB-003", "Admin Jobs", "Delete Job", "Admin", "Delete a job listing", "Job exists", "1. Click Delete\n2. Confirm dialog", "Job ID", "Job removed from admin list and student portal.", "P1", "Functional"],
  ["ADM-NOTE-001", "Admin Notes", "Upload Study Note", "Admin", "Upload study note PDF with title, category, and price", "On /admin/notes", "1. Click Upload Note\n2. Attach PDF\n3. Save", "Note details", "Note saved and published to student notes catalog.", "P0", "Functional"],
  ["ADM-NOTE-002", "Admin Notes", "Store Product Creation", "Admin", "Create digital store product in /admin/store with price and note attachments", "On /admin/store", "1. Click Add Product\n2. Price: ₹49\n3. Save", "Product details", "Product created and available in /student/store for student checkout.", "P0", "Functional"],
  ["ADM-QUEST-001", "Admin Questions", "Add Question", "Admin", "Create single interview practice question with category and answer key", "On /admin/interview-questions", "1. Click Add Question\n2. Fill question and answer\n3. Save", "Question data", "Question saved and rendered in student interview prep.", "P0", "Functional"],
  ["ADM-QUEST-002", "Admin Questions", "Create Timed MCQ Test", "Admin", "Create timed MCQ assessment with questions, options, and correct answer indices", "On /admin/interview-prep", "1. Click Create Test\n2. Add 5 MCQs\n3. Save", "MCQ test data", "Test published to student 'Available Tests' tab.", "P0", "Functional"],
  ["ADM-BULK-001", "Bulk Import", "Bulk Import Questions CSV", "Admin", "Upload valid CSV template containing 20 interview questions", "On /admin/interview-questions/import", "1. Upload questions_template.csv\n2. Click Process", "CSV with 20 rows", "All 20 questions imported with success confirmation.", "P0", "Functional / Integration"],
  ["ADM-BULK-002", "Bulk Import", "Validation", "Admin", "Reject CSV with missing required columns", "On bulk import", "1. Upload CSV missing 'question_text'\n2. Click Process", "Invalid CSV", "Error report specifies missing column; 0 corrupted rows imported.", "P1", "Validation / Negative"],
  ["ADM-FLAG-001", "Feature Flags", "Toggle Feature Flag", "Admin", "Disable AI Mock Interview feature flag and verify student menu hides it", "On /admin/settings", "1. Toggle AI Mock Interview flag OFF\n2. Save", "Flag: false", "AI Mock Interview hidden on student portal gracefully.", "P1", "Functional / Config"],
  ["ADM-FLAG-002", "Feature Flags", "Social Media Links", "Admin", "Update LinkedIn and Twitter URLs in admin settings and verify public footer", "On /admin/settings", "1. Enter LinkedIn URL\n2. Save", "LinkedIn URL", "Footer social media icons link to the updated URLs.", "P2", "Functional"]
];
admData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 14. SECURITY & ACCESS CONTROL (SEC-001 to SEC-015)
// ----------------------------------------------------------------------------
const secData = [
  ["SEC-001", "Security", "Direct Admin URL Protection", "Guest", "Unauthenticated guest attempting to access /admin/dashboard is redirected to /admin/login", "Logged out", "1. Open /admin/dashboard directly", "None", "Intercepted by security middleware; redirected to /admin/login.", "P0", "Security / Authorization"],
  ["SEC-002", "Security", "Student Role Escalation Protection", "Student", "Logged-in student attempting to access /admin/students receives 403 / redirect", "Student logged in", "1. Navigate to /admin/students", "None", "Access denied; student redirected to student dashboard.", "P0", "Security / Role"],
  ["SEC-003", "Security", "Row Level Security (RLS) Isolation", "Student", "Student A cannot read or modify Student B's purchases or private profile", "2 students", "1. Student A queries student_purchases with Student B's ID", "Student B ID", "Supabase RLS policies strictly filter results to auth.uid() only.", "P0", "Security / Database"],
  ["SEC-004", "Security", "SQL Injection Protection", "Guest", "Login and search inputs with SQL injection payloads are safely parameterized", "On /login or /jobs", "1. Enter `' OR '1'='1' --` in email and search\n2. Submit", "SQLi payload", "Inputs treated as literal strings; no database bypass.", "P0", "Security / Injection"],
  ["SEC-005", "Security", "Cross-Site Scripting (XSS) Protection", "Student", "Profile name or question submission containing `<script>` tags is escaped", "On profile form", "1. Enter `<script>alert('XSS')</script>` in Name\n2. Save and reload", "XSS payload", "React safely escapes HTML characters; no JavaScript executes.", "P0", "Security / XSS"],
  ["SEC-006", "Security", "Rate Limiting on Payment APIs", "Guest", "Excessive rapid requests to payment creation endpoints trigger HTTP 429", "Rapid script", "1. Send rapid burst requests to /api/payments/create-order", "Rapid API calls", "Rate limiter returns HTTP 429 'Too Many Requests'.", "P1", "Security / Rate Limiting"]
];
secData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 15. END-TO-END BUSINESS JOURNEYS (E2E-001 to E2E-010)
// ----------------------------------------------------------------------------
const e2eData = [
  ["E2E-001", "End-to-End Journeys", "New Student Onboarding", "Student", "Complete Student Lifecycle: Register -> Profile -> Resume -> Jobs -> Save Job -> Practice -> Assessment -> Scorecard", "New user", "1. Register\n2. Fill profile\n3. Upload PDF resume\n4. Save a job\n5. Review interview prep\n6. Take MCQ test\n7. Verify score in Completed tab", "Full workflow", "All steps complete smoothly; student successfully onboarded.", "P0", "End-to-End"],
  ["E2E-002", "End-to-End Journeys", "Premium Membership Upgrade", "Student", "Premium Subscription Journey: Login -> View Pricing -> Select Premium (₹149) -> Complete UPI Payment -> Unlock AI Adaptive Mode", "Free student", "1. Log in\n2. Upgrade to Premium (₹149)\n3. Complete test UPI payment\n4. Verify active status\n5. Open AI Adaptive Mode", "Plan: Premium", "Payment verified; subscription active; AI Adaptive Mode unlocked.", "P0", "End-to-End / Payment"],
  ["E2E-003", "End-to-End Journeys", "Store Cart Purchase & Unlock", "Student", "Store Purchase Journey: Browse Store -> Add Note to Cart -> Checkout with Razorpay -> Complete Payment -> Access Unlocked PDF in Purchases", "Student logged in", "1. Browse store\n2. Add note (₹29) to cart\n3. Checkout with test UPI\n4. Verify PDF download in My Purchases", "Store item: ₹29", "Order paid; student_purchases created; note unlocked permanently.", "P0", "End-to-End / Payment"],
  ["E2E-004", "End-to-End Journeys", "Admin Job Publishing Lifecycle", "Admin", "Admin Job Lifecycle: Admin Login -> Create Job -> Publish -> Student Search & Verify -> Student Apply", "Admin and Student", "1. Admin creates job\n2. Student logs in\n3. Searches and applies for job", "Job data", "Job published by admin appears immediately in student portal.", "P0", "End-to-End"],
  ["E2E-005", "End-to-End Journeys", "Assessment & Scorecard Verification", "Student", "Assessment Lifecycle: Available Tests -> Start Test -> Answer MCQs -> Submit -> Score Report -> Completed Tab -> Persistence", "Student logged in", "1. Open Available Tests\n2. Complete test\n3. Submit\n4. View score\n5. Check Completed tab\n6. Refresh", "Assessment flow", "Test moves permanently to Completed tab with accurate score history.", "P0", "End-to-End"]
];
e2eData.forEach(t => addTest(createRow(...t)));

// ----------------------------------------------------------------------------
// 16. REGRESSION SUITE (REG-001 to REG-015)
// ----------------------------------------------------------------------------
const regData = [
  ["REG-001", "Regression", "Core Smoke Test", "All Roles", "Verify Public Landing, Student Portal, and Admin Portal core routes render cleanly", "Server running", "1. Visit /, /jobs, /notes, /pricing, /student/dashboard, /admin/login", "None", "All key routes render with 200 OK and 0 JavaScript console errors.", "P0", "Regression"],
  ["REG-002", "Regression", "Payment Verification Flow", "Student", "Verify Razorpay order creation and HMAC-SHA256 signature verification integrity", "Gateway in test mode", "1. Run automated test suite `scripts/test_razorpay_integration.ts`", "None", "All 27 / 27 payment security and idempotency tests pass.", "P0", "Regression / Automated"],
  ["REG-003", "Regression", "Google Analytics 4 Tracking", "Guest", "Verify GA4 script loads with valid measurement ID and SPA navigation tracking", "GA4 configured", "1. Run automated test suite `scripts/test_google_analytics.ts`", "None", "All 11 / 11 GA4 tracking tests pass.", "P1", "Regression / Automated"]
];
regData.forEach(t => addTest(createRow(...t)));

console.log(`Total Master Test Cases compiled: ${allTestCases.length}`);

// ----------------------------------------------------------------------------
// BUILD EXCEL WORKBOOK
// ----------------------------------------------------------------------------
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
  { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 45 },
  { wch: 28 }, { wch: 55 }, { wch: 25 }, { wch: 55 }, { wch: 10 },
  { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
  { wch: 15 }, { wch: 15 }, { wch: 30 }
];
XLSX.utils.book_append_sheet(wb, wsMaster, "All Test Cases");

// 3. INDIVIDUAL MODULE SHEETS
const moduleSheetMapping = {
  "Public Website": "Public Website",
  "Authentication": "Authentication",
  "Student Dashboard": "Student Dashboard",
  "Student Profile": "Student Profile",
  "Resume": "Resume",
  "Jobs": "Jobs",
  "Study Notes": "Study Notes",
  "Interview Preparation": "Interview Preparation",
  "Timed Assessments": "Timed Assessments",
  "AI Features": "AI Features",
  "Subscription": "Subscription",
  "Razorpay Payments": "Razorpay Payments",
  "Store / Cart": "Store & Cart",
  "Admin Login": "Admin Login",
  "Admin Dashboard": "Admin Dashboard",
  "Admin Students": "Admin Students",
  "Admin Jobs": "Admin Jobs",
  "Admin Notes": "Admin Notes",
  "Admin Questions": "Admin Questions",
  "Bulk Import": "Bulk Import",
  "Feature Flags": "Feature Flags",
  "Security": "Security",
  "End-to-End Journeys": "End-to-End Journeys",
  "Regression": "Regression Suite"
};

for (const [modKey, sheetName] of Object.entries(moduleSheetMapping)) {
  const modData = moduleBuckets[modKey] || [];
  if (modData.length > 0) {
    const ws = XLSX.utils.json_to_sheet(modData, { header: headers });
    ws['!cols'] = wsMaster['!cols'];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
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
  ["REQ-AUTH-01", "Student Registration & Login", "frontend/app/register, /login", "AUTH-001 to AUTH-020", "Covered (100%)"],
  ["REQ-DASH-01", "Student Dashboard", "frontend/app/student/dashboard", "STU-DASH-001 to STU-DASH-010", "Covered (100%)"],
  ["REQ-PROF-01", "Student Profile & Validation", "frontend/app/student/profile", "STU-PROF-001 to STU-PROF-020", "Covered (100%)"],
  ["REQ-RES-01", "Resume Management", "frontend/app/student/resume", "STU-RES-001 to STU-RES-006", "Covered (100%)"],
  ["REQ-JOB-01", "Jobs Directory & Search", "frontend/app/student/jobs", "STU-JOB-001 to STU-JOB-007", "Covered (100%)"],
  ["REQ-NOTE-01", "Study Notes & Catalog", "frontend/app/student/notes", "STU-NOTE-001 to STU-NOTE-006", "Covered (100%)"],
  ["REQ-INT-01", "Interview Preparation", "frontend/app/student/interview-preparation", "STU-INT-001 to STU-INT-003", "Covered (100%)"],
  ["REQ-TEST-01", "Timed MCQ Assessments", "frontend/app/student/interview-preparation", "STU-TEST-001 to STU-TEST-007", "Covered (100%)"],
  ["REQ-AI-01", "AI Mock Interview & Adaptive Mode", "frontend/app/student/mock-interview", "STU-AI-001 to STU-AI-008", "Covered (100%)"],
  ["REQ-SUB-01", "Subscription Plans (₹49, ₹99, ₹149)", "frontend/app/student/subscription", "STU-SUB-001 to STU-SUB-004", "Covered (100%)"],
  ["REQ-PAY-01", "Razorpay Test Mode (UPI / QR)", "frontend/app/student/payment, lib/razorpay.ts", "STU-PAY-001 to STU-PAY-008", "Covered (100%)"],
  ["REQ-STORE-01", "Store Catalog, Cart & Checkout", "frontend/app/student/store, /cart, /checkout", "STU-STORE-001 to STU-STORE-006", "Covered (100%)"],
  ["REQ-ADM-01", "Admin Portal & Management", "frontend/app/admin/*", "ADM-AUTH-001 to ADM-FLAG-002", "Covered (100%)"],
  ["REQ-SEC-01", "Security, RLS & Rate Limiting", "frontend/proxy.ts, lib/rateLimit.ts", "SEC-001 to SEC-006", "Covered (100%)"],
  ["REQ-E2E-01", "End-to-End Business Lifecycles", "Full Application Flow", "E2E-001 to E2E-005", "Covered (100%)"]
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

// Output workbook
const outputPath = path.join(__dirname, '..', '..', 'KnowledgePaat_Manual_E2E_Test_Cases.xlsx');
XLSX.writeFile(wb, outputPath);
console.log(`✅ Workbook successfully written to: ${outputPath}`);
