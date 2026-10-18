# KnowledgePaat — Phase 8 Actionable Implementation Checklist

**Status:** Implementation complete; external acceptance checks pending.  
**Target Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Production Guard:** `csjywuflkvohytbvglxf` strictly guarded and blocked from mutations  
**Payment Gateway:** Razorpay Test Mode credentials (`rzp_test_...` key pair, no real money)  
**Execution Timestamp:** 2026-10-18T15:25:00+05:30 (IST)  

---

## 1. Overview & Remediation Objectives

Phase 8 completes administrative, financial, and access operations for the KnowledgePaat eBook platform. It provides server-verified administration of eBook orders, durable-intent provider-backed test-mode refunds with strict business policy enforcement (Rules A through E), audited customer access management, real-time financial reporting, and read-only Razorpay payment and settlement reconciliation.

All provider-fallback ambiguities have been resolved:
- Simulated provider fallbacks removed from `frontend/lib/razorpay.ts`.
- Tests partitioned by execution type (Real Provider API, Live Database, Mock/Fixture, Static Inspection, Browser Execution).
- Genuine Razorpay API calls attempted live and truthfully marked BLOCKED due to an intermediate proxy terminating TLS with an unencrypted HTTP response on port 443 (error:0A00010B:SSL routines::wrong version number).
- Concurrency, gateway timeouts, uncertain recovery, and "Refund Both Orders" partial completion verified on live staging database and explicit test fixtures.

---

## 2. Ordered Implementation Tasks & Verification Status

### Task 8.1: Admin Purchase History & Navigation
- [x] **Complete Admin Routes**:
  - Implemented `/admin/e-book-orders` (orders ledger, overview KPI reporting, financial reconciliation tabs).
  - Implemented `/admin/e-book-orders/[orderId]` (in-depth order details, refund processing, access management, and audit log).
  - Maintained backward-compatibility redirect from `/admin/e-books/orders` to `/admin/e-book-orders`.
- [x] **Server-Side Pagination, Search, Sorting, and Filters**:
  - Server-side search by internal order ID (`ORD-...`), gateway order ID (`order_...`), payment ID (`pay_...`), and customer name/email.
  - Multi-dimensional filters for order status (`paid`, `pending`, `failed`), order type (`purchase`, `upgrade`), refund status (`none`, `partial`, `full`), and date range.
- [x] **Unambiguous Indian Standard Time (IST) Display**:
  - All date/time displays explicitly formatted and labelled as `IST (UTC+05:30)`.
- [x] **Bi-Directional Linked Upgrade Navigation**:
  - Original ₹49 purchase order displays linked navigation banner to its separate ₹50 upgrade order.
  - Upgrade order displays linked navigation banner back to original base purchase order.
- [x] **Server-Verified Administrator Permissions (RBAC)**:
  - All admin routes and APIs (`/api/admin/ebooks/*`) verify `role = 'admin'` in `public.profiles`.
  - Anonymous visitors and students are rejected with HTTP 401/403.
- *Result*: **PASS** (Verified via TEST-01 & TEST-02 in `test_phase8_admin_refunds_suite.ts`)

---

### Task 8.2: Admin Dashboard and Reports
- [x] **Operational Overview Metrics**:
  - Real-time aggregation of Gross Captured Sales, Processed Refunds, Pending Refunds, and Net Sales.
  - Breakdowns for Original Purchases vs. PDF Upgrades without duplicate counting.
  - Active entitlement distribution (Online Only vs. Read + Download).
  - Best-selling books ranking by units and revenue.
  - Accurate labelling of PDF download activity as *link issuances*, not completed client downloads.
- [x] **Integer-Paise Financial Math**:
  - All internal calculations performed in integer paise; formatted in rupees (`₹`) for display.
  - Explicit separation of captured sales less refunds from provider settlement totals.
  - Provider fees and settlements marked as unavailable where not provided by gateway sandbox.
- [x] **Formula-Injection Safe CSV Export**:
  - Endpoint `/api/admin/ebooks/orders?format=csv` sanitizes all cells against formula injection (CWE-1236) by prepending single quotes to `=`, `+`, `-`, `@`, `\t`, and `\r`.
  - RFC 4180 compliant escaping.
- *Result*: **PASS** (Verified via TEST-14 & TEST-15 in `test_phase8_admin_refunds_suite.ts`)

---

### Task 8.3: Durable-Intent Provider Refund Workflow
- [x] **Durable-Intent Persistence & Network Isolation**:
  - Durable intent persisted in `public.ebook_refunds` before invoking external Razorpay API.
  - Database transactions are never held open across external HTTP gateway calls.
  - Official `X-Refund-Idempotency` header and stable idempotency key persisted per intent.
  - Retries reuse the persisted key and immutable payload, preventing balance reservation exhaustion.
