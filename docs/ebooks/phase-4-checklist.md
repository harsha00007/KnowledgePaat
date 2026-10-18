# KnowledgePaat — Phase 4 Actionable Implementation Checklist

**Target Phase:** Phase 4 of 9 (Verified Customer Identity, Purchase Ownership/Entitlement Foundations & My Books Experience)  
**Status:** COMPLETED & VERIFIED ON DEDICATED STAGING (18/18 Live Tests PASS, TypeScript 0 Errors, Zero Phase 3 Regressions 24/24 PASS)  
**Date:** October 2026  

---

## 1. Overview & Objectives

Phase 4 establishes verified customer identity integration, digital entitlement and ownership foundations, and the customer library experience (`/my-books`) for the KnowledgePaat eBook platform. Visitors can transition seamlessly from an anonymous bookstore or guest cart into authenticated customer sessions, access their owned digital library with historical edition immutability, inspect plan-tier privileges (Read Online vs Read + Download), and evaluate ownership-aware purchase intents for future Phase 5 checkout.

---

## 2. Ordered Implementation Tasks & Verification Status

### Task 4.1: Customer Identity & Verification Integration
- [x] **Authoritative Server Identity Resolution**: [`frontend/lib/ebook/customerAuth.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/customerAuth.ts)
  - Uses official `supabase.auth.getUser()` via server-side cookies.
  - Strictly rejects browser-supplied IDs, emails, roles, or client-decoded tokens.
  - Enforces `user.email_confirmed_at` verification; unverified callers receive HTTP 403 `EMAIL_NOT_VERIFIED`.
  - Auto-provisions minimal `profiles` record (`role='student'`), ensuring book buyers are never blocked by unrelated career onboarding fields.
  - *Verification*: Tested via `test_phase4_customer_identity_suite.ts` (Tests 3, 4, 5).
  - *Result*: **PASS**

---

### Task 4.2: Protected Customer Routes & Authentication Handoff
- [x] **Edge Middleware Protection**: [`frontend/utils/supabase/middleware.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/utils/supabase/middleware.ts)
  - Gates `/my-books`, `/checkout`, and `/read/*` when unauthenticated, redirecting to `/login?redirectTo=...`.
  - Preserves internal target paths while allowing public bookstore (`/e-books`, `/cart`) to remain unauthenticated.
  - Prevents redirecting customer eBook routes to `/student/dashboard`.
  - *Verification*: Tested via `test_phase4_customer_identity_suite.ts` (Tests 1, 2, 7).
  - *Result*: **PASS**
- [x] **Safe Login & Registration Redirect Handoff**: [`frontend/app/login/page.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/login/page.tsx) & [`frontend/app/register/page.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/register/page.tsx)
  - Bi-directionally propagates `redirectTo` query parameter between Login and Register views.
  - Validates redirect targets via `sanitizeInternalRedirectUrl`, strictly neutralizing external domains (`https://evil.com`), protocol schemes (`javascript:`), and CRLF sequences.
  - *Verification*: Tested via `test_phase4_customer_identity_suite.ts` (Test 7).
  - *Result*: **PASS**
