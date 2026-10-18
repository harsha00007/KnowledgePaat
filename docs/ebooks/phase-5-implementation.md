# KnowledgePaat — Phase 5 Implementation Report: eBook Checkout, Payments & Entitlement Unlocking

**System:** KnowledgePaat LMS & Technical Bookstore  
**Target Phase:** Phase 5 of 9 (Checkout, Payment Verification, Purchase Records & Payment-Triggered eBook Entitlements)  
**Status:** IMPLEMENTED & VERIFIED ON DEDICATED STAGING  
**Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Gateway Mode:** Razorpay TEST MODE ONLY (`rzp_test_...` / cryptographic test orders; no real funds charged)  
**Date:** October 2026  

---

## 1. Environment & Production Mutation Guard

- **Dedicated Staging Supabase**: `https://lzuinimbsdxnhzmjpxmr.supabase.co` (Ref: `lzuinimbsdxnhzmjpxmr`)
- **Production Protection**: The known production project reference `csjywuflkvohytbvglxf` is strictly rejected by all migration scripts, seed utilities, test harnesses, and backend routes.
- **Credential Isolation**: Razorpay API secrets (`RAZORPAY_KEY_SECRET`), webhook secrets (`RAZORPAY_WEBHOOK_SECRET`), and Supabase service-role keys are kept server-side only. Publishable key IDs (`RAZORPAY_KEY_ID`) exposed to client bundles are limited to test mode (`rzp_test_...`).
- **Legacy Payment Preservation**: Legacy student store and subscription checkout workflows (`POST /api/payments/create-order` and `POST /api/payments/verify-payment`) remain fully preserved without regressions.

---

## 2. Order, Payment & Entitlement Data Architecture

Phase 5 introduces dedicated, scoped PostgreSQL tables and Row Level Security policies via [`supabase/migrations/supabase_ebook_phase5_orders_setup.sql`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/supabase/migrations/supabase_ebook_phase5_orders_setup.sql):

### 2.1 Core Commerce Tables
1. **`public.ebook_orders`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `order_number TEXT UNIQUE NOT NULL` (e.g. `EB-20261018-XXXX`)
   - `customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT`
   - `total_amount_paise INTEGER NOT NULL CHECK (total_amount_paise > 0)`
   - `currency TEXT NOT NULL DEFAULT 'INR'`
   - `payment_gateway TEXT NOT NULL DEFAULT 'razorpay'`
   - `gateway_order_id TEXT UNIQUE` (Razorpay order ID, e.g. `order_...`)
   - `gateway_payment_id TEXT UNIQUE` (Razorpay payment ID, e.g. `pay_...`)
   - `gateway_signature TEXT` (HMAC verification signature)
   - `payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'))`
   - `order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'completed', 'cancelled'))`
   - `customer_email TEXT`, `customer_name TEXT`
   - `paid_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`

2. **`public.ebook_order_items`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `order_id UUID NOT NULL REFERENCES public.ebook_orders(id) ON DELETE CASCADE`
   - `ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE RESTRICT`
   - `edition_id UUID NOT NULL REFERENCES public.ebook_editions(id) ON DELETE RESTRICT`
   - `plan TEXT NOT NULL CHECK (plan IN ('read_online', 'read_download'))`
   - `price_paise INTEGER NOT NULL CHECK (price_paise > 0)`
   - `title TEXT NOT NULL`
   - `edition_label TEXT`
   - Constraint: `CONSTRAINT unique_order_ebook_item UNIQUE (order_id, ebook_id)`

3. **`public.ebook_receipt_outbox`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `order_id UUID NOT NULL REFERENCES public.ebook_orders(id) ON DELETE CASCADE`
   - `customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `recipient_email TEXT NOT NULL`, `recipient_name TEXT`
   - `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed'))`
   - `retry_count INTEGER NOT NULL DEFAULT 0`, `last_error TEXT`, `payload JSONB`
   - Constraint: `CONSTRAINT unique_receipt_order UNIQUE (order_id)`

4. **`public.ebook_webhook_events`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `event_id TEXT UNIQUE NOT NULL`
   - `event_type TEXT NOT NULL`, `gateway TEXT NOT NULL DEFAULT 'razorpay'`
   - `payload JSONB NOT NULL`
   - `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'ignored'))`
   - `processed_at TIMESTAMPTZ`, `error_message TEXT`

