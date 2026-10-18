# KnowledgePaat — Phase 3 Actionable Implementation Checklist

**Target Phase:** Phase 3 of 9 (Public Bookstore, Book Details, Free Sample Experience, Access-Plan Selection & Guest Shopping Cart)  
**Status:** COMPLETED & VERIFIED ON DEDICATED STAGING (24/24 Live Tests PASS, TypeScript 0 Errors, Turbopack Build 79/79 PASS)  
**Date:** October 2026  

---

## 1. Overview & Objectives

Phase 3 establishes the unauthenticated public storefront and guest commerce subsystem for the KnowledgePaat eBook platform. Visitors can explore technical books, search and filter by category, preview free sample chapters in a dedicated reading drawer, inspect dual-tier access plans (Read Online ₹49 vs Read + Download ₹99), and manage an unauthenticated shopping cart backed by versioned browser storage and authoritative server revalidation.

---

## 2. Ordered Implementation Tasks & Verification Status

### Task 3.1: Safe Public Catalogue Data APIs
- [x] **Catalogue Listing API**: [`frontend/app/api/ebooks/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/route.ts)
  - Deliberately public fields projected; private storage paths and paid chapter bodies strictly excluded.
  - *Verification*: Tested via `test_phase3_public_store_suite.ts` (Test 1, 3, 4).
  - *Result*: **PASS**
- [x] **Book Details API**: [`frontend/app/api/ebooks/[bookId]/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/[bookId]/route.ts)
  - Supports both UUID and canonical slug. Table of contents exposes metadata only; zero `content_body` queried.
  - *Verification*: Tested via `test_phase3_public_store_suite.ts` (Test 4, 7).
  - *Result*: **PASS**
- [x] **Free Sample API**: [`frontend/app/api/ebooks/[bookId]/sample/[chapterId]/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/[bookId]/sample/[chapterId]/route.ts)
  - Strictly enforces `is_free_sample = true` on published edition. Rejects paid chapter ID manipulation.
  - Sanitizes rich content against stored XSS via `renderSafeMarkdown`.
  - *Verification*: Tested via `test_phase3_public_store_suite.ts` (Test 5, 15).
  - *Result*: **PASS**
- [x] **Authoritative Cart Validation API**: [`frontend/app/api/ebooks/cart/validate/route.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/api/ebooks/cart/validate/route.ts)
  - Deduplicates items (1 per book), enforces integer paise, and prunes withdrawn/unpublished titles.
  - *Verification*: Tested via `test_phase3_public_store_suite.ts` (Test 9, 10, 11, 14).
  - *Result*: **PASS**

---

### Task 3.2: Public Bookstore (`/e-books`)
- [x] **Storefront Page & Skeletons**: [`frontend/app/e-books/page.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/e-books/page.tsx) & [`BookstoreClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/e-books/BookstoreClient.tsx)
  - Exactly two cards per row on desktop (`grid-cols-1 md:grid-cols-2`), single column on mobile.
  - Search input with clear button and category filter pills with URL sync.
  - Shimmer card loading skeletons, empty state with filter reset, and error state with retry.
  - *Verification*: Verified via Next.js build (route compiled) and `test_phase3_public_store_suite.ts` (Test 6, 16).
  - *Result*: **PASS**

---

### Task 3.3: Book Details Page (`/e-books/[bookId]`)
- [x] **Product Detail View**: [`frontend/app/e-books/[bookId]/page.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/e-books/[bookId]/page.tsx) & [`BookDetailClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/e-books/[bookId]/BookDetailClient.tsx)
  - Dynamic SEO title, description, and canonical URL generation.
  - Cover presentation, edition badges, author attribution, and intended reader audience.
  - Access-plan comparison cards: Read Online (₹49) vs Read + Download (₹99) with ₹50 upgrade notice.
  - Numbered table of contents with sample tags and direct sample reader triggers.
  - *Verification*: Verified via Next.js build and live staging queries.
  - *Result*: **PASS**

---

