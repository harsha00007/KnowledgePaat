# KnowledgePaat — Phase 9 Manual & End-to-End Test Guide

**System:** KnowledgePaat LMS & Technical Bookstore  
**Target Phase:** Phase 9 (End-to-End Validation, Security Hardening, UX Verification, Launch Readiness)  
**Target Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Store URL:** `http://localhost:3000/e-books`  
**Cart URL:** `http://localhost:3000/cart`  
**Library URL:** `http://localhost:3000/my-books`  
**Admin URL:** `http://localhost:3000/admin/e-book-orders`  
**Payment Mode:** Razorpay Test Mode (`rzp_test_...` key pair, zero real money)  
**Execution Timestamp:** 2026-10-18T17:45:00+05:30 (IST)  

---

## Scenario 1: Anonymous Visitor Catalogue, Sample & Cart Flow

### Preconditions
- Browser is unauthenticated (incognito window).
- Next.js development server is active on `http://localhost:3000`.

### Steps
1. Navigate to `http://localhost:3000/e-books`.
2. Inspect the bookstore header:
   - Verify KnowledgePaat logo and navigation links.
   - Verify cart icon displays count `0`.
3. Test catalog search and filters:
   - Type `Microservices` in the search bar and press Enter or click "Search".
   - Select the `System Design` category filter chip.
   - Observe real-time filtering of books.
4. Click on a book card (e.g. *Mastering Microservices Architecture*):
   - Verify book details page displays title, author, edition badge, description, and table of contents.
5. Click **"Read Free Sample"** on Chapter 1:
   - Verify free sample chapter opens in the reading drawer.
   - Verify chapter text renders with clean typography, headers, and code snippets.
   - Attempt to access a paid chapter (Chapter 2) from the drawer table of contents:
     - Verify paid chapters display a *"Purchasers Only"* badge and cannot be read anonymously.
6. Choose an access plan on the book details page:
   - Select **"Read Online Only (₹49)"** or **"Read + Download PDF (₹99)"**.
   - Click **"Add to Cart"**.
   - Observe toast notification confirming addition.
   - Observe cart badge count increments to `1`.
7. Refresh the browser page (`F5` or `Ctrl+R`):
   - Verify cart badge persists at `1` via `localStorage`.
8. Navigate to `http://localhost:3000/cart`:
   - Verify the cart displays the chosen book title, edition badge, access plan badge, authoritative price in rupees (`₹`), and total amount.
9. Click **"Proceed to Sign In / Checkout"**:
   - Sign in using test student credentials (`student@knowledgepaat.test`).
   - Observe automatic redirect back to `/cart` or checkout flow with cart items intact.

### Expected Result
- Catalog browsing, keyword search, category filtering, sample chapter reading, plan selection, and client-side cart persistence all execute smoothly. Free sample content is accessible anonymously; paid content is strictly protected.

---

## Scenario 2: ₹49 Online Purchase, Reading Persistence & PDF Denial

### Preconditions
- Signed in as an authorized student (`role = 'student'`).
- Cart contains 1 book with the **"Read Online (₹49)"** plan.

### Steps
1. Navigate to `http://localhost:3000/cart` and click **"Proceed to Checkout"**.
2. Complete checkout via Razorpay Test Mode:
   - Razorpay test modal opens displaying order reference and authoritative amount `₹49.00`.
   - Select Test Netbanking or Test Card (`success` simulation).
   - Authorize payment.
3. Observe post-payment confirmation:
   - Browser redirects to `/checkout/success` displaying order number and confirmation banner.
4. Navigate to `http://localhost:3000/my-books`:
   - Verify the purchased book appears in the student's digital shelf.
   - Verify the badge displays **"Read Online"** plan.
5. Click **"Open Reader"**:
   - Verify the protected reader opens at `http://localhost:3000/read/[bookId]/[chapterId]`.
   - Navigate through chapters using next/previous buttons and table of contents sidebar.
   - Perform an in-book keyword search using the reader search bar.
6. Test Reading State Persistence:
   - Scroll down to 50% of Chapter 2.
   - Click the bookmark icon to save a bookmark with note: *"Key architecture takeaway"*.
   - Open reader display settings:
     - Switch theme from Light to **Dark**.
     - Change font size to **Large**.
     - Set content width to **Wide**.
