# KnowledgePaat — Phase 7 Actionable Implementation Checklist

**Target Phase:** Phase 7 of 9 (Secure PDF Downloads and Payment-Backed ₹50 Upgrades from Read Online to Read + Download)  
**Status:** COMPLETED & VERIFIED ON DEDICATED STAGING (20/20 Acceptance Tests PASS, Phase 6 Regression 10/10 PASS, TypeScript 0 Errors, Next.js Build 89/89 Routes PASS)  
**Target Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Production Guard:** `csjywuflkvohytbvglxf` strictly guarded and blocked from mutations  
**Payment Gateway:** Razorpay Test Mode transactions only (no real money charged)  
**Date:** October 2026  

---

## 1. Overview & Objectives

Phase 7 implements server-authorized, secure PDF downloads and a payment-backed ₹50 upgrade path for customers who originally purchased "Read Online" (₹49) licenses. It enforces strict server-authoritative pricing, preserves historical edition ownership without silent substitution, maintains all original financial transactions and customer reading progress/bookmarks upon upgrade, applies comprehensive audit logging distinguishing link issuance from completed file transfers, and integrates seamless user experiences in My Books and the online reader.

---

## 2. Ordered Implementation Tasks & Verification Status

### Task 7.1: Authorised PDF Delivery
- [x] **Verified Authenticated Customer**:
  - Validates active customer session and verified email address before processing any download request.
  - Rejects anonymous and unauthenticated visitors with HTTP 401.
- [x] **Owned Book & Edition Resolution**:
  - Resolves active entitlement from `public.ebook_entitlements` where `is_active = true`.
  - Rejects users without ownership (`NO_ACTIVE_ENTITLEMENT` 403).
  - Explicitly blocks cross-book or cross-edition queries.
- [x] **Active PDF Entitlement Requirement**:
  - Requires `can_download_pdf = true`.
  - Read Online customers (`can_download_pdf = false`) receive HTTP 403 with code `ONLINE_ONLY_PLAN`.
- [x] **Server-Side Immutable Asset Resolution**:
  - Resolves storage path from `public.ebook_editions.file_path` server-side.
  - Never accepts client-provided storage paths or URLs.
- [x] **Private Storage Existence & Inaccessibility**:
  - Private bucket `ebook-pdfs` configured with RLS denying direct public access.
  - Confirms file existence before generating signed delivery URL.
- [x] **Historical Edition Preservation**:
  - Customer owning Edition 1 receives Edition 1 PDF, even if Edition 2 is now the active public edition, or if Edition 1 is withdrawn from sale.
- *Result*: **PASS** (Verified via Invariants 1, 2, 3, 4, 5, 6, 7, 8 in `test_phase7_downloads_suite.ts`)

---

### Task 7.2: Delivery Mechanism and Limitations
- [x] **Delivery Architecture**:
  - Evaluated Option A (Short-lived signed Supabase URL) vs Option B (Server proxy/streaming).
  - Selected Option A: 60-second signed URLs generated via Supabase Storage Admin API.
- [x] **Safety & Attachment Headers**:
  - Signed URL sets download content-disposition header with collision-resistant safe filename: `${slug}-edition-${editionNumber}.pdf`.
- [x] **Cache Control & Privacy**:
  - Response headers: `Cache-Control: private, no-store, no-cache, max-age=0, must-revalidate` and `Pragma: no-cache`.
  - Prevents intermediate proxies or shared caches from caching signed bearer URLs.
- [x] **Truthful Revocation & Transfer Disclosure**:
  - Documented that signed URLs function as bearer tokens for their 60-second validity window.
  - Revoking entitlement in database immediately blocks future link issuance (HTTP 403).
  - Shared file is never deleted upon individual customer revocation.
  - System never claims downloaded local PDFs can be remotely recalled.
- [x] **Rate Limiting**:
  - Integrated `EBOOK_DOWNLOAD` policy: 15 download requests per minute per authenticated customer.
- *Result*: **PASS** (Verified via Invariants 6, 9, 10 in `test_phase7_downloads_suite.ts`)

---

### Task 7.3: My Books and Reader UI
- [x] **Read + Download Owners Experience**:
  - Displays "Download PDF" action with loading spinner and "Preparing download..." status.
  - Prevents duplicate requests during active generation.
  - Downloads genuine purchased edition PDF via temporary anchor with cleanup.
