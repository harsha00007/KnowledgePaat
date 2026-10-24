# KnowledgePaat eBook Platform: Production-Readiness Audit Report (Corrected)

**Audit Scope:** Comprehensive Production-Readiness Audit of KnowledgePaat eBook Storefront, Authentication, Payments, Reader, Admin, and Infrastructure  
**Authorised Staging Supabase:** `lzuinimbsdxnhzmjpxmr` (`https://lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Protected Production Supabase:** `csjywuflkvohytbvglxf` (`https://csjywuflkvohytbvglxf.supabase.co`)  
**Payment Gateway Mode:** Razorpay Test Mode (`rzp_test_...`)  
**Repository Branch / Commit SHA:** `ebook-storefront` / `d0c857e48a6d3468fc7b854c7576117cc247122a`  
**Application Root:** `frontend` (Next.js 16.3.0, Node.js v20.20.2)  
**Audit Re-Verification Date:** October 24, 2026  

---

## 1. Executive Summary & Launch Recommendation

An evidence-based production-readiness audit was conducted on the KnowledgePaat website, prioritizing the eBook storefront, authentication, payments, reader, downloads, admin operations, and shared infrastructure. All executions were performed against authorized staging systems with production fail-closed boundary enforcement.

### 1.1 Corrected Audit Totals
Across the 126 individual acceptance criteria evaluated:

| Classification | Count | Percentage | Definition |
| :--- | :---: | :---: | :--- |
| **PASS** | **111** | **88.1%** | Verified via executed tests or authoritative source invariant. |
| **FAIL** | **2** | **1.6%** | High-load concurrency targets (100 VUs and 2,000–5,000 VUs) failed error rate/latency SLAs. |
| **BLOCKED** | **10** | **7.9%** | Blocked by external provider/account configuration (SMTP, live gateway, DNS, Vercel token). |
| **UNVERIFIED** | **3** | **2.4%** | Production migration execution record, remote DNS cutover, and physical mobile hardware testing. |
| **TOTAL** | **126** | **100.0%** | Comprehensive evaluation across all 10 audit areas. |

### 1.2 Recommendation: NO-GO for Live eBook Sales
**The recommendation for live eBook sales is NO-GO.**

This decision is governed by two distinct classes of blockers:
1. **Unresolved External Configuration Blockers (5 items):** Inbound Razorpay webhook delivery, transactional email transport (Resend/SMTP), custom domain DNS records, Supabase Auth custom SMTP, and production Vercel project deployment remain unconfigured. Activating sales without webhooks or email receipts leaves customer purchases unfulfilled and unconfirmed.
2. **Capacity & Concurrency Limitations (2 failed thresholds):** On a single server instance, traffic exceeding 50 concurrent virtual users experiences event-loop saturation and socket timeouts. At 100 VUs, the error rate reached **1.01%**, failing the strict `< 0.1%` SLA. At 2,000–5,000 VUs, error rates reached **28.3%–58.8%**. Launching without horizontal scaling or autoscaling presents a significant operational risk during promotional traffic bursts.

---

## 2. Production Migration Reconciliation

The earlier draft of this report claimed that a migration was executed against production `csjywuflkvohytbvglxf`. An evidence-based reconciliation establishes the following:

- **Migration File:** `supabase/migrations/live_production_complete_migration.sql`
- **File Checksum (SHA-256):** `9dc7c86cc89d6018d52dd85fb97d1ed85816b39de9a20e2350eb25f176ed8cb9`
- **Execution Agency & Boundary:** The audit agent **did not execute** any migration against production, strictly obeying the safety boundary (*"Protected production Supabase: csjywuflkvohytbvglxf. No production mutations"*).
- **Reported Execution:** In conversation on October 24, 2026, the user initially reported an error (`ERROR: 42703: column "social_links" of relation "platform_settings" does not exist`), received a corrected non-destructive script without dummy `INSERT` statements, and subsequently stated: *"i have successfully ran the entire query"*.
- **Read-Only Schema Verification:**
  - Read-only probe against `https://csjywuflkvohytbvglxf.supabase.co` using public anon key verified that tables `public.ebooks` (0 rows) and `public.ebook_editions` (0 rows) exist.
  - Table `public.platform_settings` exists with columns: `['id', 'theme_feature_enabled', 'updated_by', 'updated_at', 'feature_flags', 'social_links']`, with 1 row (`id = 'global'`).
  - The earlier failed execution attempted an `INSERT` on line 95, which failed because `social_links` did not exist. In PostgreSQL, statements outside an explicit transaction block commit independently. The subsequent non-destructive script executed `ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS ...`.
- **Audit Classification:** Because the execution was performed out-of-band by the user via the Supabase Dashboard SQL editor without an audited CI/CD pipeline, cryptographic attestation, or verifiable server-side migration tracking records (`supabase_migrations.schema_migrations`) accessible to the read-only agent, **its formal migration execution status is classified as UNVERIFIED**.

---

## 3. Actual Authentication Configuration

Earlier documentation contained contradictory claims regarding OTP length (claiming 6 digits while earlier test logs noted 8 digits). Re-testing the actual staging environment established:

### 3.1 GoTrue Server Configuration & Empirical Proof
Executing `scratch/test_genuine_otp_verification.js` against staging GoTrue (`https://lzuinimbsdxnhzmjpxmr.supabase.co`) on October 24, 2026 produced:
```
[PASS] Supabase GoTrue generated signup OTP:
  - Code: 70132325 (8 digits)
  - User ID: b8fe07eb-1a46-4107-b18c-f7ac8f9d5475
```
- **GoTrue Code Length:** The staging Supabase project is configured to issue **8-digit numeric OTP codes**, not 6 digits.
- **UI Implementation:** Inspection of `frontend/app/register/page.tsx` confirms:
  - `const cleanDigits = rawVal.replace(/\D/g, '').slice(0, 8);` (line 275)
  - `maxLength={8}` (line 384)
  - `placeholder="••••••••"` (8 dots, line 386)
  - Auto-submits when 8 digits are entered (line 280)
  - Validates `otpCode.length < 6 || isVerifying` for the button disable state (line 402), allowing 6 to 8 digits.

### 3.2 Verification Exchange, Session & Single-Use Enforcement
- **Genuine Verification Exchange:** Submitting `token: '70132325'` returned HTTP 200 with an access token (903 chars), refresh token, and confirmed `email_confirmed_at`.
- **Replay Protection:** Re-submitting the same OTP returned HTTP 403 `Token has expired or is invalid`. Single-use enforcement is strictly preserved.
- **Invalid OTP:** Submitting `00000000` returned HTTP 403 `Token has expired or is invalid`.
- **Post-Verification Session:** Confirmed account successfully logged in and established customer session.
- **Template Separation:** Branded email templates exist in source (`frontend/lib/email/templates.ts`). However, installation into Supabase Auth Dashboard is **BLOCKED/UNCONFIGURED**, and mailbox receipt is **BLOCKED** due to missing staging SMTP credentials.

---

## 4. Separation of Evidence Types

All audit assertions are categorized by their factual evidence type:

1. **Source Inspection:** Static verification of code invariants (e.g., `process.env` references, route definitions, RLS policies).
2. **Unit / Mocked Tests:** Validating algorithmic correctness without network dependencies (e.g., CSV sanitization, redirect sanitization, mocked gateway network timeouts).
3. **Live Staging API / Database Tests:** Executed against running staging server (`http://0.0.0.0:3000`) and staging Supabase (`lzuinimbsdxnhzmjpxmr`).
4. **Actual Browser Tests:** Executed via native Google Chrome headless (v155.0.8059.39) capturing real viewport screenshots across 320px, 390px, 430px, 768px, and 1440px.
5. **Remote Vercel Verification:** Checks executed against remote Vercel infrastructure (currently **BLOCKED** due to unauthenticated CLI container). A localhost curl does not prove remote Vercel deployment.
6. **Genuine Provider Execution:** Genuine API calls executed against external provider endpoints (e.g., Razorpay Gateway API `https://api.razorpay.com/v1/orders` creating genuine test orders).

All live tests cited in this report were re-executed on **October 24, 2026** against commit [`d0c857e48a6d3468fc7b854c7576117cc247122a`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat).

---

## 5. Corrected Caching, Workers, and Cron Architecture

Verification of actual source code and database schemas revealed several corrections to previous descriptions:

### 5.1 Multi-Instance Caching (`frontend/lib/serverCache.ts`)
- **Storage Table:** Cache tag invalidation epochs are stored in table `ebook_webhook_events` with key `event_id = 'tag_epoch:' + tag`. (There is no table named `server_cache_epochs`).
- **Atomic Cache Version Updates:** Monotonic CAS counter increments epoch timestamps in `ebook_webhook_events`.
- **Cross-Instance Propagation:** Clusters poll the shared epoch at interval `EPOCH_CHECK_INTERVAL_MS = 2500` (2.5 seconds maximum propagation delay between instances).
- **In-Flight Invalidation Fencing:** `invalidateServerCache` synchronously advances local epochs immediately upon invocation. Queries completing after invalidation have their fetch start time (`fetchStartedAt`) compared against `tagEpoch.epoch`; stale completes are discarded.
- **Zero Cache-Hit Database Overhead:** Warm cache hits execute 0 PostgreSQL queries. Measured latency: 3.8ms.

### 5.2 Receipt Outbox Worker (`frontend/lib/ebook/receipts.ts`)
- **Lease Duration:** Application code enforces **5 minutes (300,000 ms)**:
  ```typescript
  const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minute lock lease
  ```
  *(Note: The 120-second lease reported previously was a temporary parameter in test fixture `test_exclusive_receipt_claims.ts` to allow lease-expiration testing without 5-minute pauses).*
- **Claim Eligibility:** Outbox queries claim records where `status = 'pending' AND (updated_at IS NULL OR updated_at < staleLeaseCutoff)`.
- **Stale Worker Fencing:** Job completion and failure updates require matching `worker_id` and active lease timestamps. Superseded workers are fenced from updating state.
- **Retry Backoff & Limits:** Max 5 retry attempts. Backoff delay is `min(300, 5 * 2^attempt)` seconds. Outbound requests include `Idempotency-Key: receipt_${orderId}_${jobId}`.
- **Scheduler Frequency:** `frontend/vercel.json` configures cron execution **every 5 minutes (`*/5 * * * *`)**, matching the 5-minute lease duration:
  ```json
  {
    "crons": [{ "path": "/api/ebooks/receipts/process-outbox", "schedule": "*/5 * * * *" }]
  }
  ```

---

## 6. Performance, Capacity, and Bottleneck Profiling

Empirical load tests were executed to determine actual capacity boundaries against the agreed acceptance targets:
- *Target 1 (Latency):* Public read APIs p95 < 500ms; protected read APIs p95 < 1,000ms.
- *Target 2 (Availability):* Unexpected errors < 0.1%.

### 6.1 Progressive Stress Test Results

| Virtual Users (VUs) | Attempted RPS | Successful RPS | p50 Latency | p95 Latency | Error Rate | Latency SLA | Error SLA | Verdict |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **50** | **283.8** | **283.8** | **122.7ms** | **234.8ms** | **0.00%** | **PASS** | **PASS** | **PASS (Supported Capacity)** |
| 100 | 227.5 | 225.2 | 179.8ms | 436.6ms | **1.01%** | PASS | **FAIL** | **FAIL (Exceeds 0.1% errors)** |
| 250 | 288.8 | 277.1 | 275.4ms | 3,013.4ms | **4.05%** | **FAIL** | **FAIL** | **FAIL (Saturated)** |
| 500 | 299.4 | 278.9 | 678.8ms | 8,059.7ms | **6.83%** | **FAIL** | **FAIL** | **FAIL (Saturated)** |
| 1,000 | 304.5 | 254.9 | 788.3ms | 10,089.5ms | **16.30%** | **FAIL** | **FAIL** | **FAIL (Saturated)** |
| 2,000 | 340.8 | 244.4 | 1,641.5ms | 12,354.6ms | **28.29%** | **FAIL** | **FAIL** | **FAIL (Saturated)** |
| 5,000 | 496.5 | 204.7 | 8,443.3ms | 12,425.2ms | **58.76%** | **FAIL** | **FAIL** | **FAIL (Saturated)** |

### 6.2 Capacity Findings & Bottleneck Analysis
- **Highest Workload Meeting Acceptance Targets:** **50 Virtual Users at 283.8 RPS (p50: 122.7ms, p95: 234.8ms, errors: 0.00%)**.
- **The 100-VU Workload Fails:** At 100 VUs, 24 requests timed out out of 2,375 requests, resulting in an error rate of **1.01%**, failing the strict `< 0.1%` SLA.
- **The 2,000–5,000-VU Workloads Fail Outright:** Single-instance Node.js processes experience event-loop queuing saturation above ~280 sustained RPS. Backlog queuing causes p95 to exceed 10 seconds.
- **Post-Overload Recovery:** Within 3 seconds of load cessation, recovery probe latency dropped to **3.8ms–5.7ms (HTTP 200, PASS)**.

---

## 7. Outstanding Launch Requirements

To reach a **GO** state for production, the following concrete actions must be completed:

1. **Vercel Production Deployment:** Deploy branch `ebook-storefront` to Vercel production with exact environment variables listed in the runbook.
2. **Razorpay Live Configuration:**
   - Toggle Razorpay Dashboard to Live Mode.
   - Generate production API keys (`rzp_live_...`).
   - Register webhook URL `https://knowledgepaat.com/api/ebooks/orders/webhook` for events: `order.paid`, `payment.captured`, `payment.failed`.
   - Set `RAZORPAY_WEBHOOK_SECRET` in Vercel.
3. **Transactional Email Transport:**
   - Provision Resend account and add domain `knowledgepaat.com`.
   - Add SPF, DKIM, and DMARC DNS records to Cloudflare.
   - Configure `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, and `EMAIL_SENDER_NAME` in Vercel.
4. **Supabase Auth Custom SMTP:** Configure custom SMTP in Supabase GoTrue Auth dashboard to support burst signups.
5. **Horizontal Scaling:** Ensure production Vercel project is configured with adequate serverless function concurrency to support peak marketing traffic exceeding 50 concurrent users.
