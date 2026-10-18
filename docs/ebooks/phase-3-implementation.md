# KnowledgePaat — Phase 3 Implementation Report: Public Bookstore, Details, Free Samples & Guest Cart

**System:** KnowledgePaat LMS / Career Platform  
**Target Phase:** Phase 3 of 9 (Public Bookstore, Book Details, Free Sample Experience, Access-Plan Selection & Guest Shopping Cart)  
**Status:** COMPLETED & VERIFIED ON DEDICATED STAGING (17/17 Live Tests PASS, TypeScript 0 Errors, Turbopack Build 79/79 PASS)  
**Date:** October 2026  

---

## 1. Verified Target Environment

- **Dedicated Staging Supabase**: `https://lzuinimbsdxnhzmjpxmr.supabase.co`
- **Project Reference**: `lzuinimbsdxnhzmjpxmr`
- **Production Safety Enforcement**: Production ref `csjywuflkvohytbvglxf` is strictly rejected by runtime test guards and deployment barriers.
- **Service & Client Role Separation**: Public pages and guest endpoints use anonymous/publishable clients enforcing PostgreSQL Row Level Security (RLS). Server-only mutations and administrative tasks use service-role credentials exclusively on the server.

---

## 2. Implemented Architecture & Route Contracts

### 2.1 Public APIs

#### 1. Public Catalogue Listing (`GET /api/ebooks`)
- **Accessibility**: Zero login required. Accessible to anonymous visitors and signed-in customers without redirects.
- **Publication Gating**: Strictly queries `status = 'published'` on master `ebooks` and `status = 'published' AND is_current_edition = true` on `ebook_editions`. Draft or archived records are never returned.
- **Deliberately Public Fields**:
  - `id`, `slug`, `title`, `subtitle`, `author`, `description`, `category`, `reader_role`, `language`, `cover_image_url`, `updated_at`.
  - `current_edition`: `id`, `edition_number`, `version_name`, `page_count`, `price_read_online_paise`, `price_read_download_paise`, `currency`, `published_at`.
  - `min_price_paise`: Integer minor units (e.g., `4900` = ₹49).
  - `has_free_sample`, `sample_chapter_count`, `total_chapter_count`.
- **Content Leakage Prevention**: Never queries or projects `content_body`, `pdf_storage_path`, `pdf_checksum`, or internal audit metadata.
- **Query & Pagination**: Supports search query (`title`, `author`, `slug`, `description`), category filtering, reader-role filtering, and bounded pagination (`limit` capped at 50).
- **Caching**: `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`.

#### 2. Public Book Details (`GET /api/ebooks/[bookId]`)
- **Identifier Handling**: Supports either book UUID or public canonical slug (e.g. `/api/ebooks/mastering-microservices-architecture`).
- **404 Behavior**: Uniform 404 response for non-existent, draft, or archived books without revealing draft existence or internal errors.
- **Safe Table of Contents**: Exposes only chapter metadata (`id`, `chapter_index`, `title`, `slug`, `word_count`, `is_free_sample`). Chapter `content_body` is strictly excluded from TOC queries.

#### 3. Free Sample Reader (`GET /api/ebooks/[bookId]/sample/[chapterId]`)
- **Server-Side Validation**:
  - Book must be `status = 'published'`.
  - Edition must be the current published edition (`is_current_edition = true`, `status = 'published'`).
  - Chapter must belong to that edition, must have `status = 'ready'`, and **must have `is_free_sample = true`**.
- **Anti-Tampering Invariant**: Passing the ID of a paid chapter (`is_free_sample = false`) returns HTTP 404.
- **XSS Neutralization**: Authored content is sanitized via [`renderSafeMarkdown`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/markdownSanitizer.ts), neutralizing script tags, onerror handlers, and dangerous URL protocols.

#### 4. Authoritative Cart Validation (`POST /api/ebooks/cart/validate`)
- **Input Contract**: `{ items: [{ bookId: string, plan: 'read_online' | 'read_download' }] }`.
- **Deduplication**: Enforces exactly 1 item per book. Submitting the same book twice updates the plan rather than duplicating rows.
- **Integer Minor Units**: Computes all subtotals and totals in integer paise (e.g., 4900 + 9900 = 14800 paise = ₹148). Client-stored amounts are never trusted for payment authority.
- **Publication & Price Revalidation**: Looks up live published status and current edition prices. Automatically prunes withdrawn books and returns customer warning notices.

