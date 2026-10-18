# KnowledgePaat — Phase 6 Manual Test Guide: Protected eBook Reader, Progress, Bookmarks & Search

**Target Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Application URL:** `http://localhost:3000`  
**Test Customer Credentials:** `STAGING_TEST_CUSTOMER_EMAIL` / `STAGING_TEST_CUSTOMER_PASSWORD` (configured in `.env.local`)  
**Feature Flag Status:** `ebook_reader: true`, `ebook_checkout: true`, `ebook_pdf_download: false`  

---

## Scenario 1: Unauthenticated Visitor Reader Gate
- **Precondition:** Visitor is not signed in.
- **Steps:**
  1. Navigate directly to `/read/mastering-microservices-architecture` in an incognito window.
- **Expected Result:**
  - Browser immediately redirects to `/login?redirectTo=/read/mastering-microservices-architecture`.
  - Paid content is never sent or rendered in HTML markup.

---

## Scenario 2: Verified User Without Ownership
- **Precondition:** User is signed in with an account that has not purchased the book.
- **Steps:**
  1. Sign in as an account with no entitlement for the book.
  2. Navigate directly to `/read/mastering-microservices-architecture`.
- **Expected Result:**
  - Friendly access restricted screen is displayed: "Reading Access Required: You do not own an active online reading license for this book."
  - Buttons presented: "View in Bookstore" (links to `/e-books/...`) and "Return to My Books".
  - Protected chapters cannot be retrieved via browser network tab (`403 Forbidden`).

---

## Scenario 3: Entitled Customer Start & Continue Reading
- **Precondition:** Signed in as `STAGING_TEST_CUSTOMER_EMAIL` (owns *Mastering Microservices Architecture*).
- **Steps:**
  1. Navigate to `/my-books`.
  2. Verify *Mastering Microservices Architecture* appears on shelf with "Read + Download" badge.
  3. Click "Start Reading" (or "Continue Reading").
- **Expected Result:**
  - Navigates to `/read/mastering-microservices-architecture`.
  - Automatically resolves customer's purchased edition and redirects to the appropriate chapter.
  - Reader header displays book title "Mastering Microservices Architecture", edition badge, and chapter title.
  - Heading is Deep Navy (`#0B1D3A`) and controls are Royal Blue (`#2563EB`).

---

## Scenario 4: Chapter Navigation & Table of Contents
- **Steps:**
  1. On the reader top navigation bar, click the "Contents" button (or hamburger menu on mobile).
  2. Verify the chapter drawer opens from the left.
  3. Inspect the list: Chapter 1 shows "Free Sample" badge, Chapter 2 and Chapter 3 are listed. Active chapter is highlighted in Royal Blue.
  4. Click "Chapter 2: Distributed Transactions & The Saga Pattern".
  5. Scroll to the bottom of the chapter and verify "Previous Chapter" (Chapter 1) and "Next Chapter" (Chapter 3) buttons.
  6. Click "Next Chapter".
- **Expected Result:**
  - Reader smoothly transitions to Chapter 3.
  - On the final chapter, bottom navigation displays: "You have completed this book!" in emerald.

---

## Scenario 5: Debounced Progress Tracking & Session Restoration
- **Steps:**
  1. Scroll down Chapter 2 to approximately 65%.
  2. Observe the status indicator in the top header.
  3. Verify status changes to "Saving…" (with teal pulse) and then "Saved" (with mint checkmark).
  4. Reload the browser page (`Ctrl+R` / `F5`).
- **Expected Result:**
  - Browser restores scroll position to the saved reading location.
  - Navigating back to `/my-books` shows reading progress bar updated to ~65%.
  - The shelf button now displays "Continue Reading".

---

## Scenario 6: Bookmarks Management
- **Steps:**
  1. While reading Chapter 2 at 50% scroll, click the Bookmark icon in the header.
  2. Verify the icon turns into a filled Royal Blue bookmark checkmark.
  3. Click the Layers / Bookmarks drawer icon in the header.
  4. Verify the drawer lists the new bookmark with chapter title and scroll position.
  5. Navigate to Chapter 1, then click the saved bookmark in the drawer.
