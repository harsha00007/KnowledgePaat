# KnowledgePaat eBook Platform — Complete Manual Testing User Guide

**Document Version:** 2.0.0  
**Target Environment:** Staging Supabase (`https://lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Production Guard:** STRICTLY PROTECTED (`csjywuflkvohytbvglxf` must remain untouched)  
**Gateway Mode:** Razorpay Test Mode Only (`rzp_test_...` — NEVER live keys or real money)  
**Document Purpose:** Step-by-step executable manual testing instructions for human testers operating as Administrators, Customers, and Public Visitors.

---

## 1. Quick Overview: The "First Complete Journey"

If you are running your very first test on this platform, follow this end-to-end sanity journey (approximately 10 minutes) to confirm all core subsystems are operational before deep-diving into individual test suites:

```
[1. Admin Prepares Book]
  /admin/e-books/new ──> Fill metadata & ₹49/₹99/₹50 pricing
  /admin/e-books/[id]/edit ──> Upload cover image & PDF attachment
  /admin/e-books/[id]/edit?tab=chapters ──> Create chapters, mark "Ready", set Chapter 1 as "Free Sample"
  /admin/e-books/[id]/edit?tab=publication ──> Verify checklist ──> Click "Publish Edition to Bookstore"
       │
       ▼
[2. Public Visitor Explores]
  / ──> Click "E-Books" header button (observe smooth 350ms slide transition)
  /e-books ──> Browse catalogue ──> Open published book detail
  /e-books/[slug] ──> Read Chapter 1 free sample without signing in ──> Confirm paid chapters are locked
       │
       ▼
[3. Customer Signs In & Purchases]
  /e-books/[slug] ──> Select "Read Online (₹49)" ──> Add to Cart
  /cart ──> Review authoritative ₹49.00 total ──> Click "Proceed to Checkout"
  /login?redirectTo=/checkout ──> Sign in with Customer A credentials ──> Lands on /checkout with cart intact
  /checkout ──> Click "Pay ₹49 via UPI / Cards" ──> Razorpay Test Mode Modal opens
  Razorpay Modal ──> Enter Test Card (4100 2800 0000 1007) ──> Enter OTP ──> Payment verifies
  /checkout/success ──> Success receipt displays ──> Click "Go to My Books"
       │
       ▼
[4. Customer Reads & Upgrades]
  /my-books ──> Book card appears with "Read Online" badge ──> Click "Start Reading"
  /read/[slug]/[ch1] ──> Read chapter ──> Scroll ──> Observe "Saving..." then "Saved"
  /my-books ──> Click "Add PDF access — ₹50" ──> Complete ₹50 Test Mode upgrade payment
  /my-books ──> Card elevates to "Read + Download" ──> Click "Download PDF" ──> PDF file downloads
       │
       ▼
[5. Administrator Audits Order]
  /admin/e-book-orders ──> Locate Customer A's base order (₹49) and upgrade order (₹50)
  /admin/e-book-orders/[orderId] ──> Inspect item breakdowns, payment IDs, and audit logs
```

---

## 2. Beginner-Friendly Setup & Preconditions

### 2.1 Starting the Application Locally

Open your terminal, navigate to the `frontend` folder, and start the local development server:

```bash
cd /home/harsha/Documents/Documents/Project/KnowledgePaat/frontend

# Install dependencies if not already done
npm install

# Start local server
npm run dev
```

The application will start at **`http://localhost:3000`**.

> [!NOTE]
> To test against a production-optimized build locally, execute:
> ```bash
> npm run build
> npm run start
> ```

### 2.2 Confirming Staging Database Target

Before clicking any buttons or entering any test data, confirm that your environment is connected **only** to dedicated Staging Supabase:

1. Open `frontend/.env.local` (or review your shell environment variables).
2. Verify:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://lzuinimbsdxnhzmjpxmr.supabase.co
   ```
3. **CRITICAL GUARD:** Confirm the project reference is **`lzuinimbsdxnhzmjpxmr`**. The production reference (`csjywuflkvohytbvglxf`) must **never** appear in your local configuration or test commands.

### 2.3 Confirming Razorpay Test Mode

1. In `frontend/.env.local`, inspect the Razorpay Key ID:
   ```env
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
   ```
2. Verify it starts with **`rzp_test_`**.
3. **NEVER** use keys starting with `rzp_live_`. Any transaction initiated in Test Mode will not charge real money or touch live banking rails.
4. Official Razorpay Test Mode Card Documentation:  
   [https://razorpay.com/docs/payments/payments/test-card-details/](https://razorpay.com/docs/payments/payments/test-card-details/)

### 2.4 Required Test Accounts & Secure Credentials

Three distinct user accounts are required for manual testing. **Never store real credentials in test guides, source code, or shared transcripts.** Obtain test credentials using these variable names from your secure team vault or `.env.local`:

| Role | Variable Name in `.env.local` / Vault | Typical Usage in Tests |
| :--- | :--- | :--- |
| **Administrator** | `STAGING_TEST_ADMIN_EMAIL`<br>`STAGING_TEST_ADMIN_PASSWORD` | Manages books, editions, pricing, publication, customer access grants, order ledgers, and refunds at `/admin/*`. |
| **Customer A** | `STAGING_TEST_STUDENT_EMAIL`<br>`STAGING_TEST_STUDENT_PASSWORD` | Primary customer account. Purchases books, reads chapters, saves bookmarks, upgrades plans, and downloads PDFs. |
| **Customer B** | `STAGING_TEST_CUSTOMER_B_EMAIL`<br>`STAGING_TEST_CUSTOMER_B_PASSWORD` | Secondary customer account. Used for multi-tenant boundary checks (confirming Customer B cannot access Customer A's books or orders). |

> [!TIP]
> If test user accounts need provisioning or password rotation on staging, administrators can run the local helper:
> ```bash
> npx ts-node --project tsconfig.json scripts/rotate_staging_test_credentials.ts
> ```
> This script updates staging Auth directly and places the high-entropy credentials securely into `frontend/.env.local`.

### 2.5 Browser Profiles for Independent Sessions

To prevent session cookie collision between Administrator and Customers, configure three separate browser contexts:

- **Window 1 (Regular Browser / Profile A):** Log in as **Administrator** at `http://localhost:3000/admin/login`.
- **Window 2 (Incognito / Profile B):** Log in as **Customer A** at `http://localhost:3000/login`.
- **Window 3 (Secondary Browser, e.g., Firefox or Chrome Guest Profile):** Log in as **Customer B** or browse anonymously as **Public Visitor**.

### 2.6 Test Assets & Disposable Records Requirement

Have the following test assets ready on your machine:
- **Cover Image:** Any standard JPEG, PNG, or WebP image under 2MB (e.g., `500x700px`).
- **Publication PDF:** Any standard PDF document under 100MB (a sample 2-page PDF is sufficient).
- **Chapter Content:** Sample text formatted in Markdown (headings, paragraphs, code blocks).

> [!IMPORTANT]
> **Use Disposable Records Only:**  
> Tests that change pricing, withdraw books from sale, revoke customer entitlements, or issue refunds must be performed on **disposable staging records created during your test session**. Do not alter established staging baseline books unless explicitly directed.

---

## 3. Official Razorpay Test Cards Reference

Use only these official Razorpay Sandbox card numbers during checkout testing. Label every entry as **Test Mode**:

| Card Type | Card Number (Test Mode Only) | Expiry | CVV | Expected Result / Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Domestic Success** | `4100 2800 0000 1007` | Any future date (e.g., `12/28`) | Any 3 digits (`123`) | Instant OTP authentication & successful capture. Enter any 4- or 6-digit OTP (e.g., `123456`). |
| **Alternative Success** | `4012 0000 0000 0002` | Future date (`10/29`) | `456` | Visa domestic success. |
| **Declined / Failed Card** | `4000 0000 0000 1002` | Future date (`12/28`) | `123` | Immediate decline by issuing bank simulation. |
| **Insufficient Funds** | `4000 0000 0000 1004` | Future date (`12/28`) | `123` | Simulates card failure due to insufficient credit limit. |

Official Documentation: [https://razorpay.com/docs/payments/payments/test-card-details/](https://razorpay.com/docs/payments/payments/test-card-details/)

---

## 4. Test Suite A: Administrator Prepares Books

Execute this suite first to author, configure, and publish a disposable test book.

---

### TC-ADM-01: Sign In as Administrator
- **Role:** Administrator
- **Prerequisites:** Administrator credentials available from `STAGING_TEST_ADMIN_EMAIL` and `STAGING_TEST_ADMIN_PASSWORD`.
- **Starting Page:** `http://localhost:3000/admin/login`
- **Numbered Actions:**
  1. Open `http://localhost:3000/admin/login` in Browser Window 1.
  2. Enter the administrator email and password into the respective fields.
  3. Click **"Sign In to Dashboard"**.
- **Expected Results:**
  - Login succeeds without error.
  - User is redirected to `/admin/dashboard`.
  - Admin header navigation displays links to eBooks, Customers, and Orders.
- **Evidence to Record:** Screenshot of `/admin/dashboard` showing logged-in admin state.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-02: Create Draft Book & Metadata
- **Role:** Administrator
- **Prerequisites:** Signed in as Administrator (`TC-ADM-01`).
- **Starting Page:** `http://localhost:3000/admin/e-books`
- **Numbered Actions:**
  1. On `/admin/e-books`, click the **"Add New eBook"** button (top right).
  2. The page navigates to `/admin/e-books/new`.
  3. Fill in the form fields:
     - **Book Title:** `Manual Test Guide to Cloud Architecture`
     - **Author Name:** `QA Lead Engineer`
     - **URL Slug:** `manual-test-guide-cloud-architecture` (auto-generated or manually typed)
     - **Category:** `System Design`
     - **Target Reader Role:** `Backend Engineers & Testers`
     - **Subtitle:** `A Comprehensive Hands-On Testing Guide`
     - **Language:** `en`
     - **Description:** `This disposable staging book is created specifically for manual verification of checkout, reading, downloads, and refunds.`
  4. Review default pricing tiers shown:
     - Online: ₹49 (4900 paise)
     - Download: ₹99 (9900 paise)
     - Upgrade: ₹50 (5000 paise)
  5. Click **"Save & Continue to Workspace"** (or submit button).
- **Expected Results:**
  - Book record is created in `ebooks` with `status='draft'`.
  - Initial Edition #1 is automatically generated in `ebook_editions`.
  - Browser automatically redirects to the editor at `/admin/e-books/[bookId]/edit`.
- **Evidence to Record:** Note the generated `bookId` from the URL bar.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-03: Upload Public Cover Asset
- **Role:** Administrator
- **Prerequisites:** Draft book created (`TC-ADM-02`); valid image file (`.jpg` or `.png`, < 2MB).
- **Starting Page:** `/admin/e-books/[bookId]/edit?tab=details`
- **Numbered Actions:**
  1. On the editor page, ensure the **"Book Details & Cover"** tab is active.
  2. In the right-hand column under **"Cover Image (Public)"**, click the file input button (**"Choose File"**).
  3. Select your test cover image.
  4. Click **"Upload Cover"**.
  5. After the upload finishes, click **"Save Book Details"** at the bottom of the left column.
- **Expected Results:**
  - File is uploaded to the public storage bucket (`ebook-covers`).
  - Cover preview appears immediately in the preview box.
  - Green notification banner displays: `"Cover image uploaded and attached successfully."`
- **Evidence to Record:** Screenshot showing the uploaded cover image thumbnail in the editor.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-04: Upload Private Publication PDF to Edition
- **Role:** Administrator
- **Prerequisites:** Draft book created (`TC-ADM-02`); valid PDF document (< 100MB).
- **Starting Page:** `/admin/e-books/[bookId]/edit?tab=editions`
- **Numbered Actions:**
  1. In the editor tab bar, click **"Editions & PDF Files"**.
  2. Confirm Edition #1 is selected as the active edition.
  3. Under **"Publication PDF Document (Strictly Private)"**, locate the file input.
  4. Select your test PDF file.
  5. Click **"Upload PDF"**.
- **Expected Results:**
  - File is uploaded to the private bucket (`ebook-pdfs`).
  - Storage path, original filename, and file size in MB are displayed with a green `"Verified Attachment"` badge.
  - Green banner confirms: `"Publication PDF uploaded to private storage successfully."`
- **Evidence to Record:** Screenshot of the verified PDF attachment card with path and size.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-05: Author Chapters, Mark Readiness, Reorder, & Designate Free Sample
- **Role:** Administrator
- **Prerequisites:** Draft book created (`TC-ADM-02`).
- **Starting Page:** `/admin/e-books/[bookId]/edit?tab=chapters`
- **Numbered Actions:**
  1. Click the **"Website Chapters"** tab.
  2. Click **"+ Add"** to create Chapter 1.
     - Title: `Chapter 1: Cloud Architecture Fundamentals`
     - Slug: `chapter-1-fundamentals`
     - Check the box: **"Designate as Free Sample (Accessible to public visitors without login)"**
     - Check the box: **"Ready for Publication"**
     - Markdown Body:
       ```markdown
       # Chapter 1: Cloud Architecture Fundamentals

       Welcome to the free sample chapter. This chapter is publicly accessible to all visitors.

       ## Key Concepts
       - High availability
       - Fault tolerance
       - Scalable storage
       ```
     - Click **"Save Chapter"**.
  3. Click **"+ Add"** to create Chapter 2.
     - Title: `Chapter 2: Distributed Data Stores & Caching`
     - Slug: `chapter-2-caching`
     - **Leave "Designate as Free Sample" unchecked.**
     - Check the box: **"Ready for Publication"**
     - Markdown Body:
       ```markdown
       # Chapter 2: Distributed Data Stores

       This is a protected paid chapter. Only authenticated owners can read this content.
       ```
     - Click **"Save Chapter"**.
  4. Click the up/down chevron arrows next to Chapter 2 in the list to test reordering. Move Chapter 2 up, then move Chapter 1 back up so Chapter 1 is first.
- **Expected Results:**
  - Chapter 1 shows the `"Free Sample"` tag and status `"ready"`.
  - Chapter 2 shows status `"ready"` without sample tag.
  - Reordering saves immediately via `/api/admin/ebooks/[bookId]/editions/[editionId]/chapters/reorder`.
- **Evidence to Record:** Screenshot of the chapter list showing Chapter 1 (Free Sample, ready) and Chapter 2 (ready).
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-06: Configure Dynamic Commercial Pricing & Discounts
- **Role:** Administrator
- **Prerequisites:** Draft book created (`TC-ADM-02`).
- **Starting Page:** `/admin/e-books/[bookId]/edit?tab=pricing`
- **Numbered Actions:**
  1. Click the **"Pricing & Discounts"** tab.
  2. Review current prices: Read Online ₹49, Read + Download ₹99, Upgrade ₹50.
  3. Under **Read Online Tier**:
     - Original Price: `49`
     - Discount Type: `none`
  4. Under **Read + Download Tier**:
     - Original Price: `99`
     - Discount Type: `none`
  5. Under **PDF Upgrade Delta**:
     - Original Price: `50`
     - Discount Type: `none`
  6. In the **"Audit & Change Log Reason"** text area, type: `Initial commercial pricing configuration for staging test book`.
  7. Click **"Save Commercial Pricing"**.
- **Expected Results:**
  - Live calculations display matching final selling prices (₹49, ₹99, ₹50).
  - Save completes successfully with green banner: `"Commercial pricing updated successfully."`
  - Audit history table below updates showing `pricing_version=1` with your change reason and timestamp.
- **Evidence to Record:** Screenshot of pricing summary and audit log row.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-07: Publication Attempt with Missing Prerequisites
- **Role:** Administrator
- **Prerequisites:** A book with an intentionally missing prerequisite (e.g., author a Chapter 3 and leave it as `draft`, uncheck "Ready").
- **Starting Page:** `/admin/e-books/[bookId]/edit?tab=publication`
- **Numbered Actions:**
  1. Go to **"Website Chapters"** tab, click **"+ Add"**, title it `Draft Appendix`, and save it with **"Ready for Publication" unchecked**.
  2. Switch to the **"Publication Checklist"** tab.
  3. Inspect the 7 checklist items.
  4. Observe Item 5: **"All Included Chapters Ready"**.
  5. Look at the launch action button at the bottom: **"Publish Edition to Bookstore"**.
- **Expected Results:**
  - Checklist shows: `DRAFTS EXIST` in amber next to Item 5.
  - An amber alert box lists blocking reasons: `"1 chapter(s) are still in draft status."`
  - The **"Publish Edition to Bookstore"** button is disabled (`disabled` attribute present, grayed out).
- **Evidence to Record:** Screenshot showing the disabled publish button and amber blocking reasons box.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-08: Satisfy Prerequisites, Publish Edition, & Confirm Public Isolation of Drafts
- **Role:** Administrator
- **Prerequisites:** Address blocking issue from `TC-ADM-07`.
- **Starting Page:** `/admin/e-books/[bookId]/edit?tab=chapters`
- **Numbered Actions:**
  1. In **"Website Chapters"**, select `Draft Appendix`, click **"Delete"** (or mark it as "Ready for Publication" and save).
  2. Switch back to **"Publication Checklist"** tab.
  3. Confirm all 7 items now show green **PASS** badges:
     - Book Title & Author: PASS
     - Book Cover Asset: PASS
     - Approved Pricing Tiers: PASS
     - Ready Website Chapters: PASS
     - All Included Chapters Ready: PASS
     - Designated Ready Free Sample: PASS
     - Private Publication PDF: PASS
  4. Click the enabled button: **"Publish Edition to Bookstore"**.
  5. Open an anonymous Incognito window and navigate to `http://localhost:3000/e-books`.
  6. Confirm your newly published book appears in the catalogue.
  7. Return to the admin editor, navigate back to `/admin/e-books/new`, and create a second book titled `Secret Unpublished Draft Book` without publishing it.
  8. Refresh the anonymous `/e-books` window.
- **Expected Results:**
  - Edition status updates from `draft` to `published`.
  - Header badge changes from amber `"Draft"` to green `"Published"`.
  - The published book appears immediately on the public `/e-books` storefront.
  - The `Secret Unpublished Draft Book` does **NOT** appear on `/e-books` (drafts remain strictly isolated from visitors).
- **Evidence to Record:** Screenshot of public `/e-books` catalogue showing only the published book.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

## 5. Test Suite B: Public Visitor Explores the Bookstore

Execute this suite in an anonymous Incognito / Guest window without signing in.

---

### TC-VIS-01: Public Portal Entry & Slide Transition
- **Role:** Public Visitor (Anonymous)
- **Prerequisites:** Application running at `http://localhost:3000`.
- **Starting Page:** `http://localhost:3000/`
- **Numbered Actions:**
  1. Open a clean Incognito window and navigate to `http://localhost:3000/`.
  2. Locate the **"E-Books"** button in the top navigation header (`id="main-nav-ebooks-btn"`).
  3. Click **"E-Books"**.
- **Expected Results:**
  - A smooth 350ms slide transition animation plays.
  - Browser URL changes to `/e-books`.
  - The bookstore header appears with the KnowledgePaat logo and dark purple theme.
- **Evidence to Record:** Observed transition smoothness and URL bar showing `/e-books`.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-VIS-02: Logo Navigation Back to Main Home
- **Role:** Public Visitor (Anonymous)
- **Prerequisites:** On `/e-books`.
- **Starting Page:** `http://localhost:3000/e-books`
- **Numbered Actions:**
  1. In the dark purple bookstore header, locate the KnowledgePaat logo button (`id="ebook-header-logo-link"`).
  2. Click the logo.
- **Expected Results:**
  - Smooth slide transition reverses back to `/`.
  - The main platform homepage is displayed.
  3. Click the browser's Back button (or click **"E-Books"** again) to return to `/e-books`.
- **Evidence to Record:** Browser URL returning to `/`.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-VIS-03: Dedicated Bookstore Navigation & Cart Placement
- **Role:** Public Visitor (Anonymous)
- **Prerequisites:** On `/e-books`.
- **Starting Page:** `http://localhost:3000/e-books`
- **Numbered Actions:**
  1. Inspect the desktop header elements from left to right:
     - KnowledgePaat Logo (links to `/`)
     - "eBooks" portal badge (links to `/e-books`)
     - "Store Home" link
     - "Browse Books" anchor link (`#catalogue`)
     - "Categories" dropdown menu
     - "My Books" link
     - Search magnifying glass icon button
     - Shopping Cart icon button (`id="ebook-header-cart-btn"`)
     - "Sign In" link and "Get Started" button
  2. Click the **"Categories"** dropdown button.
  3. Select **"System Design"**.
- **Expected Results:**
  - Categories dropdown opens smoothly.
  - Selecting "System Design" closes the dropdown and updates the catalogue URL to `/e-books?category=System+Design`.
  - Cart button is prominently visible in the header without an item badge (cart is empty).
- **Evidence to Record:** Screenshot of the open Categories dropdown.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-VIS-04: Catalogue Browsing, Search, Topic Filtering, & Pagination
- **Role:** Public Visitor (Anonymous)
- **Prerequisites:** At least 1 published book in the catalogue.
- **Starting Page:** `http://localhost:3000/e-books`
- **Numbered Actions:**
  1. Scroll down to the **"#catalogue"** section.
  2. In the catalogue search box, type `Cloud` and press Enter.
  3. Verify the catalogue cards filter to show books matching "Cloud".
  4. Click the **"All"** category pill to reset filters.
  5. Click the category pill **"Engineering"**.
  6. Click **"All"** again.
- **Expected Results:**
  - Search query filters in real-time or on submit.
  - Active filter pills display clear highlight state.
  - URL synchronizes query parameters (`?search=Cloud`, `?category=Engineering`).
- **Evidence to Record:** Note filter results and URL parameter behavior.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-VIS-05: Book Details Page, Authoritative Pricing, & Table of Contents
- **Role:** Public Visitor (Anonymous)
- **Prerequisites:** Published test book visible in catalogue.
- **Starting Page:** `http://localhost:3000/e-books`
- **Numbered Actions:**
  1. Click on the book card for `Manual Test Guide to Cloud Architecture`.
  2. Page navigates to `/e-books/[slug]`.
  3. Inspect the detail page layout:
     - Serif typography book title and author.
     - Book cover asset rendered cleanly.
     - Plan pricing cards: **Read Online (₹49)** and **Read + Download (₹99)**.
     - Table of Contents section listing Chapter 1 and Chapter 2.
  4. Observe the badges in the Table of Contents:
     - Chapter 1 has a green **"Free Sample"** badge and a **"Read Sample"** button.
     - Chapter 2 has a lock icon indicating it is a paid chapter.
- **Expected Results:**
  - Page renders without layout shift or missing images.
  - Pricing matches the admin-configured ₹49 and ₹99 amounts.
  - Table of Contents accurately distinguishes free sample from paid chapters.
- **Evidence to Record:** Screenshot of the book detail page showing pricing tiers and TOC.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-VIS-06: Read Free Sample Chapter Without Authentication
- **Role:** Public Visitor (Anonymous)
- **Prerequisites:** On `/e-books/[slug]`.
- **Starting Page:** `/e-books/[slug]`
- **Numbered Actions:**
  1. In the Table of Contents on the book detail page, click **"Read Sample"** next to Chapter 1.
  2. Observe the reading drawer that slides in from the right.
  3. Read the rendered markdown text.
  4. Press the `Escape` key on your keyboard, or click the close button (**"X"**) in the top right of the drawer.
- **Expected Results:**
  - The sample drawer slides open without prompting for login or authentication.
  - Markdown headings, lists, and formatting render safely without raw HTML.
  - Pressing `Escape` or clicking `X` closes the drawer and returns focus to the detail page.
- **Evidence to Record:** Screenshot of the open free sample reading drawer showing Chapter 1 content.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-VIS-07: Direct Access Protection on Paid Chapters
- **Role:** Public Visitor (Anonymous)
- **Prerequisites:** Knowledge of the paid chapter ID (Chapter 2 ID from admin or URL).
- **Starting Page:** Anonymous browser window.
- **Numbered Actions:**
  1. Manually type the protected reader URL into the address bar:
     `http://localhost:3000/read/[bookSlug]/[paidChapterId]`
  2. Press Enter.
- **Expected Results:**
  - The middleware or reader client intercepts the unauthenticated request.
  - User is redirected to `/login?redirectTo=/read/[bookSlug]/[paidChapterId]` (or an `"Authentication Required"` screen is displayed with a `"Sign In to Continue"` button).
  - Unauthenticated visitors are strictly forbidden from viewing paid chapter content.
- **Evidence to Record:** Browser URL showing redirection to `/login?redirectTo=...`.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

## 6. Test Suite C: Guest Cart and Authentication

Execute this suite to verify cart persistence, plan switching, duplicate prevention, and seamless authentication redirection.

---

### TC-CRT-01: Add Books Under Both Access Plans
- **Role:** Public Visitor / Guest
- **Prerequisites:** At least 2 published books in catalogue (or use 1 book to test one plan, then another).
- **Starting Page:** `/e-books/[bookSlug]`
- **Numbered Actions:**
  1. On the book detail page, click the plan card **"Read Online (₹49)"**.
  2. Click **"Add to Cart"**.
  3. Observe the shopping cart icon in the header.
- **Expected Results:**
  - Cart badge appears on the cart icon showing count `1`.
  - Item is stored in the browser's local cart storage.
- **Evidence to Record:** Header cart badge displaying `1`.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CRT-02: Duplicate Prevention on Re-Adding Same Book
- **Role:** Public Visitor / Guest
- **Prerequisites:** Book already in cart (`TC-CRT-01`).
- **Starting Page:** `/e-books/[bookSlug]`
- **Numbered Actions:**
  1. On the same book detail page, select **"Read + Download (₹99)"**.
  2. Click **"Add to Cart"** again.
  3. Click the cart icon button in the header (`/cart`).
- **Expected Results:**
  - Cart counter badge remains `1` (not 2).
  - On `/cart`, exactly **one line item** exists for this book.
  - The plan for this book has updated to the newly selected plan (**Read + Download**), preventing duplicate purchase of the same title.
- **Evidence to Record:** Screenshot of `/cart` showing exactly 1 item for the book.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CRT-03: Cart Line Item Plan Switching & In-Place Price Recalculation
- **Role:** Public Visitor / Guest
- **Prerequisites:** 1 item in cart at `/cart`.
- **Starting Page:** `http://localhost:3000/cart`
- **Numbered Actions:**
  1. On `/cart`, locate the **"Selected Access Tier"** toggle buttons on the item card:
     - `Read Online` (₹49)
     - `Read + PDF` (₹99)
  2. Click **"Read Online"**.
     - Observe the item price and Order Summary Total.
  3. Click **"Read + PDF"**.
     - Observe the item price and Order Summary Total.
- **Expected Results:**
  - Switching to `Read Online` updates the item price to ₹49.00 and Total to ₹49.00.
  - Switching to `Read + PDF` updates the item price to ₹99.00 and Total to ₹99.00.
  - Total recalculates in-place immediately without a full page reload.
- **Evidence to Record:** Note instantaneous total update between ₹49.00 and ₹99.00.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CRT-04: Remove Single Item & Clear Cart Modal (Cancel vs Confirm)
- **Role:** Public Visitor / Guest
- **Prerequisites:** At least 1 item in cart at `/cart`.
- **Starting Page:** `http://localhost:3000/cart`
- **Numbered Actions:**
  1. Click **"Clear Cart"** (or add 2 books and test trash icon on one book first).
  2. Click the trash can icon on an item $\rightarrow$ Item is removed immediately.
  3. Add the book back to cart.
  4. On `/cart`, click the **"Clear Cart"** button $\rightarrow$ A modal titled **"Clear Shopping Cart?"** opens.
  5. In the modal, click **"Cancel"**.
  6. Confirm the cart items remain intact.
  7. Click **"Clear Cart"** again, and this time click **"Yes, Clear Cart"**.
- **Expected Results:**
  - Trash can icon removes only that specific item.
  - "Cancel" in modal dismisses the modal without altering cart items.
  - "Yes, Clear Cart" empties the cart and transitions the page to the Empty Cart state showing `"Your eBook Shopping Cart is Empty"` with an `"Explore eBooks Bookstore"` button.
- **Evidence to Record:** Screenshot of the empty cart state.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CRT-05: Refresh & Multi-Tab Synchronisation Persistence
- **Role:** Public Visitor / Guest
- **Prerequisites:** Add 1 book to cart at `/cart`.
- **Starting Page:** `http://localhost:3000/cart`
- **Numbered Actions:**
  1. On `/cart`, select the **"Read Online"** plan.
  2. Reload the page using `F5` (or `Cmd+R`).
  3. Confirm the book and selected plan persist.
  4. Open a second tab in the same browser window and navigate to `http://localhost:3000/cart`.
  5. In Tab 2, change the plan to **"Read + PDF"**.
  6. Switch back to Tab 1 without refreshing.
- **Expected Results:**
  - Refreshing does not wipe the cart.
  - The storage event listener synchronizes Tab 1 to reflect the updated plan (**Read + PDF**) and updated total (₹99.00) automatically.
- **Evidence to Record:** Observed synchronization between the two tabs.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CRT-06: Sign In From eBook Section With Safe Return Path
- **Role:** Customer A
- **Prerequisites:** On `/e-books`; Customer A credentials available from `STAGING_TEST_STUDENT_EMAIL` / `STAGING_TEST_STUDENT_PASSWORD`.
- **Starting Page:** `http://localhost:3000/e-books`
- **Numbered Actions:**
  1. In the bookstore header, click the **"Sign In"** link.
  2. Observe the browser URL bar: it should read `/login?redirectTo=%2Fe-books`.
  3. Enter Customer A's email and password.
  4. Click **"Sign In"**.
- **Expected Results:**
  - Login completes successfully.
  - Application redirects the user back to `/e-books` (NOT to `/student/dashboard`).
  - Bookstore header now shows the user's logged-in state (e.g., "Dashboard" and "Log out" buttons).
- **Evidence to Record:** URL confirming return to `/e-books` after authentication.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CRT-07: Cart Preservation Through Authentication
- **Role:** Customer A
- **Prerequisites:** Sign out of all accounts. Add a book to cart as guest at `/cart`.
- **Starting Page:** `http://localhost:3000/cart`
- **Numbered Actions:**
  1. On `/cart`, verify the book is present with plan **"Read Online (₹49)"**.
  2. Click **"Proceed to Checkout"**.
  3. Because you are not logged in, the application intercepts and redirects to `/login?redirectTo=%2Fcheckout`.
  4. Enter Customer A credentials and click **"Sign In"**.
- **Expected Results:**
  - Login succeeds.
  - Browser automatically navigates to `http://localhost:3000/checkout`.
  - Your cart items and the ₹49.00 total are intact on `/checkout` (no items lost).
- **Evidence to Record:** Screenshot of `/checkout` showing Customer A signed in with the preserved cart items.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CRT-08: Student Portal Freedom & Unwanted Redirect Prevention
- **Role:** Customer A (Student role)
- **Prerequisites:** Signed in as Customer A.
- **Starting Page:** `http://localhost:3000/e-books`
- **Numbered Actions:**
  1. While signed in as Customer A, click between `/e-books`, `/cart`, and `/my-books`.
  2. Confirm you can freely navigate these bookstore pages without being automatically bounced to `/student/dashboard`.
  3. Only navigating directly to the root landing `/` or `/login` should redirect to `/student/dashboard`.
- **Expected Results:**
  - Authenticated students can browse the bookstore, manage their cart, and read their library without unwanted redirects.
- **Evidence to Record:** Verified smooth navigation across `/e-books`, `/cart`, and `/my-books`.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

## 7. Test Suite D: Checkout and Payment Recovery

Execute this suite as signed-in Customer A. Use Razorpay Test Mode cards only.

---

### TC-CHK-01: Order Summary Price Verification
- **Role:** Customer A
- **Prerequisites:** On `/checkout` with 1 book (`Read Online`, ₹49).
- **Starting Page:** `http://localhost:3000/checkout`
- **Numbered Actions:**
  1. Review the Customer Information card: Email and Full Name verified.
  2. Review the Order Summary card:
     - Book title and Edition number.
     - Selected tier: `Read Online`.
     - Authoritative Total: `₹49.00`.
  3. Inspect the channel availability badges:
     - `Cards & Netbanking (Active)`
     - `UPI Intent (Mobile)`
     - `UPI QR (Desktop)`
- **Expected Results:**
  - Total displays exactly ₹49.00 (matching server pricing minor units of 4900 paise).
  - Taxes are clearly marked as included.
  - Checkout button displays: `"Pay ₹49 via UPI / Cards"`.
- **Evidence to Record:** Screenshot of the `/checkout` summary card.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CHK-02: Successful Razorpay Test Mode Card Payment
- **Role:** Customer A
- **Prerequisites:** On `/checkout` with 1 book (`Read Online`, ₹49).
- **Starting Page:** `http://localhost:3000/checkout`
- **Numbered Actions:**
  1. Click **"Pay ₹49 via UPI / Cards"**.
  2. The Razorpay modal opens in a centered overlay with navy branding (`#0B1D3A`).
  3. In the modal, select the **"Card"** payment option.
  4. Enter official Razorpay Test Mode details:
     - **Card Number:** `4100 2800 0000 1007`
     - **Expiry:** `12/28`
     - **CVV:** `123`
  5. Click **"Pay ₹49"**.
  6. The test OTP screen appears. Enter any OTP (e.g., `123456`) and click **"Submit"**.
  7. Wait for verification (do not refresh).
- **Expected Results:**
  - Razorpay returns payment credentials to the application.
  - `/api/ebooks/orders/verify` verifies HMAC signature and confirms database state.
  - Cart item is pruned from local storage.
  - Browser automatically redirects to `/checkout/success?orderId=[orderId]`.
  - Success page displays: `"Payment Confirmed & Access Unlocked"`, Order Number, and a `"Go to My Books"` button.
- **Evidence to Record:** Note the Order Number (e.g., `KP-EB-...`) and capture screenshot of `/checkout/success`.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CHK-03: Gateway Failure, Cancellation, Dismissal, & Retry
- **Role:** Customer A
- **Prerequisites:** Add a different book (or same book on clean account) to cart; proceed to `/checkout`.
- **Starting Page:** `http://localhost:3000/checkout`
- **Numbered Actions:**
  1. On `/checkout`, click **"Pay ₹X via UPI / Cards"**.
  2. When the Razorpay modal opens, click the close button (**"X"**) in the top corner of the modal (or select Card $\rightarrow$ enter test failed card `4000 0000 0000 1002`).
  3. Observe the checkout page.
- **Expected Results:**
  - Modal dismisses cleanly.
  - Checkout page displays a **"Payment in Progress"** recovery card with the active order number and a **"Check Payment Status"** button.
  - If a declined card was used, a red decline message displays: `"Payment was declined or cancelled. You can retry with UPI or Card."`
  4. Click **"Pay ₹X via UPI / Cards"** again.
  5. Confirm the modal re-opens using the **existing pending order ID** rather than inserting a duplicate order row into the database.
- **Evidence to Record:** Screenshot of the "Payment in Progress" recovery card on `/checkout`.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CHK-04: "Check Payment Status" Recovery Action
- **Role:** Customer A
- **Prerequisites:** Active pending order on `/checkout` or `/checkout/success`.
- **Starting Page:** `http://localhost:3000/checkout`
- **Numbered Actions:**
  1. On the "Payment in Progress" recovery card, click **"Check Payment Status"**.
- **Expected Results:**
  - Button enters loading state showing `"Checking with Razorpay..."`.
  - Application executes `POST /api/ebooks/orders/[orderId]/check-status`.
  - If payment is still pending/unpaid, the card displays: `"Awaiting completed payment confirmation from gateway."`
  - If payment was captured externally, status updates to `paid` and redirects to `/checkout/success`.
- **Evidence to Record:** Response message displayed on the recovery card.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CHK-05: Success Page Refresh & Idempotency
- **Role:** Customer A
- **Prerequisites:** On `/checkout/success?orderId=[orderId]` after a completed test payment (`TC-CHK-02`).
- **Starting Page:** `/checkout/success?orderId=[orderId]`
- **Numbered Actions:**
  1. On the success confirmation screen, press `F5` (or `Cmd+R`) to reload the page.
  2. Reload the page a second time.
- **Expected Results:**
  - Page re-fetches the existing order details via `GET /api/ebooks/orders/[orderId]`.
  - Order details, tax invoice download button, and entitlement links render cleanly.
  - Zero duplicate orders or entitlements are created in the database.
- **Evidence to Record:** Confirmation that order details re-render identically without error.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CHK-06: Pending & Failed Payment Access Protection
- **Role:** Customer A
- **Prerequisites:** An order that was initiated but cancelled/unpaid (`TC-CHK-03`).
- **Starting Page:** `http://localhost:3000/my-books`
- **Numbered Actions:**
  1. Navigate to `/my-books`.
  2. Inspect the library shelf for the book from the cancelled/pending order.
  3. Attempt to directly access the book reader at `/read/[bookSlug]`.
- **Expected Results:**
  - The unpaid book does **NOT** appear on the customer's digital library shelf at `/my-books`.
  - Attempting to access `/read/[bookSlug]` returns an `"Access Restricted"` error screen.
  - Uncaptured payments never grant digital reading entitlements.
- **Evidence to Record:** Screenshot of `/my-books` showing unpaid title is absent.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-CHK-07: Order Record Comparison (Customer History vs Admin Ledger)
- **Role:** Customer A & Administrator
- **Prerequisites:** Successful purchase completed in `TC-CHK-02`.
- **Starting Page:** Customer window at `/my-books`; Admin window at `/admin/e-book-orders`.
- **Numbered Actions:**
  1. In Customer Window (`/my-books`), click **"Order History"** button in the top right.
  2. Inspect the order in the modal:
     - Order Number (e.g., `KP-EB-...`)
     - Date
     - Total Amount: `₹49`
     - Status badge: `Paid & Fulfilled`
     - Line items: `Read Online`
  3. In Admin Window, navigate to `http://localhost:3000/admin/e-book-orders`.
  4. Search or filter by the customer email or Order Number.
  5. Click to open the order detail page (`/admin/e-book-orders/[orderId]`).
  6. Compare Customer and Admin records.
- **Expected Results:**
  - Order Number, items, amount in paise (`4900`), payment provider ID (`pay_...`), and customer email match identically between customer and admin views.
- **Evidence to Record:** Note Order Number and verify consistency across both roles.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

## 8. Test Suite E: Customer Library and Reader

Execute this suite as signed-in Customer A on their purchased book.

---

### TC-LIB-01: Digital Library Entitlements Inspection
- **Role:** Customer A
- **Prerequisites:** Completed purchase of `Manual Test Guide to Cloud Architecture` (Read Online tier).
- **Starting Page:** `http://localhost:3000/my-books`
- **Numbered Actions:**
  1. Navigate to `/my-books`.
  2. Inspect the purchased book card:
     - Cover image thumbnail
     - Book Title and Author
     - Edition badge: `Edition 1`
     - Plan badge: **"Read Online"** (blue badge with book icon)
     - Purchase attribution date
     - Action buttons: **"Start Reading"** and **"Add PDF access — ₹50"**
- **Expected Results:**
  - Card displays with exact metadata.
  - "Download PDF" button is absent (or indicates upgrade required).
- **Evidence to Record:** Screenshot of the book card in `/my-books`.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RDR-02: Launch Reader & Chapter Navigation
- **Role:** Customer A
- **Prerequisites:** On `/my-books`.
- **Starting Page:** `http://localhost:3000/my-books`
- **Numbered Actions:**
  1. On the book card, click **"Start Reading"**.
  2. Reader opens at `/read/[bookSlug]/[chapter1Id]`.
  3. In the top bar, click the **"Contents"** button (hamburger icon).
  4. The Table of Contents drawer slides in from the left.
  5. Click `Chapter 2: Distributed Data Stores & Caching`.
  6. Scroll down to the bottom of Chapter 2.
  7. Click the **"Previous Chapter"** button.
- **Expected Results:**
  - Reader loads distraction-free with dark/navy top header.
  - Selecting Chapter 2 in the drawer switches chapters immediately.
  - "Previous Chapter" button at bottom navigates back to Chapter 1.
- **Evidence to Record:** Verified navigation between Chapter 1 and Chapter 2.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RDR-03: Progress Tracking, Refresh, & Automatic Resume
- **Role:** Customer A
- **Prerequisites:** In reader on Chapter 2.
- **Starting Page:** `/read/[bookSlug]/[chapter2Id]`
- **Numbered Actions:**
  1. Scroll halfway down Chapter 2 (approximately 50% scroll position).
  2. In the top right header, observe the save status indicator:
     - Displays `Saving…` with a pulsing teal dot during scroll.
     - Within 1.5 seconds after stopping, displays `Saved` with a green checkmark.
  3. Navigate back to `/my-books` by clicking the **"My Books"** back link.
  4. On the book card in `/my-books`, observe the reading progress bar:
     - Displays `"Reading Progress: 50%"` with a blue progress bar.
     - Button label changes from "Start Reading" to **"Continue Reading"**.
  5. Click **"Continue Reading"**.
- **Expected Results:**
  - Reader automatically reopens at Chapter 2 and smoothly scrolls to the saved 50% position.
- **Evidence to Record:** Screenshot of the 50% progress bar on `/my-books` and resumed scroll position.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RDR-04: Bookmarks Management
- **Role:** Customer A
- **Prerequisites:** In reader at `/read/[bookSlug]/[chapter2Id]`.
- **Starting Page:** `/read/[bookSlug]/[chapter2Id]`
- **Numbered Actions:**
  1. In the top bar, click the **Bookmark icon** button.
  2. Observe the bookmark icon fill state: it turns solid blue (`BookmarkCheck`).
  3. In the top bar, click the **Bookmarks Drawer** button (`Layers` icon).
  4. The saved bookmarks drawer slides in from the right.
  5. Verify the bookmark entry: Chapter Title, scroll position percentage, and timestamp.
  6. In the drawer, click the **"X"** remove icon next to the bookmark.
- **Expected Results:**
  - Bookmark saves to the server via `POST /api/ebooks/[bookId]/bookmarks`.
  - Drawer lists the saved bookmark.
  - Clicking "X" deletes the bookmark via `DELETE` and updates the header bookmark icon back to unfilled.
- **Evidence to Record:** Screenshot of the open Bookmarks drawer showing the saved entry.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RDR-05: In-Book Search
- **Role:** Customer A
- **Prerequisites:** In reader at `/read/[bookSlug]/[chapterId]`.
- **Starting Page:** `/read/[bookSlug]/[chapterId]`
- **Numbered Actions:**
  1. In the top header bar, click the **Search magnifying glass icon**.
  2. The Search modal opens over the reading canvas.
  3. Type `caching` into the search input and press Enter (or click **"Search"**).
  4. Review the search results list.
  5. Click on the matching result for Chapter 2.
- **Expected Results:**
  - Search executes against all edition chapters via `/api/ebooks/[bookId]/search`.
  - Results show Chapter number, title, match count, and a text snippet.
  - Clicking a result navigates directly to that chapter and closes the search modal.
- **Evidence to Record:** Screenshot of search results with highlighted snippets.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RDR-06: Display Preferences Persistence
- **Role:** Customer A
- **Prerequisites:** In reader at `/read/[bookSlug]/[chapterId]`.
- **Starting Page:** `/read/[bookSlug]/[chapterId]`
- **Numbered Actions:**
  1. In the top header bar, click the **Settings icon** (`Settings2`).
  2. The **"Display Settings"** popover opens.
  3. Change the following settings one by one:
     - **Theme:** Click **"Sepia"** (canvas turns warm amber `#FBF0D9`), then **"Dark"** (canvas turns `#0B1D3A`), then back to **"Light"**.
     - **Text Size:** Click **"L"** (Large) $\rightarrow$ Text enlarges immediately.
     - **Typography:** Click **"Serif"** $\rightarrow$ Text font changes to serif.
     - **Column Width:** Click **"Wide"** $\rightarrow$ Reading column expands.
  4. Reload the browser page (`F5`).
- **Expected Results:**
  - Styling updates in real-time on the reading canvas.
  - Settings are saved to `/api/ebooks/preferences`.
  - Upon page reload, the reader restores the exact chosen preferences (Theme, Font Size, Typography, Column Width).
- **Evidence to Record:** Screenshot of the reader in Sepia or Dark mode.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RDR-07: Mobile Responsiveness, Drawer Focus, & Keyboard Interactions
- **Role:** Customer A
- **Prerequisites:** In reader at `/read/[bookSlug]/[chapterId]`.
- **Starting Page:** `/read/[bookSlug]/[chapterId]`
- **Numbered Actions:**
  1. Open DevTools (`F12`) and toggle device toolbar to a mobile viewport (e.g., iPhone 14 or 390x844px).
  2. Confirm top header adapts cleanly with collapsed icons.
  3. Tap the **Contents** hamburger button $\rightarrow$ TOC drawer opens covering responsive width.
  4. Tap the backdrop or tap `X` to close.
  5. Locate a code block in the chapter text $\rightarrow$ Hover/tap the **"Copy"** button on the code block $\rightarrow$ Text copies to clipboard and button briefly shows **"Copied!"**.
  6. **Implementation Truth Check:** Press `Escape` while the Table of Contents drawer is open.
- **Expected Results:**
  - Mobile layout is responsive without horizontal overflow.
  - Code block copy helper functions with "Copied!" feedback.
  - *Actual Implementation Note:* Drawers close on backdrop click and `X` button click. Verify whether `Escape` closes the active drawer or requires explicit backdrop/button tap.
- **Evidence to Record:** Mobile screenshot and note on keyboard/Escape behavior.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RDR-08: Offline / Network Drop Progress-Save Recovery
- **Role:** Customer A
- **Prerequisites:** In reader at `/read/[bookSlug]/[chapterId]`.
- **Starting Page:** `/read/[bookSlug]/[chapterId]`
- **Numbered Actions:**
  1. Open DevTools (`F12`) $\rightarrow$ Network tab $\rightarrow$ Set Throttling to **"Offline"**.
  2. Scroll the chapter text up and down.
  3. Wait 2 seconds and observe the saving status indicator in the top header.
  4. Turn Network back to **"No throttling"** (Online).
  5. In the header, click the red button: **"Save failed (Retry)"**.
- **Expected Results:**
  - While offline, saving fails gracefully and displays a red **"Save failed (Retry)"** button.
  - Reading is not interrupted and no crash occurs.
  - When connection is restored, clicking "Save failed (Retry)" re-triggers `persistProgress()` and updates status to `Saved`.
- **Evidence to Record:** Screenshot of "Save failed (Retry)" indicator.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RDR-09: Multi-User Isolation & Boundary Checks
- **Role:** Customer A & Customer B
- **Prerequisites:** Customer A owns the book. Customer B has NOT purchased the book.
- **Starting Page:** Customer B browser window.
- **Numbered Actions:**
  1. In Customer B's browser window, navigate to `http://localhost:3000/login`.
  2. Sign in using Customer B credentials (`STAGING_TEST_CUSTOMER_B_EMAIL`).
  3. Navigate to `http://localhost:3000/my-books`.
  4. Confirm Customer A's purchased book does **NOT** appear in Customer B's library shelf.
  5. Copy the paid chapter URL from Customer A's session (`/read/[bookSlug]/[paidChapter2Id]`) and paste it into Customer B's address bar.
  6. Press Enter.
- **Expected Results:**
  - Customer B's `/my-books` displays an empty library state (or only Customer B's own titles).
  - Pasting Customer A's chapter URL into Customer B's browser returns an **"Access Restricted"** screen with message: `"The requested chapter is not accessible."`
  - Cross-customer access is strictly prevented by server-side RLS and entitlement verification.
- **Evidence to Record:** Screenshot of Customer B seeing "Access Restricted" on Customer A's chapter.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

## 9. Test Suite F: Downloads and Upgrades

Execute this suite as signed-in Customer A on their "Read Online" book.

---

### TC-DWN-01: Online-Only Tier Download Restriction
- **Role:** Customer A
- **Prerequisites:** Customer A owns `Manual Test Guide to Cloud Architecture` with `read_online` plan.
- **Starting Page:** `http://localhost:3000/my-books`
- **Numbered Actions:**
  1. Navigate to `/my-books`.
  2. Inspect the book card. Confirm there is **no** active "Download PDF" button; the card displays **"Add PDF access — ₹50"**.
  3. In your browser DevTools Console (or terminal via `curl`), execute a direct download request:
     ```javascript
     fetch('/api/ebooks/[bookId]/download?editionId=[editionId]').then(r => r.json()).then(console.log)
     ```
- **Expected Results:**
  - UI strictly prevents PDF download for online-only owners.
  - The direct API call returns HTTP `403 Forbidden` with error code `PLAN_DOES_NOT_INCLUDE_DOWNLOAD`.
- **Evidence to Record:** Console output showing HTTP 403 response.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-DWN-02: Read + Download Owner Secure PDF Delivery
- **Role:** Customer (with `read_download` plan, or after completing upgrade in `TC-UPG-04`)
- **Prerequisites:** Customer entitlement elevated to `read_download`.
- **Starting Page:** `http://localhost:3000/my-books`
- **Numbered Actions:**
  1. On `/my-books`, locate the elevated book card.
  2. Confirm the purple plan badge: **"Read + Download"**.
  3. Click **"Download PDF"**.
  4. Observe the button state: briefly displays `"Preparing PDF..."`.
  5. Check your browser downloads folder. Open the downloaded PDF file in a PDF viewer.
- **Expected Results:**
  - API call `/api/ebooks/[bookId]/download` validates entitlement and generates a temporary 60-second signed Supabase URL.
  - File download initiates immediately.
  - PDF opens cleanly in PDF viewer, showing all authored book chapters.
  - Card displays green confirmation: `"Download ready: [filename].pdf"`.
- **Evidence to Record:** Downloaded PDF file name, file size, and screenshot of the opened document.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-UPG-03: PDF Upgrade Modal & Admin-Controlled Pricing Quote
- **Role:** Customer A
- **Prerequisites:** Customer A has `read_online` access.
- **Starting Page:** `http://localhost:3000/my-books`
- **Numbered Actions:**
  1. On `/my-books`, click the button **"Add PDF access — ₹50"** on the book card.
  2. The `EBookUpgradeModal` opens in a centered overlay.
  3. Inspect the modal contents:
     - Current Plan: `Read Online`
     - Upgraded Plan: `Read + Download (Full)`
     - Benefits listed: Unlimited offline PDF downloads, permanent copy.
     - Authoritative Upgrade Price: `₹50.00`.
- **Expected Results:**
  - Modal fetches the live quote from `/api/ebooks/[bookId]/upgrade/quote`.
  - Authoritative price matches the admin-configured ₹50 upgrade delta (5000 paise).
  - Button displays: `"Pay ₹50 via UPI / Cards"`.
- **Evidence to Record:** Screenshot of the open Upgrade Modal showing the ₹50 quote.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-UPG-04: Complete Razorpay Test Mode PDF Upgrade Payment
- **Role:** Customer A
- **Prerequisites:** Upgrade modal open (`TC-UPG-03`).
- **Starting Page:** `EBookUpgradeModal` on `/my-books`
- **Numbered Actions:**
  1. In the upgrade modal, click **"Pay ₹50 via UPI / Cards"**.
  2. Razorpay Test Mode modal opens with amount ₹50.
  3. Select **Card** $\rightarrow$ Enter Test Card `4100 2800 0000 1007`, `12/28`, `123`.
  4. Submit test OTP (`123456`).
  5. Wait for verification.
- **Expected Results:**
  - Modal displays: `"Payment confirmed! Upgrading your digital access..."`.
  - Modal closes automatically.
  - The book card on `/my-books` elevates immediately:
    - Plan badge changes from "Read Online" to **"Read + Download"**.
    - "Add PDF access — ₹50" button disappears.
    - **"Download PDF"** button appears.
- **Evidence to Record:** Screenshot of the elevated book card on `/my-books`.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-UPG-05: Separate Upgrade Order & Reading Continuity
- **Role:** Customer A
- **Prerequisites:** Upgrade completed (`TC-UPG-04`).
- **Starting Page:** `http://localhost:3000/my-books`
- **Numbered Actions:**
  1. On `/my-books`, click **"Order History"**.
  2. Review the orders listed in the modal:
     - Order 1: Base purchase (₹49, `Read Online`).
     - Order 2: Distinct upgrade order (₹50, with a purple badge: **"PDF Upgrade"**).
  3. Close the modal.
  4. On the upgraded book card, click **"Continue Reading"**.
  5. Check reading progress, scroll position, and bookmarks.
- **Expected Results:**
  - Upgrade creates a **separate financial order record** with its own order number, preserving clean accounting.
  - Upgrading access plan does **NOT** reset reading progress, scroll offset, or saved bookmarks.
- **Evidence to Record:** Screenshot of the Order History modal showing both the base order and the upgrade order.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-UPG-06: Historical Purchased-Edition PDF Immutability
- **Role:** Administrator & Customer A
- **Prerequisites:** Customer A owns Edition 1 of the book.
- **Starting Page:** Administrator window at `/admin/e-books/[bookId]/edit?tab=editions`.
- **Numbered Actions:**
  1. In Administrator Window, create and publish **Edition 2** of the book with a new test PDF.
  2. In Customer A's window, navigate to `/my-books`.
  3. Inspect the book card: it displays badge `Edition 1` (and `Historical Edition`).
  4. Click **"Download PDF"**.
- **Expected Results:**
  - Customer A receives the PDF corresponding to **Edition 1** (the exact edition purchased), not Edition 2.
  - Content immutability ensures customers always receive the edition they purchased.
- **Evidence to Record:** Filename and content of the downloaded PDF confirming Edition 1 delivery.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-DWN-07: Access Revocation & Signed URL Expiry
- **Role:** Administrator & Customer A
- **Prerequisites:** Customer A owns the book; Administrator window open.
- **Starting Page:** Administrator window at `/admin/e-book-customers`.
- **Numbered Actions:**
  1. In Administrator Window, open `/admin/e-book-customers`.
  2. Search for Customer A (`STAGING_TEST_STUDENT_EMAIL`).
  3. Open Customer Details $\rightarrow$ Under Entitlements, click **"Revoke Access"**.
  4. Enter reason: `Compliance manual test revocation` and submit.
  5. In Customer A's window, refresh `/my-books`.
  6. Attempt to download the PDF or read chapters.
- **Expected Results:**
  - Card displays a red badge: **"Access Revoked"**.
  - Reader and download buttons are replaced with notice: `"Access for this book has been revoked or refunded."`
  - Subsequent requests to `/api/ebooks/[bookId]/download` return HTTP 403 Forbidden.
  - **Important Technical Context:** Previously downloaded PDF files stored on the user's hard drive cannot be remotely deleted. A signed URL already issued to the browser may remain functional until its 60-second signature expires. Revocation guarantees **no new signed URLs** can ever be issued.
- **Evidence to Record:** Screenshot of `/my-books` displaying "Access Revoked".
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

## 10. Test Suite G: Admin Management and Edition Protection

Execute this suite in Administrator Window 1.

---

### TC-ADM-09: Purchase History Orders Ledger & CSV Export
- **Role:** Administrator
- **Prerequisites:** Completed test purchases from Suite D and Suite F.
- **Starting Page:** `http://localhost:3000/admin/e-book-orders`
- **Numbered Actions:**
  1. Open `/admin/e-book-orders`.
  2. Review the orders table:
     - Columns: Order Number, Customer, Date, Items, Amount, Gateway Status, Refund Status.
  3. Filter by **Status: Paid**.
  4. In the search box, type Customer A's email.
  5. Click on an order row to navigate to `/admin/e-book-orders/[orderId]`.
  6. Click the Back button to return to `/admin/e-book-orders`.
  7. Click the **"Export CSV"** button.
  8. Open the downloaded CSV file in a spreadsheet editor (or text editor).
- **Expected Results:**
  - Orders table displays all staging purchases accurately.
  - CSV file downloads. Formulas or special characters (`=`, `+`, `-`, `@`) in title or user fields are safely escaped with a leading single quote (`'`) to prevent CSV injection.
- **Evidence to Record:** Downloaded CSV filename and sample row.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-10: Edit Published Commercial Pricing with Mandatory Audit Reason
- **Role:** Administrator
- **Prerequisites:** A published book at `/admin/e-books/[bookId]/edit`.
- **Starting Page:** `/admin/e-books/[bookId]/edit?tab=pricing`
- **Numbered Actions:**
  1. In the editor, navigate to the **"Pricing & Discounts"** tab.
  2. Change prices:
     - Read Online Original: change from `49` to `59`
     - Read + Download Original: change from `99` to `119`
  3. **Leave the Change Reason empty** and click **"Save Commercial Pricing"**.
  4. Observe error feedback.
  5. Enter Change Reason: `Promotional price update for Q4 manual audit`.
  6. Click **"Save Commercial Pricing"** again.
- **Expected Results:**
  - Step 3 fails: Red alert specifies `"A change reason is required for commercial audit logging."`
  - Step 5 succeeds: Green banner confirms pricing update.
  - `pricing_version` increments from `1` to `2`.
  - Audit history table displays a new row with the reason, new prices, and admin timestamp.
- **Evidence to Record:** Screenshot showing incremented `pricing_version` and audit history table row.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-11: Price Adjustment Protection for Past Paid Orders
- **Role:** Administrator & Customer A
- **Prerequisites:** Price adjusted to ₹59/₹119 in `TC-ADM-10`. Customer A bought earlier at ₹49.
- **Starting Page:** `/admin/e-book-orders` and `/my-books`
- **Numbered Actions:**
  1. In Admin Window, open the order detail page for Customer A's earlier purchase (`/admin/e-book-orders/[earlierOrderId]`).
  2. Verify the recorded line item and total amount.
  3. In Customer A's window, open **"Order History"** on `/my-books`.
- **Expected Results:**
  - Both admin order ledger and customer order history reflect the original paid amount (**₹49.00**).
  - Editing commercial prices in the catalogue never retroactively changes historical paid order records.
- **Evidence to Record:** Order record displaying unchanged ₹49.00 amount.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-12: Storefront & Cart Immediate Pricing Reflection
- **Role:** Public Visitor
- **Prerequisites:** Price updated to ₹59/₹119 in `TC-ADM-10`.
- **Starting Page:** Anonymous Incognito window at `/e-books/[bookSlug]`
- **Numbered Actions:**
  1. Navigate to `/e-books/[bookSlug]` in an Incognito window.
  2. Inspect the plan pricing cards.
  3. Add the book to cart. Navigate to `/cart`.
- **Expected Results:**
  - Storefront detail page immediately reflects the updated prices: **₹59** and **₹119**.
  - Cart verifies prices against the server and displays authoritative updated total: **₹59.00** (or ₹119.00).
- **Evidence to Record:** Screenshot of `/cart` showing the newly updated price.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-13: Optimistic Concurrency Conflict Detection on Stale Pricing Edits
- **Role:** Administrator
- **Prerequisites:** Published book pricing tab open.
- **Starting Page:** `/admin/e-books/[bookId]/edit?tab=pricing`
- **Numbered Actions:**
  1. Open `/admin/e-books/[bookId]/edit?tab=pricing` in Tab 1.
  2. Open the exact same URL in Tab 2.
  3. In Tab 1: Change Read Online to `69`, enter reason `Tab 1 update`, and click **"Save Commercial Pricing"**.
     - Verify Tab 1 saves successfully (version becomes `3`).
  4. Switch to Tab 2 (which still has stale version `2` loaded in its form state).
  5. In Tab 2: Change Read Online to `79`, enter reason `Tab 2 stale update`, and click **"Save Commercial Pricing"**.
- **Expected Results:**
  - Tab 2 submission is intercepted by server-side optimistic concurrency control.
  - Server returns HTTP `409 Conflict`.
  - Tab 2 displays conflict banner: `"Concurrent update conflict detected. Please reload."`
  - Prevents accidental silent overwrites when multiple admins edit pricing simultaneously.
- **Evidence to Record:** Screenshot of the HTTP 409 conflict error banner in Tab 2.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-14: Immutability of Published Edition Chapters & PDFs
- **Role:** Administrator
- **Prerequisites:** Published edition loaded in editor.
- **Starting Page:** `/admin/e-books/[bookId]/edit?tab=chapters`
- **Numbered Actions:**
  1. In the editor, ensure the active edition is **Edition 1 (Published)**.
  2. Click the **"Website Chapters"** tab.
  3. Inspect the top alert banner and form controls.
  4. Try to click **"+ Add"**, edit chapter text, click **"Save Chapter"**, or click chapter delete.
  5. Switch to **"Editions & PDF Files"** tab.
  6. Inspect the PDF upload section.
- **Expected Results:**
  - Amber banner displays: `Edition Content Locked: Edition #1 is published and immutable to preserve purchased reader access. Chapters and PDFs cannot be modified.`
  - "+ Add", "Delete", reorder buttons, and editor textarea are disabled (`disabled` attribute).
  - PDF section displays: `Publication PDF is locked for published editions. To upload a revised publication PDF, create a new draft edition revision.`
- **Evidence to Record:** Screenshot of the locked edition banner and disabled chapter controls.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-15: Create New Draft Edition Revision & Publish Revision
- **Role:** Administrator
- **Prerequisites:** Published book with Edition 1 locked (`TC-ADM-14`).
- **Starting Page:** `/admin/e-books/[bookId]/edit?tab=editions`
- **Numbered Actions:**
  1. On the **"Editions & PDF Files"** tab, click **"Create New Edition Revision"**.
  2. A prompt asks for a revision name. Enter: `Edition 2 (Major Update)`.
  3. Click OK.
  4. Wait for the page to refresh. Confirm active edition switches to **Edition 2**.
  5. Switch to **"Website Chapters"** tab. Confirm chapters were cloned from Edition 1.
  6. Edit Chapter 1 title to: `Chapter 1: Cloud Architecture Fundamentals (v2 Revised)`. Click **"Save Chapter"**.
  7. On **"Editions & PDF Files"** tab, upload a new revised PDF for Edition 2.
  8. Switch to **"Publication Checklist"** tab and click **"Publish Edition to Bookstore"**.
- **Expected Results:**
  - Edition 2 is created as draft, allowing full editing without touching Edition 1.
  - Edition 2 publishes successfully and becomes the active current edition for new storefront buyers.
- **Evidence to Record:** Screenshot showing Edition 2 published and active.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-16: Customer Edition Preservation After Storefront Revision
- **Role:** Customer A
- **Prerequisites:** Customer A purchased Edition 1. Administrator published Edition 2 in `TC-ADM-15`.
- **Starting Page:** `http://localhost:3000/my-books`
- **Numbered Actions:**
  1. In Customer A's window, navigate to `/my-books`.
  2. Inspect the book card:
     - Edition badge still displays: `Edition 1`.
     - An overlay label displays: `Historical Edition`.
  3. Click **"Start Reading"** (or Continue Reading).
  4. Inspect Chapter 1 title in the reader.
- **Expected Results:**
  - Customer A continues reading their purchased **Edition 1** (`Chapter 1: Cloud Architecture Fundamentals`).
  - Chapter 1 does **NOT** show the v2 revision text from Edition 2.
  - Customer's purchased content is preserved indefinitely.
- **Evidence to Record:** Reader showing Edition 1 title and version name.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-17: Withdraw Book from Active Sale
- **Role:** Administrator & Customer A
- **Prerequisites:** Published book; Customer A owns an edition.
- **Starting Page:** `/admin/e-books/[bookId]/edit?tab=publication`
- **Numbered Actions:**
  1. In Admin Window, navigate to `/admin/e-books/[bookId]/edit?tab=publication`.
  2. Under Launch Actions, click **"Withdraw from Sale"**.
  3. In an anonymous Incognito window, search for the book on `/e-books`.
  4. In Customer A's window, refresh `/my-books`.
- **Expected Results:**
  - Edition status changes to `withdrawn` (or `archived`).
  - Book is removed from the public bookstore catalogue `/e-books` (new visitors cannot buy it).
  - In Customer A's `/my-books`, the book **remains fully accessible** for reading and PDF downloads.
- **Evidence to Record:** Public `/e-books` showing book is absent; Customer A `/my-books` showing book remains accessible.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-18: Complimentary Access Grant, Revocation, & Audit Trail
- **Role:** Administrator & Customer B
- **Prerequisites:** Customer B account (`STAGING_TEST_CUSTOMER_B_EMAIL`) exists with zero purchases.
- **Starting Page:** `http://localhost:3000/admin/e-book-customers`
- **Numbered Actions:**
  1. Open `/admin/e-book-customers`.
  2. Search for Customer B's email.
  3. Click **"View Details"** to open Customer B's drawer.
  4. Click **"Grant Complimentary Access"**.
  5. Select the published test book, active edition, and plan **"Read + Download"**.
  6. Enter Mandatory Reason: `Scholarship complimentary grant for staging QA`.
  7. Click **"Grant Access"**.
  8. In Customer B's browser window, navigate to `/my-books`.
  9. Inspect Customer B's library shelf.
- **Expected Results:**
  - Entitlement is created with `grant_type='complimentary'`.
  - Zero fake financial orders are generated in `/admin/e-book-orders`.
  - Customer B's `/my-books` displays the book card with an emerald badge: **"Complimentary"**.
  - Customer B can read online and download the PDF.
  - In Admin Drawer $\rightarrow$ Audit tab, the grant is logged with admin ID, timestamp, and reason.
- **Evidence to Record:** Screenshot of Customer B's library shelf showing the "Complimentary" badge.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-ADM-19: Homepage CMS Draft & Publishing Controls
- **Role:** Administrator & Public Visitor
- **Prerequisites:** Administrator signed in.
- **Starting Page:** `http://localhost:3000/admin/e-books/homepage`
- **Numbered Actions:**
  1. Open `/admin/e-books/homepage`.
  2. In the **"Hero Section"** tab, change:
     - Hero Eyebrow: `Curated Technical Publications`
     - Hero Heading: `Build Resilient Distributed Systems`
     - Highlighted Text: `With Expert Guidance`
  3. Click **"Save Draft"**.
  4. Open an anonymous Incognito window at `http://localhost:3000/e-books`.
  5. Verify the public storefront: it should still display the old published heading (draft is isolated).
  6. Return to Admin Window and click **"Publish Homepage"**.
  7. Refresh the anonymous `/e-books` window.
- **Expected Results:**
  - "Save Draft" updates only the draft record without affecting public visitors.
  - "Publish Homepage" copies draft to published state, increments version, and updates the public storefront immediately.
- **Evidence to Record:** Screenshot of `/e-books` showing the newly published hero heading.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

## 11. Test Suite H: Refunds

Use **separate disposable Test Mode purchases** for each refund scenario. Never execute tests on live production records.

---

### TC-RFD-01: Full Refund on Base Purchase
- **Role:** Administrator & Customer A
- **Prerequisites:** Create a fresh test purchase of a disposable book (₹49) as Customer A (`TC-CHK-02`).
- **Starting Page:** `/admin/e-book-orders/[orderId]`
- **Numbered Actions:**
  1. In Admin Window, navigate to `/admin/e-book-orders` and locate the disposable ₹49 order.
  2. Open the order detail page `/admin/e-book-orders/[orderId]`.
  3. Click the **"Process Refund"** button (`RotateCcw` icon).
  4. The Refund Order modal opens:
     - Select Refund Type: **"Full Refund"**
     - Amount: verifies `49.00`
     - Access Entitlement Action: verify **"Revoke Access Completely"**
     - Reason: type `Customer requested full cancellation - staging test`
  5. Click **"Confirm & Execute Refund"**.
  6. Wait for provider processing.
  7. In Customer A's window, refresh `/my-books` and `/my-books` $\rightarrow$ Order History.
- **Expected Results:**
  - Razorpay Test Mode gateway processes refund and returns refund ID (`rfnd_...`).
  - Order status updates to `refunded` and refund status to `full`.
  - Available refundable balance drops to `₹0.00`.
  - Customer A's entitlement is revoked: card on `/my-books` shows `Access Revoked`, reading/downloads blocked.
  - Customer Order History modal shows badge: `Fully Refunded (₹49)`.
- **Evidence to Record:** Razorpay Refund ID (`rfnd_...`) and screenshot of the refunded order detail page.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RFD-02: Partial Refund on Multi-Item or Goodwill
- **Role:** Administrator & Customer A
- **Prerequisites:** Create a fresh test purchase (e.g., ₹99 Read + Download) as Customer A.
- **Starting Page:** `/admin/e-book-orders/[orderId]`
- **Numbered Actions:**
  1. Open the order detail page for the ₹99 purchase.
  2. Click **"Process Refund"**.
  3. In the modal:
     - Select Refund Type: **"Partial Refund"**
     - Enter Refund Amount in Rupees: `30` (3000 paise)
     - Access Entitlement Action: select **"Retain Access Unchanged"**
     - Reason: type `Promotional price matching goodwill refund`
  4. Click **"Confirm & Execute Refund"**.
  5. In Customer A's window, inspect `/my-books` and `/my-books` $\rightarrow$ Order History.
- **Expected Results:**
  - Razorpay processes partial refund of ₹30.00.
  - Order status updates to `partially_refunded`.
  - Refunded Amount displays `₹30.00`; Available balance updates to `₹69.00`.
  - Customer A's entitlement remains **Active** (online reading and downloads still functional).
  - Customer Order History displays: `Partially Refunded (₹30)`.
- **Evidence to Record:** Note remaining refundable balance (₹69.00) and Customer A's continued access.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RFD-03: Upgrade Refund with Online Access Preserved
- **Role:** Administrator & Customer A
- **Prerequisites:** Customer A has a base purchase (₹49) AND a completed upgrade (₹50) from Suite F.
- **Starting Page:** `/admin/e-book-orders`
- **Numbered Actions:**
  1. Open `/admin/e-book-orders`.
  2. Locate the **₹50 Upgrade Order** (order type: `upgrade`).
  3. Click to open `/admin/e-book-orders/[upgradeOrderId]`.
  4. Click **"Process Refund"**.
  5. Observe the Access Entitlement Action field:
     - It defaults automatically to **"Downgrade to Read Online Only"**.
  6. Enter Reason: `Customer dissatisfied with PDF formatting; reverting to online tier`.
  7. Click **"Confirm & Execute Refund"**.
  8. In Customer A's window, refresh `/my-books`.
- **Expected Results:**
  - Upgrade order is fully refunded (₹50.00).
  - Customer entitlement **downgrades** from `read_download` to `read_online`.
  - "Download PDF" button disappears.
  - **Online reading access remains 100% active and unrevoked.**
- **Evidence to Record:** Screenshot of Customer A's card showing plan reverted to "Read Online" with reading access active.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RFD-04: Rule C Base-Refund Protection While Active Upgrade Exists
- **Role:** Administrator
- **Prerequisites:** Customer has a base purchase (₹49) with an active paid upgrade (₹50) attached.
- **Starting Page:** `/admin/e-book-orders/[baseOrderId]`
- **Numbered Actions:**
  1. Open the **Base Order** (₹49) detail page in the admin portal.
  2. Note the banner or linked orders card indicating an active dependent upgrade exists.
  3. Click **"Process Refund"**.
  4. In the modal, uncheck any co-refund option and attempt to submit a standalone base refund with `force_allow_dependent_upgrade: false`.
- **Expected Results:**
  - Application business logic enforces **Rule C Conflict**.
  - Server rejects the request with error code `DEPENDENT_UPGRADE_EXISTS`.
  - Modal displays error message: `"Rule C Conflict: An active paid PDF upgrade exists for this purchase. Standalone base refund is blocked unless you acknowledge and force dependent upgrade resolution."`
  - Prevents orphaned upgrade licenses.
- **Evidence to Record:** Screenshot of the Rule C conflict error message in the refund modal.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RFD-05: Linked Dual Refund (Base + Upgrade Co-Refund)
- **Role:** Administrator & Customer A
- **Prerequisites:** Customer has base purchase (₹49) and active upgrade (₹50).
- **Starting Page:** `/admin/e-book-orders/[baseOrderId]`
- **Numbered Actions:**
  1. On the Base Order detail page, click **"Process Refund"**.
  2. Select the option: **"Refund Both Base and Upgrade Orders Co-jointly"**.
  3. Enter Reason: `Complete customer return of both base book and PDF upgrade`.
  4. Click **"Confirm & Execute Refund"**.
  5. Observe order ledger and Customer A's library shelf.
- **Expected Results:**
  - System executes linked refund via `action: 'refund_both'`.
  - Both base order (₹49) and upgrade order (₹50) are refunded through Razorpay.
  - Customer entitlement is completely revoked.
- **Evidence to Record:** Both refund IDs and confirmation of total revocation.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RFD-06: Repeated Refund Prevention & Balance Safeguard
- **Role:** Administrator
- **Prerequisites:** Order from `TC-RFD-01` (fully refunded, balance ₹0.00).
- **Starting Page:** `/admin/e-book-orders/[orderId]`
- **Numbered Actions:**
  1. Open the fully refunded order from `TC-RFD-01`.
  2. Inspect the "Process Refund" button.
  3. If clickable, open modal, enter ₹10, and attempt to submit.
- **Expected Results:**
  - Button is disabled or displays notice: `"Order is fully refunded."`
  - Attempting to submit an amount greater than available refundable balance (₹0.00) is rejected immediately with error: `"Amount exceeds available refundable balance of ₹0.00."`
  - Database row-level locks prevent concurrent double-refund attempts.
- **Evidence to Record:** UI validation error preventing over-refund.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

### TC-RFD-07: Pending / Interrupted Refund Recovery
- **Role:** Administrator (Developer-Assisted)
- **Prerequisites:** A refund record in `pending` status (can be inspected from existing audit scenario or simulated via gateway mock).
- **Starting Page:** `/admin/e-book-orders/[orderId]`
- **Numbered Actions:**
  1. On an order detail page with a refund in `pending` status, locate the **"Sync with Gateway"** button (`RefreshCw` icon) next to the pending refund.
  2. Click **"Sync with Gateway"**.
- **Expected Results:**
  - System calls `/api/admin/ebooks/refunds/[refundId]/reconcile`.
  - Queries Razorpay Gateway API directly for provider refund status.
  - If provider confirms `processed`, local database updates to `processed` and completes customer access revocation.
- **Evidence to Record:** Sync confirmation alert and updated refund status badge.
- **Actual Result:** Pending execution.
- **Status:** NOT RUN
- **Issue Reference:** None.

---

## 12. Test Suite I: External Dependencies and Technical Checks

These checks address operational launch gates, feature flags, and environment capabilities.

---

### TC-TECH-01: Transactional Email Receipts & Refund Notifications
- **Role:** Developer / QA Engineer
- **Prerequisites:** Environment inspection.
- **Execution:**
  1. Check `frontend/.env.local` for `RESEND_API_KEY` or `SMTP_HOST`.
  2. Observe: Credentials are not yet provisioned (`RESEND_API_KEY` is empty).
  3. Review `test_email_acceptance.ts` test results: The outbox queue pattern operates asynchronously without blocking payments, but emails cannot be delivered to physical inboxes until operational DNS (SPF, DKIM, DMARC) and provider keys are provisioned.
- **Expected Results:**
  - Order verification succeeds and creates outbox records cleanly.
  - Email transport remains blocked pending domain credentials.
- **Status:** **BLOCKED** (Operational dependency: Resend / SMTP credentials and DNS records).
- **Issue Reference:** Launch Blocker Gate 2 (`docs/ebooks/audit-remediation-report.md`).

---

### TC-TECH-02: UPI Availability & Fallback Payment Channels
- **Role:** Developer / QA Engineer
- **Prerequisites:** Razorpay Test Mode account credentials.
- **Execution:**
  1. Run `npx ts-node scripts/test_upi_intent_qr_suite.ts`.
  2. Inspect response from Razorpay `fetchPaymentMethods()`:
     ```json
     { "card": true, "netbanking": true, "wallet": true, "upi": false }
     ```
  3. Open `/checkout` in browser $\rightarrow$ Click Pay $\rightarrow$ Inspect modal.
- **Expected Results:**
  - Razorpay merchant account currently has `upi: false`.
  - Modal automatically and cleanly presents fallback channels (**Cards & Netbanking**) without crashing.
  - Seamless fallback payment works 100% via test cards.
- **Status:** **BLOCKED for UPI** (Requires Razorpay Dashboard merchant UPI activation); **PASS for clean fallback**.
- **Issue Reference:** Launch Blocker Gate 1 (`docs/ebooks/audit-remediation-report.md`).

---

### TC-TECH-03: Mobile Browser Intent & Desktop QR Hardware Acceptance
- **Role:** Physical Device Tester
- **Prerequisites:** Physical Android / iOS smartphone with Google Pay, PhonePe, or Paytm installed; desktop browser.
- **Execution:**
  1. On Android Chrome: Open staging URL $\rightarrow$ Add eBook $\rightarrow$ Tap Pay.
  2. While `upi: false`, confirm modal renders responsive bottom sheet showing Card and Netbanking options cleanly.
  3. Once merchant UPI is activated in Razorpay Dashboard: Re-test to verify installed UPI banking apps open via intent.
- **Expected Results:**
  - Mobile bottom sheet renders with touch-friendly controls.
  - Test Card payments complete cleanly on mobile devices.
- **Status:** NOT RUN (Pending physical hardware session post-UPI merchant activation).
- **Issue Reference:** Section 5 (`docs/ebooks/razorpay-upi-qr-integration.md`).

---

### TC-TECH-04: API Rate Limiting & Overload Recovery
- **Role:** Developer / QA Engineer
- **Prerequisites:** Terminal access.
- **Execution:**
  1. Run the rate limit automated verification:
     ```bash
     npx ts-node --project tsconfig.json scripts/rate_limit_worker.ts
     ```
  2. Rapidly send > 20 requests to `/api/ebooks/orders/create` within 60 seconds.
- **Expected Results:**
  - First 20 requests succeed (or return business validation).
  - 21st request returns HTTP `429 Too Many Requests`.
  - Response includes headers: `Retry-After: [seconds]` and `X-RateLimit-Remaining: 0`.
  - Database state remains completely invariant.
  - After the retry window expires, normal API requests succeed immediately.
- **Status:** **PASS** (Verified in automated audit suite).
- **Issue Reference:** Section 8 (`docs/ebooks/audit-remediation-report.md`).

---

### TC-TECH-05: Production Reverse Proxy Trust & Header Spoofing
- **Role:** DevOps / Security Engineer
- **Prerequisites:** Staging / Production deployment configuration inspection.
- **Execution:**
  1. Inspect `frontend/lib/rateLimit.ts`.
  2. Confirm the auto-trust bug was remediated: `TRUST_PROXY` must be explicitly configured as `true` **only** when deployed behind an authentic reverse proxy (Cloudflare, AWS ALB, Nginx).
  3. Send request with spoofed `X-Forwarded-For: 1.1.1.1` to standalone container.
- **Expected Results:**
  - Standalone server ignores untrusted `X-Forwarded-For` header and extracts the true client IP from the connection socket.
  - When deployed to production behind reverse proxy, setting `TRUST_PROXY=true` extracts the authentic client IP.
- **Status:** **FIXED + UNVERIFIED IN PROD** (Code fixed; live proof requires deployment behind production reverse-proxy).
- **Issue Reference:** Launch Blocker Gate 3 (`docs/ebooks/audit-remediation-report.md`).

---

### TC-TECH-06: Code Quality, Lint Baseline, & Typecheck Verification
- **Role:** Developer / QA Engineer
- **Prerequisites:** Terminal access in `frontend/`.
- **Execution:**
  ```bash
  cd frontend
  npm run build
  npx tsc --noEmit
  npm run lint
  ```
- **Expected Results:**
  - `npm run build`: Completes successfully (Exit code 0); production route table verified.
  - `npx tsc --noEmit`: Zero TypeScript compilation errors.
  - `npm run lint`: Exit code 0. Zero `prefer-const` errors; zero `react/no-unescaped-entities` errors. Baseline of 545 non-breaking application warnings/errors documented.
- **Status:** **PASS** (Verified in gap-closure audit).
- **Issue Reference:** Workstream 2 (`docs/ebooks/audit-remediation-report.md`).

---

## 13. Printable Export Capabilities Statement

> [!NOTE]
> **Environment Export Tooling Status:**  
> Command-line PDF/Word conversion utilities (`pandoc`, `libreoffice`, `wkhtmltopdf`, `weasyprint`) are **not installed** in this Linux operating environment.  
>  
> **How to create a clean printable PDF:**
> 1. Open this file (`docs/ebooks/end-to-end-manual-test-guide.md`) in any modern browser (or VS Code / GitHub Markdown viewer).
> 2. Press `Ctrl + P` (or `Cmd + P` on macOS) to open the browser print dialogue.
> 3. Select **"Save as PDF"**.
> 4. Ensure **"Background graphics"** is checked to preserve color alerts and status badges.
> 5. Click **"Save"**.

---

## 14. Recommended Starting Point

To begin your manual testing session right now:

1. **Start the local server:**  
   `cd frontend && npm run dev`
2. **Open your browser at:**  
   `http://localhost:3000/admin/login`
3. **Begin with Test:**  
   **`TC-ADM-01: Sign In as Administrator`** (Section 4)
4. Follow sequentially through **Section 4 (Admin Prepares Books)** to publish your test book, then open an Incognito window to proceed with **Section 5 (Public Visitor)** and **Section 6 (Guest Cart & Checkout)**.
