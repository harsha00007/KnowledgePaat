# KnowledgePaat — Phase 8 Manual Test Guide: Admin Operations, Refunds & Financial Reconciliation

**Status:** Implementation complete; external acceptance checks pending.  
**Target Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Application URL:** `http://localhost:3000`  
**Admin URL:** `http://localhost:3000/admin/e-book-orders`  
**Test Administrator Credentials:** Configured with `role = 'admin'` in `public.profiles`  
**Test Student / Customer Credentials:** Configured with `role = 'student'` in `public.profiles`  
**Gateway Mode:** Razorpay Test Mode (`rzp_test_...` key pair)  
**Browser Status:** Interactive browser journeys verified via installed native Google Chrome (`Google Chrome 155.0.8059.39` at `/usr/bin/google-chrome`). 10 authenticated screenshots captured in artifacts directory. Manual steps below provide operator instructions.

---

## Scenario 1: RBAC Security — Anonymous and Student Rejection
- **Precondition:** Browser session is unauthenticated, or signed in as a standard student (`role = 'student'`).
- **Steps:**
  1. In an incognito window, navigate to `http://localhost:3000/admin/e-book-orders`.
  2. Attempt direct API access in terminal or browser console:
     ```bash
     curl -i http://localhost:3000/api/admin/ebooks/orders
     ```
  3. Sign in as a regular student account and navigate to `http://localhost:3000/admin/e-book-orders`.
- **Expected Result:**
  - Unauthenticated access redirects immediately to `/admin/login` or returns HTTP `401 Unauthorized`.
  - Student account access displays an amber warning card: *"Access Denied — Administrator privileges are required to view eBook financial orders and operations."* with a link to return to the student dashboard.
  - Direct API calls return HTTP `401` or `403 Forbidden` (`FORBIDDEN: Admin privileges required`).
  - Database RLS policies prevent reading `ebook_refunds`, `ebook_audit_logs`, or privileged order fields.

---

## Scenario 2: Admin Purchase History Ledger & Multi-Dimensional Filtering
- **Precondition:** Signed in as an authorized administrator (`role = 'admin'`).
- **Steps:**
  1. Navigate to `http://localhost:3000/admin/e-book-orders`.
  2. Verify that the table loads and displays:
     - Internal Order Reference (e.g., `ORD-20261018-...`)
     - Customer Name & Email
     - Purchased Book Title & Plan Badge
     - Total Amount in Rupees (e.g., `₹99.00`, `₹50.00`, `₹49.00`)
     - Payment Status (`paid`, `pending`, `failed`)
     - Refund Status (`none`, `partial`, `full`)
     - Creation Date with unambiguous timezone label: `IST (UTC+05:30)`
  3. Test Search Bar:
     - Enter customer email (e.g., `customer@example.com`) and verify matching records filter instantly.
     - Search by Gateway Order ID (e.g., `order_...`) or Payment ID (`pay_...`).
  4. Test Filters:
     - Select Order Type: `Upgrades Only (₹50)` — verify only PDF upgrade orders are displayed.
     - Select Refund State: `Refunded` — verify only refunded or partially refunded orders appear.
  5. Test Pagination:
     - Click `Next` and `Previous` buttons to verify page navigation.
- **Expected Result:**
  - Filtering and search execute server-side with debounce.
  - All displayed monetary values match integer paise divided by 100.
  - Timezones are clearly labelled as `IST (UTC+05:30)`.

---

## Scenario 3: Order Details & Bi-Directional Linked Upgrade Navigation
- **Precondition:** An original ₹49 base purchase order exists with a subsequent ₹50 upgrade order.
- **Steps:**
  1. From `/admin/e-book-orders`, click on the ₹49 base order.
  2. Verify order details display:
     - Customer details, item list, unit prices in paise, tax breakdown, gateway payment ID, and payment timestamp.
     - Active entitlement status and granted edition.
  3. Locate the **"Linked PDF Upgrade Order"** banner:
     - Displays link to the ₹50 upgrade order.
  4. Click the link to navigate to the upgrade order (`/admin/e-book-orders/[upgradeOrderId]`).
  5. Verify the upgrade order details display:
     - Order Type badge: `Upgrade Order (₹50)`.
     - Link back to: **"Original Purchase Order"** (`[originalOrderId]`).
  6. Click the original purchase link to navigate back seamlessly.
- **Expected Result:**
  - Both orders maintain independent financial snapshots and immutable gateway IDs.
  - Navigation between the base purchase and upgrade order is bi-directional and instantaneous.

---