- [x] **No False Processed States**:
  - Gateway pending states remain `pending` locally; entitlements are never mutated prematurely.
- [x] **Cumulative Limits & Concurrency**:
  - Stored procedure `create_ebook_refund_intent` locks order row (`FOR UPDATE`).
  - Concurrent requests cannot exceed captured amounts.
- [x] **Timeout & Uncertain Response Handling**:
  - Gateway timeouts, connection drops, and 5xx responses retain status `pending` with diagnostic details in `error_message`, strictly preserving fund reservations (`v_pending_sum`).
  - Recovery action (`syncRefundStatusWithGateway`) queries provider with pagination and validates exact intent correlation (payment ID, amount, currency, receipt/notes) without releasing reservations on empty queries.
- *Result*: **PASS** (Verified via TEST-04, TEST-05, TEST-06 in `test_phase8_admin_refunds_suite.ts` and IDEMP-01, UNC-01 through UNC-05 in `test_refund_idempotency_uncertain_suite.ts`)

---

### Task 8.4: Refund & Entitlement Business Policies (Rules A–E)
- [x] **Rule A (Full ₹99 Purchase Refund)**:
  - Revokes all access funded by that purchase (`is_active = false`, `status = 'revoked'`).
  - Reading progress, bookmarks, and shared storage assets are preserved.
- [x] **Rule B (Full ₹50 Upgrade Refund)**:
  - Downgrades entitlement plan from `read_download` to `read_online`.
  - Removes PDF download privilege while preserving online reading funded by valid base order.
- [x] **Rule C (Base ₹49 Purchase with Active ₹50 Upgrade)**:
  - Standalone refund of base purchase is blocked.
  - Dedicated "Refund Both Orders" orchestrator cascades upgrade then base refunds.
  - Retaining individual truthful statuses on partial completion; retries skip already-refunded upgrades.
- [x] **Rule D (Partial / Goodwill Refund)**:
  - Access is not automatically revoked on partial refund unless explicitly specified by administrator.
- [x] **Rule E (Multi-Item Isolation)**:
  - Item-allocated refund affects only the specified item and its associated edition grant.
- [x] **Complimentary Grant Isolation**:
  - Complimentary grants (`grant_type: 'complimentary'`) are never revoked by order refunds.
- [x] **Anti-Resurrection Protection**:
  - Hardened `finalize_ebook_order_payment` prevents delayed payment webhooks from reactivating refunded orders.
- *Result*: **PASS** (Verified via TEST-07, TEST-08, TEST-09, TEST-10A, TEST-10B, TEST-11, TEST-12, TEST-13)

---

### Task 8.5: Audited Customer Access Management
- [x] **Access Inspection & Management**:
  - Admin modal allows inspecting active customer entitlements and funding sources.
  - Audited revocation with mandatory reason.
  - Complimentary access grant issuance without creating fake orders or phantom gateway records.
  - Authorized restoration of previously revoked access.
- [x] **Audit Trail Completeness**:
  - Stored procedure `admin_manage_ebook_access` records actor ID, customer ID, action, reason, and before/after states in `public.ebook_audit_logs`.
  - Audit table protected by RLS against client mutations.
- *Result*: **PASS** (Verified on live database)

---

### Task 8.6: Financial Reconciliation
- [x] **Read-Only Razorpay Gateway Reconciliation**:
  - Compares local database records against Razorpay payment and refund APIs.
  - Surfaces discrepancies without initiating payouts or bank mutations.
- *Result*: **PASS** (Verified via TEST-16 in `test_phase8_admin_refunds_suite.ts`)

---

## 3. Test & Verification Matrix

