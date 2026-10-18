# KnowledgePaat — Phase 7 Manual Test Guide: Secure PDF Downloads & ₹50 Upgrades

**Target Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Application URL:** `http://localhost:3000`  
**Test Customer Credentials:** `STAGING_TEST_CUSTOMER_EMAIL` / `STAGING_TEST_CUSTOMER_PASSWORD` (configured in `.env.local`)  
**Secondary Test Customer Credentials:** `STAGING_TEST_CUSTOMER_B_EMAIL` / `STAGING_TEST_CUSTOMER_B_PASSWORD`  
**Feature Flag Status:** `ebook_reader: true`, `ebook_checkout: true`, `ebook_pdf_download: true` (staging only)  

---

## Scenario 1: Unauthenticated Visitor Download Gate
- **Precondition:** Visitor is not signed in (incognito window or signed out session).
- **Steps:**
  1. Open browser DevTools Network tab.
  2. Navigate directly to `http://localhost:3000/api/ebooks/mastering-microservices-architecture/download` in the address bar.
- **Expected Result:**
  - HTTP `401 Unauthorized` is returned.
  - JSON payload: `{"error": "Unauthorized: Active customer session required"}`.
  - No storage signed URL or file path is generated, logged, or returned.

---

## Scenario 2: Verified Customer Without Ownership
- **Precondition:** User is signed in with Customer B account (`phase7.customer.b@knowledgepaat.test`), which has not purchased the book.
- **Steps:**
  1. Sign in as Customer B.
  2. Attempt to fetch download URL via browser console:
     ```javascript
     fetch('/api/ebooks/mastering-microservices-architecture/download').then(r => r.json()).then(console.log);
     ```
- **Expected Result:**
  - HTTP `403 Forbidden` is returned.
  - JSON payload error code: `NO_ACTIVE_ENTITLEMENT`.
  - Message explains that no active entitlement was found for this book and edition.

---

## Scenario 3: Read Online (₹49) Customer Attempts Download
- **Precondition:** Customer owns an active ₹49 `read_online` entitlement (`can_read_online: true`, `can_download_pdf: false`).
- **Steps:**
  1. Sign in as the ₹49 customer.
  2. Navigate to `http://localhost:3000/my-books`.
  3. Inspect the book card for the ₹49 book.
  4. Attempt direct download via API fetch:
     ```javascript
     fetch('/api/ebooks/mastering-microservices-architecture/download').then(r => r.json()).then(console.log);
     ```
- **Expected Result:**
  - On `/my-books`, the book card displays "Online Reading Only" badge and an amber "Add PDF access — ₹50" button instead of a download button.
  - Direct API request fails with HTTP `403 Forbidden` (`ONLINE_ONLY_PLAN`).
  - Error message prompts the user to upgrade to Read + Download.

---

## Scenario 4: Read Online (₹49) Customer Upgrades to Read + Download (₹50)
- **Precondition:** Customer owns ₹49 `read_online` license. Razorpay Test Mode is active.
- **Steps:**
  1. Sign in as the ₹49 customer and navigate to `http://localhost:3000/my-books`.
  2. Click the amber button **"Add PDF access — ₹50"**.
  3. Verify the **"Upgrade to Read + Download"** modal opens:
     - Displays book title, cover thumbnail, and exact purchased edition.
     - Displays current plan: "Read Online (Active)".
     - Displays upgraded plan: "Read + Download (Full offline PDF access)".
     - Displays price: "₹50 (inclusive of all taxes)".
     - Explicitly confirms: "Your existing reading progress, bookmarks, and online access remain completely intact."
  4. Click **"Upgrade Now — ₹50"**.
  5. The Razorpay Test Mode checkout modal launches with Amount: ₹50.00.
  6. Select "Netbanking" -> "State Bank of India" -> click "Pay ₹50.00" -> click "Success" in the Razorpay test bank screen.
- **Expected Result:**
  - Razorpay completes payment with status `captured`.
  - Verification endpoint `POST /api/ebooks/orders/verify` validates signature, queries provider, and invokes `finalize_ebook_order_payment`.
  - Upgrade modal displays success toast: "Upgrade Complete! You now have full PDF download access."
  - My Books shelf automatically refreshes:
    - Badge transitions to emerald **"Read + Download"**.
    - Button transitions to Royal Blue **"Download PDF"**.
  - All existing bookmarks and reading progress percentage are intact.