## Scenario 4: Real Test-Mode Full Refund (Rule A: Full ₹99 Purchase Refund)
- **Precondition:** Order is a paid ₹99 standalone purchase (`read_download` plan) with active entitlement.
- **Steps:**
  1. Navigate to `/admin/e-book-orders/[orderId]`.
  2. Click the red button **"Process Refund"** in the top action bar.
  3. In the refund modal:
     - Select Refund Type: **Full Refund**.
     - Verify refund amount is populated with full `₹99.00` (9900 paise).
     - Enter mandatory reason: `Customer requested refund within 24 hours of purchase`.
     - Review the Access Impact Warning: *"Entitlement for edition will be REVOKED. Customer will lose both online reading and download access."*
  4. Click **"Confirm & Process Refund"**.
  5. Wait for confirmation toast.
- **Expected Result:**
  - Durable intent is persisted in `ebook_refunds` with status `pending`.
  - Gateway refund is executed with deterministic idempotency key.
  - Order status updates: `refund_status: full`, `refunded_amount_paise: 9900`.
  - Customer entitlement status transitions to `revoked`.
  - If customer attempts to read or download, access is denied (`ACCESS_REVOKED`).
  - Bookmarks and historical reading progress are **preserved** (not deleted).

---

## Scenario 5: Real Test-Mode Upgrade Refund (Rule B: Full ₹50 Upgrade Refund)
- **Precondition:** Order is a paid ₹50 upgrade order (`upgrade_pdf` plan). Customer previously owned ₹49 online access.
- **Steps:**
  1. Open the ₹50 upgrade order details at `/admin/e-book-orders/[upgradeOrderId]`.
  2. Click **"Process Refund"**.
  3. Verify refund modal displays:
     - Full Refund: `₹50.00`.
     - Reason field.
     - Access Impact Warning: *"Entitlement will be DOWNGRADED to online-only access. PDF download privileges will be removed, but online reading will remain intact."*
  4. Confirm refund.
- **Expected Result:**
  - Upgrade order is marked `refund_status: full`.
  - Customer entitlement `plan` is downgraded from `read_download` to `read_online`.
  - Customer `can_download_pdf` becomes `false`, while `can_read_online` remains `true`.
  - In `My Books`, the book badge reverts from `Read + Download` to `Online Reading Only`.
  - Direct download endpoint returns HTTP `403 Forbidden` (`ONLINE_ONLY_PLAN`).

---

## Scenario 6: Dependent Upgrade Safeguard (Rule C: Base ₹49 Refund Blocked)
- **Precondition:** Base ₹49 order has an active dependent ₹50 upgrade order.
- **Steps:**
  1. Open the base ₹49 order details at `/admin/e-book-orders/[baseOrderId]`.
  2. Click **"Process Refund"**.
  3. Inspect modal warning:
     - System detects active dependent upgrade.
     - Standalone refund is disabled with message: *"An active PDF upgrade order exists for this edition. You must resolve the upgrade order first or choose 'Refund Both Orders'."*
  4. Select **"Refund Both Orders (₹99 total)"**.
  5. Verify both orders and amounts are displayed clearly.
  6. Enter reason and confirm.
- **Expected Result:**
  - System cascades refunds: first initiates refund on the ₹50 upgrade order, then on the ₹49 base order.
  - Both gateway refunds are recorded with individual provider refund IDs.
  - Entitlement is revoked only after both refunds settle.
  - Under no circumstances is the base order refunded alone while leaving an orphaned upgrade.

---

## Scenario 7: Partial / Goodwill Refund without Revocation (Rule D)
- **Precondition:** Paid ₹99 order with active entitlement.
- **Steps:**
  1. Open order details.
  2. Click **"Process Refund"**.
  3. Select Refund Type: **Partial Refund**.
  4. Enter Amount: `₹20.00` (2000 paise).
  5. Select Item Allocation: `Mastering Microservices Architecture (₹20.00)`.
  6. Check Access Policy: **"Retain Customer Access (Goodwill Discount)"**.
  7. Confirm refund.
- **Expected Result:**
  - Razorpay processes partial refund of ₹20.00.
  - Order `refund_status` becomes `partial`, `refunded_amount_paise: 2000`.
  - Item `refunded_paise: 2000`.
  - Entitlement remains active (`status: active`, `can_read_online: true`, `can_download_pdf: true`).

---

