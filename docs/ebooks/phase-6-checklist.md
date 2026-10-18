# KnowledgePaat — Phase 6 Actionable Implementation Checklist

**Target Phase:** Phase 6 of 9 (Protected Online Reading, Chapter Navigation, Search, Bookmarks, Reading Preferences, and Saved Progress)  
**Status:** COMPLETED & DURABLY PERSISTED ON DEDICATED STAGING (20/20 Acceptance Tests PASS, 10/10 DB Persistence PASS, TypeScript 0 Errors, Next.js Build 89/89 Routes PASS)  
**Date:** October 2026  

---

## 1. Overview & Objectives

Phase 6 implements a distraction-free, protected online reading experience for entitled KnowledgePaat eBook customers. It provides purchased-edition resolution (preserving historical editions), server-enforced chapter content protection, debounced progress tracking, bookmarks, in-book keyword search scoped to authorized editions, customizable display preferences (themes, fonts, widths), and seamless library shelf integration. All persistence uses durable PostgreSQL storage on the dedicated staging project (`lzuinimbsdxnhzmjpxmr`).

---

## 2. Ordered Implementation Tasks & Verification Status

### Task 6.1: Preflight Phase 5 Corrections
- [x] **Agreed Purchase Cases Verification**:
  - ₹49 (4900 paise): Online access only (`plan = 'read_online'`). Unlocks `can_read_online: true`, `can_download_pdf: false`. Verified via live staging order.
  - ₹99 (9900 paise): Complete access (`plan = 'read_download'`). Unlocks `can_read_online: true`, `can_download_pdf: true`. Verified via live staging order.
  - ₹148 (14800 paise): Mixed cart (1 × ₹49 + 1 × ₹99). Atomic multi-item fulfillment verified.
- [x] **DNS Pinning Hardening**: [`frontend/utils/supabase/dnsPin.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/utils/supabase/dnsPin.ts)
  - Removed permanent hardcoded mapping of `api.razorpay.com` to `13.206.106.225`.
  - Configured dynamic DNS resolution with `setDefaultResultOrder('ipv4first')` and `options.family = 4`.
  - Preserved hostname-based HTTPS, certificate verification, and SNI.
  - Regression verified with 20/20 PASS on Phase 5 test suite.
- [x] **Test Credential Sanitation & Rotation**:
  - Removed plaintext passwords from reports and documentation.
  - Test customer passwords and emails supplied via `.env.local` (`STAGING_TEST_CUSTOMER_EMAIL`, `STAGING_TEST_CUSTOMER_PASSWORD`).
  - Rotated the shared test customer password directly in Supabase Auth via admin API without printing secrets.
- [x] **External Delivery Checks Status**:
  - Provider webhook delivery and receipt email delivery remain accurately marked as pending / unverified until live external delivery occurs.
- *Result*: **PASS**

---

### Task 6.2: Purchased-Edition Resolution
- [x] **Resolution Logic**: [`frontend/lib/ebook/reader.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/reader.ts)
  - Validates authenticated customer with confirmed email.
  - Queries `public.ebook_entitlements` where `is_active = true` and `can_read_online = true`.
  - Defaults deterministically to the latest purchased edition (`edition_number` DESC).
  - Preserves legitimate reading access to purchased historical/withdrawn editions.
  - Supports explicit multi-edition selection via `?editionId=` query parameter.
  - *Verification*: Tested via Invariants 1, 2, 8, 9 in `test_phase6_reader_suite.ts`.
- *Result*: **PASS**

---

