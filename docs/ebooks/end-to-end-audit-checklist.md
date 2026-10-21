# KnowledgePaat eBook Platform — End-to-End Audit Checklist

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-21  
**Target Environment:** Staging Supabase (`https://lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Production Guard:** STRICTLY PROTECTED (`csjywuflkvohytbvglxf` untouched)  
**Gateway Mode:** Razorpay Test Mode Only (`rzp_test_...`)  

---

## 1. Public Discovery & Navigation

- [x] **Storefront Entry Button:** Main header displays dedicated "E-Books" navigation button linking to `/e-books`.
- [x] **Storefront Entrance Animation:** Smooth 350ms directional slide transition (`SectionTransitionLink`) between platform home and bookstore.
- [x] **Prefers-Reduced-Motion:** Transitions immediately bypass when `prefers-reduced-motion` is active.
- [x] **Public Anonymous Access:** Anonymous visitors can access `/e-books` and `/e-books/[bookId]` without authentication prompts.
- [x] **Return to Platform Home:** Header logo and dedicated footer return link safely navigate to `/` with accessible labels.
- [x] **Catalogue Discovery:** Search bar, category filter pills, sorting options, and pagination controls function as intended.
- [x] **Draft Book Isolation:** Unapproved drafts and archived books are strictly excluded from public storefront queries (`status = 'published'`).
- [x] **Featured Publications:** Featured books section dynamically renders active items configured in admin homepage CMS.
- [x] **3D Showcase Stage:** Hero stage displays 3D angled book covers and pedestal on desktop.
- [x] **Book Details Page:** Renders book title, author, description, Playfair serif headings, edition selector, and dual plan cards.
- [x] **Table of Contents (TOC):** Displays chapter list in correct sequential order (`chapter_index ASC`).
- [x] **Free Sample Reading Drawer:** Free sample chapters open in side drawer without requiring authentication.
- [x] **Paid Chapter Protection:** Non-sample chapter content bodies are strictly withheld by public APIs.
- [x] **State Handling:** Loading skeletons, empty results state, error banners, and retry actions render truthfully.
- [x] **Responsive Layouts:** 2-column card grid on desktop, single-column responsive layout with bottom drawer on mobile.

---

## 2. Cart & Authentication

- [x] **Dual Plan Selection:** Customers can choose either "Read Online" or "Read + Download" for any published book.
- [x] **Duplicate Item Prevention:** Adding an already added book updates the existing plan rather than creating redundant cart items.
- [x] **Plan Switching:** Changing plans in cart recalculates subtotal and taxes immediately.
- [x] **Integer Paise Math:** All prices, discounts, and totals use integer minor units (paise) to prevent floating-point discrepancies.
- [x] **Local Storage Continuity:** Cart items persist across page navigation and browser reloads under `knowledgepaat_ebook_cart_v1`.
- [x] **Storage Corruption Recovery:** Corrupt or malformed local storage recovers safely without crashing the UI.
- [x] **Guest-to-Login Preservation:** Cart choices made by an anonymous visitor survive the login transition.
- [x] **Server-Authoritative Price Validation:** `/api/ebooks/cart/validate` recalculates prices directly from database editions, strictly ignoring browser prices.
- [x] **Price Change Warning:** Stale cart prices prompt clear customer warnings showing updated authoritative amounts before checkout.
- [x] **Withdrawn Book Handling:** Withdrawn or deleted books are detected and removed from active checkout.
- [x] **Header Login Return Path:** Signing in from eBook header returns visitor to `/e-books`.
- [x] **My Books Return Path:** Signing in from My Books returns visitor to `/my-books`.
- [x] **Checkout Return Path:** Signing in from checkout preserves intended order and returns to `/checkout`.
- [x] **Open Redirect Rejection:** `sanitizeInternalRedirectUrl` rejects external URLs, protocol-relative targets, and backslash exploits.
- [x] **Signed-in Student Freedom:** Authenticated students can browse `/e-books`, `/cart`, and `/my-books` without unwanted redirects to `/student/dashboard`.

---

## 3. Admin Pricing & Homepage CMS

- [x] **Commercial Price Separation:** Commercial prices in `ebook_pricing` can be changed on published books without altering content chapters.
- [x] **Pricing Rules & Bounds:** Negative prices, invalid discounts, and percentage discounts > 100% are rejected with HTTP 400.
- [x] **Server-Side Rounding:** Half-up paise rounding enforced in `calculateSellingPrice()`.
- [x] **Optimistic Concurrency Control:** Updates submitting a stale `pricing_version` are rejected with HTTP 409 Conflict.
- [x] **Audit Trail:** Commercial price updates log actor, reason, previous prices, and new prices in `ebook_audit_logs`.
- [x] **Homepage Draft Isolation:** Unpublished homepage changes remain private; public visitors only see the published configuration.
- [x] **Atomic Homepage Publication:** Admin publishing validates content and atomically updates `ebook_homepage_content`.
- [x] **Failed Publication Rollback:** Malformed homepage draft submissions are rejected without affecting active public content.
- [x] **Student Management Listing:** Bounded server-side pagination with customer search filters by name/email.
- [x] **Customer Detail Aggregation:** Customer overview aggregates entitlements, orders, reading progress, and download logs.
- [x] **Complimentary Access Purity:** Complimentary grants record `grant_type='complimentary'` and create zero fake financial records.
- [x] **Manual Access Revocation & Restoration:** Admins can revoke or restore customer access with audited events.

---

## 4. Purchases, UPI/QR & Payment Recovery

- [x] **Order Initialization:** `/api/ebooks/orders/create` authoritatively validates published editions and calculates integer paise totals.
- [x] **Test Mode Purchase Journeys:**
  - [x] Read Online order creation & verification (₹49).
  - [x] Read + Download order creation & verification (₹99).
  - [x] Mixed-plan multi-book cart order creation & verification (₹148).
  - [x] PDF upgrade order creation & verification (₹50).
- [x] **Signature Verification:** HMAC-SHA256 signature verification uses `crypto.timingSafeEqual()`.
- [x] **Atomic Finalization:** PostgreSQL RPC `finalize_ebook_order_payment` executes idempotently.
- [x] **Repeated Verification Idempotency:** Duplicate verification requests return `already_paid: true` with zero duplicate entitlements.
- [x] **Duplicate Order Prevention:** Changing payment selection or retrying checkout reuses active pending orders.
- [x] **Check Payment Status Recovery:** Authenticated action `/api/ebooks/orders/[orderId]/check-status` queries gateway API and reconciles status.
- [x] **Strict Access Invariant:** Displaying a QR code or returning from a UPI app never unlocks digital content without verification.
- [x] **Fallback Channel Preservation:** Standard Checkout config preserves Cards & Netbanking (`show_default_blocks: true`).
- [ ] **Dynamic UPI QR Canvas:** (BLOCKED) Razorpay omits dynamic QR canvas because merchant account has `upi: false`.
- [ ] **Native Mobile App Switching (Intent):** (BLOCKED) Real app switching requires physical mobile device, active merchant handle, and Live Mode.
- [ ] **Physical Scan-and-Pay Execution:** (BLOCKED) Live banking apps reject test VPAs (`razorpay.test@icici`) on production NPCI switches.

---

## 5. Webhooks & Transactional Emails

- [x] **Canonical Webhook Endpoint:** `/api/ebooks/orders/webhook` accepts raw request body.
- [x] **HMAC-SHA256 Signature Verification:** Webhook payloads validated against `RAZORPAY_WEBHOOK_SECRET`.
- [x] **Invalid Signature Rejection:** Tampered or unsigned webhooks rejected with HTTP 400.
- [x] **Duplicate Event Deduplication:** Processed events recorded in `ebook_webhook_events` to ensure exactly-once processing.
- [x] **Genuine Provider Ingress (WH-04):** Verified genuine Razorpay Test Mode webhook delivered via public ngrok HTTPS URL.
- [x] **Receipt Outbox Enqueuing:** `finalize_ebook_order_payment` atomically inserts outbox records.
- [x] **Receipt Payload Security:** Outbox records contain only order ID, number, amounts, and currency (zero tokens or secrets).
- [x] **Missing Transport Graceful Handling:** Outbox worker truthfully logs `status='unconfigured_blocked'` when SMTP credentials are absent.
- [ ] **Genuine Email Mailbox Delivery:** (BLOCKED) Delivery to allowlisted mailboxes blocked pending `RESEND_API_KEY` (`CFG-05`, `EML-04`).

---

## 6. Library Shelf, Reader, Downloads & Upgrades

- [x] **Customer Isolation:** Customers querying `/my-books` or `/api/ebooks/library` see only their own entitlements.
- [x] **Edition Pinning:** Customer entitlements remain pinned to the exact purchased edition even if new editions are published.
- [x] **Historical Withdrawn Access:** Grandfathered access preserved for books withdrawn from public sale.
- [x] **Permission Separation:** Read Online owners are granted reader access and blocked from PDF downloads.
- [x] **Authorized PDF Download:** Generates 60-second signed URL from private `ebook-pdfs` bucket for entitled customers.
- [x] **Direct Storage Protection:** Anonymous or unauthenticated direct requests to `ebook-pdfs` bucket are rejected by storage RLS.
- [x] **Download Access Logging:** Link issuances logged in `ebook_download_logs` with customer ID, edition, IP, and user-agent.
- [x] **Reader Chapter Navigation:** Reader displays chapters in sequential order with Prev/Next buttons.
- [x] **Owned-Content Search:** Reader search queries are restricted strictly to owned editions.
- [x] **Reading Progress Sync:** Scroll percentage and last chapter read persist across sessions and device reloads.
- [x] **Customer Bookmarks:** Bookmark creation, notes, and deletion are isolated to the customer and purchased edition.
- [x] **Authored Content Sanitization:** Markdown sanitizer strips `<script>` tags, event handlers, and `javascript:` URLs.
- [x] **Reader Accessibility:** Font size controls, serif/sans toggles, and light/dark theme switchers work smoothly.
- [x] **PDF Upgrade Contract:** `createEBookUpgradeOrder` links to existing online purchase, charges ₹50, and updates plan to `read_download`.
- [x] **Progress Survival on Upgrade:** Existing reading progress, bookmarks, and reader preferences survive PDF upgrades intact.

---

## 7. Refunds & Administration

- [x] **Privileged Access Gating:** Admin refund routes require server-verified `profiles.role === 'admin'`.
- [x] **Cumulative Balance Enforcement:** Cannot refund more than the original charged amount.
- [x] **Concurrent Over-Refund Rejection:** Row-level locks prevent concurrent requests from exceeding available balances.
- [x] **Downgrade Rule B:** Refunding a ₹50 upgrade downgrades entitlement to `read_online` while preserving online reading access.
- [x] **Dependent Block Rule C:** Standalone refund on base purchase is blocked with `DEPENDENT_UPGRADE_EXISTS` if active upgrade exists.
- [x] **Refund Both Orders:** Coordinated dual refund handles base and upgrade independently, recovering safely if one fails.
- [x] **Resurrection Protection:** Delayed payment verification callbacks cannot resurrect access for a refunded order.
- [x] **Uncertain Gateway Recovery:** Network timeouts retain pending reservation; recovery sync queries gateway without duplicate refund calls.
- [x] **Operational Financial Math:** Admin reports calculate gross, net, and refunds in integer paise with zero duplicate counts.
- [x] **Spreadsheet Formula Sanitization (CWE-1236):** CSV export prepends `'` and quotes fields starting with `=`, `+`, `-`, `@`, `\t`, `\r`.
- [x] **Genuine Gateway Refund Settlement:** (VERIFIED) Card test payments executed with genuine Razorpay provider refund IDs across Rule A full, Rule D partial, Rule B downgrade, Rule C guard, and dual independent refund operations (`REF-01-*`).

---

## 8. Security, Rate Limiting & Pagination

- [x] **Row-Level Security (RLS):** Student accounts cannot inspect, update, or delete other students' profiles or entitlements.
- [x] **Shared Rate-Limit Atomicity:** Mutex-free rate limiting engine uses dedicated database table `ebook_webhook_events`.
- [x] **Multi-Process Concurrency:** Rate limits enforced across separate OS worker processes without quota drift.
- [x] **HTTP 429 & Retry-After:** Quota exhaustion returns HTTP 429 with standard rate limit headers.
- [x] **Limiter Backend Outage Safety:** Database limiter outage returns truthful HTTP 503 instead of 429.
- [x] **Anti-Spoofing & Trusted Proxy:** Forwarded IP headers ignored unless `TRUST_PROXY=true`. Authenticated quotas bound to user ID.
- [x] **Bounded Pagination:** All listing endpoints implement bounded `page` and `limit` with deterministic tie-breakers.
- [x] **Large CSV Export:** Batched retrieval exports up to 10,000 records without hitting PostgREST 1,000-row limit.
- [x] **Export Ceiling Refusal:** Datasets exceeding 10,000 records return HTTP 400 with actionable filtering advice.
- [x] **Security Clean-up:** (RESOLVED) Deleted `/api/test-session/route.ts`, isolated test auth helper, rotated fixture credentials, verified 404 in dev/prod builds.

---

## 9. Launch Readiness Sign-Off Summary

| Requirement Category | Readiness Status | Action Required Prior to Live Launch |
| :--- | :--- | :--- |
| **Storefront & Reader Architecture** | **READY** | None. Tested and verified. |
| **Pricing & Concurrency Controls** | **READY** | None. Tested and verified. |
| **Cart & Customer Auth** | **READY** | None. Tested and verified. |
| **Cards & Netbanking Payments** | **READY** | None. Verified in Test Mode. |
| **Razorpay UPI Intent & Dynamic QR** | **BLOCKED** | Activate UPI Payment Method in Razorpay Dashboard. |
| **Transactional Email Dispatch** | **BLOCKED** | Configure `RESEND_API_KEY` and verified domain in `.env.local`. |
| **Provider Gateway Refunds** | **READY** | Fully verified with genuine provider refund IDs (`rfnd_...`). |
| **Endpoint Security** | **READY** | Deleted `/api/test-session/route.ts` and hardened credentials. |
| **Production Deployment** | **PROTECTED** | Production Supabase (`csjywuflkvohytbvglxf`) remains untouched. |
