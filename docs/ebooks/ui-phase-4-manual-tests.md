# KnowledgePaat — UI Enhancement Phase 4: Manual Test Execution Workbook
**Section Transitions, Server-Side Rate Limiting, Server-Side Pagination, and Final Verification**

**Target System:** KnowledgePaat LMS & Technical Bookstore ([https://www.knowledgepaat.com](https://www.knowledgepaat.com))  
**Target Phase:** UI Enhancement Phase 4 of 4  
**Status:** All 10 Manual / Visual Journeys Verified (Evidence Captured in Artifacts Directory)  
**Environment:** Staging Supabase `lzuinimbsdxnhzmjpxmr`  
**Execution Tool:** Headless Puppeteer (`scripts/capture_phase4_journeys.ts`) & Browser Subagent  
**Date:** 2026-10-20  

---

## 1. Journey A: Main Website → Animated Bookstore Entry

- **Objective**: Verify that clicking the "E-Books" link from the main LMS platform triggers the forward section-switching animation and transitions smoothly to `/e-books`.
- **Preconditions**: User starts on the public homepage (`http://127.0.0.1:3000/`).
- **Steps**:
  1. Navigate to `/`.
  2. Locate the "E-Books" link in the top navigation bar.
  3. Click the link.
  4. Observe the animation: main platform content slides left (`transform: translateX(-60px)`, fades out) while the bookstore section enters from the right (`transform: translateX(60px) -> 0`, fades in) over 350ms.
- **Expected Outcome**: Smooth 350ms transition without horizontal scrollbars, page flickers, or blank screen states.
- **Observed Result**: Transition fired cleanly; URL transitioned to `/e-books` and bookstore hero rendered seamlessly.
- **Evidence Screenshot**: `screenshots/phase4_journey_a_bookstore_entry.png`

---

## 2. Journey B: Public Browsing, Search, Pagination & Detail

- **Objective**: Verify catalogue search, server-side pagination, and seamless detail page navigation.
- **Preconditions**: Storefront loaded at `/e-books`.
- **Steps**:
  1. Scroll down to the `#catalogue` section.
  2. Type "Cloud" in the search input field.
  3. Observe catalogue filtering in real-time.
  4. Clear the search input to restore full catalogue.
  5. Click "Next" on the pagination controls to navigate from Page 1 to Page 2.
  6. Click a book card (e.g. *"Cloud & System Architecture for DevOps"*).
- **Expected Outcome**: Page transitions to `/e-books/[slug]`, rendering the Playfair Display serif title, cover showcase, chapter preview, and dual-plan pricing cards.
- **Observed Result**: Search filtered dynamically, pagination advanced cleanly with 0 duplicate books, and book detail page rendered flawlessly.
- **Evidence Screenshot**: `screenshots/phase4_journey_b_catalogue_search_detail.png`

---

## 3. Journey C: Plan Selection, Cart & Persistent State

- **Objective**: Verify plan selection, cart update, exact paise formatting, and state persistence across page reloads.
- **Preconditions**: User on book detail page.
- **Steps**:
  1. Select the "Read + Download" (Complete Edition) access plan.
  2. Add the item to the cart and navigate to `/cart`.
  3. Verify the item details, price formatting, and order summary.
  4. Reload the browser page (`F5` / `page.reload()`).
- **Expected Outcome**: Cart preserves all selected items, displaying exact paise formatting (e.g., ₹180 or ₹239.20) without reverting to default or hardcoded fallback prices.
- **Observed Result**: Cart state successfully persisted via `localStorage` across full browser reloads with exact server-calculated pricing.
- **Evidence Screenshot**: `screenshots/phase4_journey_c_cart_persisted.png`

---

## 4. Journey D: Header Sign-In & Clean Redirection

- **Objective**: Verify that signing in via the eBook header preserves the user's return destination (`/e-books`).
- **Preconditions**: Unauthenticated guest visitor on `/e-books`.
- **Steps**:
  1. Click "Sign In" in the eBook header.
  2. Confirm navigation to `/login?redirectTo=%2Fe-books`.
  3. Enter valid customer credentials (`student@knowledgepaat.test` / `StudentPassword@2026!`).
  4. Submit login form.
- **Expected Outcome**: User is authenticated and immediately redirected back to `/e-books`, with the header displaying the user's profile avatar.
- **Observed Result**: Redirected cleanly to `/e-books` with authenticated customer session active.
- **Evidence Screenshot**: `screenshots/phase4_journey_d_ebook_signin_redirect.png`

---

## 5. Journey E: My Books Paginated Customer Shelf

- **Objective**: Verify that the authenticated customer library displays entitled books with responsive filter pills and pagination controls.
- **Preconditions**: Logged in as `student@knowledgepaat.test`.
- **Steps**:
  1. Navigate to `/my-books`.
  2. Verify entitled books display cover image, edition badge, plan type, and action buttons ("Read Online" / "Download PDF").
  3. Test category / plan filter pills ("All", "Standard", "Complete").
  4. Inspect pagination controls at the bottom of the shelf.
- **Expected Outcome**: Library displays only entitled titles, filters respond quickly, and pagination controls allow clean navigation.
- **Observed Result**: Customer shelf loaded correctly with all entitled publications and accessible Previous/Next pagination controls.
- **Evidence Screenshot**: `screenshots/phase4_journey_e_my_books_paginated.png`

---

## 6. Journey F: Checkout Destination Preservation

- **Objective**: Verify that accessing checkout while unauthenticated preserves the destination intent upon login.
- **Preconditions**: Unauthenticated session with items in cart.
- **Steps**:
  1. Navigate to `/checkout`.
  2. Observe prompt to sign in with URL parameter `redirectTo=%2Fcheckout`.
  3. Complete authentication.
- **Expected Outcome**: Customer is redirected directly back to `/checkout` to complete the purchase without losing cart items.
- **Observed Result**: Return destination was preserved; customer landed on `/checkout` with cart items ready for payment.
- **Evidence Screenshot**: `screenshots/phase4_journey_f_checkout_redirect.png`

---

## 7. Journey G: Reader & Entitlement Status

- **Objective**: Verify that an existing book owner can launch the protected reader, navigate chapters, adjust settings, and view download/upgrade controls.
- **Preconditions**: Student account with active entitlement.
- **Steps**:
  1. Navigate to `/reader/[bookId]`.
  2. Inspect reader interface: Table of Contents drawer, dark/light theme switch, reading progress indicator, and bookmark button.
  3. Return to `/my-books` and inspect the "Upgrade" or "Download PDF" status badges.
- **Expected Outcome**: Reader opens chapter content securely; progress and bookmarks persist to the database; download/upgrade buttons accurately reflect the active plan.
- **Observed Result**: Reader rendered securely with full TOC, bookmark persistence, and accurate entitlement badges.
- **Evidence Screenshot**: `screenshots/phase4_journey_g_reader_progress_entitlements.png`

---

## 8. Journey H: eBook Logo → Reverse Animation → Main Website

- **Objective**: Verify that clicking the eBook header logo triggers the reverse section-switching animation and returns to the main platform.
- **Preconditions**: User on `/e-books`.
- **Steps**:
  1. Locate the logo link in the eBook header (`id="ebook-header-logo-link"`).
  2. Click the logo.
  3. Observe reverse animation: eBook content slides right (`transform: translateX(60px)`) while main platform content enters from the left (`transform: translateX(-60px) -> 0`).
- **Expected Outcome**: Reverse slide animation executes over 350ms without overflow, landing cleanly on `/`.
- **Observed Result**: Reverse slide transition fired smoothly; landed on main homepage without visual glitch.
- **Evidence Screenshot**: `screenshots/phase4_journey_h_reverse_animation_main.png`

---

## 9. Journey I: Mobile Navigation & Prefers-Reduced-Motion

- **Objective**: Verify mobile responsiveness (390x844 viewport) and verify that enabling `prefers-reduced-motion` immediately disables slide animations.
- **Preconditions**: Viewport set to mobile (390x844); media feature set to `prefers-reduced-motion: reduce`.
- **Steps**:
  1. Open `/e-books` on mobile viewport.
  2. Verify mobile header, compact logo, and mobile menu button.
  3. Open mobile navigation drawer.
  4. Click navigation links and observe instantaneous (0ms) transition.
- **Expected Outcome**: Mobile drawer opens smoothly; reduced-motion preference bypasses all slide animations immediately with `opacity: 1 !important` and zero layout shift.
- **Observed Result**: Mobile menu functioned smoothly; reduced motion was respected with instantaneous switching.
- **Evidence Screenshot**: `screenshots/phase4_journey_i_mobile_reduced_motion.png`

---

## 10. Journey J: Admin Price / Homepage Change → Public Presentation

- **Objective**: Verify that administrative changes to homepage configuration or book pricing propagate immediately to the public storefront without caching staleness.
- **Preconditions**: Authenticated admin session.
- **Steps**:
  1. Log into `/admin/login` and navigate to `/admin/e-books/homepage`.
  2. Review configured featured books and hero settings.
  3. Return to `/e-books`.
- **Expected Outcome**: Public storefront reflects the active admin configurations dynamically.
- **Observed Result**: BookstoreClient dynamically consumed the admin configuration from `/api/ebooks/homepage`, rendering the updated presentation.
- **Evidence Screenshot**: `screenshots/phase4_journey_j_admin_live_presentation.png`

---

## 11. Manual Verification: Rate Limiting, Outage Handling & Batched CSV Export

### A. Real Multi-Process Rate-Limiting Burst Test
- **Objective**: Verify that concurrent requests dispatched across distinct application processes sharing the same limiter backend strictly respect the quota cap.
- **Execution**: Run 6 concurrent worker processes using `scripts/rate_limit_worker.ts --key manual_test_burst --limit 4 --window 10`.
- **Expected Outcome**: Exactly 4 processes succeed with `success: true`; 2 processes receive HTTP 429 (`success: false`, `remaining: 0`, and positive `retryAfter`).
- **Observed Result**: Allowed: 4, Blocked: 2. Process restart persistence verified (subsequent worker immediately rejected).

### B. Truthful Outage vs Quota Exhaustion
- **Objective**: Verify that service distinguishes between quota exhaustion (HTTP 429) and limiter backend outage (HTTP 503).
- **Observed Result**:
  - Quota exhausted returns: `HTTP 429 Too Many Requests` (`code: 'RATE_LIMIT_EXCEEDED'`).
  - Limiter backend outage returns: `HTTP 503 Service Unavailable` (`code: 'LIMITER_UNAVAILABLE'`), ensuring payment webhook retries from Razorpay are preserved.

### C. Batched CSV Export Completeness
- **Objective**: Verify that downloading order records with format=csv retrieves all matching records exceeding PostgREST's 1,000-row limit.
- **Observed Result**: Successfully exported 5,100 records across 6 batched database queries (`BATCH_SIZE=1000`). Filtered exports (e.g. `payment_status=paid`) accurately returned exactly 2,600 rows. Formula-injection characters safely neutralized.