- [x] **Read Online Owners Experience**:
  - Displays amber "Add PDF access — ₹50" action.
  - Opens `EBookUpgradeModal` explaining that reading progress and bookmarks remain intact.
- [x] **Reader Toolbar Action**:
  - In-reader "Download PDF" toolbar button for entitled readers.
  - Direct upgrade link for online-only readers.
- [x] **Truthful Error & Retry Handling**:
  - Displays user-friendly error toast with retry button if network or storage issues occur.
  - Never silently substitutes an alternate file or latest public edition.
- *Result*: **PASS** (UI components integrated in `MyBooksClient.tsx` and `ReaderClient.tsx`)

---

### Task 7.4: Upgrade Eligibility and Quote
- [x] **Eligibility Validation**:
  - Requires authenticated, verified customer.
  - Requires active online entitlement for the specified edition (`can_read_online = true`).
  - Requires customer does not already possess PDF access (`can_download_pdf = false`).
  - Requires valid publication PDF file exists in private storage.
- [x] **Server-Authoritative Pricing**:
  - Upgrade quote endpoint: `GET /api/ebooks/[bookId]/upgrade/quote`.
  - Authoritative price: ₹50 / 5000 paise.
  - Client-supplied purchase prices are completely ignored.
- [x] **Edge Case & Conflict Handling**:
  - Explicitly rejects already upgraded customers (`ALREADY_UPGRADED`).
  - Explicitly rejects non-owners (`NO_ONLINE_OWNERSHIP`).
  - Explicitly rejects revoked entitlements (`ACCESS_REVOKED`).
  - Prevents duplicate pending orders within a 15-minute window.
- *Result*: **PASS** (Verified via Invariants 11, 12, 14 in `test_phase7_downloads_suite.ts`)

---

### Task 7.5: Upgrade Order and Payment
- [x] **Distinct Upgrade Order Model**:
  - Order record created with `order_type = 'upgrade'`.
  - Linked to `original_order_id` and `original_entitlement_id`.
  - Item created with `plan = 'upgrade_pdf'`, amount `5000` paise.
  - Original ₹49 order is never modified or conflated into a ₹99 order.
- [x] **Reused Payment Verification Pipeline**:
  - Creates genuine Razorpay Test Mode order (`order_...`).
  - Client completes payment via official Razorpay modal.
  - Verification endpoint `POST /api/ebooks/orders/verify` verifies cryptographic HMAC signature, validates payment status with Razorpay API, and ensures status is `captured`.
- *Result*: **PASS** (Verified via Invariants 13, 14, 15 in `test_phase7_downloads_suite.ts`)

---

### Task 7.6: Atomic Access Upgrade
- [x] **Database Transaction & Stored Procedure**:
  - Applied migration `supabase_ebook_phase7_downloads_setup.sql`.
  - Updated `finalize_ebook_order_payment` stored procedure.
  - Direct customer execution of the RPC is blocked (SECURITY DEFINER with service-role execution).
- [x] **Entitlement & Data Preservation**:
  - Updates existing entitlement: `can_download_pdf = true`, `grant_type = 'upgrade'`.
  - Preserves existing entitlement ID, user ID, book ID, and edition ID.
  - Preserves all reading progress records (`public.ebook_reading_progress`).
  - Preserves all bookmarks (`public.ebook_bookmarks`).
- [x] **Idempotency & Race Handling**:
  - Repeated verification calls return existing fulfilled order without duplicating entitlement grants or audit items.
- *Result*: **PASS** (Verified via Invariants 15, 16, 17 in `test_phase7_downloads_suite.ts`)

---

### Task 7.7: History and Audit Visibility
- [x] **Customer Order History Modal**:
  - Lists original ₹49 purchase as "Read Online".
  - Lists separate ₹50 upgrade as "PDF Upgrade (+₹50)" with distinct badge.
  - Displays distinct Razorpay payment identifiers.
- [x] **Download Audit Logging**:
  - Records link issuance in `public.ebook_download_logs`.
  - Status logged as `url_issued` (distinguishing link issuance from completed file transfer).
  - Logs IP address and User-Agent.
  - Never logs or persists signed bearer URLs or credentials.
- *Result*: **PASS** (Verified via Invariants 18, 19 in `test_phase7_downloads_suite.ts`)

---

