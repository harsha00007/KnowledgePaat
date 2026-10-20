# KnowledgePaat — UI Enhancement Phase 1: Manual Test Matrix & QA Runbook

**Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Server URL:** `http://localhost:3000`  
**Test Credentials:**  
- **Admin**: `admin@knowledgepaat.test` / `AdminPassword@2026!`  
- **Student**: `student@knowledgepaat.test` / `StudentPassword@2026!`  

---

## 1. Automated Test Suite Execution Command

To execute the complete 36-check end-to-end verification suite:

```bash
cd frontend
PATH="/home/harsha/.nvm/versions/node/v20.20.2/bin:$PATH" npx tsx scripts/test_ui_phase1_suite.ts
```

### Expected Output Summary:
```text
================================================================================
PHASE 1 VERIFICATION COMPLETE:
Total Checks Executed : 36
Passed                : 36
Failed                : 0
Blocked               : 0
Unverified            : 0
================================================================================
```

---

## 2. Step-by-Step Manual QA Test Matrix

### Test 1: Authoritative Commercial Pricing on Published Book
- **Objective**: Verify that commercial prices can be updated on a published book while publication content locks protect chapters and PDF files.
- **Preconditions**: Book is in `published` status with at least 1 active edition and published chapters.
- **Steps**:
  1. Sign in as administrator at `http://localhost:3000/login`.
  2. Navigate to `/admin/e-books` and select a published book (e.g. "Cloud System Architecture & DevOps Handbook").
  3. Click on the **"Pricing & Discounts"** tab (`/admin/e-books/[bookId]/edit?tab=pricing`).
  4. Note the current version (e.g. `Pricing Version: v1`).
  5. In **Read Online**, set List Price to ₹240 and select Discount Type "Percentage" with value 10% (Calculated Selling: ₹216).
  6. In **Read + Download**, set List Price to ₹400 and Discount Type "Fixed" with value 5000 paise (₹50 discount, Calculated Selling: ₹350).
  7. In **PDF Upgrade Price**, set List Price to ₹150 (independent of the difference).
  8. Enter a Change Reason: "Q4 Promotional Pricing Update".
  9. Click **"Save Commercial Pricing"**.
- **Expected Results**:
  - Success banner appears: "Commercial pricing updated successfully (version incremented)".
  - Pricing version updates to `v2`.
  - Database row in `ebook_pricing` has new values; mirrors in `ebook_editions` are updated synchronously.
  - Audit log row created in `ebook_audit_logs`.
  - Chapters and PDF storage reference remain completely intact and locked against tampering.

---

### Test 2: Optimistic Concurrency Rejection (Stale Edits)
- **Objective**: Verify that concurrent administrator edits do not silently overwrite each other.
- **Steps**:
  1. Open the Pricing tab in two separate browser tabs (Tab A and Tab B), both displaying `Pricing Version: v1`.
  2. In Tab A, update Read Online price to ₹200 with reason "Admin A update" and click Save. Tab A increments to `v2`.
  3. Switch to Tab B (still showing `v1`). Attempt to update Read Online price to ₹220 with reason "Admin B update" and click Save.
- **Expected Results**:
  - Tab B displays an error: *"Conflict: Pricing was modified by another administrator (version 2). Please refresh to view the latest changes."*
  - Tab B's stale edit is rejected (HTTP 409). Tab A's edit is preserved.

---

### Test 3: Validation Rules & Zero-Price Rejection
- **Objective**: Verify server-side rejection of invalid prices, bad discount percentages, and ₹0 commercial selling prices.
- **Steps**:
  1. Attempt to enter a negative list price (e.g. -₹50).
  2. Attempt to enter a discount percentage $> 100\%$ (e.g. 150%).
  3. Attempt to apply a 100% discount, making the final selling price ₹0.
  4. Attempt to submit with an empty Change Reason.
- **Expected Results**:
  - Submitting ₹0 selling price returns: *"Read Online selling price must be greater than zero paise. Free eBook access must be granted via administrator complimentary access."*
  - Submitting $>100\%$ returns: *"Read Online discount percentage must be between 0 and 100."*
  - Empty change reason returns: *"A detailed change reason is required for administrative pricing modifications."*

---

### Test 4: Dynamic Pricing Integration Across Cart & Checkout
- **Objective**: Verify that cart validation detects updated edition prices and checkout locks in the authoritative price snapshot.
- **Steps**:
  1. As a customer, view the catalogue at `/e-books` and add an edition to cart.
  2. As admin, update the edition's selling price in `ebook_pricing`.
  3. Return to the customer cart at `/cart`.
- **Expected Results**:
  - Cart validation flags the price change with a clear warning: *"The price for [Book Title] has updated to ₹X."*
  - Cart totals reflect the new server price.
  - Proceeding to checkout creates a pending order capturing the authoritative `pricing_version` and amount in paise.

---

### Test 5: Homepage Content Management (Draft Isolation & Atomic Publish)
- **Objective**: Verify draft/published isolation in the eBook Storefront Content Editor.
- **Steps**:
  1. Sign in as admin and navigate to `/admin/e-books/homepage`.
  2. In the Hero Section tab, change Main Heading to "Next-Gen Software Architecture [Draft Test]".
  3. Click **"Save Draft"**. Note status: *"Draft status: Saved draft changes"*.
  4. In an Incognito window (unauthenticated visitor), navigate to `/e-books` or call `GET /api/ebooks/homepage`.
  5. Return to the admin editor and click **"Publish to Store"**.
  6. Refresh the incognito window.
- **Expected Results**:
  - While in draft state, anonymous visitors continue to see the previously published heading (draft is strictly isolated).
  - After clicking "Publish to Store", the published configuration updates atomically.
  - Anonymous visitors now see the new heading. Active catalogue books are dynamically joined with current authoritative selling prices.

---

### Test 6: Customer eBook Management & Audited Actions
- **Objective**: Verify customer search, bounded pagination, customer detail drawer, and complimentary access granting/revocation.
- **Steps**:
  1. Sign in as admin and navigate to `/admin/e-book-customers`.
  2. Observe the total count (e.g. 85 Total Customers) and pagination controls (15 customers/page).
  3. Type a query in the search bar (e.g. `student@knowledgepaat.test`) and click Search.
  4. Click **"Inspect & Manage"** on the customer row to open the detail drawer.
  5. Inspect the 5 sub-tabs: Entitlements, Orders, Reading Progress, Download Logs, Audit Trail.
  6. Click **"Grant Complimentary Access"**, select a book, edition, and plan (`Read Online`), enter reason "Special Scholarship", and submit.
  7. Inspect the customer's entitlements and access status pill (now shows `Complimentary`).
  8. Click **"Revoke Access"** with reason "Course Completion". Confirm revocation.
  9. Click **"Restore Access"** with reason "Appeal Approved". Confirm restoration.
- **Expected Results**:
  - Search filters server-side accurately without client-side lag.
  - Complimentary grant creates an active entitlement with `grant_type: 'complimentary'`.
  - Zero financial rows are created in `ebook_orders`.
  - Revocation marks `is_active: false`. Restoration marks `is_active: true`.
  - All actions produce immutable entries in `ebook_audit_logs`.
