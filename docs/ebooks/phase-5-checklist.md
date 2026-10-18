# KnowledgePaat — Phase 5 Actionable Implementation Checklist

**Target Phase:** Phase 5 of 9 (Checkout, Payment Verification, Purchase Records & Payment-Triggered eBook Entitlements)  
**Status:** COMPLETED & VERIFIED ON DEDICATED STAGING (20/20 Acceptance Tests PASS, TypeScript 0 Errors, Build 81/81 PASS)  
**Date:** October 2026  

---

## 1. Overview & Objectives

Phase 5 delivers end-to-end authenticated checkout, server order creation, Razorpay Test Mode integration, cryptographic HMAC-SHA256 signature verification, asynchronous webhook reconciliation, durable idempotent PostgreSQL finalization, instant digital library unlocking, customer order history, and basic administrative oversight for the KnowledgePaat eBook platform.

---

## 2. Ordered Implementation Tasks & Verification Status

### Task 5.1: Authenticated Checkout UI
- [x] **Checkout Client Interface**: [`frontend/app/checkout/CheckoutClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/checkout/CheckoutClient.tsx)
  - Resolved verified customer identity (Name & Email) from session.
  - Revalidates cart items authoritatively against server database.
  - Itemized display: Book title, edition number/version, selected plan (Read Online vs Read + Download), per-item price in ₹.
  - Total payable in ₹ (derived exclusively from server-side integer paise).
  - Razorpay Test Mode checkout popup initialization with buyer prefill and custom branding.
  - Graceful recovery banners on payment cancellation or network failure.
  - Prunes only purchased items from cart on completion.
  - *Verification*: Tested via browser client and `test_phase5_checkout_suite.ts` (Tests 1, 2, 3).
  - *Result*: **PASS**

---

### Task 5.2: Order and Payment Model
- [x] **Database Schema & Migrations**: [`supabase/migrations/supabase_ebook_phase5_orders_setup.sql`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/supabase/migrations/supabase_ebook_phase5_orders_setup.sql)
  - `public.ebook_orders`: Stores immutable snapshots of customer ID, unique order number, total in integer minor units (`total_amount_paise`), currency (`INR`), gateway references, and lifecycle statuses.
  - `public.ebook_order_items`: Stores immutable snapshots of ordered books, pinned editions, access plans, and per-item paise prices.
  - `public.ebook_receipt_outbox`: Stores pending/sent receipt email delivery jobs with retry counters and last error messages.
  - `public.ebook_webhook_events`: Stores raw provider event payloads and unique event IDs for deduplication.
  - Foreign key `fk_ebook_entitlements_order` links digital entitlements directly to financial orders.
  - *Verification*: Live schema check against dedicated staging Supabase (`lzuinimbsdxnhzmjpxmr`).
  - *Result*: **PASS**

---

### Task 5.3: Server Order Creation
- [x] **Server Order Endpoint**: [`frontend/app/api/ebooks/orders/create/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/orders/create/route.ts) & [`frontend/lib/ebook/orders.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/orders.ts)
  - Strictly requires authenticated customer with verified email (`user.email_confirmed_at`).
  - Validates books and current published editions in PostgreSQL.
  - Re-evaluates purchase intent (`evaluatePurchaseIntent`): rejects complete ownership duplicates; recognizes online owners and prevents charging full ₹99 again (upgrade intent recognized; charging gated until Phase 7).
  - Enforces integer paise arithmetic (₹49 = 4900 paise, ₹99 = 9900 paise, Mixed = 14800 paise).
  - Persists pending internal order and calls `createRazorpayOrder(...)` in Test Mode.
  - *Verification*: Tested via `test_phase5_checkout_suite.ts` (Tests 1, 2, 3, 4, 5).
  - *Result*: **PASS**

---

### Task 5.4: Provider Checkout & Signature Verification
- [x] **Cryptographic Verification**: [`frontend/app/api/ebooks/orders/verify/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/orders/verify/route.ts) & [`frontend/lib/razorpay.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/razorpay.ts)
  - Uses timing-safe buffer comparison (`crypto.timingSafeEqual`) to prevent timing attacks.
  - Validates customer ownership of internal order before verification.
  - Verifies that gateway order reference matches trusted stored ID.
  - Rejects forged signatures and mismatched references with 400 Bad Request.
  - Enforces required captured state: authorized-but-uncaptured payments do not unlock books.
  - *Verification*: Tested via `test_phase5_checkout_suite.ts` (Tests 6, 7, 8, 9).
  - *Result*: **PASS**

---

### Task 5.5: Webhooks & Asynchronous Reconciliation
- [x] **Scoped Webhook Handler**: [`frontend/app/api/ebooks/orders/webhook/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/orders/webhook/route.ts) & delegation in [`frontend/app/api/payments/razorpay/webhook/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/payments/razorpay/webhook/route.ts)
  - Signature verification against original raw request body (`req.text()`) and `RAZORPAY_WEBHOOK_SECRET`.
  - Durably records event in `ebook_webhook_events` to prevent duplicate event execution.
  - Handles browser closure: processes `payment.captured` and unlocks library asynchronously even if the client disconnected.
  - *Verification*: Tested via `test_phase5_checkout_suite.ts` (Tests 7, 11, 12, 13).
  - *Result*: **PASS**

---

### Task 5.6: Atomic Purchase Finalisation
- [x] **PostgreSQL Stored Procedure**: `public.finalize_ebook_order_payment(p_order_id, p_payment_id, p_gateway_order_id, p_signature)`
  - Row locking (`FOR UPDATE`) eliminates race conditions between callback and webhook.
  - Idempotent: returns `already_paid: true` if order was already finalized.
  - Creates/upgrades edition-pinned entitlements in `ebook_entitlements`.
  - Preserves stronger access: existing `read_download` rights are never downgraded.
  - Enqueues durable receipt job in `ebook_receipt_outbox`.
  - *Verification*: Tested via `test_phase5_checkout_suite.ts` (Tests 6, 10, 11, 14, 15).
  - *Result*: **PASS**

---

### Task 5.7: Purchase Confirmation & Customer Order History
- [x] **Order Confirmation View**: [`frontend/app/checkout/success/SuccessClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/checkout/success/SuccessClient.tsx)
  - Displays confirmed order reference, gateway reference, itemized plan details, and total amount.
  - Direct CTA to navigate to `/my-books`.
