# KnowledgePaat eBook Platform: Production-Readiness Checklist (Corrected)

**Audit Target:** KnowledgePaat Staging & Production Read-Only Verification  
**Dedicated Staging Supabase:** `lzuinimbsdxnhzmjpxmr` (`https://lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Protected Production Supabase:** `csjywuflkvohytbvglxf` (`https://csjywuflkvohytbvglxf.supabase.co`)  
**Payment Gateway Mode:** Razorpay Test Mode (`rzp_test_...`)  
**Repository Branch / Commit SHA:** `ebook-storefront` / `d0c857e48a6d3468fc7b854c7576117cc247122a`  
**Application Root:** `frontend` (Next.js 16.3.0 on Node.js v20.20.2)  
**Audit Re-Verification Date:** October 24, 2026  

---

## 1. Executive Status Summary Matrix

| Section | Audit Domain | Total Checks | PASS | FAIL | BLOCKED | UNVERIFIED |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| 1 | Vercel Deployment & Environment Guards | 10 | 8 | 0 | 1 | 1 |
| 2 | Secrets, Authentication & Authorisation | 10 | 10 | 0 | 0 | 0 |
| 3 | Registration, Verification & Email | 10 | 7 | 0 | 3 | 0 |
| 4 | Storefront, Catalogue & Pricing | 12 | 12 | 0 | 0 | 0 |
| 5 | Payments, Webhooks & Fulfilment | 11 | 9 | 0 | 2 | 0 |
| 6 | Library, Reader, Downloads & Upgrades | 20 | 20 | 0 | 0 | 0 |
| 7 | Receipts, Cron & Background Processing | 14 | 12 | 0 | 2 | 0 |
| 8 | Refunds and Admin Operations | 17 | 17 | 0 | 0 | 0 |
| 9 | Performance, Rate Limiting & Capacity | 12 | 8 | **2** | 2 | 0 |
| 10 | Operations, UX & Launch Recovery | 10 | 8 | 0 | 0 | **2** |
| **TOTAL** | **All 10 Audit Domains** | **126** | **111** | **2** | **10** | **3** |

*Status Criteria:*
- **PASS:** Empirically verified via live execution against authorized staging environment or verified source invariant.
- **FAIL:** Executed check failed stated acceptance threshold (e.g., error rate >= 0.1% or latency p95 >= 500ms).
- **BLOCKED:** Cannot be executed due to unconfigured external service credentials, lack of inbound DNS/tunnel, or security safety policy.
- **UNVERIFIED:** Claimed or proposed event cannot be definitively established from authorized, verifiable audit artifacts.

---

## 1. Vercel Deployment & Environment Guards

| ID | Requirement | Env | Status | Evidence Type | Method / Command | Evidence & Findings | Remaining Action / Dependency |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1.1 | Repository root, branch & commit SHA | Local | **PASS** | Source inspection | `git rev-parse HEAD`, `git status -s` | Clean git status on `ebook-storefront`, SHA `d0c857e48a6d3468fc7b854c7576117cc247122a`. | Push approved branch to remote origin before deployment. |
| 1.2 | Framework & build configuration | Staging | **PASS** | Unit / Build test | `npm run build` | Next.js 16.3.0, Node.js 20.20.2; 94/94 static and dynamic routes compiled with 0 errors. | Maintained in `package.json` and `next.config.ts`. |
| 1.3 | Vercel configuration file | Staging | **PASS** | Source inspection | Inspection of `frontend/vercel.json` | Configures `framework: nextjs`, cron paths, and root directory `frontend`. | Deploy via Vercel dashboard or CLI. |
| 1.4 | Remote Vercel preview/staging deployment URL | Remote | **BLOCKED** | Remote Vercel verification | `vercel whoami` / dashboard check | Vercel CLI is unauthenticated in local container; no remote Vercel deployment token present. | Requires account owner login with Vercel deployment token. |
| 1.5 | Staging / Production separation guard | Staging | **PASS** | Live staging API test | `scratch/test_vercel_readiness_and_client_ip.ts` (Test 5) | Throws `FAIL-CLOSED` error if `csjywuflkvohytbvglxf` connection attempted from staging. | Preserve fail-closed check in `utils/supabase/server.ts`. |
| 1.6 | Staging Supabase and Test Mode payments | Staging | **PASS** | Source inspection | `.env.local` inspection | Target endpoint is `lzuinimbsdxnhzmjpxmr`, Razorpay key is `rzp_test_...`. | Production credentials kept in `.env.production.local`. |
| 1.7 | Test-only endpoints isolated from production | Staging | **PASS** | Source inspection | Inspection of `app/api/admin/ebooks/reconciliation` | Endpoint enforces `process.env.NODE_ENV !== 'production'`. | Prevent deployment with `NODE_ENV=test`. |
| 1.8 | Stateless application processes (No `/tmp` / memory state) | Staging | **PASS** | Source inspection | Route handler audit | Application state in PostgreSQL; PDFs stream directly from Supabase Storage without `/tmp`. | None. |
| 1.9 | Deployed routes render interactive UI | Staging | **PASS** | Live staging API test | `curl -s http://localhost:3000/e-books` | Returns HTTP 200 with full 139KB HTML payload, metadata, and search controls. Note: Proves local server, not remote CDN. | Verify on remote Vercel domain post-deployment. |
| 1.10 | Custom domain & canonical redirects | Remote | **UNVERIFIED** | Remote DNS verification | DNS query `knowledgepaat.com` | Production DNS currently points to live legacy host. Staging DNS cutover intentionally preserved. | Perform post-cutover verification. |

---

## 2. Secrets, Authentication, and Authorisation

| ID | Requirement | Env | Status | Evidence Type | Method / Command | Evidence & Findings | Remaining Action / Dependency |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 2.1 | Secrets absent from tracked git files | Local | **PASS** | Source inspection | `scripts/test_deep_security_audit.ts` | Zero private API keys, service role keys, or database passwords in tracked repository files. | Automated pre-commit git secrets hook recommended. |
| 2.2 | Secrets absent from client browser bundles | Staging | **PASS** | Source inspection | `scripts/test_phase9_e2e_suite.ts` (Test 6.6) | Client bundles expose only `NEXT_PUBLIC_*` safe publishable keys (2 keys verified). | None. |
| 2.3 | Service-role credentials remain server-only | Staging | **PASS** | Source inspection | Code audit `utils/supabase/server.ts` | `SUPABASE_SERVICE_ROLE_KEY` referenced only inside server-side route handlers. | None. |
| 2.4 | Authoritative Supabase Auth session verification | Staging | **PASS** | Live staging API test | `lib/ebook/customerAuth.ts` | Authenticates via `supabase.auth.getUser()`; browser-supplied IDs and JWT payloads ignored. | None. |
| 2.5 | Server-enforced Role-Based Access Control (RBAC) | Staging | **PASS** | Live staging API test | `scripts/test_phase9_e2e_suite.ts` (Test 6.1) | Non-admin users (`role: student`) receive HTTP 403 on all `/api/admin/ebooks/*` endpoints. | None. |
| 2.6 | Authoritative database RPC security | Staging | **PASS** | Live staging database test | `scripts/test_phase9_e2e_suite.ts` (Test 6.5) | Anonymous RPC calls to administrative procedures rejected by PostgreSQL security policies. | None. |
| 2.7 | Database and Storage RLS customer isolation | Staging | **PASS** | Live staging database test | `scripts/test_phase6_reader_suite.ts` (Test 5) | Customer A cannot view or modify Customer B's orders, entitlements, bookmarks, or progress. | None. |
| 2.8 | Anonymous requests rejected on protected APIs | Staging | **PASS** | Live staging API test | `scripts/test_phase6_reader_suite.ts` (Test 1) | Unauthenticated requests receive HTTP 401 with standard `UNAUTHENTICATED` error code. | None. |
| 2.9 | Private PDF storage anonymous access denied | Staging | **PASS** | Live staging database test | `scripts/test_phase9_e2e_suite.ts` (Test 6.3) | Direct public URL access to `ebook-pdfs` private bucket returns HTTP 400 NoSuchBucket. | Bucket privacy maintained in Supabase. |
| 2.10 | Safe redirect destinations enforce internal paths | Staging | **PASS** | Unit / Mocked test | `lib/safeRedirect.ts` unit tests | External destinations (`https://evil.com`), protocol-relative URLs (`//evil.com`), and `javascript:` schemes rejected. | None. |

---

## 3. Registration, Verification, and Email

| ID | Requirement | Env | Status | Evidence Type | Method / Command | Evidence & Findings | Remaining Action / Dependency |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 3.1 | Registration and login flows | Staging | **PASS** | Live staging API test | `scratch/test_phase1_auth_verification.js` | User registration and password authentication succeed against staging GoTrue. | None. |
| 3.2 | Existing live accounts and purchases preserved | Live DB | **PASS** | Read-only database query | Read-only check against `csjywuflkvohytbvglxf` | Existing user profiles and live tables remain intact; zero `DELETE` or `DROP TABLE` executed. | None. |
| 3.3 | Branded authentication email templates | Local | **PASS** | Source inspection | Inspection of `lib/email/templates.ts` | Templates prepared in source code with KnowledgePaat branding, logo, and OTP layout. | Must be installed into Supabase Auth Dashboard. |
| 3.4 | Supabase Auth Custom SMTP / Send Email hook | Staging | **BLOCKED** | Staging provider audit | GoTrue auth config check | External SMTP credentials (AWS SES / Resend) not configured in staging Supabase dashboard. | Configure custom SMTP provider in Supabase Auth settings. |
| 3.5 | Application transactional receipt transport | Staging | **BLOCKED** | Staging provider audit | `scripts/test_phase9_e2e_suite.ts` (Test 5.3) | `RESEND_API_KEY` omitted in `.env.local`. Outbox queue records job but skips network dispatch. | Provide `RESEND_API_KEY` for live transactional emails. |
| 3.6 | Sending domain DNS verification (SPF/DKIM/DMARC) | Remote | **BLOCKED** | Remote DNS verification | DNS TXT query `knowledgepaat.com` | Custom transactional email domain records pending DNS registrar addition. | Add SPF, DKIM CNAMEs, and DMARC record to DNS. |
| 3.7 | OTP input length matches actual GoTrue configuration | Staging | **PASS** | Live staging API test | `scratch/test_genuine_otp_verification.js` | Staging GoTrue generates **8-digit numeric OTPs** (e.g. `70132325`); UI handles `maxLength={8}`. | Verify production GoTrue OTP length matches (typically 6 or 8 digits). |
| 3.8 | Invalid, expired, and reused OTP codes fail | Staging | **PASS** | Live staging API test | `scratch/test_genuine_otp_verification.js` | Wrong OTP and reused OTP return HTTP 403 `Token has expired or is invalid`. | None. |
| 3.9 | Rate limiting & resend cooldown on verification | Staging | **PASS** | Source inspection & unit test | `lib/rateLimit.ts` policies | Resend cooldown enforced; burst signups capped at 10 requests per 15 minutes per IP. | None. |
| 3.10 | Post-confirmation session & return destination survive | Staging | **PASS** | Live staging API test | `scratch/test_genuine_otp_verification.js` | Verification exchange returns valid access token (903 chars) and establishes authenticated session. | None. |

---

## 4. Storefront, Catalogue, and Pricing

| ID | Requirement | Env | Status | Evidence Type | Method / Command | Evidence & Findings | Remaining Action / Dependency |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4.1 | Public catalogue browsing requires no login | Staging | **PASS** | Live staging API test | `scripts/test_phase9_e2e_suite.ts` (Test 3.A) | Unauthenticated GET `/api/ebooks` returns HTTP 200 with public book list. | None. |
| 4.2 | Free sample chapters accessible anonymously | Staging | **PASS** | Live staging API test | `scripts/test_phase6_reader_suite.ts` (Test 10) | GET `/api/ebooks/[id]/sample/[chapterId]` returns sample content without session. | None. |
| 4.3 | Draft and withdrawn books excluded from public listing | Staging | **PASS** | Live staging database test | `scripts/test_phase6_reader_suite.ts` (Test 8) | Public query filters by `status = 'published'`; drafts hidden. | None. |
| 4.4 | Public responses exclude paid bodies and PDF paths | Staging | **PASS** | Live staging API test | `scripts/test_phase6_reader_suite.ts` (Test 20) | Content bodies omitted; `pdf_storage_path` nullified; `can_download_pdf: false`. | None. |
| 4.5 | Search, category filtering, and sorting | Staging | **PASS** | Live staging API test | `curl http://localhost:3000/api/ebooks?q=cloud&sort=price_low` | Returns filtered, sorted results; pagination meta matches returned books. | None. |
| 4.6 | Deterministic server pagination (10 books/page) | Staging | **PASS** | Live staging API test | API query verification | Query returns exactly `limit=10` items with matching `total`, `page`, and `totalPages`. | None. |
| 4.7 | Out-of-range pagination recovery | Staging | **PASS** | Live staging API test | `curl http://localhost:3000/api/ebooks?page=999` | Returns empty array `books: []`, HTTP 200, clean recovery with `totalPages` indicator. | None. |
| 4.8 | Authoritative admin-controlled pricing | Staging | **PASS** | Live staging API test | `scripts/test_phase9_e2e_suite.ts` (Test 4.4) | Server validates prices against database; tampered client price (₹10) rejected. | None. |
| 4.9 | Checkout revalidates pricing and active ownership | Staging | **PASS** | Live staging API test | `scripts/test_phase9_e2e_suite.ts` (Test 4.5) | Duplicate purchases of already-owned titles blocked with ownership alert. | None. |
| 4.10 | Paid orders retain immutable financial snapshots | Staging | **PASS** | Live staging database test | `scripts/test_phase7_downloads_suite.ts` (Test 16) | `ebook_orders` stores frozen `total_amount_paise`, currency, and item snapshots. | None. |
| 4.11 | Multi-instance cache invalidation (Tag Epochs) | Staging | **PASS** | Live staging database test | `scratch/test_cache_invalidation_correctness_and_cost.ts` (6/6 PASS) | CAS monotonic increments in `ebook_webhook_events` invalidate cross-instance memory caches within 2.5s. | None. |
| 4.12 | In-flight stale cache overwrite fencing | Staging | **PASS** | Unit / Integration test | `scratch/test_cache_invalidation_correctness_and_cost.ts` (Test 3) | Pre-invalidation slow fetches fenced from overwriting newer cache entries. | None. |

---

## 5. Payments, Webhooks, and Fulfilment

| ID | Requirement | Env | Status | Evidence Type | Method / Command | Evidence & Findings | Remaining Action / Dependency |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 5.1 | Webhook handler route resolution | Staging | **PASS** | Source inspection | Inspection of `payments/razorpay/webhook` & `ebooks/orders/webhook` | Both routes resolve to unified `handleEBookWebhook(rawBody, signature)` logic. | Maintain single handler core. |
| 5.2 | Razorpay Test Mode credentials & order creation | Staging | **PASS** | Genuine provider execution | `scripts/test_phase5_api_checkout_suite.ts` (Test 1) | Created genuine test order `order_TrfgTHkFVFGhZg` for ₹50 via Razorpay Test Gateway API. | Live credentials required for production cutover. |
| 5.3 | Raw-body HMAC-SHA256 signature verification | Staging | **PASS** | Live staging API test | `scripts/test_phase5_api_checkout_suite.ts` (Test 4) | Valid signature accepted; altered payload signature rejected. | None. |
| 5.4 | Trusted stored gateway order association | Staging | **PASS** | Live staging database test | `scripts/test_phase5_api_checkout_suite.ts` (Test 3) | Order fulfillment verifies `gateway_order_id` matches persisted database record. | None. |
| 5.5 | Exact amount, currency, and captured status validation | Staging | **PASS** | Live staging API test | `scripts/test_phase5_api_checkout_suite.ts` (Test 3) | Mismatched amount (₹1 vs ₹49) fails closed without granting access. | None. |
| 5.6 | Pending, failed, or forged payments grant no access | Staging | **PASS** | Live staging database test | `scripts/test_phase9_e2e_suite.ts` (Test 4.1) | Failed order `ORD-P9-FAIL-...` produces 0 active entitlements. | None. |
| 5.7 | Atomic payment fulfillment via database transaction | Staging | **PASS** | Live staging database test | `scripts/test_phase5_api_checkout_suite.ts` (Test 5) | RPC `fulfill_ebook_order` atomically updates order and inserts entitlement. | None. |
| 5.8 | Idempotent duplicate verification & webhook replays | Staging | **PASS** | Live staging API test | `scripts/test_phase5_api_checkout_suite.ts` (Test 6) | Replaying verified payment returns `already_paid: true` with 0 duplicate grants. | None. |
| 5.9 | Check-payment-status recovery is authenticated | Staging | **PASS** | Live staging API test | `scripts/test_phase5_api_checkout_suite.ts` (Test 7) | `/api/ebooks/orders/[id]/check-status` requires authenticated customer matching order. | None. |
| 5.10 | Live inbound webhook delivery via public HTTPS | Remote | **BLOCKED** | Staging provider audit | Inbound webhook audit | No public staging HTTPS tunnel/endpoint configured for inbound Razorpay webhook dispatch. Local signature verified. | Configure webhook URL in Razorpay Dashboard post-deployment. |
| 5.11 | Live production financial payment execution | Remote | **BLOCKED** | Safety Protocol | Boundary enforcement | Live card/UPI execution blocked by audit safety bounds. | Execute authorized test transaction post-launch. |

---

## 6. Library, Reader, Downloads, and Upgrades

| ID | Requirement | Env | Status | Evidence Type | Method / Command | Evidence & Findings | Remaining Action / Dependency |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 6.1 | Customer library customer isolation | Staging | **PASS** | Live staging API test | `scripts/test_phase6_reader_suite.ts` (Test 5) | Customer A receives HTTP 403 trying to read Customer B's purchased book. | None. |
| 6.2 | Purchased edition IDs remain pinned | Staging | **PASS** | Live staging database test | `scripts/test_phase6_reader_suite.ts` (Test 8) | Customer retains access to purchased historical Edition 1 after Edition 2 published. | None. |
| 6.3 | Access revocation immediately blocks requests | Staging | **PASS** | Live staging API test | `scripts/test_phase6_reader_suite.ts` (Test 7) | Setting `is_active: false` immediately yields HTTP 403 `ACCESS_REVOKED`. | None. |
| 6.4 | Parameter manipulation cannot bypass ownership | Staging | **PASS** | Live staging API test | `scripts/test_phase6_reader_suite.ts` (Test 6) | Tampered chapter ID returns HTTP 404; unowned book returns HTTP 403. | None. |
| 6.5 | Reading progress persists across sessions | Staging | **PASS** | Live staging API test | `scripts/test_phase6_reader_suite.ts` (Test 12) | Saved scroll position (65.5%) faithfully retrieved after simulated reload. | None. |
| 6.6 | Reading bookmarks persist and remain user-scoped | Staging | **PASS** | Live staging database test | `scripts/test_phase6_reader_suite.ts` (Test 15) | Customer bookmarks isolated; User B sees 0 bookmarks from User A. | None. |
| 6.7 | Book search cannot disclose unowned content | Staging | **PASS** | Live staging API test | `scripts/test_phase6_reader_suite.ts` (Test 16) | Full-text search on unowned book returns HTTP 403; owned book returns matching snippets. | None. |
| 6.8 | Reader HTML content sanitized against XSS | Staging | **PASS** | Unit / Static inspection | `scripts/test_phase6_reader_suite.ts` (Test 17) | Malicious `<script>` tags and `onerror` handlers stripped from rendered output. | None. |
| 6.9 | Online-only plans cannot obtain PDF download links | Staging | **PASS** | Live staging API test | `scripts/test_phase7_downloads_suite.ts` (Test 2) | ₹49 Read Online owner receives HTTP 403 `UPGRADE_REQUIRED` on download request. | None. |
| 6.10 | Eligible owners receive correct private PDF stream | Staging | **PASS** | Live staging API test | `scripts/test_phase7_downloads_suite.ts` (Test 3) | ₹99 Read + Download owner receives 329 bytes with valid `%PDF-1.4` binary header. | None. |
| 6.11 | Signed download URLs expire within 60 seconds | Staging | **PASS** | Live staging API test | `scripts/test_phase7_downloads_suite.ts` (Test 9) | Signed URL issued with 60s configurable expiry; re-fetching after expiry returns HTTP 400. | None. |
| 6.12 | Download response headers disable shared caching | Staging | **PASS** | Live staging API test | `scripts/test_phase7_downloads_suite.ts` (Test 9) | Serves `Cache-Control: private, no-store, max-age=0` to prevent CDN caching. | None. |
| 6.13 | Authoritative upgrade quote calculation | Staging | **PASS** | Live staging API test | `scripts/test_phase7_downloads_suite.ts` (Test 11) | Eligible online owner receives authoritative quote for target edition. | None. |
| 6.14 | Non-owners and already-upgraded users denied upgrade | Staging | **PASS** | Live staging API test | `scripts/test_phase7_downloads_suite.ts` (Test 12) | Non-owner receives `eligible: false` ("You do not own Read Online access"). | None. |
| 6.15 | Genuine Test Mode payment upgrades entitlement | Staging | **PASS** | Genuine provider execution | `scripts/test_phase7_downloads_suite.ts` (Test 13) | Upgrades plan to `read_download` and activates `can_download_pdf: true` atomically. | None. |
| 6.16 | Failed/uncaptured upgrade payment grants no PDF | Staging | **PASS** | Live staging API test | `scripts/test_phase7_downloads_suite.ts` (Test 14) | Forged signature or failed payment grants no download permission. | None. |
| 6.17 | Repeated upgrade finalization is idempotent | Staging | **PASS** | Live staging API test | `scripts/test_phase7_downloads_suite.ts` (Test 15) | Re-verifying upgrade returns `already_paid: true` with zero duplicate grants. | None. |
| 6.18 | Original purchase record unchanged after upgrade | Staging | **PASS** | Live staging database test | `scripts/test_phase7_downloads_suite.ts` (Test 16) | Original order remains intact; upgrade order recorded as separate transaction. | None. |
| 6.19 | Progress and bookmarks survive entitlement upgrade | Staging | **PASS** | Live staging database test | `scripts/test_phase7_downloads_suite.ts` (Test 17) | Progress position (42.5%) and bookmark IDs survive elevation without reset. | None. |
| 6.20 | Customer purchase history displays both transactions | Staging | **PASS** | Live staging database test | `scripts/test_phase7_downloads_suite.ts` (Test 18) | Customer history correctly displays both the base and upgrade invoices. | None. |

---

## 7. Receipts, Cron, and Background Processing

| ID | Requirement | Env | Status | Evidence Type | Method / Command | Evidence & Findings | Remaining Action / Dependency |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 7.1 | Receipt jobs durably enqueued with fulfillment | Staging | **PASS** | Source inspection | Inspection of `lib/ebook/fulfillment.ts` | Fulfillment atomically enqueues outbox record into `ebook_receipt_outbox`. | None. |
| 7.2 | Atomic conditional claim on receipt outbox | Staging | **PASS** | Live staging database test | `scratch/test_exclusive_receipt_claims.ts` (Test 1) | Synchronization barrier: exactly 1 worker claimed job; non-winners conceded with 0 duplicate sends. | None. |
| 7.3 | Expired lease reclamation for crashed workers | Staging | **PASS** | Live staging database test | `scratch/test_exclusive_receipt_claims.ts` (Test 2) | Expired worker lease successfully reclaimed by recovery worker. | None. |
| 7.4 | Stale worker fencing on completion | Staging | **PASS** | Live staging database test | `scratch/test_exclusive_receipt_claims.ts` (Test 3) | Worker with superseded claim token fenced from marking job complete or overwriting state. | None. |
| 7.5 | Terminal failure threshold (5 attempts max) | Staging | **PASS** | Live staging database test | `scratch/test_receipt_worker_reliability.ts` (Test 2) | Unrecoverable jobs marked `failed` after 5 attempts; retries cease. | None. |
| 7.6 | Exponential backoff on retryable failures | Staging | **PASS** | Source inspection | Code audit `lib/ebook/receipts.ts` | Calculates retry delay as `min(300, 5 * 2^attempt)` seconds. | None. |
| 7.7 | Provider idempotency keys on outbound email | Staging | **PASS** | Source inspection | Code audit `lib/email/receiptTransport.ts` | Dispatches with `Idempotency-Key: receipt_${orderId}_${jobId}`. | None. |
| 7.8 | Email failures do not roll back access | Staging | **PASS** | Live staging API test | `scripts/test_phase5_api_checkout_suite.ts` (Test 5.3) | Missing email credentials logs error; customer entitlement remains fully active. | None. |
| 7.9 | Cron endpoints protected by secret header | Staging | **PASS** | Live staging API test | `scratch/test_exclusive_receipt_claims.ts` | Calling `/api/ebooks/receipts/process-outbox` without `Bearer CRON_SECRET` returns HTTP 401. | None. |
| 7.10 | Deployed external scheduler configuration | Remote | **BLOCKED** | Remote Vercel verification | `frontend/vercel.json` audit | `vercel.json` configures `*/5 * * * *`, but requires deployment to active Vercel project. | Configure recurring cron trigger hitting receipt endpoint. |
| 7.11 | Outbound transactional SMTP/API provider setup | Remote | **BLOCKED** | Remote provider audit | Resend dashboard check | Transactional API key and sending domain records pending configuration. | Configure `RESEND_API_KEY` in environment variables. |
| 7.12 | High-throughput concurrent worker reliability | Staging | **PASS** | Live staging database test | `scratch/test_receipt_worker_reliability.ts` (Test 1) | 5 concurrent workers processed 20 distinct jobs with 0 duplicate deliveries. | None. |
| 7.13 | Terminal outbox error alerting & visibility | Staging | **PASS** | Live staging database test | Query `ebook_receipt_outbox` | Permanently failed jobs retain `last_error` and are visible in admin reports. | None. |
| 7.14 | No unhandled fire-and-forget background promises | Staging | **PASS** | Source inspection | Route handler audit | Background work queued durably in database rather than unhandled floating promises. | None. |

---

## 8. Refunds and Admin Operations

| ID | Requirement | Env | Status | Evidence Type | Method / Command | Evidence & Findings | Remaining Action / Dependency |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 8.1 | Admin refund API role verification | Staging | **PASS** | Live staging API test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 1) | Student role rejected with HTTP 403; admin role authorized. | None. |
| 8.2 | Provider test refund execution | Staging | **PASS** | Genuine provider execution | `scripts/test_phase8_admin_refunds_suite.ts` (Test 2) | Processed refund via Gateway Test Mode API; recorded provider refund ID. | Live refunds require production cutover. |
| 8.3 | Cumulative refund limit enforcement | Staging | **PASS** | Live staging database test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 3) | Attempting to refund beyond order total rejected (`EXCEEDS_ORDER_TOTAL`). | None. |
| 8.4 | Concurrent refund race protection via row locks | Staging | **PASS** | Live staging database test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 4) | Concurrent requests serialize via PostgreSQL `FOR UPDATE`; double refund prevented. | None. |
| 8.5 | Uncertain gateway timeout handling | Staging | **PASS** | Unit / Mocked test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 5) | Gateway timeout leaves refund `pending` with reservation retained; entitlement protected. | None. |
| 8.6 | Admin recovery sync without duplicate refunds | Staging | **PASS** | Live staging database test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 6) | Sync checks gateway state before re-attempting; zero duplicate charges. | None. |
| 8.7 | Rule A: Full base refund revokes all access | Staging | **PASS** | Unit / Mocked test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 7) | Full refund revokes both online reading and PDF download permissions. | None. |
| 8.8 | Rule B: Full upgrade refund downgrades access | Staging | **PASS** | Unit / Mocked test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 8) | Upgrade refund revokes PDF access while keeping online reading intact. | None. |
| 8.9 | Rule C: Active upgrade blocks standalone base refund | Staging | **PASS** | Live staging database test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 9) | Base refund rejected with `DEPENDENT_UPGRADE_EXISTS` until upgrade resolved. | None. |
| 8.10 | Rule D: "Refund Both Orders" partial completion | Staging | **PASS** | Unit / Mocked test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 10A) | Upgrade processed, base rejected -> yields `upgrade_processed_base_failed` truthfully. | None. |
| 8.11 | Rule E: Retrying incomplete "Refund Both Orders" | Staging | **PASS** | Unit / Mocked test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 10B) | Retry skips already-processed upgrade (0 gateway calls) and only retries base order. | None. |
| 8.12 | Complimentary grants immune to order refunds | Staging | **PASS** | Live staging database test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 11) | Admin complimentary access retains `is_active: true` during customer order refunds. | None. |
| 8.13 | Partial order refunds isolate allocated items | Staging | **PASS** | Unit / Mocked test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 12) | Refunding Item 1 revokes Item 1 while leaving unrefunded Item 2 active. | None. |
| 8.14 | Delayed payment callbacks cannot resurrect refunds | Staging | **PASS** | Live staging database test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 13) | Late webhook on refunded order rejected ("Order has already been refunded"). | None. |
| 8.15 | CSV formula injection sanitization (CWE-1236) | Staging | **PASS** | Unit / Static inspection | `scripts/test_phase8_admin_refunds_suite.ts` (Test 14) | Prefixes `=, +, -, @` safely prepended with `'` and enclosed in RFC 4180 quotes. | None. |
| 8.16 | Admin operational report integer-paise math | Staging | **PASS** | Live staging database test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 15) | Gross, net, and refund calculations use exact integer paise with zero duplicate counting. | None. |
| 8.17 | Read-only financial reconciliation audit | Staging | **PASS** | Live staging database test | `scripts/test_phase8_admin_refunds_suite.ts` (Test 16) | Audited local database orders against gateway orders without applying any mutations. | None. |