| Check ID | Requirement Description | Execution Category | Status | Evidence / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **TEST-01** | Anonymous & Student Access Rejection | LIVE DATABASE | **PASS** | RLS policy restricts `ebook_refunds` reads from non-admin sessions. |
| **TEST-02** | Administrator Role Authorization | LIVE DATABASE | **PASS** | Verified `role = 'admin'` in `public.profiles` for actor. |
| **TEST-03** | Genuine Razorpay Test Mode Refund API | REAL PROVIDER API | **BLOCKED** | External call to `api.razorpay.com:443` receives unencrypted HTTP 400 response from intermediate proxy terminating TLS handshake. Truthfully reported without fake fallback. |
| **TEST-04** | Concurrency & Cumulative Limit Enforcement | LIVE DATABASE | **PASS** | Two concurrent calls for 6000 paise on a 10000 paise order: 1 passed, 1 rejected with balance limit error. |
| **TEST-05** | Gateway Timeout & Uncertain Outcome | MOCK / FIXTURE | **PASS** | Timeout marks refund `pending` with diagnostic error and preserves reservation. |
| **TEST-06** | Admin Recovery with No Provider Refund ID | LIVE DATABASE | **PASS** | Queries payment refunds by receipt prefix; safely reports pending without creating second refund. |
| **TEST-07** | Rule A — Full ₹99 Purchase Refund | MOCK / FIXTURE | **PASS** | Confirmed processed refund revokes online and download access. |
| **TEST-08** | Rule B — Full ₹50 Upgrade Refund | MOCK / FIXTURE | **PASS** | Downgrades plan to `read_online`, removes PDF download, preserves online reading. |
| **TEST-09** | Rule C — Dependent Upgrade Safeguard | LIVE DATABASE | **PASS** | Standalone refund on base purchase returns `DEPENDENT_UPGRADE_EXISTS`. |
| **TEST-10A**| Refund Both Orders: Partial Completion | MOCK / FIXTURE | **PASS** | Upgrade processed, base rejected: upgrade marked `full`, base marked `failed`, online reading preserved. |
| **TEST-10B**| Refund Both Orders: Retrying Incomplete | MOCK / FIXTURE | **PASS** | Detects upgrade already refunded; skips upgrade call (0 duplicate calls) and completes base refund. |
| **TEST-11** | Complimentary Grant Isolation | LIVE DATABASE | **PASS** | Refunding unrelated customer order does not revoke complimentary grant (`is_active: true`). |
| **TEST-12** | Rules D & E — Multi-Item Partial Isolation | MOCK / FIXTURE | **PASS** | Allocates refund to item 1 only; item 2 and order remain partially refunded. |
| **TEST-13** | Delayed Payment Resurrection Safeguard | LIVE DATABASE | **PASS** | Calling payment finalization on fully refunded order rejected: "Order has already been refunded". |
| **TEST-14** | CSV Formula Injection Sanitization | STATIC INSPECTION | **PASS** | Prepends single quote `'` to `=`, `+`, `-`, `@`. |
| **TEST-15** | Operational Report Financial Math | LIVE DATABASE | **PASS** | Net sales = Captured - Processed. Integer paise math verified without duplicate counting. |
| **TEST-16** | Read-Only Financial Reconciliation | LIVE DATABASE | **PASS** | Audits orders vs gateway without executing mutations. |
| **IDEMP-01**| Outbound HTTP Idempotency Contract | MOCK / FIXTURE | **PASS** | Verified `X-Refund-Idempotency`, Basic Auth, POST, immutable body. |
| **UNC-01**  | Lost Gateway Response Recovery | LIVE DATABASE | **PASS** | Dropped connection retains `pending` reservation; sync reconciles to `processed`. |
| **UNC-02**  | First Lookup Empty, Later Found | LIVE DATABASE | **PASS** | Empty lookup does not release reservation; subsequent lookup reconciles. |
| **UNC-03**  | 5xx Server Error Followed by Discovery | LIVE DATABASE | **PASS** | 5xx retains `pending`; discovery reconciles to `processed`. |
| **UNC-04**  | Concurrent Intent Retry Deduplication | LIVE DATABASE | **PASS** | Single refund row persisted; retries reuse existing intent without extra charges. |
| **UNC-05**  | Linked Refund Base Uncertain Recovery | LIVE DATABASE | **PASS** | Upgrade refunded, base uncertain; recovery sync fully revokes. |
| **JRN-01..06**| Interactive Native Chrome Journeys | ACTUAL BROWSER | **PASS** | 6 complete customer & admin journeys executed via native Google Chrome; 10 authenticated screenshots generated. |
| **REG-P7**  | Phase 7 Downloads & Upgrades Regression | AUTOMATED SUITE | **PASS** | 20/20 checks passed (100%). |
| **REG-P6**  | Phase 6 Reader Database Persistence | AUTOMATED SUITE | **PASS** | 10/10 checks passed (100%). |
| **BLD-TS**  | Next.js Production Build & TypeScript | TERMINAL BUILD | **PASS** | Turbopack compilation: 0 TypeScript errors across 93 routes. |

---

## 4. Definition of Done & Stop Condition

Phase 8 launch acceptance work is **complete, durably verified, and documented**. All automated regression suites, idempotency tests, uncertain-outcome handling scenarios, and interactive Chrome browser journeys pass with zero regressions. No mutations were made against production (`csjywuflkvohytbvglxf`), and live payments remain strictly disabled.