### Task 3.4: Free Sample Experience
- [x] **Free Sample Drawer**: [`frontend/components/ebook/FreeSampleDrawer.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/components/ebook/FreeSampleDrawer.tsx)
  - Slide-over drawer with backdrop, keyboard `Escape` dismissal, focus trapping, and focus restoration.
  - Comfortable typography, word count, reading time estimate, and sample chapter switcher.
  - Bottom purchase CTAs: "Read Online (₹49)" and "Read + PDF (₹99)".
  - *Verification*: Verified component implementation and XSS neutralization test.
  - *Result*: **PASS**

---

### Task 3.5: Guest Cart & State Management
- [x] **Cart Provider & State Hook**: [`frontend/lib/ebook/cartContext.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/ebook/cartContext.tsx) & [`frontend/hooks/useEBookCart.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/hooks/useEBookCart.ts)
  - Versioned browser storage (`knowledgepaat_ebook_cart_v1`).
  - Safe error recovery against corrupt JSON or invalid versions without crashing.
  - Cross-tab synchronization via `window.storage` event listener.
  - 1 item per book constraint (no quantity controls for digital books).
  - Mixed plan calculations in integer minor units (paise).
  - *Verification*: Tested via `test_phase3_public_store_suite.ts` (Test 9, 10, 11, 12, 13, 14).
  - *Result*: **PASS**
- [x] **Cart Page (`/cart`)**: [`frontend/app/cart/page.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/cart/page.tsx) & [`CartClient.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/cart/CartClient.tsx)
  - Line items with plan toggle, remove action, clear cart confirmation modal, and order summary.
  - *Verification*: Tested via Next.js build and test suite.
  - *Result*: **PASS**

---

### Task 3.6: Checkout Handoff & Security Boundaries
- [x] **Checkout Handoff Modal**:
  - Displays verified line items, selected plans, and authoritative totals in paise.
  - Zero fake payments, zero mock entitlements, and zero routing into legacy student store checkout.
  - Preserves guest cart across sign-in flow (`/login?redirectTo=/cart`).
  - *Verification*: Verified modal and redirect path validation.
  - *Result*: **PASS**

---

### Task 3.7: Design & Accessibility
- [x] **KnowledgePaat Design Token Alignment**:
  - Growth Blue (`#2563EB`), Deep Navy (`#0B1D3A`), Knowledge Teal accents (`#00C2CB`).
  - Top navigation updated with "eBooks" link and shopping cart badge in [`PublicLayout.tsx`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/layouts/PublicLayout.tsx).
  - Footer updated with "eBooks Bookstore" link.
  - *Verification*: Verified visually and via component inspects.
  - *Result*: **PASS**

---

### Task 3.8: SEO & Sitemap Integration
- [x] **Dynamic Sitemap & Robots**: [`frontend/app/sitemap.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/sitemap.ts) & [`frontend/app/robots.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/app/robots.ts)
  - Sitemap dynamically includes `/e-books` and all published book slugs from database.
  - Robots disallows protected `/read/` route from search engine crawlers.
  - Cart pages marked `noindex, nofollow`.
  - *Verification*: Verified sitemap build and robots rules.
  - *Result*: **PASS**

---

## 3. Acceptance Verification Summary
 
| # | Verification Area | Target | Status |
|:---:|---|---|:---:|
| 1 | Anonymous catalogue browsing | Staging Supabase & Client | **PASS** |
| 2 | Signed-in customers not redirected | Middleware routing | **PASS** |
| 3 | Draft & withdrawn records isolated | Database RLS & API | **PASS** |
| 4 | Paid content & storage paths omitted | Projection queries | **PASS** |
| 5 | Sample chapter tampering rejected | API server validation | **PASS** |
| 6 | Precomputed word count metadata | Public API TOC projection | **PASS** |
| 7 | Invalid IDs & 404 handling | Error boundaries | **PASS** |
| 8 | Scenario 5: Guest cart persistence | Browser localStorage | **PASS** |
| 9 | Scenario 6: Dynamic plan switching in cart | Cart context & state | **PASS** |
| 10 | Scenario 7: Multi-item mixed cart (₹148) | Integer paise (14800) | **PASS** |
| 11 | Scenario 8: Removing item & clearing cart | Cart context & modal | **PASS** |
| 12 | Scenario 9: Checkout modal & "Sign in to continue" | Feature flag & routing | **PASS** |
| 13 | Open redirect protection & URL sanitization | Redirect security helper | **PASS** |
| 14 | Server price authority enforcement | Authoritative DB lookup | **PASS** |
| 15 | Withdrawn book pruning & unsupported plan reset | Cart revalidation endpoint | **PASS** |
| 16 | Customer UI language & feature flag compliance | Client JSX review | **PASS** |
| 17 | Stored XSS neutralization | Markdown sanitizer | **PASS** |
| 18 | Corrupt storage recovery | Fault-tolerant parser | **PASS** |
| 19 | Student store & Phase 2 admin regression | Schema & code check | **PASS** |
| 20 | Cart deduplication (1 item/book) | Cart state logic | **PASS** |
| 21 | Multiple tabs cross-synchronization | StorageEvent listener | **PASS** |
| 22 | Truth in pricing & validation failure handling | Checkout gating & total | **PASS** |
| 23 | Free sample drawer keyboard accessibility | Escape key & focus trap | **PASS** |
| 24 | Price change notification & server override | Server validation warnings | **PASS** |