- [x] **Customer Order History Modal**: [`frontend/app/my-books/MyBooksClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/my-books/MyBooksClient.tsx)
  - Customer can view all past orders, dates, line items, and fulfillment statuses.
- [x] **Customer API Isolation**: [`frontend/app/api/ebooks/orders/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/orders/route.ts) & [`[orderId]/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/orders/[orderId]/route.ts)
  - Customer A cannot inspect Customer B orders.
- [x] **Administrator Order Management**: [`frontend/app/admin/e-books/orders/page.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/admin/e-books/orders/page.tsx)
  - Search, payment status filters, pagination, and snapshot inspection.
  - Zero manual "mark paid" buttons.
  - *Verification*: Tested via `test_phase5_checkout_suite.ts` (Tests 16, 17).
  - *Result*: **PASS**

---

### Task 5.8: Receipts & Email Outbox
- [x] **Durable Receipt Outbox Processor**: [`frontend/lib/ebook/receipts.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/receipts.ts)
  - Outbox failure never revokes or rolls back paid access.
  - Honest provider detection: records status as `failed` / `unconfigured_blocked` if email credentials (`RESEND_API_KEY` or `SMTP_HOST`) are absent.
  - *Verification*: Tested via `test_phase5_checkout_suite.ts` (Test 18).
  - *Result*: **PASS**

---

### Task 5.10: Genuine Razorpay Test Mode API Verification & Recovery Action (No Webhook Required)
- [x] **Authoritative Server Verification**: [`frontend/app/api/ebooks/orders/verify/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/orders/verify/route.ts) & [`frontend/lib/ebook/orders.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/orders.ts)
  - Resolves authenticated customer's internal order from `public.ebook_orders`.
  - Verifies HMAC signature using the **trusted stored provider order ID** (`order.gateway_order_id`). Rejects mismatches immediately.
  - Fetches payment details directly from Razorpay Gateway API (`https://api.razorpay.com/v1/payments/{paymentId}`).
  - Authoritatively validates order association (`payment.order_id === order.gateway_order_id`), exact amount in integer paise (`payment.amount === order.total_amount_paise`), currency (`INR`), and captured status (`payment.status === 'captured' && payment.captured === true`).
  - Never unlocks from browser success alone. Rejects uncaptured/authorized payments without unlocking.
  - Invokes atomic, idempotent purchase finalisation `finalize_ebook_order_payment`.
- [x] **Authenticated Recovery Action ("Check payment status")**: [`frontend/app/api/ebooks/orders/[orderId]/check-status/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/orders/%5BorderId%5D/check-status/route.ts)
  - Rate-limited per customer ID (20 requests per 5 minutes via `RATE_LIMIT_POLICIES.PAYMENT_VERIFY`).
  - Queries `fetchRazorpayOrderPayments(order.gateway_order_id)` via Razorpay Gateway API.
  - If captured payment found, automatically finalizes order and returns `{ status: 'paid', reconciled: true }`.
  - If pending/authorized, returns status with bounded guidance.
  - UI integration in [`SuccessClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/checkout/success/SuccessClient.tsx) with up to 3 bounded auto-retries (3.5s delay) and manual recovery button.
- [x] **Fail-Closed Webhook Security**:
  - Webhook endpoint (`POST /api/ebooks/orders/webhook`) strictly fails closed (HTTP 503) when `RAZORPAY_WEBHOOK_SECRET` is missing or unconfigured.
  - Webhook signature bypass is strictly prevented.
  - Provider-delivered webhook verification is kept explicitly **UNVERIFIED** (documented clearly).
- [x] **Automated API Checkout Test Suite**: [`frontend/scripts/test_phase5_api_checkout_suite.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/scripts/test_phase5_api_checkout_suite.ts)
  - Tests successful, failed, pending, mismatched, and repeated verification against live Razorpay Test Mode API and staging Supabase.
  - *Result*: **8/8 PASS** (100% verified on live staging).

---

## 3. Test Evidence & Acceptance Summary

| Test Suite | Environment | Scope | Status | Result |
| :--- | :--- | :--- | :--- | :--- |
| `test_phase5_checkout_suite.ts` | Staging Supabase | 20 Invariant Acceptance Suite | Verified | **20/20 PASS** |
| `test_phase5_api_checkout_suite.ts` | Staging Supabase + Razorpay Test API | Genuine API Checkout, Verification & Recovery | Verified | **8/8 PASS** |
| Provider-Delivered Webhook Delivery | Localhost Tunnel | Inbound Razorpay Webhook Events | **EXPLICITLY UNVERIFIED** | Fail-Closed Guard Active |
| Next.js TypeScript & Production Build | Local Build (`next build`) | 89/89 routes compiled | Verified | **0 Errors, 89/89 PASS** |

---

## 4. Phase 5 Completion Sign-Off

Phase 5 implementation and verification is 100% complete for API-based checkout, authoritative gateway verification, customer library unlocking, and recovery actions.
Production deployment and Phase 6 development remain strictly on hold until requested.
