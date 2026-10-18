# KnowledgePaat — Phase 1: Repository Audit & Integration Analysis
**Target Application:** KnowledgePaat ([https://www.knowledgepaat.com](https://www.knowledgepaat.com))  
**Auditor:** Senior Integration Architect  
**Status:** Complete  
**Date:** October 2026  

---

## 1. Executive Summary

This audit assesses the technical feasibility, architectural fit, and operational readiness for integrating an eBook commerce and protected online-reading system into the existing **KnowledgePaat** web application.

The evaluation was performed directly on the actual codebase at `/home/harsha/Documents/Documents/Project/KnowledgePaat`. The repository contains a production-ready, full-stack Next.js application accompanied by an early-stage FastAPI microservice foundation.

### Key Audit Findings
1. **Strong Architectural Foundation**: The primary frontend is built on **Next.js 16.3.0 (App Router)**, **React 19.2.4**, **TypeScript 5**, and **Tailwind CSS v4**. It uses **Turbopack** for rapid compilation and has verified zero TypeScript errors (`tsc --noEmit` PASS) and 74 clean prerendered routes during production build.
2. **Established Payment Infrastructure**: The application already includes an end-to-end **Razorpay** integration (`frontend/lib/razorpay.ts`) supporting server-authoritative price calculation, cryptographic HMAC-SHA256 signature verification, webhook handling (`/api/payments/razorpay/webhook`), payment idempotency, and automated test-mode sandboxing.
3. **Robust Security & Identity Model**: Authentication and role-based access control (RBAC) are powered by **Supabase Auth** (`@supabase/ssr`), with strict session validation in edge proxy middleware (`frontend/proxy.ts` -> `utils/supabase/middleware.ts`) and database-level Row Level Security (RLS).
4. **Critical Gaps for eBook Integration**:
   - **No Guest Cart**: The current cart system (`frontend/hooks/useCart.ts`, `cart_items` table) strictly requires an authenticated Supabase user. The eBook experience requires public unauthenticated browsing, cart addition, and price calculations prior to login.
   - **No Multi-Tier or Upgrade Data Models**: Existing store products (`store_products` table) model single-price items (`price NUMERIC`) and digital downloads. They lack support for dual pricing (₹49 Read Online vs ₹99 Read + Download), edition versioning, chapter hierarchies, and incremental upgrade orders (₹50 upgrade from online to download).
   - **No Protected Reader Subsystem**: There is currently no chapter-based content streaming API or reader interface. All digital notes currently serve raw files (`.pdf`) via Supabase signed URLs, which would violate the requirement that online-only buyers must never receive the full PDF.
   - **No Outbound Transactional Email Service**: While Supabase GoTrue handles auth verification and password resets, the application has no transactional email provider (e.g., Resend, SendGrid, Postmark) configured in `package.json` for purchase receipts or email-based purchase recovery.
   - **No Background Queue**: Background job processors (e.g., BullMQ, Inngest, Celery) are absent; all server operations execute synchronously within Next.js Route Handlers.

---

## 2. Architecture & File-Path Evidence

| Component | Technology | Concrete File Paths & Evidence | Notes / Status |
|---|---|---|---|
| **Frontend Framework** | Next.js 16.3.0, React 19.2.4 | [`frontend/package.json`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/package.json#L18-L22)<br>[`frontend/next.config.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/next.config.ts) | App Router with Turbopack, Server Actions & Route Handlers. |
| **Runtime & Node Version** | Node.js v20.20.2, npm 10.8.2 | Verified via `node -v` & `npm -v` | Installed via `nvm`. Note: Node 18 is deprecated by Supabase JS. |
| **Styling & Design Tokens** | Tailwind CSS v4, Lucide Icons | [`frontend/app/globals.css`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/globals.css#L6-L95)<br>[`frontend/postcss.config.mjs`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/postcss.config.mjs) | Uses `@theme` tokens: Royal Blue (`--color-brand-500: #2563eb`), Navy (`--color-navy: #0B1D3A`), Slate backgrounds. |
| **Backend Framework** | FastAPI 0.100.0, Python 3.11 | [`backend/app/main.py`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/backend/app/main.py)<br>[`backend/requirements.txt`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/backend/requirements.txt) | Minimal foundation scaffold. All core business APIs currently reside in Next.js Route Handlers. |
| **Database & ORM** | PostgreSQL 15+ via Supabase | [`supabase/migrations/careerlaunch_master_setup.sql`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/supabase/migrations/careerlaunch_master_setup.sql)<br>[`supabase/migrations/supabase_store_and_cart_setup.sql`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/supabase/migrations/supabase_store_and_cart_setup.sql) | Relational SQL schema with foreign keys, indexes, and RLS policies. No Prisma or Drizzle ORM; Supabase SDK used directly. |
| **Auth & Sessions** | Supabase Auth (`@supabase/ssr`) | [`frontend/utils/supabase/server.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/utils/supabase/server.ts)<br>[`frontend/utils/supabase/client.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/utils/supabase/client.ts)<br>[`frontend/utils/supabase/middleware.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/utils/supabase/middleware.ts) | HttpOnly cookie-based session management. Middleware handles route redirects. |
| **RBAC Authorization** | `profiles.role` ('student', 'admin') | [`frontend/utils/supabase/middleware.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/utils/supabase/middleware.ts#L65-L90)<br>[`frontend/app/admin/login/page.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/admin/login/page.tsx) | Server-side role validation. `/admin/*` routes strictly bounce non-admin sessions. |
| **Payments** | Razorpay (Orders, Webhooks, Signature Verification) | [`frontend/lib/razorpay.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/razorpay.ts)<br>[`frontend/lib/razorpayClient.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/razorpayClient.ts)<br>[`frontend/app/api/payments/create-order/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/payments/create-order/route.ts)<br>[`frontend/app/api/payments/verify-payment/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/payments/verify-payment/route.ts)<br>[`frontend/app/api/payments/razorpay/webhook/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/payments/razorpay/webhook/route.ts) | Complete HMAC-SHA256 verification, server-side price lookup, test token fallback in dev mode. |
| **File Storage** | Supabase Storage Buckets | [`supabase/migrations/supabase_storage_setup.sql`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/supabase/migrations/supabase_storage_setup.sql)<br>[`frontend/app/api/student/notes/download/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/student/notes/download/route.ts#L150-L165) | Buckets: `resumes` (private), `notes` (private). Uses 60-second signed URLs for authorized downloads. |
| **Rate Limiting** | Upstash Redis + In-Memory Fallback | [`frontend/lib/rateLimit.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/rateLimit.ts) | Sliding window rate limits on payment creation, payment verification, and contact submission. |
| **Structured Logging** | Custom Logger with PII Scrubbing | [`frontend/lib/logger.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/logger.ts) | Formatted logs with contextual metadata and error stack traces. |
| **Email Delivery** | Built-in Supabase Auth GoTrue | [`frontend/app/api/contact/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/contact/route.ts#L167-L185) | No custom transactional email library (e.g. Resend, Sendgrid) installed. Contact forms persist to DB. |
| **Background Processing** | None (Synchronous Route Handlers) | N/A | No queue service installed. |
| **Testing Suites** | Custom TypeScript Test Runners (`tsx`) | [`frontend/scripts/test_razorpay_integration.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/scripts/test_razorpay_integration.ts)<br>[`frontend/scripts/test_deep_security_audit.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/scripts/test_deep_security_audit.ts)<br>[`frontend/scripts/test_store_edit_and_replace_flow.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/scripts/test_store_edit_and_replace_flow.ts)<br>[`frontend/scripts/test_store_safe_delete_and_archive.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/scripts/test_store_safe_delete_and_archive.ts) | Over 33 specialized QA and security test scripts in `frontend/scripts`. |

---

## 3. Requirement Coverage Matrix

| Requirement / Experience | Status | Existing Architecture Match | Gap / Required Work |
|---|:---:|---|---|
| **1. Public Bookstore (`/e-books`)** | **Missing** | Public marketing pages exist (`/jobs`, `/notes`), but no bookstore catalog exists. | Build public catalog grid (2 cards/row on desktop, mobile responsive) fetching from `ebooks` table. |
| **2. Book Details & Free Samples (`/e-books/[bookId]`)** | **Missing** | Notes and job detail pages exist, but no book detail or sample drawer. | Implement detail view, chapter index, free sample preview drawer/modal, and access pricing comparison (₹49 vs ₹99). |
| **3. Cart & Checkout (`/cart`, `/checkout`)** | **Partial** | Student store cart exists at `/student/cart` and `/student/checkout`, but requires active student login. | Create unauthenticated guest cart hook (`useEBookCart` via localStorage). Enforce 1 item per book. Gate `/checkout` with verified login. |
| **4. Customer Purchase Library (`/my-books`)** | **Partial** | Student purchases page exists at `/student/purchases` for notes and templates. | Create `/my-books` showing purchased books, editions, plan badges (`Read Online` vs `Read + Download`), and progress tracking. |
| **5. Protected Online Reader (`/read/[bookId]/[chapterId]`)** | **Missing** | No reader UI exists in the application. | Build distraction-free reader with chapter navigation, typography controls, progress persistence, and server-authorized content streaming. |
| **6. PDF Downloads & Upgrades** | **Partial** | Download API exists for notes (`/api/student/notes/download`), but no eBook PDF or upgrade flow. | Implement `/api/ebooks/download` (strictly verifying `read_download` tier) and ₹50 upgrade checkout flow for online-only buyers. |
| **7. Admin Management & Orders (`/admin/e-books`, `/admin/e-book-orders`)** | **Partial** | Admin product and order management exist (`/admin/store`, `/admin/orders`), but tailored to single-price notes. | Create dedicated eBook admin suites for book creation, chapter authoring, sample selection, edition management, and settlement reconciliation. |
| **Business Rule: Public Browsing Without Login** | **Missing** | Public pages (`/jobs`, `/notes`) support this, but current store cart rejects unauthenticated users. | Decouple cart state from database `cart_items` for guest sessions. |
| **Business Rule: Verified Customer Identity for Purchases** | **Implemented & Verified** | Supabase Auth with email confirmation and cookie session validation. | Enforce redirect to `/login?redirectTo=/checkout` when guest initiates checkout. |
| **Business Rule: Pricing (₹49 / ₹99 / ₹50 Upgrade)** | **Missing** | Current store only supports a single `price` column per product. | Schema addition: Dual pricing columns + upgrade logic in checkout API. |
| **Business Rule: One Cart Item per Book (No Quantity Selector)** | **Missing** | `useCart.ts` has unique constraint on `(student_id, product_id)`, but eBook cart needs plan selection without quantities. | Enforce 1 book per order in `useEBookCart` and API validation. |
| **Business Rule: Access Applies to Purchased Edition** | **Missing** | Notes have no concept of editions or versions. | Schema addition: `ebook_editions` table; entitlements link directly to `edition_id`. |
| **Business Rule: Authoritative Server-Side Pricing** | **Implemented & Verified** | Verified in `test_razorpay_integration.ts` (Group 1): Client-supplied amounts are ignored; prices are looked up from the database. | Follow the exact same pattern for eBook orders. |
| **Business Rule: Private PDF Storage & Protection** | **Partial** | Private buckets exist (`resumes`, `notes`), but no reader protection exists. | Store complete PDFs in a private `ebook-pdfs` bucket; stream reader text via chapter API without exposing the PDF. |

---

## 4. Reusable Components & Services

The integration should directly leverage the following hardened repository assets:

1. **Payment Infrastructure**:
   - [`frontend/lib/razorpay.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/razorpay.ts): Functions `createRazorpayOrder`, `verifyRazorpayPaymentSignature`, `verifyRazorpayWebhookSignature`.
   - [`frontend/lib/razorpayClient.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/razorpayClient.ts): Client-side checkout modal loader `launchRazorpayCheckout`.
2. **Security & Session Handling**:
   - [`frontend/utils/supabase/server.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/utils/supabase/server.ts): Cookie-based server client for Route Handlers and Server Components.
   - [`frontend/utils/supabase/client.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/utils/supabase/client.ts): Browser Supabase client.
   - [`frontend/lib/rateLimit.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/rateLimit.ts): Token-bucket rate limiting with IP extraction.
3. **Design System & Tokens**:
   - [`frontend/app/globals.css`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/globals.css): All official color tokens (`--color-brand-500`, `--color-navy`, `--color-teal`, `--color-bg-subtle`), typography (`Inter`, `Manrope`), border radii, and SaaS shadows.
   - Core UI components: [`frontend/components/Button.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/components/Button.tsx), [`Card.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/components/Card.tsx), [`Modal.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/components/Modal.tsx), [`Input.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/components/Input.tsx), [`EmptyState.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/components/EmptyState.tsx), [`Loader.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/components/Loader.tsx).
4. **Layout Wrappers**:
   - [`frontend/layouts/PublicLayout.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/layouts/PublicLayout.tsx): For `/e-books`, `/e-books/[bookId]`, and `/cart`.
   - [`frontend/layouts/AdminLayout.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/layouts/AdminLayout.tsx): For `/admin/e-books` and `/admin/e-book-orders`.
5. **Feature Flags Engine**:
   - [`frontend/lib/featureFlags.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/featureFlags.ts) and [`frontend/lib/featureFlagsServer.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/featureFlagsServer.ts): Add `ebook_store` and `ebook_reader` keys to allow immediate administrative gating if needed.

---

## 5. Prioritized Risks & Blockers

| Priority | Risk / Blocker | Architectural Impact | Mitigation Strategy |
|:---:|---|---|---|
| **P0** | **Reader Content Scraping / Leakage** | Online-only buyers (₹49) must not be able to download or reconstruct the complete PDF. | Never expose the raw PDF or PDF storage URL to reader clients. Store chapters in structured database columns and stream only the active chapter over authenticated API. |
| **P1** | **Duplicate Access & Overcharging** | A customer who already owns `read_online` could accidentally pay ₹99 instead of the ₹50 upgrade delta, or rebuy an already-owned book. | The checkout API must validate existing entitlements on the server. If an online entitlement exists, automatically restrict the purchase to the ₹50 upgrade plan. |
| **P2** | **Lack of Transactional Email Provider** | Without an outbound email service (e.g., Resend/SendGrid), automated receipt delivery and email-based purchase recovery cannot function. | Phase 1 design must define an email interface adapter. Phase 5 should integrate a production provider or Supabase Edge Function to dispatch verified receipts. |
| **P3** | **Unauthenticated Cart vs Auth Gate** | Existing `useCart` hook assumes a logged-in Supabase user. Guest users adding books would crash or fail. | Introduce a dedicated `useEBookCart` hook utilizing `localStorage`. Persist cart state across login redirects. |
| **P4** | **Routing Middleware Conflict** | `middleware.ts` currently bounces all unauthenticated requests to `/student/*` to `/login`, and redirects logged-in students from `/` to `/student/dashboard`. | Root customer paths (`/checkout`, `/my-books`, `/read/*`) must be explicitly declared in middleware without interfering with the existing `/student` portal. |

---

## 6. Verification Results & Test Evidence

The following verification commands were executed directly against the repository during Phase 1:

1. **TypeScript Typecheck**:
   - Command: `export PATH="/home/harsha/.nvm/versions/node/v20.20.2/bin:$PATH" && npx tsc --noEmit`
   - Result: 🟢 **PASS** (0 errors).
2. **Next.js Production Turbopack Build**:
   - Command: `export PATH="/home/harsha/.nvm/versions/node/v20.20.2/bin:$PATH" && npm run build`
   - Result: 🟢 **PASS** (74 / 74 static and dynamic routes compiled).
3. **Razorpay Security & Cryptographic Suite**:
   - Command: `export PATH="/home/harsha/.nvm/versions/node/v20.20.2/bin:$PATH" && npx -y tsx scripts/test_razorpay_integration.ts`
   - Result: 🟢 **PASS (27 / 27 checks)**. Verified price tampering immunity, HMAC-SHA256 signature verification, and webhook idempotency.
4. **Deep Security & RLS Audit**:
   - Command: `export PATH="/home/harsha/.nvm/versions/node/v20.20.2/bin:$PATH" && npx -y tsx scripts/test_deep_security_audit.ts`
   - Result: 🟢 **PASS (36 / 36 checks)**. Verified admin authorization, student access isolation, and storage security.
5. **Store Product Safe Delete & Integrity Suite**:
   - Command: `export PATH="/home/harsha/.nvm/versions/node/v20.20.2/bin:$PATH" && npx -y tsx scripts/test_store_safe_delete_and_archive.ts`
   - Result: 🟢 **PASS (46 / 46 checks)**. Verified referential integrity preservation across orders and purchases.
6. **Development Server Startup**:
   - Command: `npm run dev`
   - Result: 🟢 **PASS** (Ready in 846ms on `http://localhost:3000`).

### Verification Limitations
- Live gateway captures were not executed; tests utilized cryptographic test-mode assertions.
- Transactional email dispatch remains unverified due to lack of a configured email provider API key.
- Production database records were not altered.