---

## 9. Performance, Rate Limiting, and Capacity

| ID | Requirement | Env | Status | Evidence Type | Method / Command | Evidence & Findings | Remaining Action / Dependency |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 9.1 | Vercel-aware client-IP resolution | Staging | **PASS** | Live staging API test | `scratch/test_proxy_authentication.ts` (Test 1) | Extracts client IP from verified ingress headers; direct origin access ignores spoofed headers. | None. |
| 9.2 | Spoofed forwarding headers cannot bypass limits | Staging | **PASS** | Live staging API test | `scratch/test_proxy_authentication.ts` (Test 2) | Direct origin connections reject arbitrary `X-Forwarded-For` and use remote address. | None. |
| 9.3 | Distinct legitimate clients tracked separately | Staging | **PASS** | Live staging API test | `scratch/test_proxy_authentication.ts` (Test 3) | Distinct verified clients maintain independent rate limit counters. | None. |
| 9.4 | Shared rate limiting across restarts | Staging | **PASS** | Live staging database test | `scratch/test_proxy_and_limiter_audit.js` | Rate limit counters persist in PostgreSQL rate-limit table across server restarts. | Redis/Upstash recommended for multi-region scale. |
| 9.5 | Cache-hit database overhead is zero | Staging | **PASS** | Live staging API test | `scratch/test_cache_invalidation_correctness_and_cost.ts` (Test 5) | Warm cache hits execute 0 PostgreSQL queries. Measured latency: 3.8ms. | None. |
| 9.6 | Private customer data excluded from shared caches | Staging | **PASS** | Live staging API test | Header inspection on `/api/ebooks/my-books` | Returns `Cache-Control: private, no-store, no-cache, must-revalidate`. | None. |
| 9.7 | Public read API latency SLA (p95 < 500ms at <= 50 VUs) | Staging | **PASS** | Live staging benchmark | Controlled capacity test (50 VUs) | 50 VUs at 283.8 RPS: p50 = 122.7ms, **p95 = 234.8ms**, 0.00% errors. Target met. | Maintain concurrency limits within capacity. |
| 9.8 | Protected read API latency SLA (p95 < 1000ms) | Staging | **PASS** | Live staging benchmark | `scratch/run_authenticated_workload_benchmarks.ts` | Authenticated reading p95: 569.5ms (target < 1000ms met). | None. |
| 9.9 | Unexpected error rate target (< 0.1% at <= 50 VUs) | Staging | **PASS** | Live staging benchmark | Controlled capacity test (50 VUs, 2317 reqs) | Exactly 0 errors observed out of 2,317 requests (0.00% error rate). Target met. | None. |
| 9.10 | Post-overload recovery | Staging | **PASS** | Live staging benchmark | `scratch/run_comprehensive_load_and_bottleneck.js` (Part 3) | After 5,000 VU stress test, latency immediately recovered to 3.8ms–5.7ms (PASS). | None. |
| 9.11 | High-concurrency workload (100 VUs) | Staging | **FAIL** | Live staging benchmark | `scratch/run_comprehensive_load_and_bottleneck.js` | 100 VUs: Error rate was **1.01%** (24 timeouts / 2375 reqs). **Fails strict < 0.1% SLA.** | Requires process clustering or autoscaling. |
| 9.12 | Peak-scale concurrent capacity (2,000–5,000 VUs) | Staging | **FAIL** | Live staging benchmark | `scratch/run_comprehensive_load_and_bottleneck.js` | 2,000 VUs: 28.29% error rate, p95 12,354ms; 5,000 VUs: 58.76% error rate. **FAILS.** | Single instance cannot support > 100 VUs. Requires horizontal scaling. |

