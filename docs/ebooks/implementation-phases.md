# KnowledgePaat — Phase 1: 9-Phase Implementation Roadmap
**Target Application:** KnowledgePaat ([https://www.knowledgepaat.com](https://www.knowledgepaat.com))  
**Architectural Blueprint:** End-to-End eBook Commerce & Protected Reader Subsystem  
**Status:** Approved Roadmap  
**Date:** October 2026  

---

## Roadmap Overview

```mermaid
graph TD
    P1[Phase 1: Audit & Integration Design] --> P2[Phase 2: Book Admin & Content Management]
    P2 --> P3[Phase 3: Public Storefront & Cart]
    P3 --> P4[Phase 4: Identity & Customer Library]
    P4 --> P5[Phase 5: Checkout, Payments & Unlocking]
    P5 --> P6[Phase 6: Protected Online Reader]
    P6 --> P7[Phase 7: PDF Downloads & Upgrades]
    P7 --> P8[Phase 8: Admin Operations, Refunds & Finance]
    P8 --> P9[Phase 9: E2E Validation & Launch]
```

---

## Phase 1: Repository Audit & Integration Design (CURRENT PHASE)
- **Scope & Dependencies**: Read all repository configurations, inspect existing payment, storage, auth, and database modules. Create foundational architectural blueprints.
- **Likely Files / Modules Affected**:
  - `docs/ebooks/phase-1-audit.md`
  - `docs/ebooks/integration-design.md`
  - `docs/ebooks/implementation-phases.md`
  - `docs/ebooks/phase-2-checklist.md`
- **Database Changes**: None. Zero schema changes during Phase 1.
- **Customer & Admin Behaviors**: No production data or live traffic impacted.
- **Loading, Empty, Error & Recovery States**: N/A (Documentation phase).
- **Appropriate Tests**:
  - `npx tsc --noEmit` (TypeScript pass)
  - `npm run build` (Turbopack production build pass)
  - `npx -y tsx scripts/test_razorpay_integration.ts` (Payment test suite pass)
  - `npx -y tsx scripts/test_deep_security_audit.ts` (Security audit pass)
- **Manual Acceptance Checks**:
  - Verify all 4 documents exist and link to verified file paths.
- **Definition of Done**: Technical feasibility verified, architectural contracts specified, and stakeholder roadmap approved.

---

## Phase 2: Book Administration & Content Management
- **Scope & Dependencies**: Establish database schema (`ebooks`, `ebook_editions`, `ebook_chapters`), configure Supabase storage buckets (`ebook-covers`, `ebook-pdfs`), and build admin interfaces for book creation, chapter authoring, sample chapter toggling, and PDF uploads.
- **Likely Files / Modules Affected**:
  - `supabase/migrations/supabase_ebook_schema_setup.sql`
  - `frontend/layouts/AdminLayout.tsx` (Add navigation items)
  - `frontend/app/admin/e-books/page.tsx` (Book list)
  - `frontend/app/admin/e-books/new/page.tsx` (Book creation)
  - `frontend/app/admin/e-books/[bookId]/edit/page.tsx` (Book editor & edition management)
  - `frontend/app/admin/e-books/[bookId]/editions/[editionId]/chapters/page.tsx` (Chapter authoring)
  - `frontend/app/api/admin/ebooks/route.ts` & sub-routes
  - `frontend/app/api/admin/ebooks/[bookId]/upload/route.ts`
- **Database Changes**:
  - Create tables: `ebooks`, `ebook_editions`, `ebook_chapters`, `ebook_audit_logs`.
  - Create Supabase storage buckets: `ebook-covers` (public) and `ebook-pdfs` (private).
- **Customer & Admin Behaviors**:
  - Admin can log into `/admin/login`, navigate to "eBooks", create a book, upload a cover image, define editions, author chapters in a rich text/Markdown editor, mark chapters as "Free Sample", and upload the publication PDF.
  - Public customers do not see unfinished drafts.
- **Loading, Empty, Error & Recovery States**:
  - Loading: Skeleton table loaders on book lists.
  - Empty: Clean empty state using `EmptyState.tsx` prompting admin to create their first eBook.
  - Error: Upload validation errors (reject non-PDF files or files > 100MB).
  - Recovery: Form state preservation during network interruptions.
- **Appropriate Tests**:
  - `frontend/scripts/test_ebook_admin_management.ts`: Verify CRUD, file validations, chapter ordering constraints, and admin role enforcement.
- **Manual Acceptance Checks**:
  - Create an eBook titled *"Mastering Full-Stack Engineering"*, author 3 chapters, mark Chapter 1 as free sample, upload a test PDF, and verify private storage permissions.
- **Definition of Done**: Admin can create, edit, reorder, preview, and archive books, editions, and chapters with verified database persistence.

---

## Phase 3: Public Storefront & Cart
- **Scope & Dependencies**: Build the public-facing bookstore catalog (`/e-books`), individual book detail pages (`/e-books/[bookId]`), free sample reading drawer/modal, and an unauthenticated guest shopping cart (`/cart`).
- **Likely Files / Modules Affected**:
  - `frontend/layouts/PublicLayout.tsx` (Add "eBooks" to navigation and cart count badge)
  - `frontend/app/e-books/page.tsx` (Catalog grid: 2 cards per row on desktop)
  - `frontend/app/e-books/[bookId]/page.tsx` (Detail view, TOC, pricing comparison)
  - `frontend/app/cart/page.tsx` (Cart page)
  - `frontend/hooks/useEBookCart.ts` (Client-side localStorage cart hook)
  - `frontend/components/SampleReaderDrawer.tsx` (Free chapter preview drawer)
  - `frontend/app/api/ebooks/route.ts`
  - `frontend/app/api/ebooks/[bookId]/route.ts`
  - `frontend/app/api/ebooks/[bookId]/sample/[chapterId]/route.ts`
- **Database Changes**: None. Uses existing tables populated in Phase 2.
- **Customer & Admin Behaviors**:
  - Public visitors (no login required) can browse the catalog, read descriptions, view tables of contents, open and read free sample chapters, select either "Read Online (₹49)" or "Read + Download (₹99)", and add items to cart.
  - Enforces 1 item per book (no quantity selector). Allows different books to have different plans in the same cart.
- **Loading, Empty, Error & Recovery States**:
  - Loading: Shimmer book card skeletons.
  - Empty: Empty cart state with "Explore Books" button.
  - Error: 404 page if invalid book ID requested.
  - Recovery: Cart persists across browser refreshes via `localStorage`.
- **Appropriate Tests**:
  - `frontend/scripts/test_ebook_public_storefront.ts`: Test public API accessibility, sample chapter retrieval, and cart item deduplication logic.
- **Manual Acceptance Checks**:
  - Open an incognito browser window, navigate to `/e-books`, read sample chapter, add book with ₹49 plan, change plan in `/cart` to ₹99, verify price updates to ₹99 without login.
- **Definition of Done**: Public storefront, sample preview, and guest cart operate smoothly with zero authentication barriers.

---

## Phase 4: Identity & Customer Library Integration
- **Scope & Dependencies**: Integrate customer identity verification with cart state, adapt middleware for protected customer routes, and build the customer digital library (`/my-books`).
- **Likely Files / Modules Affected**:
  - `frontend/utils/supabase/middleware.ts` (Update route gates for `/checkout`, `/my-books`, `/read`)
  - `frontend/app/my-books/page.tsx` (Customer library page)
  - `frontend/layouts/StudentLayout.tsx` (Add "My Books" link to sidebar)
  - `frontend/app/api/ebooks/library/route.ts`
- **Database Changes**:
  - Create table: `ebook_reading_progress`.
- **Customer & Admin Behaviors**:
  - Visitors clicking "Proceed to Checkout" from `/cart` are directed to sign in or register if unauthenticated, preserving cart contents.
  - Authenticated customers can navigate to `/my-books` to view their unlocked books, access plans (`Read Online` vs `Read + Download`), and reading completion percentages.
- **Loading, Empty, Error & Recovery States**:
  - Loading: Card skeleton grid on `/my-books`.
  - Empty: Prompt to explore bookstore when no books are owned.
  - Error: Unauthenticated access to `/my-books` redirects to `/login?redirectTo=/my-books`.
- **Appropriate Tests**:
  - `frontend/scripts/test_ebook_identity_and_library.ts`: Test auth gating on customer routes and profile data isolation.
- **Manual Acceptance Checks**:
  - Attempt accessing `/my-books` while logged out (verify redirect to login); log in as a student (verify library renders).
- **Definition of Done**: Verified customer authentication guards library routes while seamlessly retaining cart state.

---

## Phase 5: Checkout, Payments, Purchases & Unlocking
- **Scope & Dependencies**: Implement authoritative checkout order creation, Razorpay payment processing, HMAC signature verification, automated existing ownership detection, and entitlement unlocking.
- **Likely Files / Modules Affected**:
  - `frontend/app/checkout/page.tsx` (Checkout interface)
  - `frontend/app/api/ebooks/orders/create/route.ts`
  - `frontend/app/api/ebooks/orders/verify/route.ts`
  - `frontend/app/api/payments/razorpay/webhook/route.ts` (Add eBook event handling)
  - `frontend/lib/razorpay.ts`
- **Database Changes**:
  - Create tables: `ebook_orders`, `ebook_order_items`, `ebook_entitlements`.
- **Customer & Admin Behaviors**:
  - Customer reviews order on `/checkout`. The server calculates prices (₹49 / ₹99) and checks existing entitlements.
  - Razorpay checkout modal opens. Upon payment completion, signature is verified server-side, `ebook_entitlements` are created, the cart is cleared, and the user is redirected to `/my-books` with a success toast.
- **Loading, Empty, Error & Recovery States**:
  - Loading: Payment processing spinner overlay.
  - Error: Friendly error banner if payment signature fails or card is declined.
  - Recovery: If customer closes browser during payment, Razorpay webhook completes order and provisions entitlement asynchronously.
- **Appropriate Tests**:
  - `frontend/scripts/test_ebook_payment_and_unlocking.ts`: Test server-side price enforcement, signature forgery rejection, webhook idempotency, and entitlement provisioning.
- **Manual Acceptance Checks**:
  - Complete a test-mode checkout for ₹49, confirm order status is `paid` in database, verify instant unlocking in `/my-books`.
- **Definition of Done**: End-to-end checkout, payment verification, and entitlement unlocking function reliably with complete tampering immunity.

---

## Phase 6: Protected Online Reader
- **Scope & Dependencies**: Develop the distraction-free online reader interface (`/read/[bookId]/[chapterId]`) with server-side entitlement checks, chapter content streaming, reading typography settings, and reading progress autosaving.
- **Likely Files / Modules Affected**:
  - `frontend/app/read/[bookId]/[chapterId]/page.tsx` (Reader UI)
  - `frontend/app/api/ebooks/read/[bookId]/[chapterId]/route.ts`
  - `frontend/app/api/ebooks/read/progress/route.ts`
  - `frontend/components/ReaderSettingsModal.tsx` (Font size, light/sepia/dark themes)
- **Database Changes**: None.
- **Customer & Admin Behaviors**:
  - Customer with active `read_online` or `read_download` entitlement reads chapters sequentially.
  - Sidebar displays table of contents with completion status.
  - Reader autosaves scroll position and active chapter.
  - Unentitled users attempting to hit the chapter API receive HTTP 403 Forbidden.
- **Loading, Empty, Error & Recovery States**:
  - Loading: Clean typography skeleton while chapter fetches.
  - Error: 403 screen with "Purchase Access" button if unentitled.
  - Recovery: Resumes reading at last saved chapter and scroll offset upon return.
- **Appropriate Tests**:
  - `frontend/scripts/test_ebook_reader_protection.ts`: Verify chapter gating, absence of PDF disclosure, and reading progress updates.
- **Manual Acceptance Checks**:
  - Log in as online-only buyer, read Chapter 1 and Chapter 2, adjust font size, refresh browser (verify position is restored), inspect network tab (verify no PDF file was downloaded).
- **Definition of Done**: Online reader delivers a responsive, distraction-free reading experience while strictly protecting paid content.

---

## Phase 7: PDF Downloads & Upgrades
- **Scope & Dependencies**: Implement secure PDF download delivery for eligible buyers (`read_download`), and the ₹50 upgrade path for existing online-only buyers (`read_online` -> `read_download`).
- **Likely Files / Modules Affected**:
  - `frontend/app/api/ebooks/download/route.ts`
  - `frontend/app/api/ebooks/orders/upgrade/route.ts`
  - `frontend/app/my-books/page.tsx` (Add "Download PDF" and "Upgrade to PDF (+₹50)" buttons)
  - `frontend/app/e-books/[bookId]/page.tsx` (Detect existing ownership and adjust CTA)
- **Database Changes**: None.
- **Customer & Admin Behaviors**:
  - `read_download` buyers see an active "Download PDF" button that generates a temporary 60-second signed URL.
  - `read_online` buyers see an "Upgrade to PDF (+₹50)" banner. Clicking it opens checkout charging strictly ₹50, and upon verification upgrades entitlement to `read_download`.
  - Online-only buyers calling `/api/ebooks/download` receive HTTP 403 Forbidden.
- **Loading, Empty, Error & Recovery States**:
  - Loading: "Generating secure link..." spinner on download button.
  - Error: Warning dialog if storage file is missing or plan is ineligible.
- **Appropriate Tests**:
  - `frontend/scripts/test_ebook_pdf_and_upgrade_flow.ts`: Verify signed URL generation, ineligibility blocking, and ₹50 upgrade price calculation.
- **Manual Acceptance Checks**:
  - Buy online plan for ₹49; verify download is blocked; click upgrade, pay ₹50 test order; verify download is now enabled and signed PDF downloads successfully.
- **Definition of Done**: PDF download delivery is restricted to eligible tiers, and upgrade checkout reliably elevates access.

---

## Phase 8: Admin Operations, Refunds, Finance & Reporting
- **Scope & Dependencies**: Build the administrative order management dashboard (`/admin/e-book-orders`), customer access adjustment suite, settlement reconciliation tracking, and automated refund processing.
- **Likely Files / Modules Affected**:
  - `frontend/app/admin/e-book-orders/page.tsx` (Order list, filters, export)
  - `frontend/app/admin/e-book-orders/[orderId]/page.tsx` (Order details, manual adjustment, refund modal)
  - `frontend/app/api/admin/ebooks/orders/route.ts`
  - `frontend/app/api/admin/ebooks/orders/[orderId]/refund/route.ts`
  - `frontend/app/api/admin/ebooks/entitlements/adjust/route.ts`
- **Database Changes**: None.
- **Customer & Admin Behaviors**:
  - Admins can search orders by customer email or transaction ID, inspect line items (original vs upgrade), and export CSV reports.
  - Admins can issue full refunds: triggers Razorpay Refund API, marks order `refunded`, and revokes access.
  - Admins can manually grant complimentary access, requiring a logged reason and administrator ID (tracked in `ebook_audit_logs`). Complimentary grants are never logged as ₹0 paid transactions.
- **Loading, Empty, Error & Recovery States**:
  - Loading: Table skeletons during data fetching.
  - Error: Modal error alert if refund is rejected by bank.
- **Appropriate Tests**:
  - `frontend/scripts/test_ebook_admin_finance_and_refunds.ts`: Test refund revocation, complimentary access audit trails, and financial record immutability.
- **Manual Acceptance Checks**:
  - Grant complimentary access to a test user, confirm audit log entry; process a test refund on an order, verify customer library immediately revokes access.
- **Definition of Done**: Complete administrative governance, truthful financial accounting, and provider-confirmed refund processing are operational.

---

## Phase 9: End-to-End Validation, Security Hardening & Launch
- **Scope & Dependencies**: Conduct full regression testing, security vulnerability scans, performance benchmarking under simulated load, SEO structured data verification, and production readiness certification.
- **Likely Files / Modules Affected**:
  - `frontend/scripts/test_ebook_full_e2e_suite.ts`
  - `frontend/app/sitemap.ts` (Add `/e-books` and published book slugs)
  - `docs/ebooks/launch-readiness-report.md`
- **Database Changes**: Apply production indexes for fast querying.
- **Customer & Admin Behaviors**: Complete end-to-end user journeys tested on staging and verified for production rollout.
- **Loading, Empty, Error & Recovery States**: All edge cases, 404s, payment drops, and network failures audited.
- **Appropriate Tests**:
  - Full automated regression suite (all scripts in `frontend/scripts/`).
  - Production build verification (`npm run build`).
  - SEO JSON-LD schema validation.
- **Manual Acceptance Checks**:
  - Complete full customer journey: browse -> read sample -> add to cart -> register -> pay ₹49 -> read online -> upgrade for ₹50 -> download PDF -> admin audit -> refund.
- **Definition of Done**: 100% test pass rate, zero regressions, and formal production sign-off.