- [x] **Guest Cart Persistence & Server Revalidation**: [`frontend/app/api/ebooks/cart/validate/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/cart/validate/route.ts)
  - Preserves guest cart in LocalStorage across authentication transitions.
  - Authoritatively revalidates prices in integer paise against the database.
  - Flags already-owned titles or eligible upgrades for authenticated customers.
  - *Verification*: Tested via `test_phase4_customer_identity_suite.ts` (Test 6, 16) and `test_phase3_public_store_suite.ts` (Tests 8, 14).
  - *Result*: **PASS**

---

### Task 4.3: Entitlement & Ownership Foundations
- [x] **Additive Database Schema**: [`supabase/migrations/supabase_ebook_phase4_entitlements_setup.sql`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/supabase/migrations/supabase_ebook_phase4_entitlements_setup.sql)
  - `public.ebook_entitlements`: Tracks `customer_id`, `ebook_id`, `edition_id`, `plan`, `can_read_online`, `can_download_pdf`, `grant_type`, `is_active`, and audit timestamps.
  - `public.ebook_reading_progress`: Tracks real scroll percentages, completed timestamps, and bookmark positions.
  - Partial unique index & constraint: `unique_customer_edition_access (customer_id, ebook_id, edition_id)`.
  - Trigger: `tr_sync_ebook_entitlement_permissions` keeps permissions aligned with `plan` and `is_active`.
  - *Verification*: Tested via `test_phase4_customer_identity_suite.ts` (Tests 8, 10, 11, 14).
  - *Result*: **PASS**
- [x] **Server Helper Functions**: [`frontend/lib/ebook/entitlements.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/entitlements.ts)
  - `getCustomerOwnedBooks(userId)`: Lists customer's owned books with safe library metadata; strictly excludes PDF paths and chapter bodies.
  - `checkBookOwnership(userId, bookId, editionId)`: Authoritative ownership check.
  - `canReadOnline(userId, bookId, editionId)`: Checks online reading privilege.
  - `canDownloadPdf(userId, bookId, editionId)`: Checks PDF download privilege.
  - `evaluatePurchaseIntent(userId, bookId, requestedPlan)`: Evaluates new purchase, ₹50 upgrade, already-owned, and new edition cases.
  - *Verification*: Tested via `test_phase4_customer_identity_suite.ts` (Tests 11, 13, 16).
  - *Result*: **PASS**

---

### Task 4.4: Database Access Control & RLS Policies
- [x] **Row Level Security Enforcement**:
  - Regular customers have `SELECT` only on their own rows (`customer_id = auth.uid()`).
  - Zero `INSERT`, `UPDATE`, or `DELETE` permissions for regular customers on `ebook_entitlements`.
  - Anonymous visitors have zero access to customer entitlements.
  - Service-role key used strictly server-side for webhooks/admin grants.
  - *Verification*: Tested via `test_phase4_customer_identity_suite.ts` (Tests 2, 8, 9, 10).
  - *Result*: **PASS**
- [x] **Historical Edition Retention for Purchasers**:
  - Permissive RLS policies on `ebook_editions` and `ebooks` allow customers to view owned editions even if withdrawn from public sale (`status != 'published'`).
  - *Verification*: Tested via `test_phase4_customer_identity_suite.ts` (Test 12).
  - *Result*: **PASS**
- [x] **Cache Isolation & Headers**:
  - `GET /api/ebooks/my-books` emits `Cache-Control: private, no-cache, no-store, must-revalidate` and `Pragma: no-cache`.
  - Prevents stale library responses across account switching.
  - *Verification*: Tested via `test_phase4_customer_identity_suite.ts` (Test 15).
  - *Result*: **PASS**

---

### Task 4.5: Customer Digital Library (`/my-books`)
- [x] **Library Page & Client**: [`frontend/app/my-books/page.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/my-books/page.tsx) & [`MyBooksClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/my-books/MyBooksClient.tsx)
  - Two book cards per row on desktop (`grid-cols-1 md:grid-cols-2`), single column on mobile.
  - KnowledgePaat brand aesthetics: royal blue actions (`#2563EB`), navy headings (`#0B1D3A`), slate surfaces.
  - Cover thumbnails, edition badges, access-tier badges (`Read Online` vs `Read + Download`), and purchase attribution dates.
  - Real reading progress bar displayed only when actual progress records exist (never fabricated).
  - Empty library state with "Explore Technical Bookstore" CTA.
  - Unverified email warning state with verification refresh button.
  - Error state with retry action.
  - Access revoked badge for refunded or deactivated entitlements.
  - Feature-flag gated actions:
    - "Read Online" disabled with tooltip when `ebook_reader = false`.
    - "Download PDF" disabled with tooltip when `ebook_pdf_download = false`.
    - "Upgrade to PDF (+₹50)" notice for online-only buyers.
  - *Verification*: Verified via Next.js build compilation and `test_phase4_customer_identity_suite.ts` (Tests 14, 17).
  - *Result*: **PASS**
- [x] **Navigation Integration**:
  - Added "My Books" to sidebar in [`StudentLayout.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/layouts/StudentLayout.tsx).
  - Added "My Books" button to header and footer in [`PublicLayout.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/layouts/PublicLayout.tsx).
  - *Verification*: Verified in Next.js production build and layout renders.
  - *Result*: **PASS**

