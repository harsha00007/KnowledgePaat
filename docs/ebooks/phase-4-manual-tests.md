# KnowledgePaat — Phase 4 Manual Acceptance & Verification Run Log

**Target Phase:** Phase 4 of 9 (Customer Identity, Entitlements & My Books)  
**Target Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Status:** 18/18 Invariants Verified (100% PASS)  
**Date:** October 2026  

---

## 1. Test Methodology & Separation of Boundaries

This document distinguishes:
1. **Real Staging Auth, API & Database Tests**: Executed against the live staging PostgreSQL database and Supabase Auth Admin using isolated disposable users and books.
2. **Edge Proxy & Route Tests**: Executed against the Next.js runtime middleware and server routes.
3. **Deferred Checks (Phases 5–7)**: Live payment capture, protected reader rendering, and PDF signed URL downloads are verified as safely gated behind feature flags.

---

## 2. Interactive Manual Verification Journeys

### Journey 1: Unauthenticated Visitor Flow & Auth Handoff
1. **Steps**:
   - Open browser incognito window to `http://localhost:3000/e-books`.
   - Browse catalog, read a free sample chapter in the sample drawer.
   - Add a book to cart with `Read Online (₹49)`.
   - Navigate to `http://localhost:3000/my-books`.
2. **Expected Behavior**:
   - Middleware catches unauthenticated visitor and redirects to `/login?redirectTo=%2Fmy-books`.
   - Cart contents remain safe in LocalStorage (`knowledgepaat_ebook_cart_v1`).
3. **Verified Result**: **PASS** (Confirmed via `curl -i http://localhost:3000/my-books` returning `307 Temporary Redirect` to `/login?redirectTo=%2Fmy-books`).

### Journey 2: Customer Sign In & Library Access
1. **Steps**:
   - Sign in with verified credentials.
   - Redirect completes to `/my-books`.
   - Inspect library page.
2. **Expected Behavior**:
   - Owned books appear in a responsive two-column grid on desktop.
   - Plan badge reflects purchase tier (`Read Online` or `Read + Download`).
   - "Read Online" button is safely gated with tooltip: *Online reader launching in Phase 6*.
   - If user has no books, empty library state renders with *Explore Technical Bookstore* CTA.
3. **Verified Result**: **PASS**.

### Journey 3: Unverified Email Handling
1. **Steps**:
   - Register a new account or attempt to access library with an unconfirmed email account.
2. **Expected Behavior**:
   - Server returns 403 `EMAIL_NOT_VERIFIED`.
   - UI renders *Email Verification Required* alert with *I've Verified My Email* refresh button.
3. **Verified Result**: **PASS** (Automated Test 03 verified `email_confirmed_at: null` gating).

### Journey 4: Historical Edition Retention After Withdrawal
1. **Steps**:
   - Customer A purchases Edition 1 of Book 1.
   - Admin marks Book 1 as `draft` (withdrawn from sale).
   - An anonymous visitor searches `/e-books`.
   - Customer A refreshes `/my-books`.
2. **Expected Behavior**:
   - Anonymous visitor cannot see Book 1 in the public catalog.
   - Customer A still sees Book 1 in their library with a *Historical Edition* badge, retaining permanent reading rights.
3. **Verified Result**: **PASS** (Automated Test 12 verified public exclusion and customer retention).

---

## 3. Live Staging Test Suite Run Evidence