5. **`public.ebook_entitlements` Foreign Key**:
   - `order_id UUID REFERENCES public.ebook_orders(id) ON DELETE SET NULL` directly links granted digital library rights to their authoritative financial source.

---

## 3. Atomic Database Purchase Finalization (`finalize_ebook_order_payment`)

Payment finalization is governed by the PostgreSQL stored procedure `public.finalize_ebook_order_payment(...)` running with `SECURITY DEFINER`:

1. **Row Lock & Idempotency**:
   - Executes `SELECT * FROM public.ebook_orders WHERE id = p_order_id FOR UPDATE` to serialize concurrent webhook/callback race conditions.
   - If `order.payment_status = 'paid'`, cleanly exits returning `{"success": true, "already_paid": true}` without double-crediting or error.
2. **Order Completion**:
   - Transitions `order_status` to `'completed'`, `payment_status` to `'paid'`, updates `gateway_payment_id`, `gateway_order_id`, `paid_at`, and `updated_at`.
3. **Edition-Pinned Entitlement Grants**:
   - Iterates through `ebook_order_items`.
   - If no prior entitlement exists: creates new grant with `is_active = TRUE`, `can_read_online = TRUE`, `can_download_pdf = (plan = 'read_download')`.
   - If prior `read_online` exists and new purchase is `read_download`: upgrades entitlement in place to `plan = 'read_download'`, `can_download_pdf = TRUE`, `grant_type = 'upgrade'`.
   - Preserves stronger access: existing `read_download` rights are never downgraded if an item is re-evaluated.
   - Preserves historical edition pinning: does not replace older purchased editions with newer catalog editions.
4. **Durable Receipt Queueing**:
   - Enqueues delivery payload into `public.ebook_receipt_outbox` with status `'pending'`.

---

## 4. Server Order Creation & Authoritative Pricing

Implemented in [`frontend/lib/ebook/orders.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/orders.ts) and exposed via `POST /api/ebooks/orders/create`:
- **Identity Enforcement**: Validates caller session via `getVerifiedCustomer()`. Rejects unauthenticated callers (401) and unverified email accounts (403).
- **Authoritative Database Pricing**:
  - Recomputes all prices from active published editions in PostgreSQL:
    - Read Online: `edition.price_read_online_paise` (default 4900 paise = ₹49)
    - Read + Download: `edition.price_read_download_paise` (default 9900 paise = ₹99)
    - Mixed cart example: 14800 paise = ₹148
  - Strictly ignores any client-supplied amount or price fields.
- **Ownership Pre-Check**:
  - Re-evaluates purchase intent using `evaluatePurchaseIntent(...)`.
  - Rejects items already owned completely (`already_owned_complete`).
  - Gated upgrade protection: recognizes if an existing online owner needs the ₹50 upgrade, but prevents charging ₹99 again for the same edition while standalone upgrade charging is gated until Phase 7.
- **Razorpay Test Order**: Generates provider order via `createRazorpayOrder(...)` and associates provider order ID with internal order record.

---

## 5. Provider Verification, Recovery Actions & Fail-Closed Webhooks

### 5.1 Authoritative Server Verification (`POST /api/ebooks/orders/verify`)
- **Resolved Internal Order**: Validates the authenticated customer session and resolves the internal order record from `public.ebook_orders`.
- **Cryptographic Signature Verification**: Verifies the HMAC-SHA256 signature using the **trusted stored provider order ID** (`order.gateway_order_id`) and timing-safe comparison (`crypto.timingSafeEqual`). Any client mismatch is rejected with 400 Bad Request.
- **Server Gateway API Verification**: Fetches authoritative payment details directly from Razorpay Gateway API (`GET https://api.razorpay.com/v1/payments/{paymentId}`).
- **Authoritative Invariant Checks**:
  1. **Order Association**: Authoritatively verifies `payment.order_id === order.gateway_order_id`.
  2. **Paise Amount**: Verifies `payment.amount === order.total_amount_paise`.
  3. **Currency**: Verifies `payment.currency === order.currency`.
  4. **Captured Status**: Verifies `payment.status === 'captured' && payment.captured === true`.
- **Never Unlocks from Browser Success Alone**: If a payment is authorized but uncaptured, or if gateway verification fails, entitlements are never unlocked.
- **Atomic Database Finalization**: Invokes `public.finalize_ebook_order_payment` to grant entitlements and queue receipt emails atomically and idempotently.

### 5.2 Authenticated Recovery Action ("Check payment status")
- **Endpoint**: `POST /api/ebooks/orders/[orderId]/check-status`
- **Rate Limiting**: Enforced via `checkRateLimit` (20 requests per 5 minutes per customer).
- **Gateway Query**: Queries `fetchRazorpayOrderPayments(order.gateway_order_id)` on Razorpay Gateway API.
- **Reconciliation**: If a captured payment matching the order amount exists, it atomically finalizes the order and returns `{ status: 'paid', reconciled: true }`.
- **Bounded Retries in UI**: Integrated in [`SuccessClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/checkout/success/SuccessClient.tsx) with a manual "Check Payment Status" recovery button and up to 3 bounded auto-retries (3.5s delay).

### 5.3 Webhook Handling & Provider Delivery Status
- **Fail-Closed Security**: When `RAZORPAY_WEBHOOK_SECRET` is missing or unconfigured, `POST /api/ebooks/orders/webhook` strictly fails closed with HTTP 503 Service Unavailable ("Webhook processing disabled: RAZORPAY_WEBHOOK_SECRET is not configured").
- **Signature Bypass Prevented**: Webhook signature verification is never bypassed under any circumstance.
- **Delivery Verification Status**: **EXPLICITLY UNVERIFIED**. Since Razorpay rejects `localhost` as a webhook hostname and tunneling tools without external public domains cannot receive inbound events, provider-delivered webhooks are documented as UNVERIFIED. All checkout and payment verification workflows function 100% authoritatively via the server verification and recovery endpoints.

---

## 6. Customer Checkout & Confirmation Experience

- **Checkout Page** ([`frontend/app/checkout/CheckoutClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/checkout/CheckoutClient.tsx)):
  - Shows verified buyer identity (Name & Email).
  - Displays authoritative itemized line items (Title, Edition, Plan: Read Online / Read + Download, Price in ₹).
  - Displays total payable in ₹.
  - Launches Razorpay Checkout popup in Test Mode.
  - On payment callback, posts signature verification and navigates to confirmation page.
  - On dismissal or gateway failure, keeps cart intact and presents helpful recovery guidance.