---

### Task 4.6: Ownership-Aware Purchase Intent Foundations
- [x] **Intent API & Calculation**: [`frontend/app/api/ebooks/intent/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/intent/route.ts)
  - Evaluates intent without charging money or creating payment records.
  - Recognizes new purchase eligibility (₹49 / ₹99).
  - Recognizes ₹50 PDF upgrade delta for existing online-only owners of the current edition.
  - Prevents duplicate intent for complete `read_download` owners.
  - Correctly distinguishes new edition releases from upgrades of older editions.
  - *Verification*: Tested via `test_phase4_customer_identity_suite.ts` (Test 16).
  - *Result*: **PASS**

---

## 3. Systematic Acceptance Verification Summary

| # | Invariant Evaluated | Target | Result | Evidence / Detail |
|---|---|---|:---:|---|
| 01 | Public bookstore works anonymously | Public API / Catalog | **PASS** | Anonymous visitors query active published books with zero auth hurdles. |
| 02 | Unauthenticated My Books requires login | Middleware / RLS | **PASS** | Direct access to `/my-books` redirects to `/login?redirectTo=/my-books`; anon RLS returns 0 rows. |
| 03 | Unverified customers identified & gated | Supabase Auth | **PASS** | Users with `email_confirmed_at = null` receive 403 `EMAIL_NOT_VERIFIED`. |
| 04 | Existing customers sign in & return safely | Auth Admin & Client | **PASS** | Authenticated customer resolves stable user ID; safe internal redirect target preserved. |
| 05 | Profile provisioning excludes career fields | `public.profiles` | **PASS** | Auto-provisions minimal profile (`role='student'`) without requiring career form fields. |
| 06 | Guest cart survives auth & revalidates | Cart Validation API | **PASS** | Preserved items revalidate against authoritative server prices in integer paise. |
| 07 | Malformed/external redirects rejected | `safeRedirect.ts` | **PASS** | `https://evil.com`, `//malicious.com`, and `javascript:` neutralize to internal fallback. |
| 08 | Customer A sees only A's entitlements | PostgreSQL RLS | **PASS** | Customer A queries return strictly Customer A's owned books (count = 1). |
| 09 | Customer A cannot query Customer B by parameter | RLS & Server Session | **PASS** | Request parameters (`?userId=...`) ignored; server resolves caller strictly via `auth.uid()`. |
| 10 | Customers cannot self-grant access | PostgreSQL RLS | **PASS** | Direct insert by authenticated customer rejected: `new row violates row-level security policy`. |
| 11 | Online vs Download permissions distinguished | Entitlements Schema | **PASS** | `read_online` grants online=true, pdf=false; `read_download` grants online=true, pdf=true. |
| 12 | Historical ownership survives withdrawal | RLS & Library Query | **PASS** | Book withdrawn from public catalog remains visible in customer library with permanent access. |
| 13 | Edition reference immutable | Entitlements Model | **PASS** | Customer A entitlement remains locked to Edition 1 even after Edition 2 is published as current. |
| 14 | Empty, revoked, error states handled | UI & API Contracts | **PASS** | Deactivating entitlement (`is_active=false`) revokes permissions and renders revoked badge. |
| 15 | Account switching isolates library | HTTP Cache Headers | **PASS** | Customer B sees only Book 2; `Cache-Control: private, no-store` prevents shared cache leakage. |
| 16 | Ownership-aware purchase intents | Intent Engine | **PASS** | Identifies new purchase, upgrade (+₹50), already-owned complete, and new edition cases. |
| 17 | Unimplemented actions safely gated | `featureFlags.ts` | **PASS** | `ebook_reader=false`, `ebook_pdf_download=false`, `ebook_checkout=false`, `ebook_my_books=true`. |
| 18 | Admin and student role RBAC intact | RBAC Middleware | **PASS** | Non-admin students cannot access admin audit logs; admin routes protected. |

**Total Invariants Evaluated:** 18  
**Passed:** 18  
**Failed:** 0  
**Status:** 100% PASS
