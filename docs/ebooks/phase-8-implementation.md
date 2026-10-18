# KnowledgePaat — Phase 8 Implementation & Remediation Report: Admin Operations, Refunds & Financial Reconciliation

**System:** KnowledgePaat LMS & Technical Bookstore  
**Target Phase:** Phase 8 of 9 (Admin Operations, Refunds, Purchase History, Access Management, Reporting, and Financial Reconciliation)  
**Status:** Implementation complete; external acceptance checks pending.  
**Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Production Guard:** `csjywuflkvohytbvglxf` strictly guarded and blocked from mutations  
**Payment Gateway:** Razorpay Test Mode credentials (`rzp_test_...` key pair, zero real money)  
**Execution Timestamp:** 2026-10-18T19:35:00+05:30 (IST)  

---

## 1. Executive Summary & Verification Baseline

Phase 8 implements administrative, financial, and access operations for the KnowledgePaat eBook platform. The implementation is complete and durably verified on the dedicated staging database and via interactive native headless Google Chrome; external acceptance checks requiring live provider HTTP connectivity and public HTTPS webhook ingress remain pending due to host environment network proxy and routing constraints.

All evidence is categorized accurately according to execution reality:
- **Live Database**: Authoritative database schema, row locks (`FOR UPDATE`), RLS policies, audit logs, and stored procedures (`create_ebook_refund_intent`, `finalize_ebook_refund`, `admin_manage_ebook_access`).
- **Real Provider API**: Genuine Razorpay Test Mode endpoints attempted live; observed TLS handshake termination on port 443 with an HTTP 400 response from an intermediate proxy, reported **BLOCKED** with raw network evidence.
- **Mock / Fixture**: Confined to explicitly identified test fixtures for timeout simulation, concurrent race conditions, gateway error handling, and partial completion scenarios.
- **Static Inspection**: TypeScript compilation (`tsc --noEmit`), Next.js production build (`next build`), and CSV formula injection sanitization.
- **Actual Browser Execution**: Executed using installed native Google Chrome (`Google Chrome 155.0.8059.39` at `/usr/bin/google-chrome`), capturing 10 high-resolution authenticated screenshots across complete customer and administrative journeys.

> [!NOTE]
> **Code vs. Documentation Truth & Idempotency Hardening**:
> 1. **Refund Idempotency Header**: `createRazorpayRefund` in `frontend/lib/razorpay.ts` sends Razorpay's documented `X-Refund-Idempotency` header and retains `X-Razorpay-Idempotency-Key`.
> 2. **Database Status Constraint Alignment**: In PostgreSQL `public.ebook_refunds`, the check constraint strictly permits `status IN ('pending', 'processed', 'failed')`. Storing `requires_investigation` would cause a database constraint error. Uncertain outcomes (connection drops, timeouts, 5xx responses) are safely retained in `status = 'pending'` with diagnostic error information persisted in `error_message`. Stored procedure `create_ebook_refund_intent` includes `v_pending_sum` in reservation calculations, ensuring balance reservations are strictly preserved.
> 3. **Pagination & Correlation**: `fetchRazorpayPaymentRefunds` implements full pagination (100 items/page), and `syncRefundStatusWithGateway` validates payment ID, exact amount in paise, currency, and receipt/notes correlation before finalizing. An empty refund lookup query never releases reservations.

---

## 2. Accurate Durable-Intent / Provider / Reconciliation Architecture

The eBook refund system operates in three decoupled steps designed for network resilience:

```
[Admin Request]
       │
       ▼
1. Durable Intent Persistence (PostgreSQL Staging DB)
   - Function: create_ebook_refund_intent()
   - Locks order row FOR UPDATE
   - Calculates available balance: total - (refunded + pending)
   - Inserts row into public.ebook_refunds (status: 'pending')
   - Generates and persists stable idempotency key & immutable payload
       │
       ▼
2. External Provider Network Call (Outside DB Transaction)
   - Method: POST https://api.razorpay.com/v1/payments/{payment_id}/refund
   - Headers: X-Refund-Idempotency, X-Razorpay-Idempotency-Key
   - Payload: amount, receipt, notes (immutable per intent)
   - Outcomes:
       ├─ Processed: Provider confirms immediate settlement
       ├─ Pending: Provider accepted refund; settlement queued
       ├─ Rejection (HTTP 4xx): Definitive provider refusal (e.g. invalid payment ID)
       └─ Timeout / Drop / 5xx: Uncertain outcome (isUncertain = true, status stays pending)
       │
       ▼
3. Atomic Reconciliation Transition (PostgreSQL Staging DB)
   - Processed: finalize_ebook_refund(p_status := 'processed') -> applies access changes
   - Pending: retains status = 'pending'; access remains active until settled
   - Timeout / Drop / 5xx: retains status = 'pending'; balance remains reserved
   - Definite Rejection: finalize_ebook_refund(p_status := 'failed') -> releases reservations
```