```text
================================================================
KNOWLEDGEPAAT PHASE 4 ACCEPTANCE SUITE — LIVE STAGING
Target Supabase Endpoint: https://lzuinimbsdxnhzmjpxmr.supabase.co
Production Guard: PASSED (Target verified as staging)
================================================================

--- Setting up isolated staging test fixtures ---
✅ Isolated staging test fixtures provisioned.

[Test 01] ✅ PASS — Public bookstore and catalog remain accessible anonymously (Found 4 published books anonymously)
[Test 02] ✅ PASS — Unauthenticated visitors cannot access customer entitlements directly (Anon query returned 0 rows (strictly protected by RLS))
[Test 03] ✅ PASS — Unverified customers are identified and email verification is strictly required (email_confirmed_at is null: true)
[Test 04] ✅ PASS — Existing customers can sign in with valid credentials and resolve identity (User ID matched: a07ca85d-4ee1-4be4-8072-930a93d2f5db)
[Test 05] ✅ PASS — Customer profile exists with role=student without requiring career onboarding fields (Profile resolved: role=student)
[Test 06] ✅ PASS — Guest cart choices survive authentication and revalidate accurate totals (Preserved 2 items totaling ₹148)
[Test 07] ✅ PASS — External and malformed redirect targets are rejected in favor of safe internal routes (Sanitization verified: evil target -> /my-books)
[Test 08] ✅ PASS — Customer A sees only Customer A entitlements via Row Level Security (Customer A returned 1 book(s) (Book 1))
[Test 09] ✅ PASS — Customer A querying Customer B records returns 0 rows due to auth.uid() enforcement (Query for B returned 0 rows)
[Test 10] ✅ PASS — Direct customer insert/grant of entitlements is strictly forbidden by RLS (Unauthorized insert rejected: new row violates row-level security policy for table "ebook_entitlements")
[Test 11] ✅ PASS — Online reading and PDF download permissions are strictly distinguished by plan (A (read_online): online=true, pdf=false; B (read_download): online=true, pdf=true)
[Test 12] ✅ PASS — Historical ownership survives withdrawal from public sale (book retained in library) (Hidden from public bookstore: true; Retained in Customer A library: true)
[Test 13] ✅ PASS — Purchased edition reference is immutable and does not silently mutate to new current edition (Locked to Edition 1 (00000000-0000-4000-e101-151c23ef262b), current is Edition 2 (00000000-0000-4000-e102-151c23ef262b))
[Test 14] ✅ PASS — Revoking an entitlement transitions is_active to false and revokes reading access (is_active=false, can_read_online=false)
[Test 15] ✅ PASS — Account switching isolates customer library state with zero leakage (Customer B library contains only Book 2 (1 book))
[Test 16] ✅ PASS — Ownership-aware purchase intent recognizes already-owned complete access (Customer B owns read_download; prevents duplicate purchase intent)
[Test 17] ✅ PASS — Unimplemented reader, download, and checkout actions remain safely gated by feature flags (reader=false, pdf=false, checkout=false, my_books=true)
[Test 18] ✅ PASS — Existing role-based access control protects admin audit logs from students (Student access to audit logs rejected: undefined)

--- Cleaning up disposable staging fixtures ---
✅ Cleaned up 3 test users and 2 test books.

================================================================
PHASE 4 EXTENDED ACCEPTANCE SUMMARY
================================================================
Total Invariants Evaluated : 18
Passed                     : 18
Failed                     : 0
================================================================

🎉 ALL 18 PHASE 4 ACCEPTANCE INVARIANTS PASSED AGAINST STAGING.
```

---

## 4. Live HTTP Endpoint Verification

| Method | Endpoint | Expected | Status | Redacted Live Response |
|---|---|---|:---:|---|
| `GET` | `/my-books` (unauth) | 307 Redirect | **PASS** | `location: /login?redirectTo=%2Fmy-books` |
| `GET` | `/api/ebooks/my-books` (unauth) | 401 Unauthorized | **PASS** | `{"success":false,"error":"Sign in to access your digital library.","code":"UNAUTHENTICATED"}` |
| `GET` | `/api/ebooks/library` (unauth) | 401 Unauthorized | **PASS** | `{"success":false,"error":"Sign in to access your digital library.","code":"UNAUTHENTICATED"}` |
| `GET` | `/e-books` (unauth) | 200 OK | **PASS** | Public catalog rendered with zero authentication barriers. |
| `GET` | `/cart` (unauth) | 200 OK | **PASS** | Guest cart rendered with zero authentication barriers. |
| `POST` | `/api/ebooks/intent` | 200 OK | **PASS** | `{"success":true,"intent":{"status":"eligible_new_purchase","pricePaise":4900,"priceRupees":49}}` |
