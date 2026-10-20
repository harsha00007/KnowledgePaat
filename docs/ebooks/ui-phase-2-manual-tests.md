# KnowledgePaat — UI Enhancement Phase 2: Manual Test Procedures & QA Workbook
**Separate eBook Section, Dedicated Bookstore Navigation, and Authentication Return Paths**

**Target System:** KnowledgePaat LMS & Technical Bookstore ([https://www.knowledgepaat.com](https://www.knowledgepaat.com))  
**Target Phase:** UI Enhancement Phase 2 of 4  
**Environment:** Staging Supabase `lzuinimbsdxnhzmjpxmr`  
**Test Base URL:** `http://localhost:3000` (or staging deployment)  
**Test Accounts:**
- **Student User:** `student@knowledgepaat.test` / `StudentPassword@2026!`
- **Admin User:** `admin@knowledgepaat.test` / `AdminPassword@2026!`

---

## Test Scenarios Overview

| Scenario | Objective | Target Roles | Verification Status |
| :--- | :--- | :--- | :---: |
| **Scenario A** | Anonymous Visitor Navigation from Main Site to Bookstore & Cart | Anonymous | ✅ PASS |
| **Scenario B** | Guest Cart Persistence across Authentication Return Path | Anonymous -> Student | ✅ PASS |
| **Scenario C** | Protected Digital Bookshelf (`/my-books`) Redirect & Return | Anonymous -> Student | ✅ PASS |
| **Scenario D** | Signed-In Student Non-Interfering Bookstore Navigation | Student | ✅ PASS |
| **Scenario E** | Bookstore Brand Logo Return to Main Platform Homepage | Any | ✅ PASS |
| **Scenario F** | Browser Navigation (Back / Forward / Refresh / Deep Link) | Any | ✅ PASS |
| **Scenario G** | Mobile Navigation Drawer & Keyboard Accessibility | Mobile / Screen Reader | ✅ PASS |
| **Scenario H** | Open-Redirect & Parameter Manipulation Security Boundary | Security Tester | ✅ PASS |

---

## Scenario A: Anonymous Visitor Bookstore Navigation Flow

### Steps:
1. Open an incognito browser window and navigate to the platform homepage: `http://localhost:3000/`.
2. Inspect the main header:
   - Verify the "E-Books" button (`id="main-nav-ebooks-btn"`) is visible directly beside the hamburger menu.
   - Verify the shopping cart icon is **not** present in the main platform header.
   - Click the "E-Books" button.
3. Observe URL changes to `http://localhost:3000/e-books`.
4. Inspect the eBook header:
   - Brand logo links to `/`.
   - "eBooks" badge links to `/e-books`.
   - Links: "Store Home", "Browse Books", "Categories", "My Books".
   - Top-right controls: Search icon, Cart button with 0 count, "Sign In" button.
5. Click "Browse Books":
   - Page scrolls smoothly down to the `#catalogue` anchor.
6. Click "View Details" on any published book.
   - URL opens `/e-books/[bookId]`.
   - Layout retains `EBookLayout` with eBook header and footer.
   - Click "Read Online" or "Add to Cart".
7. Click the Shopping Cart button in the eBook header.
   - URL opens `/cart`.
   - Cart renders selected plan and item with authoritative price.

### Expected Result:
- Seamless transition from main platform to bookstore.
- No login prompt encountered during browsing, reading samples, or managing guest cart.
- No duplicate headers or broken links.

---

## Scenario B: Guest Shopping Cart & Sign-In Preservation

### Steps:
1. As an anonymous visitor on `http://localhost:3000/e-books`, add a book to the cart.
2. Note the cart badge increments to 1.
3. Click "Sign In" in the eBook header.
4. Verify destination URL: `http://localhost:3000/login?redirectTo=%2Fe-books`.
5. Enter credentials:
   - Email: `student@knowledgepaat.test`
   - Password: `StudentPassword@2026!`
6. Submit the login form.
7. Observe post-login redirection.
8. Verify current URL is `http://localhost:3000/e-books` (not `/student/dashboard`).
9. Inspect the shopping cart badge in the eBook header.

### Expected Result:
- Cart count remains 1.
- Opening `/cart` confirms the previously added book and selected plan are intact.
- Header displays student controls ("Dashboard", "Log Out") instead of "Sign In".

---

## Scenario C: Protected Digital Bookshelf (`/my-books`) Redirect & Return

### Steps:
1. Open an incognito window (anonymous state).
2. Directly visit `http://localhost:3000/my-books` or click "My Books" in the eBook header.
3. Observe immediate HTTP 307 redirect to:
   `http://localhost:3000/login?redirectTo=%2Fmy-books`.
4. Sign in with student credentials (`student@knowledgepaat.test` / `StudentPassword@2026!`).
5. Observe post-login redirection.
6. Verify landing URL is `http://localhost:3000/my-books`.

### Expected Result:
- Redirection safely preserves the `/my-books` destination.
- Student bookshelf loads cleanly inside `EBookLayout`.
- Student can start reading or upgrade editions.

---

## Scenario D: Signed-In Student Non-Interfering Bookstore Navigation

### Steps:
1. As a signed-in student, navigate directly to `http://localhost:3000/e-books`.
2. Verify page loads with HTTP 200 without redirecting to `/student/dashboard`.
3. Filter by category, use search bar, and inspect book details.
4. Click "Shopping Cart" -> loads `/cart` without dashboard redirection.
5. Click "Checkout" -> loads `/checkout` without dashboard redirection.
6. Click "Dashboard" in the header -> navigates to `/student/dashboard`.

### Expected Result:
- Signed-in students have unrestricted browsing throughout the bookstore.
- Middleware only routes to dashboard when visiting the root marketing page `/` or bare `/login`.

---

## Scenario E: Bookstore Brand Logo Return to Main Platform Homepage

### Steps:
1. From any bookstore page (`/e-books`, `/cart`, `/my-books`), click the KnowledgePaat logo in the top-left of the eBook header.
2. Observe navigation to `http://localhost:3000/`.
3. Scroll to the footer of any bookstore page and click "← Back to KnowledgePaat Platform Home".
4. Observe navigation to `http://localhost:3000/`.

### Expected Result:
- Both links immediately return the user to the main platform homepage (`/`).
- Main platform homepage renders `PublicLayout` with the "E-Books" button and no cart icon.

---

## Scenario F: Browser Navigation (Back / Forward / Refresh / Deep Link)

### Steps:
1. Navigate: `/` → `/e-books` → `/e-books/[bookId]` → `/cart`.
2. Press Browser Back 3 times:
   - Verify `/e-books/[bookId]` uses `EBookLayout`.
   - Verify `/e-books` uses `EBookLayout`.
   - Verify `/` uses `PublicLayout`.
3. Press Browser Forward 2 times.
4. On `/e-books/[bookId]`, press Browser Refresh (F5 / Cmd+R).
5. Verify page renders identical layout, content, and cart badge.
6. Paste direct deep link into new tab: `http://localhost:3000/cart`.

### Expected Result:
- Correct layout is preserved across all browser history transitions and full page refreshes.
- Zero layout jitter, flashing, or simultaneous headers.

---

## Scenario G: Mobile Navigation Drawer & Keyboard Accessibility

### Steps:
1. Set viewport to 390x844 (Mobile).
2. Navigate to `http://localhost:3000/e-books`.
3. Inspect mobile header:
   - Single brand logo, "eBooks" badge, search button, cart button, and hamburger toggle.
   - Verify no horizontal scrollbar or overflow.
4. Press Tab to focus hamburger menu button, press Enter.
5. Verify drawer opens:
   - Dimmed backdrop overlay appears.
   - Search input, bookstore links, categories, My Books, and account actions are visible.
   - Screen reader attributes: `role="dialog"`, `aria-modal="true"`, `aria-expanded="true"`.
6. Press `Escape` key.
   - Drawer dismisses cleanly.
   - Keyboard focus returns automatically to the hamburger toggle button.
7. Open drawer again, click the "X" close button (`data-close-btn`).
   - Drawer dismisses cleanly.

### Expected Result:
- 100% keyboard accessible, zero horizontal overflow, compliant screen reader announcement attributes.

---

## Scenario H: Open-Redirect & Parameter Manipulation Security Boundary

### Steps:
1. Test open-redirect candidate with external domain:
   `http://localhost:3000/login?redirectTo=https://attacker-site.com/phish`
2. Authenticate as student.
3. Observe landing destination.
4. Test protocol-relative URL:
   `http://localhost:3000/login?redirectTo=//attacker-site.com`
5. Test backslash-relative URL:
   `http://localhost:3000/login?redirectTo=/\attacker-site.com`
6. Test Javascript pseudo-protocol:
   `http://localhost:3000/login?redirectTo=javascript:alert(1)`

### Expected Result:
- `sanitizeInternalRedirectUrl` rejects all external/malformed redirect candidates.
- In each case, the system safely falls back to `/student/dashboard`.
- Zero open-redirect or XSS vulnerabilities.

---

## Summary of QA Deliverables & Evidence Artifacts

| Artifact Name | Path | Description |
| :--- | :--- | :--- |
| **Main Header Screenshot** | `screenshots/ui_phase2_main_header_with_ebooks.png` | Desktop header at `/` showing "E-Books" button and removed cart |
| **eBook Desktop Header** | `screenshots/ui_phase2_ebook_desktop_header.png` | Dedicated eBook header at `/e-books` with all destinations |
| **Categories Dropdown** | `screenshots/ui_phase2_ebook_categories_dropdown.png` | Topic filter dropdown expanded on desktop |
| **eBook Footer** | `screenshots/ui_phase2_ebook_footer.png` | Dedicated bookstore 4-column footer and social links |
| **Cart Page** | `screenshots/ui_phase2_cart_page_ebook_layout.png` | `/cart` rendered within `EBookLayout` |
| **My Books** | `screenshots/ui_phase2_my_books_ebook_layout.png` | `/my-books` rendered within `EBookLayout` |
| **Mobile Header** | `screenshots/ui_phase2_mobile_header_closed.png` | 390px mobile viewport header |
| **Mobile Drawer Open** | `screenshots/ui_phase2_mobile_drawer_open.png` | Slide-in drawer with search, categories, and account card |
| **Automated Test Suite** | `frontend/scripts/test_ui_phase2_suite.ts` | 32-check programmatic verification suite (100% pass) |
| **Screenshot Script** | `frontend/scripts/capture_phase2_screenshots.ts` | Headless Chrome automated capture script |