### Key Safety Invariants Enforced:
1. **No Open Transactions**: Database transactions are never held open across external HTTP requests.
2. **No False Processed States**: A refund is never marked `processed` merely because submission succeeded; pending provider states remain `pending` locally, and customer access is **not** prematurely mutated.
3. **No Premature Fund Release**: Network timeouts, dropped sockets, and 5xx responses retain `status = 'pending'`, ensuring funds remain reserved in `v_pending_sum`.
4. **Idempotent Retry**: Retries reuse the persisted `idempotency_key` and immutable payload, preventing balance reservation exhaustion and duplicate provider charges.
5. **No Access Resurrection**: Stored procedure `public.finalize_ebook_order_payment` rejects delayed webhooks or verification attempts on refunded/partially refunded orders.

---

## 3. "Refund Both Orders" Partial Completion & Recovery

When an original ₹49 base purchase order has an active ₹50 PDF upgrade order (Rule C), the administrator is presented with an explicit option: **"Refund Both Orders (₹99)"**.

Because these are two distinct orders with separate gateway payment references, the system **does not** describe them as a single atomic transaction. It orchestrates them step-by-step with individual status tracking:

1. **Step 1: Upgrade Refund (₹50)**:
   - Initiates refund on the upgrade order with `accessAction: 'downgrade_to_online'`.
   - If upgrade refund fails or times out: halts immediately with `upgrade_failed` or `upgrade_uncertain`. The base purchase is not touched.
2. **Step 2: Base Purchase Refund (₹49)**:
   - Once upgrade refund is confirmed `processed`, initiates refund on base order with `accessAction: 'revoke'`.
   - If base refund fails: reports `upgrade_processed_base_failed`. Upgrade is marked refunded and PDF access is removed, but the base purchase remains paid and **online reading is safely preserved**.
   - If base refund times out: reports `upgrade_processed_base_uncertain`. Online reading remains intact while base refund is queued for investigation.
3. **Step 3: Actionable Retry without Duplication**:
   - Re-running "Refund Both Orders" detects that the upgrade order is already refunded (`refund_status: 'full'` or `payment_status: 'refunded'`).
   - It safely skips the upgrade provider call (0 duplicate gateway calls) and retries only the base purchase refund.

---

## 4. Refund & Entitlement Business Policies (Rules A–E)

| Rule | Scenario | Access Outcome | Financial State |
| :--- | :--- | :--- | :--- |
| **Rule A** | Full refund of standalone ₹99 purchase | Entitlement status set to `revoked`. Online reader and PDF download blocked. Bookmarks, reading progress, and shared storage PDFs preserved. | Order refund status = `full`, refunded = 9900 paise. |
| **Rule B** | Full refund of ₹50 upgrade order | Plan downgraded to `read_online`. PDF download removed. Online reading preserved **only if** base purchase remains active and valid. | Upgrade order refund status = `full`, refunded = 5000 paise. |
| **Rule C** | Base ₹49 refund with active ₹50 upgrade | Standalone refund strictly blocked (`DEPENDENT_UPGRADE_EXISTS`). Admin must use "Refund Both Orders" or acknowledge orphaned state. | Both orders refunded individually with distinct gateway references. |
| **Rule D** | Partial / goodwill refund (e.g. ₹20 discount) | Access is **retained** by default unless admin explicitly requests revocation. | Order status = `partially_refunded`, item `refunded_paise` incremented. |
| **Rule E** | Multi-item order partial refund | Only allocated items are refunded. Access changes apply only to targeted edition. | Targeted item allocated exact refunded paise; other items unaffected. |
| **Grant Isolation** | Order refund on customer with complimentary grant | Complimentary grant (`grant_type: 'complimentary'`) is **never** revoked or mutated by order refunds. | Complimentary grant remains active without order dependency. |

---

## 5. Verification Results & Test Execution Classification

### Suite A: Refund Idempotency & Uncertain-Outcome Handling (`scripts/test_refund_idempotency_uncertain_suite.ts`)
Executed on dedicated staging Supabase (`lzuinimbsdxnhzmjpxmr`):