- **Expected Result:**
  - Reader immediately returns to Chapter 2 at the bookmarked position.
  - Clicking the "X" button next to the bookmark in the drawer deletes the bookmark.

---

## Scenario 7: In-Book Keyword Search
- **Steps:**
  1. Click the magnifying glass Search icon in the header (or press `Ctrl+K`).
  2. Type `Saga` into the search box and press Enter or click Search.
  3. Inspect search results.
- **Expected Result:**
  - Search returns matching chapters with contextual snippets.
  - Clicking a search result jumps directly to that chapter.
  - Searching for queries shorter than 2 characters displays a friendly length guidance notice.

---

## Scenario 8: Display Preferences (Themes, Fonts, Widths)
- **Steps:**
  1. Click the Settings icon in the header.
  2. Under **Theme**, click "Sepia". Verify background turns warm parchment (`#FBF0D9`) and text turns warm brown (`#5F4B32`).
  3. Click "Dark". Verify background turns Deep Navy (`#0B1D3A`) and text turns slate/white.
  4. Under **Text Size**, select "XL". Verify font scale increases for comfortable reading.
  5. Under **Typography**, select "Serif". Verify serif typeface applies.
  6. Under **Column Width**, select "Narrow". Verify reading column adjusts.
  7. Reload page.
- **Expected Result:**
  - Customer preferences persist in PostgreSQL across reloads and sessions.

---

## Scenario 9: Code Blocks Copy Control
- **Steps:**
  1. Locate a code block in the chapter.
  2. Hover over the top-right corner of the code block.
  3. Click the "Copy" button.
- **Expected Result:**
  - Button text briefly turns to "Copied!".
  - Code text is placed on system clipboard without HTML artifacts or line numbers.

---

## Scenario 10: XSS Script Injection Protection
- **Steps:**
  1. Inspect the DOM in dev tools for rendered content containing `<script>`, `onerror=`, or `javascript:`.
- **Expected Result:**
  - All script elements and executable attributes are completely stripped.
  - Links with `javascript:` are neutralized to `#`.
  - Normal hyperlinks (`https://...`) open safely in new tabs with `rel="noopener noreferrer"`.

---

## Scenario 11: Mobile Chapter Drawer & Responsive Layout
- **Steps:**
  1. Resize browser window to mobile width (< 768px) or use Chrome DevTools device mode.
  2. Verify desktop sidebar collapses and mobile header displays hamburger button.
  3. Click hamburger button to open mobile navigation drawer.
  4. Click outside the drawer on the backdrop.
- **Expected Result:**
  - Drawer closes smoothly without layout jumping.
  - Header controls (Search, Bookmarks, Theme Aa) remain comfortably accessible on small touchscreens.

---

## Scenario 12: Keyboard Focus & Escape Handling
- **Steps:**
  1. Open the search modal (`Ctrl+K` or clicking search icon).
  2. Verify focus is automatically trapped inside the search input.
  3. Press the `Escape` key on the keyboard.
  4. Open the Table of Contents drawer or Display Settings popover.
  5. Press `Escape`.
- **Expected Result:**
  - Modals, drawers, and popovers close immediately upon pressing `Escape`.

---

## Scenario 13: Sign-out / Account-Switch Isolation
- **Steps:**
  1. While signed in as Customer 1, customize display preferences to Dark theme and XL font size.
  2. Click user profile in header and select "Sign Out".
  3. Sign in as Customer 2 (who has default preferences).
  4. Navigate to `/read/...`.
- **Expected Result:**
  - Customer 2 does not inherit Customer 1's Dark/XL preferences.
  - Customer 2's reading progress and bookmarks are completely separate.

---

## Scenario 14: Save Failure & Retry Handling
- **Steps:**
  1. Open reader and scroll down.
  2. In browser dev tools, toggle "Offline" in the Network tab.
  3. Scroll down further to trigger debounced progress save.
  4. Observe header indicator.
  5. Re-enable network in DevTools and click the "Save failed (Retry)" button in the header.
- **Expected Result:**
  - When offline, status changes to "Save failed (Retry)" in rose without blocking reading.
  - When reconnected and clicked, status transitions to "Saving…" → "Saved" (in emerald).