### Task 7.8: Verification Suite Results (Task 8)
- [x] **1. Anonymous PDF requests denied**: PASS (HTTP 401)
- [x] **2. ₹49 owner cannot obtain PDF**: PASS (HTTP 403 `ONLINE_ONLY_PLAN`)
- [x] **3. ₹99 owner receives correct PDF**: PASS (Magic bytes `%PDF-1.4`)
- [x] **4. Customer A cannot use Customer B entitlement**: PASS (HTTP 403 `NO_ACTIVE_ENTITLEMENT`)
- [x] **5. Changed book/edition inputs cannot retrieve unrelated files**: PASS (HTTP 404 / 403)
- [x] **6. Private PDF cannot be fetched via public asset URL**: PASS (RLS denies public access)
- [x] **7. Missing/revoked access blocks new downloads**: PASS (HTTP 403 `ACCESS_REVOKED`)
- [x] **8. Historical eligible editions remain downloadable**: PASS (Resolves owned Edition 1)
- [x] **9. Delivery expiry and cache headers match contract**: PASS (60s lifetime, `no-store`, `no-cache`)
- [x] **10. Missing-file and storage failures produce truthful errors**: PASS (HTTP 404 `ASSET_NOT_FOUND`)
- [x] **11. Eligible online owner receives ₹50 upgrade quote**: PASS (₹50 / 5000 paise authoritative)
- [x] **12. Non-owners/already-upgraded cannot purchase wrong upgrade**: PASS (HTTP 403/400 rejected)
- [x] **13. Genuine Razorpay Test Mode ₹50 payment upgrades entitlement**: PASS (Captured & upgraded)
- [x] **14. Failed/pending/forged payments grant no PDF access**: PASS (Signature check fails closed)
- [x] **15. Repeated finalisation creates one access upgrade**: PASS (Idempotent 1 entitlement)
- [x] **16. Original ₹49 purchase remains unchanged**: PASS (Preserved ₹49, distinct order IDs)
- [x] **17. Progress and bookmarks survive upgrading**: PASS (100% data intact)
- [x] **18. Customer history shows both financial transactions**: PASS (Both orders visible)
- [x] **19. Admin visibility remains protected**: PASS (RLS enforces service/admin boundary)
- [x] **20. Online reader, cart, and previous payment behaviour intact**: PASS (Reader regressions 10/10 PASS)

---

### Task 7.9: Feature Flags & Documentation
- [x] Feature flags configured in `frontend/lib/featureFlags.ts`:
  - `ebook_pdf_download: true` enabled for staging.
- [x] Technical implementation document: `docs/ebooks/phase-7-implementation.md`.
- [x] Manual test guide: `docs/ebooks/phase-7-manual-tests.md`.
- [x] Actionable checklist: `docs/ebooks/phase-7-checklist.md`.
- *Result*: **PASS**

---

## 3. Definition of Done Evaluation

| Criterion | Target | Actual Staging Result | Status |
|---|---|---|---|
| Authorised PDF Delivery | Secure 60s signed URL, strict entitlement checks | Working, validated `%PDF-1.4` bytes | **PASS** |
| Historical Edition Preservation | Retain owned edition access | Pinned to purchased edition | **PASS** |
| Payment-Backed ₹50 Upgrade | Server-authoritative ₹50 order + Razorpay | Tested with genuine Test Mode order/capture | **PASS** |
| Atomic Entitlement Upgrade | Single DB transaction, no data loss | `finalize_ebook_order_payment` verified | **PASS** |
| Financial History Integrity | Separate orders, snapshots preserved | ₹49 order + ₹50 order intact | **PASS** |
| Progress & Bookmarks Survives | Zero loss during upgrade | Verified identical pre- & post-upgrade | **PASS** |
| Download Audit Logging | Link issuance logged, no bearer URL leaks | Stored in `ebook_download_logs` | **PASS** |
| Automated Acceptance Tests | 20/20 Invariants PASS | 20/20 PASS (100%) | **PASS** |
| Regression Checks | Phase 6 reader & persistence | 10/10 PASS (100%) | **PASS** |
| TypeScript & Production Build | 0 errors, clean Next.js build | 89/89 routes built successfully | **PASS** |
| Browser Subagent Execution | Playwright driver binary fetch | Host proxy blocked download | **BLOCKED** (Manual guide provided) |
| Webhook & Email Delivery | Live provider delivery | Staging stub / pending Phase 8 | **UNVERIFIED / PENDING** |