---

## Scenario 5: Entitled Read + Download (₹99) Customer Downloads PDF from My Books
- **Precondition:** Customer owns active `read_download` entitlement (`can_download_pdf: true`).
- **Steps:**
  1. Sign in as an entitled customer and navigate to `http://localhost:3000/my-books`.
  2. Locate the book card showing the emerald "Read + Download" badge.
  3. Click **"Download PDF"**.
- **Expected Result:**
  - The button immediately enters loading state with spinning icon and text "Preparing download...".
  - Button is disabled during fetch to prevent duplicate clicks.
  - Browser initiates file download: `${book-slug}-edition-${editionNumber}.pdf`.
  - Saved file has valid magic bytes `%PDF-1.4`.
  - An audit record is logged in `public.ebook_download_logs` with `status: 'url_issued'` and client IP.
  - The signed bearer URL is never displayed in the console or UI.

---

## Scenario 6: In-Reader PDF Download Toolbar Action
- **Precondition:** Customer owns active `read_download` entitlement and opens reader.
- **Steps:**
  1. From `/my-books`, click "Continue Reading" (navigating to `/read/[bookId]/[chapterId]`).
  2. Look at the reader header navigation bar.
  3. Locate the "Download PDF" button (download tray icon) alongside Settings, Search, and Bookmarks.
  4. Click "Download PDF".
- **Expected Result:**
  - Status toast indicates "Preparing PDF download...".
  - Browser automatically downloads the correct purchased edition PDF.
  - Reader view and scroll position remain completely undisturbed.

---

## Scenario 7: Customer Order History Verification
- **Precondition:** Customer previously purchased ₹49 Read Online and subsequently completed ₹50 Upgrade.
- **Steps:**
  1. On `/my-books`, click the **"Order History"** button in the header toolbar.
  2. Inspect the orders modal list.
- **Expected Result:**
  - Both transactions appear as separate financial records:
    1. **Original Purchase**: Order #... with Plan "Read Online", Amount "₹49.00", Status "Paid".
    2. **PDF Upgrade**: Order #... with Type badge "PDF Upgrade", Plan "PDF Upgrade (+₹50)", Amount "₹50.00", Status "Paid".
  - Original ₹49 order is NOT modified or overwritten.
  - Both Razorpay payment IDs are distinct.

---

## Scenario 8: Historical / Withdrawn Edition Protection
- **Precondition:** Customer owns Edition 1 of a book. A newer Edition 2 has since been published, or Edition 1 has been withdrawn from general bookstore sales.
- **Steps:**
  1. Request download for the customer's owned book via `/api/ebooks/[bookId]/download`.
  2. Verify the downloaded file and edition metadata.
- **Expected Result:**
  - Server delivers Edition 1 (the purchased asset), NEVER Edition 2.
  - The download filename indicates edition: `${book-slug}-edition-1.pdf`.
  - Download is NOT blocked merely because the edition is unlisted from new sales.

---

## Scenario 9: Duplicate Click and Concurrent Intent Protection
- **Precondition:** Customer initiates ₹50 upgrade modal.
- **Steps:**
  1. Click "Upgrade Now — ₹50" twice in rapid succession (< 500ms).
- **Expected Result:**
  - Button is immediately disabled upon first click with loading state.
  - Server upgrade intent logic detects any pending upgrade order within a 15-minute window and returns the existing order rather than creating duplicate chargeable provider orders.
  - Only one Razorpay checkout modal opens.

---

## Scenario 10: Revocation & Truthful Error Handling
- **Precondition:** Entitlement is revoked in Supabase database (`UPDATE public.ebook_entitlements SET is_active = false WHERE ...`).
- **Steps:**
  1. Customer attempts to download PDF or upgrade.
- **Expected Result:**
  - Server immediately rejects request with HTTP 403 `ACCESS_REVOKED`.
  - User interface displays truthful notice: "Access revoked or inactive. Please contact support."
  - Underlying file in storage is NOT deleted.