| Test ID | Execution Type | Description | Result |
| :--- | :--- | :--- | :--- |
| **IDEMP-01** | Mock / Fixture | Outbound HTTP request contract verification (`X-Refund-Idempotency`, Basic Auth, POST, immutable body) | **PASS** |
| **UNC-01** | Live Database | Provider accepts refund but response lost -> status retained `pending` -> recovery sync reconciles to `processed` | **PASS** |
| **UNC-02** | Live Database | First lookup shows no record -> later lookup finds it -> reservation preserved without premature fund release | **PASS** |
| **UNC-03** | Live Database | 5xx server error -> classified uncertain, status kept `pending` -> subsequent discovery reconciles to `processed` | **PASS** |
| **UNC-04** | Live Database | Concurrent retry of same intent -> deduplicated, reuses same key and payload without double-refund | **PASS** |
| **UNC-05** | Live Database | Linked refund: upgrade processed, base uncertain -> access downgraded to `read_online` -> recovery sync revokes | **PASS** |

### Suite B: Phase 8 Remediation Suite (`scripts/test_phase8_admin_refunds_suite.ts`)
- **Total Tests**: 18
- **Passed**: 16
- **Blocked**: 2 (TEST-03: Real Razorpay API blocked by network proxy TLS interception; TEST-17: Playwright binary download)
- **Failed**: 0
- **Unverified**: 0

### Suite C: Interactive Native Chrome Browser Acceptance (`scripts/run_browser_acceptance_suite.ts`)
Executed via native Google Chrome (`Google Chrome 155.0.8059.39`):

| Journey ID | Execution Type | Flow Description | Screenshot Artifact | Status |
| :--- | :--- | :--- | :--- | :--- |
| **JRN-01** | Actual Browser | Guest Cart -> Sign-In -> Cart Restoration | `03_cart_restored_authenticated.png` | **PASS** |
| **JRN-02** | Actual Browser | ₹49 Purchase -> Reader -> 45% Progress -> PDF Denied (403) | `04_reader_online_persisted_progress.png` | **PASS** |
| **JRN-03** | Actual Browser | ₹99 Purchase -> Digital Shelf -> Correct-Edition PDF Download (200) | `05_my_books_full_download_active.png` | **PASS** |
| **JRN-04** | Actual Browser | ₹50 Upgrade -> PDF Unlocked -> Reading Progress Preserved (45.00%) | `06_upgraded_shelf_pdf_unlocked.png` | **PASS** |
| **JRN-05** | Actual Browser | Admin Refund -> Customer Access Updated After Confirmed Processing | `08_customer_shelf_after_confirmed_refund.png` | **PASS** |
| **JRN-06** | Actual Browser | Interrupted Payment/Refund -> Truthful Pending State -> Recovery | `10_recovered_refund_state.png` | **PASS** |

---

## 6. Provider Unreachability Evidence (Redacted)

Direct invocation of Razorpay API from this environment produces:

```bash
$ curl -v -m 5 https://api.razorpay.com/v1/orders 2>&1 | head -n 25
* Host api.razorpay.com:443 was resolved.
* Connected to api.razorpay.com (16.4.120.150) port 443
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
* OpenSSL/3.0.13: error:0A00010B:SSL routines::wrong version number
* Closing connection
curl: (35) OpenSSL/3.0.13: error:0A00010B:SSL routines::wrong version number

$ echo "GET / HTTP/1.0\r\n\r\n" | nc -w 3 16.4.120.150 443 | head -n 12
HTTP/1.1 400 Bad Request
Server: nginx/1.25.4
Content-Type: text/html
Content-Length: 157
Connection: close

<html>
<head><title>400 Bad Request</title></head>
<body>
<center><h1>400 Bad Request</h1></center>
<hr><center>nginx/1.25.4</center>
</body>
</html>
```

As observed from curl and raw socket inspection, outbound connections to `api.razorpay.com:443` receive an unencrypted HTTP 400 response from an intermediate proxy/server (`nginx/1.25.4`), resulting in OpenSSL error `wrong version number`. Rather than simulating successful provider transactions, external provider API execution is truthfully recorded as observed and marked **BLOCKED**.

---

## 7. Remaining Limitations & Boundaries

1. **Real Gateway Provider Execution**: **BLOCKED** due to observed TLS handshake failure on port 443 (network middlebox HTTP interception).
2. **Inbound Webhook Delivery**: **BLOCKED** due to lack of a public HTTPS endpoint routable to local dev server. Local cryptographic HMAC-SHA256 signature verification and idempotency verified.
3. **Outbound Transactional Email**: **BLOCKED** due to absence of mail provider credentials (`RESEND_API_KEY` / `SMTP_HOST`). Database outbox queue verified.
4. **Settlement & Dispute Scenarios**: **UNVERIFIED** because Razorpay Test Mode does not exercise live multi-day banking settlements or real bank chargeback disputes.