7. Refresh the page or log out and log back in:
   - Re-open the book from `/my-books`.
   - Verify reader restores exact scroll position, active bookmark, Dark theme, Large font, and Wide layout.
8. Attempt PDF Download:
   - Inspect reader toolbar: Verify PDF download button is disabled or absent for online-only plan.
   - Attempt direct API call in browser console:
     ```javascript
     fetch('/api/ebooks/[bookId]/download').then(r => r.json()).then(console.log);
     ```
   - Verify API returns HTTP 403 Forbidden with error `ONLINE_ONLY_PLAN`.

### Expected Result
- Instant digital unlocking for ₹49 purchase; reading progress, bookmarks, and display preferences persist durably in staging PostgreSQL; PDF download requests are rejected both in the UI and server API.

---

## Scenario 3: ₹99 Read + Download Purchase & Verified PDF Delivery

### Preconditions
- Signed in as a new test student.
- Cart contains 1 book with the **"Read + Download (₹99)"** plan.

### Steps
1. Navigate to `http://localhost:3000/cart` and initiate checkout.
2. Complete payment in Razorpay Test Mode for `₹99.00`.
3. Verify order confirmation and navigate to `/my-books`:
   - Verify the book card displays the **"Read + Download (PDF)"** plan badge.
   - Verify both **"Open Reader"** and **"Download PDF"** buttons are visible and active.
4. Click **"Download PDF"**:
   - Observe download modal opening, validating customer entitlement on the server.
   - Server issues a short-lived signed URL to the private Supabase storage bucket (`ebook-pdfs`).
   - Browser initiates file download.
5. Inspect the downloaded file:
   - Open the downloaded PDF in a PDF viewer or examine headers in terminal:
     ```bash
     head -n 5 downloaded_book.pdf
     ```
   - Verify magic header begins with `%PDF-1.4`.
   - Verify title, page count, and edition match the purchased book.

### Expected Result
- Complete ₹99 purchase provides both distraction-free online reading and legitimate PDF download delivery from private Supabase storage with short-lived signed URLs.

---

## Scenario 4: ₹50 PDF Upgrade Journey & State Preservation

### Preconditions
- Signed in as the customer from Scenario 2 who owns the **₹49 Read Online** plan.

### Steps
1. Navigate to `/my-books`:
   - Observe the purchased book displays an **"Upgrade to PDF (₹50)"** button.
2. Click **"Upgrade to PDF (₹50)"**:
   - An upgrade modal opens displaying:
     - Current Plan: *Read Online (₹49)*
     - Target Plan: *Read + Download PDF (₹99)*
     - Upgrade Price Difference: *₹50.00*
3. Click **"Confirm & Pay ₹50"**:
   - Server calculates authoritative upgrade quote (`9900 - 4900 = 5000 paise`).
   - Razorpay test modal opens for `₹50.00`.
   - Authorize payment.
4. Observe post-upgrade state in `/my-books`:
   - The book badge immediately updates to **"Read + Download (PDF)"**.
   - The **"Download PDF"** button is now unlocked and active.
5. Open reader:
   - Verify reading progress (scroll percentage), saved bookmarks, and custom display preferences remain completely intact without regression.
6. Verify Admin Order Ledger (`http://localhost:3000/admin/e-book-orders`):
   - Signed in as admin:
   - Verify the original ₹49 purchase order and the separate ₹50 upgrade order are recorded as separate line items.
   - Verify the base order displays a link to the upgrade order, and the upgrade order displays a link to the base order.

### Expected Result
- Seamless, server-verified ₹50 upgrade unseals PDF download rights, preserves student reading history and bookmarks, and records cleanly linked immutable order records.

---

## Scenario 5: Refunds & Access Policy Enforcement (Rules A through E)

### Preconditions
- Signed in as an administrator (`role = 'admin'`).
- Navigate to `http://localhost:3000/admin/e-book-orders`.

### Test Cases
1. **Rule A: Full ₹99 Purchase Refund**:
   - Select an order with a ₹99 Read + Download purchase.
   - Click "Process Refund" -> Choose "Full Refund (₹99.00)".
   - Reason: "Customer dissatisfaction within policy window".
   - Confirm refund.
   - **Verification**:
     - Order status transitions to `refunded`.
     - In customer's `/my-books`, access is completely revoked (`is_active: false`).
     - Reader access returns 403 Access Denied.