- **Order Confirmation Page** ([`frontend/app/checkout/success/SuccessClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/checkout/success/SuccessClient.tsx)):
  - Displays order reference, payment gateway ID, items, and total paid.
  - Confirms instant digital library unlocking.
  - Provides direct navigation CTA to `/my-books`.
  - Truthfully notes that distraction-free reader (Phase 6) and PDF downloads (Phase 7) are in active preparation.
- **Customer Order History Modal** ([`frontend/app/my-books/MyBooksClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/my-books/MyBooksClient.tsx)):
  - Accessible via "Order History" button in `/my-books`.
  - Displays historical orders, dates, amounts, and item breakdown.

---

## 7. Administrator Order Management

- **Admin Orders Listing** ([`frontend/app/admin/e-books/orders/page.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/admin/e-books/orders/page.tsx)):
  - Accessible via "View Orders" button in `/admin/e-books`.
  - Provides search by order number, customer email/name, or gateway reference.
  - Payment status filter (`all`, `paid`, `pending`, `failed`).
  - Server-paginated listing with detailed snapshot modal.
  - No manual "mark paid" controls (strict financial audit trail).

---

## 8. Receipt Records & Email Outbox Processor

- **Durable Queueing** ([`frontend/lib/ebook/receipts.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/receipts.ts)):
  - Automatically records receipt entry in `public.ebook_receipt_outbox`.
  - Non-blocking execution: email transport failure **never** cancels, rolls back, or revokes a paid order or unlocked entitlement.
  - Truthful transport inspection: checks for `RESEND_API_KEY` or `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`. When unconfigured, records status as `failed` with error message `BLOCKED: No transactional email provider configured`. Never falsely claims an email was delivered.

---

## 9. Feature Gate Boundaries

- `ebook_checkout`: Enabled (`true`) for functional staging checkout.
- `ebook_my_books`: Enabled (`true`) for customer library access.
- `ebook_reader`: Gated (`false`) — Phase 6.
- `ebook_pdf_download`: Gated (`false`) — Phase 7.
- Upgrades charging: Gated — Phase 7.
- Refund execution & settlement reconciliation: Gated — Phase 8.
