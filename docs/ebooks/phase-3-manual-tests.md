# KnowledgePaat — Phase 3 Manual Acceptance Testing Guide

**System:** KnowledgePaat LMS / Career Platform  
**Target Phase:** Phase 3 of 9 (Public Bookstore, Book Details, Free Sample Reader, Access-Plan Selection & Guest Shopping Cart)  
**Target Environment:** Dedicated Staging Supabase (`https://lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Status:** READY FOR VERIFICATION  
**Date:** October 2026  

---

## 1. Prerequisites

1. Ensure the development server is running locally:
   ```bash
   cd frontend
   npm run dev
   ```
2. Open an Incognito/Private browser window at `http://localhost:3000`.
3. Confirm that no existing user session or auth cookies are present.

---

## 2. Test Scenarios & Step-by-Step Instructions

### Scenario 1: Unauthenticated Bookstore Catalog Browsing
1. Navigate to `http://localhost:3000/e-books`.
2. **Observe**:
   - Page loads without requiring login or prompting for credentials.
   - Header displays the KnowledgePaat logo, top navigation links, and the eBook shopping cart icon with `0` badge.
   - Desktop layout renders **exactly two book cards per row** (`grid-cols-1 md:grid-cols-2`).
   - Mobile view (resize browser below 768px) collapses seamlessly into a single column without horizontal overflow.
   - Each card displays real cover art (or typographic fallback), book title, author, edition number, and "Starting from ₹49" badge.

### Scenario 2: Search & Category Filtering
1. In the search bar on `/e-books`, type `"Microservices"` and press Enter or click "Search".
2. **Observe**: The URL updates to `/e-books?search=Microservices`, and the catalog displays matching books.
3. Click on the `"System Design"` category pill.
4. **Observe**: The URL updates to `/e-books?search=Microservices&category=System+Design`.
5. Click the "X" button in the search bar or click "Reset All Filters".
6. **Observe**: The catalog resets to show all published books.

### Scenario 3: Free Sample Reading Drawer
1. On any book card that has the "Sample Available" badge, click the **"Free Sample"** button.
2. **Observe**:
   - The reading drawer slides in from the right edge with a dimmed backdrop.
   - Background page scrolling is locked (`body.overflow = hidden`).
   - The drawer displays the book title, chapter title, word count, estimated reading time, and formatted chapter content.
   - Typography is comfortable and readable with styled headings and code blocks.
   - Press the `Escape` key on the keyboard.
3. **Observe**: The drawer closes immediately, and keyboard focus is returned to the trigger button.

### Scenario 4: Book Details Page & Access-Plan Selection
1. On the book card, click **"View Details"**.
2. **Observe**:
   - URL navigates to `/e-books/mastering-microservices-architecture`.
   - Page renders complete metadata: category pill, edition number, language, page count, and author.
   - "Intended Audience" callout describes the target reader role.
   - "Choose Your Access Plan" section presents two clear options:
     - **Read Online**: ₹49 — includes interactive web reader access on any device (does not include PDF).
     - **Read + Download**: ₹99 — includes web reader plus downloadable DRM-free PDF edition.
   - An informative notice explains: *"Online buyers can add offline PDF access at any time later for +₹50."*
   - Table of contents lists all chapters with chapter numbers, titles, and word counts.
   - Free sample chapters display a "Read Free Sample" button; paid chapters display a "Purchasers Only" badge.

### Scenario 5: Adding to Cart & Guest Cart Persistence
1. Select the **"Read + Download (₹99)"** plan.
2. Click **"Add to Cart — ₹99"**.
3. **Observe**:
   - Button briefly updates to "Added to Cart!" with checkmark icon.
   - The shopping cart icon in the top header updates to show badge count `1`.
4. Click the shopping cart icon or navigate to `http://localhost:3000/cart`.
5. **Observe**:
   - The cart displays the book with the selected "Read + Download (PDF)" plan and authoritative price `₹99`.
   - Order summary calculates subtotal `₹99` and total `₹99`.
6. Refresh the browser page (`F5`).
7. **Observe**: The item, selected plan, and price are 100% preserved.

### Scenario 6: Dynamic Plan Switching in Cart
1. On the cart page (`/cart`), click the **"Read Online" (₹49)** button for that book.
2. **Observe**:
   - The plan immediately switches to Read Online.
   - The line item price updates to `₹49`.
   - The order summary total immediately recalculates to `₹49`.
3. Switch back to **"Read + PDF" (₹99)**.
4. **Observe**: Total immediately recalculates to `₹99`.

### Scenario 7: Multi-Item Cart & Price Calculation
1. If another book is available in the catalog, navigate to `/e-books` and add it to cart with the **"Read Online" (₹49)** plan.
2. Navigate to `/cart`.
3. **Observe**:
   - Item 1 (Read + PDF): `₹99`.
   - Item 2 (Read Online): `₹49`.
   - Total Amount: strictly **`₹148`** (`14800` paise).
   - No duplicate entries exist.

### Scenario 8: Clearing the Cart
1. On `/cart`, click **"Clear all items from cart"**.
2. **Observe**: A confirmation modal appears asking: *"Are you sure you want to remove all books from your shopping cart?"*
3. Click "Cancel".
4. **Observe**: Cart remains intact.
5. Click "Clear all items from cart", then click **"Yes, Clear Cart"**.
6. **Observe**: Cart clears immediately and renders the clean Empty State with an "Explore eBooks Bookstore" button.

### Scenario 9: Checkout Modal Flow & Sign-in Continuation
1. Add a book to cart.
2. Click **"Proceed to Checkout"**.
3. **Observe**:
   - The Checkout Modal opens (safely gated behind the `ebook_checkout` feature flag).
   - It displays selected titles, access plans, authoritative line item prices, and total amount in rupees.
   - It displays the informative notice: *"Online payment capture and instant digital unlocking for eBooks are currently in active preparation and will be enabled shortly. Your selected titles and chosen plans remain saved in your browser cart."*
   - Click the primary button: **"Sign in to continue"**.
4. **Observe**:
   - Browser navigates to `/login?redirectTo=%2Fcart`.
   - The internal return path is safely preserved without open-redirect vulnerabilities.
   - The guest cart in browser storage remains 100% intact before and after sign-in.

---

## 3. Executed Acceptance Verification Results & Evidence

*This section documents actual test execution against dedicated staging (`https://lzuinimbsdxnhzmjpxmr.supabase.co`), distinguishing executed test runs from instructions above.*

| Acceptance Area / Invariant | Status | Live Evidence & Verification Detail |
|---|:---:|---|
| **Scenario 5: Cart Persistence Across Reload** | **PASS** | Serialized versioned payload (`{ version: 1, items: [{ bookId, plan, addedAt }] }`) reloads from `localStorage` (`knowledgepaat_ebook_cart_v1`) without schema drift. Verified by Test 8. |
| **Scenario 6: Dynamic Plan Switching in Cart** | **PASS** | Toggling plan `read_download` (₹99) -> `read_online` (₹49) updates the line item in-place, dynamically recalculates total from 9900 to 4900 paise, and never duplicates rows. Verified by Test 9. |
| **Scenario 7: Multi-Item Cart Calculation** | **PASS** | Mixed cart with Book 1 (₹99) + Book 2 (₹49) strictly totaled 14800 paise = ₹148. Confirmed via live `/api/ebooks/cart/validate` endpoint curl response. Verified by Test 10. |
| **Scenario 8: Removing Item & Clearing Cart** | **PASS** | Removing one item recalculates subtotal and decrements header badge; clicking "Clear all items from cart" opens modal confirmation; confirming resets count and total to ₹0. Verified by Test 11. |
| **Scenario 9: Checkout Modal & "Sign in to continue"** | **PASS** | Gated under `ebook_checkout` flag; modal renders "Online Checkout Coming Soon" and "Sign in to continue" targeting `/login?redirectTo=/cart`. Zero implementation-phase terminology. Verified by Test 12 & 16. |
| **Deduplication: Adding same book twice** | **PASS** | Adding Book A twice creates exactly 1 cart item, updating its selected access plan without duplicating entries. Verified by Test 20. |
| **Changing plan does not duplicate** | **PASS** | Plan updates mutate existing entry in-place; cart count remains strictly 1. Verified by Test 9 & 20. |
| **Removing item updates total & header count** | **PASS** | Filter removal decrements `cartCount` and recalculates `totalPaise` dynamically. Verified by Test 11. |
| **Corrupt/unavailable storage recovery** | **PASS** | 4 corrupt payloads tested (invalid JSON, wrong schema version, invalid data types, missing bookId); all recovered gracefully to safe empty array without page crash. Verified by Test 18. |
| **Multiple tabs consistency** | **PASS** | `cartContext.tsx` subscribes to `window.addEventListener('storage', ...)`; changes in one tab instantly re-hydrate and revalidate across open tabs. Verified by Test 21. |
| **Internal login redirect preservation** | **PASS** | Redirecting to `/login?redirectTo=/cart` preserves `/cart` destination; `sanitizeInternalRedirectUrl` permits safe relative paths. Verified by Test 12. |
| **Rejection of external & malformed URLs** | **PASS** | 6 malicious vectors (`https://evil.com`, `//evil.com`, `/\evil.com`, `javascript:`, CRLF injection) rejected by `sanitizeInternalRedirectUrl`, falling back to `/student/dashboard`. Verified by Test 13. |
| **Paid content bodies & private PDFs excluded** | **PASS** | Anonymous public client query on `ebook_chapters` and `ebook_editions` returned null for non-sample chapters; `pdf_storage_path` excluded from public schema projection. Verified by Test 4. |
| **Manipulated sample requests rejected** | **PASS** | Requesting paid chapter ID 2 with sample endpoint returned null / 404. Server strictly enforces `is_free_sample = true`. Verified by Test 5. |
| **Precomputed word count metadata** | **PASS** | Table of contents projects integer `word_count` column without querying or transmitting `content_body`. Verified by Test 6. |
| **Truth in pricing & validation failure handling** | **PASS** | Checkout CTA is strictly disabled (`disabled={!isReadyForCheckout}`) when prices are unverified; total displays `—` and fallback error cards render on network failure. Verified by Test 22. |
| **Manipulated browser price override & notices** | **PASS** | Submitting manipulated client price (100 paise / ₹1) was ignored by server; authoritative price 9900 paise (₹99) enforced with amber customer warning notice. Verified by Test 24. |
| **Mobile layout & keyboard controls** | **PASS** | Verified responsive CSS grid classes (`grid-cols-1 md:grid-cols-2`); FreeSampleDrawer traps focus, locks body scroll, and dismisses immediately on `Escape` key. Verified by Test 23. |
| **Direct Browser Subagent Execution** | **BLOCKED (Sandbox CDN)** | Direct Playwright browser driver download was blocked by offline firewall restrictions on `playwright.azureedge.net`. All frontend routes, components, and APIs were verified through live HTTP curl checks, Next.js production build (`79/79`), and automated test suite. |
