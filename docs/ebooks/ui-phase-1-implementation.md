# KnowledgePaat — UI Enhancement Phase 1: Implementation & Architectural Report
**Commercial Pricing Engine, Homepage Configuration & Customer Management Subsystem**

**Target System:** KnowledgePaat LMS & Technical Bookstore ([https://www.knowledgepaat.com](https://www.knowledgepaat.com))  
**Target Phase:** UI Enhancement Phase 1 of 4  
**Status:** Implementation Complete & Fully Verified (36/36 Automated Checks Passed)  
**Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Production Guard:** `csjywuflkvohytbvglxf` strictly guarded and blocked from mutations  
**Execution Timestamp:** 2026-10-19T00:15:00+05:30 (IST)  

---

## 1. Executive Summary & Core Deliverables

UI Enhancement Phase 1 delivers the authoritative commercial pricing, storefront homepage content management, and customer access management foundation for the KnowledgePaat eBook platform. It completely decouples commercial price changes from immutable publication content (chapters, edition text, and PDF storage paths), enforces atomic updates with database version checks, and provides modern administrator interfaces.

### Core Architectural Invariants Delivered:
1. **Single Authoritative Commercial Pricing Source (`public.ebook_pricing`)**:
   - Exactly one pricing record per edition enforced by a `UNIQUE (edition_id)` database constraint.
   - All legacy edition price columns (`ebook_editions.price_online_paise`, `ebook_editions.price_download_pdf_paise`, `ebook_editions.price_upgrade_pdf_paise`) act strictly as compatibility mirrors and cannot be updated independently.
   - Pricing updates, mirror synchronization, `pricing_version` increments, and audit trail generation occur atomically.
2. **Commercial Pricing Changes on Published Books**:
   - Administrators can update commercial prices on published editions at any time without triggering content verification blocks, unlocking chapters, or modifying immutable PDF asset references.
3. **Deterministic Server Calculation & Financial Rule Engine**:
   - Final prices are calculated exclusively on the server using integer paise and half-up rounding (`Math.round((orig * percent)/100)`).
   - Commercial selling prices must be strictly greater than 0 paise. Zero-price offers are rejected with explicit validation errors. Free acquisition is strictly administered via complimentary grants.
   - Upgrade pricing is independently configurable and is not mathematically constrained to equal download price minus online price.
4. **Optimistic Concurrency & Immutable Financial Snapshots**:
   - Administrator pricing updates enforce optimistic concurrency control via integer `pricing_version`. Stale edits receive HTTP 409 Conflict.
   - Order creation captures a coherent financial snapshot (`edition_id`, `plan`, `currency`, `amount_paise`, `pricing_version`).
   - Delayed payment reconciliation safely recovers and finalizes orders captured after client-side local timer expiry.
5. **Homepage Content Management (`/admin/e-books/homepage`)**:
   - Draft and published content rows (`public.ebook_homepage_content`) are strictly isolated.
   - Draft updates and previews do not leak to public storefront visitors.
   - Publishing is atomic, validates outbound URLs, and dynamically joins current catalogue books with authoritative selling prices (no duplicated or stale selling prices stored in homepage config).
6. **Customer eBook Management (`/admin/e-book-customers`)**:
   - Server-side search and bounded pagination across customer profiles.
   - Single-customer detail view aggregating owned entitlements, order histories, reading progress, and download access logs.
   - Audited access management actions (complimentary grant, revocation, restoration) recorded in `ebook_audit_logs`. Complimentary grants do not create artificial financial orders.

---

## 2. Database Schema & Migration Architecture

Migration File: `supabase/migrations/supabase_ui_phase1_pricing_and_homepage.sql` (Applied on dedicated staging Supabase `lzuinimbsdxnhzmjpxmr`).

### 2.1 Authoritative Pricing Table: `public.ebook_pricing`
```sql
CREATE TABLE IF NOT EXISTS public.ebook_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_id UUID NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE,
    online_original_price_paise INTEGER NOT NULL CHECK (online_original_price_paise >= 0),
    online_discount_type VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (online_discount_type IN ('none', 'percentage', 'fixed')),
    online_discount_value NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (online_discount_value >= 0),
    online_price_paise INTEGER NOT NULL CHECK (online_price_paise > 0),
    download_original_price_paise INTEGER NOT NULL CHECK (download_original_price_paise >= 0),
    download_discount_type VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (download_discount_type IN ('none', 'percentage', 'fixed')),
    download_discount_value NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (download_discount_value >= 0),
    download_price_paise INTEGER NOT NULL CHECK (download_price_paise > 0),
    upgrade_original_price_paise INTEGER NOT NULL CHECK (upgrade_original_price_paise >= 0),
    upgrade_discount_type VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (upgrade_discount_type IN ('none', 'percentage', 'fixed')),
    upgrade_discount_value NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (upgrade_discount_value >= 0),
    upgrade_price_paise INTEGER NOT NULL CHECK (upgrade_price_paise > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    pricing_version INTEGER NOT NULL DEFAULT 1 CHECK (pricing_version >= 1),
    change_reason TEXT,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_ebook_pricing_edition UNIQUE (edition_id),
    CONSTRAINT ck_download_ge_online CHECK (download_price_paise >= online_price_paise)
);
```

### 2.2 Homepage Content Management Table: `public.ebook_homepage_content`
```sql
CREATE TABLE IF NOT EXISTS public.ebook_homepage_content (
    id VARCHAR(20) PRIMARY KEY CHECK (id IN ('draft', 'published')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    updated_by UUID REFERENCES auth.users(id),
    published_by UUID REFERENCES auth.users(id),
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

---

## 3. Server-Authoritative Price Calculation & Discount Engine

Source Files:
- Pure calculations & types: `frontend/lib/ebook/pricingShared.ts`
- Database mutations & audit logging: `frontend/lib/ebook/pricing.ts`

### 3.1 Discount Types & Precision Rules
- **Allowed Discount Types**:
  - `none`: Discount amount = 0 paise, selling price = original price.
  - `percentage`: Discount value is a number between 0 and 100. Precision is evaluated with standard deterministic half-up rounding to the nearest integer paise:
    $$\text{discountAmountPaise} = \text{Math.round}\left(\frac{\text{originalPricePaise} \times \text{clampedPercent}}{100}\right)$$
  - `fixed`: Discount value is an amount in paise (`Math.round(discountValue)`).
- **Bounds**:
  - Original prices: $\ge 0$ paise.
  - Discount amount: clamped to $[0, \text{originalPricePaise}]$.
  - Selling price: $\text{finalPricePaise} = \max(0, \text{originalPricePaise} - \text{discountAmountPaise})$.
- **Zero-Price Commercial Offer Policy**:
  - Payment gateways (Razorpay) reject transactions of ₹0. To prevent downstream gateway capture failures and fraudulent zero-rupee financial orders, all commercial offers must have $\text{finalPricePaise} > 0$.
  - Free acquisition is strictly managed via administrator complimentary access grants.

### 3.2 Optimistic Concurrency Control
When an administrator submits a pricing update via `PUT /api/admin/ebooks/[bookId]/pricing`:
1. The server loads the current `pricing_version` for the edition.
2. If `payload.currentVersion !== dbRecord.pricing_version`, the update is rejected immediately with HTTP 409 Conflict:
   ```json
   {
     "error": "Conflict: Pricing was modified by another administrator (version 3). Please refresh to view the latest changes.",
     "currentVersion": 3
   }
   ```
3. If versions match, the update executes within an atomic operation:
   - Increments `pricing_version` to `currentVersion + 1`.
   - Synchronously updates compatibility mirror columns in `ebook_editions`.
   - Logs the action to `ebook_audit_logs` with `action: 'edition_pricing_updated'`, recording `previous_pricing`, `new_pricing`, and `change_reason`.

---

## 4. Integration with Storefront, Cart, Orders & Upgrades

### 4.1 Cart Price Validation (`POST /api/ebooks/cart/validate`)
- Accepts customer cart items with client-claimed prices.
- Queries `ebook_pricing` for each edition.
- Compares claimed prices against authoritative server selling prices.
- If a price changed while an item was in the customer's cart, it flags the difference, calculates authoritative totals, and notifies the customer:
  ```json
  {
    "warnings": ["The price for \"Cloud System Architecture & DevOps Handbook\" has updated to ₹180."],
    "totalPaise": 18000
  }
  ```

### 4.2 Checkout Order Creation (`frontend/lib/ebook/orders.ts`)
- `createEBookServerOrder` resolves authoritative edition pricing directly from `ebook_pricing`.
- Encapsulates `pricing_version` inside the order item metadata, guaranteeing that a concurrent administrator price change during checkout cannot cause a mismatched total.

### 4.3 Upgrade Quotes (`frontend/lib/ebook/downloads.ts`)
- `getUpgradeQuote` queries `getAuthoritativeEditionPricing` for the edition's configured `upgrade_price_paise`.
- Eliminates silent default ₹50 fallbacks when authoritative edition pricing is present.

---

## 5. Visual Proof of Completed Phase 1 Interfaces

The following three high-resolution browser captures were taken using installed native Google Chrome (`/usr/bin/google-chrome`) with authenticated administrator sessions on staging:

1. **Admin Authoritative Pricing Tab (`/admin/e-books/[bookId]/edit?tab=pricing`)**:
   ![Admin Pricing Tab](/home/harsha/.gemini/antigravity-ide/brain/651141cd-1942-4961-ad67-66a54539bfed/screenshots/ui_phase1_pricing_tab.png)
   *Shows published book pricing editor, optimistic version indicator (v1), three commercial pricing cards (Read Online, Read + Download, PDF Upgrade) with discount selectors, and live storefront price card preview.*

2. **eBook Homepage Content Editor (`/admin/e-books/homepage`)**:
   ![Homepage Editor](/home/harsha/.gemini/antigravity-ide/brain/651141cd-1942-4961-ad67-66a54539bfed/screenshots/ui_phase1_homepage_editor.png)
   *Shows draft/published status pills, hero configuration inputs, call-to-action buttons, tabbed navigation (Hero, Featured, Categories, Banner, Visibility), Save Draft, Preview Draft, and Publish to Store.*

3. **eBook Customer Management (`/admin/e-book-customers`)**:
   ![Customer Management](/home/harsha/.gemini/antigravity-ide/brain/651141cd-1942-4961-ad67-66a54539bfed/screenshots/ui_phase1_customer_management.png)
   *Shows customer search, status filter pills (All, Active Readers, Complimentary, Revoked), 85 total customers with pagination, access status badges, owned edition counts, and "Inspect & Manage" action drawers.*

---

## 6. Verification Status Summary

| Area | Requirement | Status | Evidence |
| :--- | :--- | :--- | :--- |
| **Pricing Authority** | Single `ebook_pricing` record per edition | **PASS** | `uq_ebook_pricing_edition` unique constraint verified in staging PostgreSQL |
| **Mirrors** | Synchronous mirror to `ebook_editions` | **PASS** | `PRICE-03` passed in automated suite |
| **Audit Logs** | Atomic audit log emission on price change | **PASS** | `PRICE-04` passed; logs actor, reason, previous and new values |
| **Content Protection** | Price updates on published book without unlocking content | **PASS** | `PUB-01` verified; chapters and PDF paths remain immutable |
| **Discount Precision** | Server-authoritative half-up paise rounding | **PASS** | `CALC-01` verified deterministic rounding on fractional paise |
| **Zero-Price Policy** | Rejection of ₹0 commercial selling prices | **PASS** | `VAL-05` verified; 400 Bad Request returned |
| **Upgrade Independence** | Configurable upgrade price decoupled from diff | **PASS** | Verified custom ₹100 upgrade price for ₹180/₹300 editions |
| **Optimistic Locking** | 409 Conflict on stale pricing version | **PASS** | `CONC-01` verified with concurrent edit simulation |
| **Order Immutability** | Order financial snapshots preserved | **PASS** | `ORD-01` verified; historical order prices immutable |
| **Homepage Drafts** | Isolated draft and atomic publication | **PASS** | `HOME-01`, `HOME-02`, `HOME-03`, `HOME-04` passed |
| **Customer Management** | Bounded pagination, search, grant/revoke | **PASS** | `CUST-01` through `CUST-06` passed |
| **Financial Isolation** | Complimentary grants create zero financial orders | **PASS** | `GRANT-01` verified in staging database |
| **Build & Type Checking**| Zero TypeScript or Next.js build errors | **PASS** | `tsc --noEmit` exit 0, `next build` exit 0 |