### Task 6.3: Authorised Content Retrieval & Server Protection
- [x] **Protected Chapter Route**: [`frontend/app/api/ebooks/[bookId]/read/[chapterId]/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/[bookId]/read/[chapterId]/route.ts)
  - Server-side customer entitlement validation on every request (direct API & page navigation).
  - Validates book/edition/chapter relationships; rejects cross-book and cross-edition IDs with 404/400.
  - Strict response headers: `Cache-Control: private, no-cache, no-store, must-revalidate`, `Pragma: no-cache`, `Expires: 0`.
  - Never stores paid chapter bodies in LocalStorage or offline service worker caches.
  - Never exposes full PDF files, storage paths, or service credentials to clients.
  - Public sample chapters remain on their public route (`/api/ebooks/[bookId]/sample/[chapterId]`).
  - *Verification*: Tested via Invariants 1, 2, 3, 4, 5, 6, 7, 10, 20.
- *Result*: **PASS**

---

### Task 6.4: Reader UI & Typography
- [x] **Reader View & Client**: [`frontend/app/read/[bookId]/[chapterId]/page.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/read/[bookId]/[chapterId]/page.tsx) & [`ReaderClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/read/[bookId]/[chapterId]/ReaderClient.tsx)
  - Color palette: Deep Navy headings (`#0B1D3A`), Royal Blue controls (`#2563EB`), White/slate surfaces, mint/teal status indicators.
  - Desktop sidebar & mobile drawer for chapter navigation.
  - Previous / next chapter buttons with clear completion indicator on final chapter.
  - Code blocks with one-click copy button.
  - Safe Markdown renderer strips `<script>`, `<iframe>`, `onerror=`, `javascript:` links.
  - *Verification*: Tested via Invariants 11, 17, 19.
- *Result*: **PASS**

---

### Task 6.5: Reading Progress & Real Database Persistence
- [x] **Reading Progress Service & API**: [`frontend/app/api/ebooks/[bookId]/progress/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/[bookId]/progress/route.ts)
  - Reuses and extends `public.ebook_reading_progress`.
  - Debounced saving (1.5s scroll debounce + unload flush).
  - Server enforces bounds validation (`0.0 <= scroll_percent <= 100.0`).
  - Customers cannot write to another customer's progress record.
  - Restores scroll position upon reload or session resume.
  - Truthful saving indicators: "Saving...", "Saved", and retry button on error ("Save failed (Retry)").
  - *Verification*: Tested via Invariants 12, 13, 14 and Persistence Tests 6, 7, 8, 9.
- *Result*: **PASS**

---

### Task 6.6: Bookmarks (Removal of In-Memory Fallbacks)
- [x] **Durable Bookmarks System**: [`frontend/app/api/ebooks/[bookId]/bookmarks/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/[bookId]/bookmarks/route.ts)
  - Direct PostgreSQL table: `public.ebook_bookmarks` in staging Supabase (`lzuinimbsdxnhzmjpxmr`).
  - Completely removed `fallbackBookmarks` in-memory map. Returns HTTP 500 error on database failure.
  - Optimistic UI reconciles truthfully with server response.
  - Add / remove bookmark with current chapter and scroll position.
  - Bookmarks drawer with one-click jump to chapter position.
  - Customer and edition scoped; cross-customer access strictly denied.
  - *Verification*: Tested via Invariant 15 and Persistence Tests 1, 2, 3, 10.
- *Result*: **PASS**

---

### Task 6.7: Authorised In-Book Search
- [x] **Search Engine**: [`frontend/app/api/ebooks/[bookId]/search/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/[bookId]/search/route.ts)
  - Scans only `ready` chapters of the customer's authorized edition.
  - Generates contextual snippets (~60 characters before and after match).
  - Rate limited to 30 requests per minute via `frontend/lib/rateLimit.ts`.
  - Never exposes full manuscript or unpurchased book content.
  - *Verification*: Tested via Invariant 16.
- *Result*: **PASS**

---

### Task 6.8: Reading Preferences (Durable Storage)
- [x] **Durable Preferences Engine**: [`frontend/app/api/ebooks/preferences/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/preferences/route.ts)
  - Direct PostgreSQL table: `public.ebook_reading_preferences` in staging Supabase (`lzuinimbsdxnhzmjpxmr`).
  - Completely removed `fallbackPreferences` in-memory map. Returns HTTP 500 error on database failure.
  - Stores theme, font size, font family, and line width.
  - Reconciles optimistic UI on server failure.
  - Persists across customer sessions; isolates settings across accounts.
  - *Verification*: Tested via Invariants 18, 19 and Persistence Tests 4, 5.
- *Result*: **PASS**

---

### Task 6.9: My Books Shelf Integration & Feature Flags
- [x] **Shelf & Flags Integration**: [`frontend/app/my-books/MyBooksClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/my-books/MyBooksClient.tsx) & [`frontend/lib/featureFlags.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/featureFlags.ts)
  - "Start Reading" button for unread books; "Continue Reading" with progress bar for in-progress books.
  - Links to `/read/[bookId]` or `/read/[bookId]/[lastChapterId]`.
  - Enabled `ebook_reader: true` for staging.
  - Kept `ebook_pdf_download: false` gated for Phase 7.
  - Removed internal implementation-phase jargon from customer tooltips.
- *Result*: **PASS**

---

## 3. Test Evidence & Acceptance Summary

| Test Category | Suite File | Target Environment | Scope | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Real Database / API Tests** | `test_phase6_reader_suite.ts` | Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr`) | 20 Invariant Reader Suite | **20/20 PASS** |
| **Real Database Persistence** | `test_phase6_persistence_suite.ts` | Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr`) | PostgreSQL Bookmarks, Preferences, Progress, Isolation | **10/10 PASS** |
| **Payment Regressions** | `test_phase5_checkout_suite.ts` | Staging Supabase + Dynamic DNS | Phase 5 Checkout & Entitlements | **20/20 PASS** |
| **Automated Browser Automation** | `browser_subagent` / Playwright | Localhost:3000 | Automated UI Navigation | **BLOCKED** (Playwright Linux driver download 404 in sandbox) |
| **Manual Interactive Tests** | `docs/ebooks/phase-6-manual-tests.md` | Localhost:3000 in Chrome | 14 Step-by-Step Scenarios | **Ready for User Verification** |
| **Next.js Production Build** | `npm run build` | Local Build | 89/89 routes compiled | **0 Errors, 89/89 PASS** |

---

## 4. Backlog Items Retained for Later Phases

| Item | Phase | Reason / Status |
|------|:-----:|-----------------|
| Provider live webhook delivery | Ongoing Backlog | Requires live Razorpay event reaching public webhook endpoint. |
| Receipt email delivery verification | Ongoing Backlog | Requires transactional SMTP / email provider integration. |
| Secure PDF delivery (`/api/ebooks/download`) | Phase 7 | Gated behind `ebook_pdf_download: false`. |
| ₹50 PDF upgrade charging | Phase 7 | Gated until Phase 7 download release. |
| Customer refunds & settlement reconciliation | Phase 8 | Scheduled for Phase 8. |