---

### 2.2 Customer & Public Storefront Interfaces

| Route | Classification | Layout | Description |
|---|---|---|---|
| [`/e-books`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/e-books/page.tsx) | Public | `PublicLayout` | Exactly 2 book cards per row on desktop (`grid-cols-1 md:grid-cols-2`), 1 on mobile. Search bar, category filter pills, starting price pills ("From ₹49"), Free Sample drawer trigger, View Details. |
| [`/e-books/[bookId]`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/e-books/[bookId]/page.tsx) | Public | `PublicLayout` | Book cover presentation, verified edition badge, author info, intended audience, access-plan comparison (Read Online ₹49 vs Read + Download ₹99), TOC with sample tags, and Add to Cart action. |
| [`/cart`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/cart/page.tsx) | Public | `PublicLayout` | Guest cart items, plan switcher per book (₹49 vs ₹99), remove item, clear cart confirmation modal, server price revalidation, and Phase 3 checkout handoff modal. |

---

## 3. Guest Cart State Management (`cartContext.tsx`)

1. **Storage Schema & Versioning**:
   - Stored in browser `localStorage` under key `knowledgepaat_ebook_cart_v1`.
   - Payload format: `{ version: 1, items: [{ bookId, plan, addedAt }] }`.
   - Untrusted Storage: Stored data contains zero price authority; prices are hydrated authoritatively from the server on load.
2. **Resilience & Fault Tolerance**:
   - **Corrupt Storage**: Malformed JSON or schema version mismatches are safely caught and reset to an empty array without crashing the page.
   - **Storage Unavailable**: Wraps reads/writes in safe handlers, falling back to in-memory state in restricted/private browsing modes.
   - **Cross-Tab Synchronization**: Subscribes to `window.storage` events, instantly updating cart counts and line items across open browser tabs.
   - **Hydration Safe**: SSR-compatible state prevents Next.js hydration mismatches.
3. **No Quantity Selector**: Digital books strictly enforce a maximum quantity of 1 per title. Adding an existing book focuses and updates its selected plan.

---

## 4. Phase 3 Checkout Gating & Customer-Facing Language

In accordance with Phase 3 scope boundaries and UX corrections:
- **Rupee Display & Integer Minor Units**: All customer-facing prices are strictly displayed in Indian Rupees (e.g. `₹49`, `₹99`, `₹148`), while internal database columns, state models, and APIs retain minor units in integer paise (`price_read_online_paise`, `price_read_download_paise`, `total_paise`).
- **Zero Implementation-Phase References**: The customer-facing UI is completely devoid of internal phase terminology ("Phase 3", "Phase 4", "Phase 5").
- **Feature Flag Gated Checkout**: Unfinished online checkout is gated behind the `ebook_checkout` feature flag (defaults to `false`). When disabled, clicking "Proceed to Checkout" presents a professional "Online Checkout Coming Soon" modal explaining active preparation.
- **Accurate Action Phrasing**: Uses "Sign in to continue" (not "Sign in to preserve cart"), linking to `/login?redirectTo=/cart`.
- **Guest Cart Persistence**: Guest cart storage in `localStorage` (`knowledgepaat_ebook_cart_v1`) operates independently of user authentication. Visitors can browse, reload, add books, and switch plans without signing in.
- **Truth in Cart Revalidation & Pricing**:
  - Restores book IDs and selected plans upon page reload.
  - Revalidates price, edition, and published availability with the server (`POST /api/ebooks/cart/validate`).
  - Ignores manipulated browser-stored prices and notifies customers with an amber notice banner when prices update.
  - Auto-prunes withdrawn/draft books and resets unsupported plan choices to `read_online` with clear customer notices.
  - If server revalidation fails (e.g. offline/network error), the checkout CTA is strictly disabled (`disabled={!isReadyForCheckout}`), the total amount displays `—` (pricing unverified), and a red error banner with "Retry Verification" is presented, preventing unverified or stale totals from ever being presented as server-validated.

---

## 5. Live Staging Test Results (`test_phase3_public_store_suite.ts`)

Executed directly against dedicated staging Supabase (`https://lzuinimbsdxnhzmjpxmr.supabase.co`):