## Scenario 8: Provider Uncertain Response & Admin Reconciliation Recovery
- **Precondition:** Simulated network timeout, socket hangup, 5xx server response, or connection drop during refund initiation.
- **Steps:**
  1. Trigger a refund that experiences gateway latency, dropped connection, or 5xx server response.
  2. Notice that the refund row in order details displays status: `pending` with diagnostic error message (e.g. `GATEWAY_NETWORK_TIMEOUT`).
  3. Notice that customer entitlement is **not** prematurely mutated or revoked.
  4. Notice that available refundable balance calculation continues to count the pending intent as reserved, preventing double-refunds.
  5. Click the action button **"Sync with Gateway"** (or execute reconciliation sync).
- **Expected Result:**
  - Admin endpoint `POST /api/admin/ebooks/refunds/[refundId]/reconcile` paginates through Razorpay payment refunds and strictly validates payment ID, exact amount in paise, currency, and receipt/notes correlation.
  - If Razorpay confirms the refund is processed, database transitions status to `processed` and applies access changes atomically.
  - If a single query returns no matching record, the reservation is **NOT** released and the refund is **NOT** marked failed. The intent safely remains in `pending` status with diagnostic notes retained until sufficiently authoritative evidence confirms definitive refusal or failure.

---

## Scenario 9: Audited Customer Access Management
- **Precondition:** Customer owns an active eBook entitlement.
- **Steps:**
  1. In Order Details, locate the **"Customer Access Management"** card.
  2. Click **"Manage Access"**.
  3. Verify modal shows:
     - Current Plan (`Read + Download`), Status (`Active`), Grant Source (`Paid Order`).
  4. Select Action: **Revoke Access**.
  5. Enter Mandatory Reason: `Violation of terms of service — unauthorized automated scraping detected`.
  6. Click **"Confirm Revocation"**.
  7. Verify access transitions to `revoked`.
  8. Click **"Manage Access"** again, select **"Restore Access"** or **"Issue Complimentary Grant"**.
  9. Enter Reason: `Issue resolved after student appeal`.
  10. Confirm action.
- **Expected Result:**
  - Complimentary grant or restoration updates entitlement without creating fake orders or financial transactions.
  - Audit log table `public.ebook_audit_logs` records: `actor_id`, `customer_id`, `action`, `reason`, `before_state`, and `after_state`.

---

## Scenario 10: Financial Operations Overview & Formula-Injection Safe CSV Export
- **Precondition:** Signed in as administrator on `/admin/e-book-orders`.
- **Steps:**
  1. Click the **"Operations Overview"** tab.
  2. Verify KPI metrics:
     - Gross Captured Sales (e.g., `₹248.00`)
     - Processed Refunds (e.g., `₹99.00`)
     - Pending Refunds (kept strictly separate from processed)
     - Net Captured Sales (`₹149.00`)
     - Upgrade Revenue (tracked distinctly without double-counting)
     - Active Entitlements: Online Only vs. Read + Download
     - Download Link Issuances: labelled accurately as *link issuances*, not completed client downloads.
  3. Click **"Export CSV"**.
  4. Open the downloaded CSV file in a text editor or spreadsheet program.
  5. Inspect the file content:
     - Cells containing potential formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) are safely escaped with a leading single quote `'`.
     - Amounts are formatted correctly.
- **Expected Result:**
  - Net sales formula: `Gross Captured - Processed Refunds`.
  - CSV export is immune to CSV formula injection vulnerabilities.

---

## Scenario 11: Read-Only Financial Reconciliation Tab
- **Precondition:** Razorpay Test Mode keys configured.
- **Steps:**
  1. Click the **"Reconciliation"** tab on `/admin/e-book-orders`.
  2. Review the discrepancy report:
     - Local vs. Provider Captured Mismatches
     - Local vs. Provider Refund Discrepancies
     - Unresolved Provider Requests / Timeouts
  3. If all transactions are synchronized, verify the green banner: *"All local orders and refunds match Razorpay gateway records perfectly."*
- **Expected Result:**
  - Reconciliation operates in strict **read-only** mode (no bank account changes, instant settlements, or payout mutations).
  - Unsynchronized orders provide an inline recovery button utilizing the existing idempotent fulfillment/refund pipeline.

---

## Scenario 12: Customer Visibility in My Books Order History
- **Precondition:** Signed in as customer who experienced a full or partial refund.
- **Steps:**
  1. Navigate to `http://localhost:3000/my-books`.
  2. Click **"Order History"** button.
  3. Review the orders modal:
     - Refunded orders display an amber or red badge: `Refunded (₹99.00)` or `Partially Refunded (₹20.00)`.
     - Refund date and timeline are displayed clearly.
     - Access explanation states: `Access revoked per refund policy` or `Read Online access retained`.
- **Expected Result:**
  - Customer receives truthful, transparent visibility into their order and refund status.
  - No confusing technical jargon or premature claims of completed bank transfers.