---

## 10. Operations, UX, and Launch Recovery

| ID | Requirement | Env | Status | Evidence Type | Method / Command | Evidence & Findings | Remaining Action / Dependency |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 10.1 | Non-destructive database migration verification | Live DB | **UNVERIFIED** | Read-only database query | Read-only schema probe on `csjywuflkvohytbvglxf` | Tables `ebooks`, `ebook_editions` and columns `feature_flags`, `social_links` exist. However, execution was user-reported without verifiable server-side migration tracking records. Classified UNVERIFIED. | Verify migration tracking log in production database. |
| 10.2 | Database rollback procedure | Staging | **PASS** | Source inspection | Review `supabase/LIVE_ENVIRONMENT_MIGRATION_GUIDE.md` | Contains idempotent reverse migrations and column teardown scripts. | Test restore in isolated staging sandbox. |
| 10.3 | Application deployment rollback | Staging | **PASS** | Architecture inspection | Vercel Git deployment architecture | Instant 1-click rollback to previous commit SHA supported by Vercel deployment history. | Documented in runbook. |
| 10.4 | Mobile responsive layouts (320px, 390px, 430px) | Staging | **PASS** | Actual browser test | Native Chrome headless screenshot audit | Full viewport render verified across small, standard, and large mobile viewports (`2026-10-24`). | None. |
| 10.5 | Tablet responsive layouts (768px) | Staging | **PASS** | Actual browser test | Native Chrome headless screenshot audit | 2-column grid and touch targets meet minimum 44px WCAG requirements (`2026-10-24`). | None. |
| 10.6 | Desktop responsive layouts (1440px) | Staging | **PASS** | Actual browser test | Native Chrome headless screenshot audit | 3-column storefront grid, media carousel, and filters render crisply (`2026-10-24`). | None. |
| 10.7 | Customer-facing error recovery | Staging | **PASS** | Source inspection | Code audit `app/e-books/page.tsx` | Error states display user-friendly messages and "Try Again" button without exposing stack traces. | None. |
| 10.8 | Public legal and support pages | Staging | **PASS** | Live staging API test | Route checks `/about`, `/contact` | Legal terms, contact info, and refund policy pages exist and render properly. | Confirm business address & support email before launch. |
| 10.9 | Physical device validation (iOS Safari / Android Chrome) | Remote | **UNVERIFIED** | Physical device test | Manual testing constraint | Verified in headless desktop Chrome 155 with emulated viewports; physical device touch hardware unverified. | Perform manual smoke test on real iOS Safari & Android Chrome devices. |
| 10.10 | Monitoring and alerting configuration | Staging | **PASS** | Source inspection | Code audit `lib/logger.ts` | Structured logging with error severity levels in place for integration with Sentry/Datadog. | Configure Sentry DSN in production Vercel dashboard. |