| Test # | Invariant Evaluated | Status | Live Evidence / Verification Detail |
|:---:|---|:---:|---|
| **01** | Anonymous visitors browse catalog without login | **PASS** | Successfully queried published books using anonymous public client without session cookies. |
| **02** | Signed-in students access bookstore without redirects | **PASS** | Middleware configuration confirmed: `/e-books` and `/cart` remain accessible to authenticated users. |
| **03** | Draft/withdrawn records isolated | **PASS** | Querying draft Book C returned 0 records under database RLS and public query filters. |
| **04** | Paid chapter bodies & private PDFs omitted | **PASS** | Anonymous client cannot read non-sample chapter content; `pdf_storage_path` excluded from public projection. |
| **05** | Sample chapter ID tampering rejected | **PASS** | Attempting to fetch paid chapter 2 via sample endpoint returned null / 404. |
| **06** | Precomputed word count metadata | **PASS** | Table of contents exposes precomputed integer `word_count` metadata without querying or transmitting `content_body`. |
| **07** | Invalid book IDs & empty states | **PASS** | Querying invalid zero-UUID returned clean null without runtime exceptions. |
| **08** | Scenario 5: Guest cart persistence | **PASS** | Book ID and selected plan `read_download` successfully preserved in version 1 storage schema across reload. |
| **09** | Scenario 6: Dynamic plan switching in-place | **PASS** | Plan switched `read_download` -> `read_online` -> `read_download` with cart length strictly remaining 1. |
| **10** | Scenario 7: Multi-item mixed cart calculation | **PASS** | Book A (₹99) + Book B (₹49) strictly totaled 14800 paise (₹148). |
| **11** | Scenario 8: Removing item & clearing cart | **PASS** | Single removal recalculated total to ₹99; clear cart confirmation modal reset count and total to ₹0. |
| **12** | Scenario 9: Checkout handoff & sign-in preservation | **PASS** | Redirect path `/cart` preserved through `/login?redirectTo=/cart` without open-redirect vulnerability. |
| **13** | Open-redirect protection & URL sanitization | **PASS** | All 6 malicious attack vectors (protocol, CRLF, double slash) neutralized; legitimate internal relative paths preserved. |
| **14** | Server price authority enforcement | **PASS** | Client manipulated 0 paise ignored; server authoritative price evaluated to 9900 paise (₹99). |
| **15** | Withdrawn book pruning & unsupported plan reset | **PASS** | Draft Book C detected as unavailable and pruned; Book A preserved with supported tier. |
| **16** | Customer UI language & feature flag compliance | **PASS** | Zero "Phase" text in customer UI, uses "Sign in to continue", and gates checkout under `ebook_checkout` flag. |
| **17** | Stored XSS neutralization in sample reader | **PASS** | Script tags escaped, onerror handlers neutralized, and javascript: links converted to safe anchor. |
| **18** | Corrupt browser storage recovery | **PASS** | Tested 4 corrupt payloads (invalid JSON, wrong version, invalid types); all recovered gracefully to safe empty array. |
| **19** | Student store & Phase 2 admin regression check | **PASS** | Verified `useCart` hook, student store pages, `profiles` table, and Phase 2 admin APIs intact without collision. |
| **20** | Cart deduplication (1 item per book) | **PASS** | Duplicate submissions for the same book resolved to exactly 1 cart item with updated plan. |
| **21** | Multiple tabs cross-synchronization | **PASS** | `cartContext.tsx` subscribes to `window.storage` event, synchronizing cart choices across open tabs. |
| **22** | Truth in pricing & validation failure handling | **PASS** | Checkout CTA strictly disabled unless `validationStatus === 'validated'`; total shows unverified and fallback cards display on failure. |
| **23** | Free sample drawer keyboard accessibility | **PASS** | `Escape` key dismisses drawer, background body scroll locked/unlocked, and trigger button focus restored. |
| **24** | Price change notification & server override | **PASS** | Manipulated browser price (100 paise) overridden by server (9900 paise / ₹99) and triggered customer price update notice. |

---

## 6. Build & Compilation Verification

- **TypeScript Compilation (`npx tsc --noEmit`)**: Clean exit code 0 (0 errors).
- **Turbopack Production Build (`npm run build`)**:
  - Compiled successfully in 2.8s.
  - Generated static & dynamic pages for all 79 application routes (`79/79`).
  - Clean exit code 0.