2. **Rule B: Full ₹50 Upgrade Refund (Downgrade)**:
   - Select a ₹50 upgrade order for a customer who previously owned ₹49 online reading.
   - Process full refund for ₹50.00.
   - **Verification**:
     - Upgrade order status transitions to `refunded`.
     - Customer entitlement is downgraded back to `read_online`.
     - PDF download access is revoked; online reader access remains active.
3. **Rule C: Standalone Base Purchase Refund Blocked by Upgrade**:
   - Select a ₹49 base purchase order that has an active paid ₹50 upgrade linked to it.
   - Attempt to refund only the ₹49 base order.
   - **Verification**:
     - System displays an amber error banner: *"DEPENDENT_UPGRADE_EXISTS: An active paid PDF upgrade exists for this purchase. Standalone base purchase refund is blocked. You must resolve or refund the dependent upgrade first."*
     - The base order cannot be refunded independently, preventing orphaned PDF access.
4. **Rule D: Partial / Goodwill Refund**:
   - Select an order and enter a partial refund amount (e.g. ₹20 goodwill courtesy credit).
   - Set access action to "Retain Access".
   - **Verification**:
     - Order transitions to `partially_refunded`.
     - Customer retains active reading and download access.
5. **Rule E: Multi-Item Order Isolation**:
   - On a multi-book order, refund Item 1 only.
   - **Verification**:
     - Access to Item 1 is revoked; access to Item 2 remains active and unaffected.

### Expected Result
- Strict enforcement of all 5 authoritative refund policies (Rules A through E), ensuring access changes occur only after confirmed refund processing without unintended access revocation or access resurrection.

---

## Scenario 6: Payment & Recovery Edge Cases

### Preconditions
- Active browser session with cart items.

### Test Cases
1. **Checkout Cancellation**:
   - Open Razorpay payment modal and click the "X" button to cancel.
   - Verify modal closes cleanly, cart items remain preserved, and zero entitlements are granted.
2. **Browser Closure Before Callback**:
   - Simulate browser tab closure immediately after payment authorization.
   - Verify system recovers order state via webhook or subsequent status reconciliation query on next visit.
3. **Repeated Verification & Concurrent Submissions**:
   - Rapidly double-click payment verification button.
   - Verify database row-level locking (`FOR UPDATE`) processes exactly one verification and idempotently returns existing order state.
4. **Authoritative Price Tampering**:
   - Attempt to submit a tampered price (e.g. ₹10 instead of ₹49) via browser devtools request editing.
   - Verify server rejects the payload with HTTP 400 *"PRICE_MISMATCH: Authoritative book price does not match client submission."*
5. **Duplicate Active Ownership**:
   - Attempt to add and purchase a book already owned in `/my-books`.
   - Verify checkout button is disabled and displays *"Already Owned"*.

### Expected Result
- Resilient transaction state machines protect against double-charging, race conditions, tampered client pricing, and orphaned payments.

---

## Scenario 7: Administrator Authoring, Revision & Reporting

### Preconditions
- Signed in as an administrator (`role = 'admin'`).
- Navigate to `http://localhost:3000/admin/e-books`.

### Steps
1. **Create Draft Book**:
   - Click "Create New eBook".
   - Fill Title: *Cloud-Native Distributed Patterns*, Author, Description, Category.
   - Click "Save Draft". Verify draft edition is initialized.
2. **Author Chapters**:
   - Add Chapter 1: Title, slug, content body. Check "Free Sample".
   - Add Chapter 2: Title, slug, content body. Leave unchecked (Paid).
3. **Upload PDF**:
   - Upload sample PDF file.
   - Verify file size in MB and storage path are recorded in `ebook_editions`.
4. **Publish Edition**:
   - Click "Publish Edition".
   - Verify all 7 pre-publication checklist requirements pass.
   - Verify edition status transitions to `published` and book appears in public store.
5. **Create Revision**:
   - Create new revision (Edition 2).
   - Verify Edition 1 is preserved as historical archive; existing customer entitlements remain bound to their purchased edition.
6. **Export Financial Reports**:
   - Navigate to `/admin/e-book-orders`.
   - Click "Export Orders CSV".
   - Verify downloaded CSV escapes formula injection prefixes (`=`, `+`, `-`, `@`) and matches database financial totals.

### Expected Result
- Full administrative lifecycle from draft creation, chapter authoring, asset uploading, multi-edition revision management, to financial reporting is verified and operational.
