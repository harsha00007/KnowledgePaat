# KnowledgePaat eBook Platform — Manual Test Run Execution Template

**Document Purpose:** Standard execution record and evidence capture log for manual testing of the KnowledgePaat eBook platform. Testers must complete this document during each manual QA cycle.

---

## 1. Test Session Metadata & Pre-Configured Test Accounts

| Field | Tester Entry / Value |
| :--- | :--- |
| **Tester Name:** | [Your Name / QA Lead] |
| **Execution Date:** | 2026-10-21 |
| **Primary Browser & Version:** | Google Chrome (Window 1 - Admin) |
| **Secondary Browser (Customer):** | Incognito Window / Firefox (Window 2 - Customer A) |
| **Boundary Browser (Customer B):** | Guest Window / Chrome Profile 2 (Window 3 - Customer B) |
| **Target Environment:** | Staging Supabase (`lzuinimbsdxnhzmjpxmr`) |
| **Gateway Mode:** | Razorpay Test Mode (`rzp_test_TpFcydlpI44Xn1`) |
| **Base Application URL:** | `http://localhost:3000` |

### Pre-Configured Staging Credentials & Test Assets

| Role / Asset | Target URL / Value | Login Credentials / Details |
| :--- | :--- | :--- |
| **Administrator** | `http://localhost:3000/admin/login` | **Email:** `admin@knowledgepaat.test`<br>**Password:** `ihNLdMKsXxdBueZ2aGKGMqSayS8uSoX7!Kp1A` |
| **Customer A (Student)** | `http://localhost:3000/login` | **Email:** `student@knowledgepaat.test`<br>**Password:** `5iqSoH1eJbWy9fUeBflgzdaeQ5LQET7V!Kp1A` |
| **Customer B (Boundary)** | `http://localhost:3000/login` | **Email:** `phase5.api.test@knowledgepaat.test`<br>**Password:** `Kp!ZIXTlfByFmLsbBzm#9z` |
| **Razorpay Test Card (Success)** | Razorpay Modal | **Card:** `4100 2800 0000 1007`<br>**Exp:** Any future (e.g. `12/28`) \| **CVV:** `123` \| **OTP:** `123456` |
| **Razorpay Test Card (Failure)** | Razorpay Modal | **Card:** `4000 0000 0000 0002` (Simulates bank decline) |

---

## 2. Disposable Staging Records Tracking

Record all disposable IDs created during this test session to enable post-test auditing or cleanup:

| Record Type | Description / Title | Generated ID / Reference |
| :--- | :--- | :--- |
| **Test Book ID 1 (Base):** | `Manual Test Guide to Cloud Architecture` | `[e.g., 550e8400-e29b-41d4-a716-446655440000]` |
| **Edition ID 1 (Published):** | `Edition 1 (Initial Release)` | `[e.g., a8c1...-edition-1]` |
| **Edition ID 2 (Revision):** | `Edition 2 (Major Update)` | `[e.g., b9d2...-edition-2]` |
| **Test Book ID 2 (Draft):** | `Secret Unpublished Draft Book` | `[e.g., c1e3...-draft-book]` |
| **Base Order Number:** | Customer A ₹49 Read Online Purchase | `[e.g., KP-EB-20261021-001]` |
| **Base Razorpay Payment ID:** | Test Mode Payment ID | `[e.g., pay_Qz123456789abc]` |
| **Upgrade Order Number:** | Customer A ₹50 PDF Upgrade Order | `[e.g., KP-EB-20261021-002]` |
| **Upgrade Payment ID:** | Test Mode Payment ID | `[e.g., pay_Qz987654321def]` |
| **Base Refund ID:** | Full/Partial Base Refund Provider ID | `[e.g., rfnd_Qz111222333aaa]` |
| **Upgrade Refund ID:** | Upgrade Refund Provider ID | `[e.g., rfnd_Qz444555666bbb]` |

---

## 3. Test Execution Log by Suite

Record status as **PASS**, **FAIL**, **BLOCKED**, or **NOT RUN**. Describe actual observed behavior and paste links to screenshots or terminal logs.

### Suite A: Administrator Prepares Books

| Test ID | Test Title | Result | Actual Behavior Observed | Evidence Reference / Screenshot | Issue Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ADM-01** | Sign In as Administrator | NOT RUN | | | |
| **TC-ADM-02** | Create Draft Book & Metadata | NOT RUN | | | |
| **TC-ADM-03** | Upload Public Cover Asset | NOT RUN | | | |
| **TC-ADM-04** | Upload Private Publication PDF | NOT RUN | | | |
| **TC-ADM-05** | Author Chapters, Readiness & Sample | NOT RUN | | | |
| **TC-ADM-06** | Configure Dynamic Pricing | NOT RUN | | | |
| **TC-ADM-07** | Publication with Missing Prereqs | NOT RUN | | | |
| **TC-ADM-08** | Satisfy Prereqs & Publish Edition | NOT RUN | | | |

---

### Suite B: Public Visitor Explores Bookstore

| Test ID | Test Title | Result | Actual Behavior Observed | Evidence Reference / Screenshot | Issue Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-VIS-01** | Portal Entry & Slide Transition | NOT RUN | | | |
| **TC-VIS-02** | Logo Navigation Back to Main Home | NOT RUN | | | |
| **TC-VIS-03** | Dedicated Header & Cart Placement | NOT RUN | | | |
| **TC-VIS-04** | Search, Topic Filtering & Pagination | NOT RUN | | | |
| **TC-VIS-05** | Book Details & Authoritative Pricing | NOT RUN | | | |
| **TC-VIS-06** | Read Free Sample Without Auth | NOT RUN | | | |
| **TC-VIS-07** | Paid Chapters Access Protection | NOT RUN | | | |

---

### Suite C: Guest Cart and Authentication

| Test ID | Test Title | Result | Actual Behavior Observed | Evidence Reference / Screenshot | Issue Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CRT-01** | Add Books Under Both Plans | NOT RUN | | | |
| **TC-CRT-02** | Duplicate Re-Add Prevention | NOT RUN | | | |
| **TC-CRT-03** | Cart Plan Switch & Price Recalc | NOT RUN | | | |
| **TC-CRT-04** | Remove Item & Clear Cart Modal | NOT RUN | | | |
| **TC-CRT-05** | Refresh & Multi-Tab Persistence | NOT RUN | | | |
| **TC-CRT-06** | Sign In With Safe Return Path | NOT RUN | | | |
| **TC-CRT-07** | Cart Preservation Through Login | NOT RUN | | | |
| **TC-CRT-08** | Student Portal Freedom | NOT RUN | | | |

---

### Suite D: Checkout and Payment Recovery

| Test ID | Test Title | Result | Actual Behavior Observed | Evidence Reference / Screenshot | Issue Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CHK-01** | Order Summary Price Verification | NOT RUN | | | |
| **TC-CHK-02** | Successful Test Mode Card Payment | NOT RUN | | | |
| **TC-CHK-03** | Failure, Dismissal & Reuse Order | NOT RUN | | | |
| **TC-CHK-04** | "Check Payment Status" Recovery | NOT RUN | | | |
| **TC-CHK-05** | Success Page Refresh Idempotency | NOT RUN | | | |
| **TC-CHK-06** | Unpaid/Failed Payment Protection | NOT RUN | | | |
| **TC-CHK-07** | Order Record Comparison | NOT RUN | | | |

---

### Suite E: Customer Library and Reader

| Test ID | Test Title | Result | Actual Behavior Observed | Evidence Reference / Screenshot | Issue Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-LIB-01** | Digital Library Shelf Inspection | NOT RUN | | | |
| **TC-RDR-02** | Launch Reader & Chapter Nav | NOT RUN | | | |
| **TC-RDR-03** | Progress Tracking & Auto-Resume | NOT RUN | | | |
| **TC-RDR-04** | Bookmarks Add, View & Delete | NOT RUN | | | |
| **TC-RDR-05** | In-Book Search & Snippets | NOT RUN | | | |
| **TC-RDR-06** | Display Preferences Persistence | NOT RUN | | | |
| **TC-RDR-07** | Mobile Responsive & Drawers | NOT RUN | | | |
| **TC-RDR-08** | Offline Progress Save Recovery | NOT RUN | | | |
| **TC-RDR-09** | Multi-User Tenant Isolation | NOT RUN | | | |

---

### Suite F: Downloads and Upgrades

| Test ID | Test Title | Result | Actual Behavior Observed | Evidence Reference / Screenshot | Issue Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-DWN-01** | Online-Only Tier Download Blocked | NOT RUN | | | |
| **TC-DWN-02** | Read + Download Secure Delivery | NOT RUN | | | |
| **TC-UPG-03** | Upgrade Modal & Admin ₹50 Quote | NOT RUN | | | |
| **TC-UPG-04** | Complete Test Mode ₹50 Upgrade | NOT RUN | | | |
| **TC-UPG-05** | Separate Upgrade Order & History | NOT RUN | | | |
| **TC-UPG-06** | Historical Edition PDF Delivery | NOT RUN | | | |
| **TC-DWN-07** | Revocation & Signed URL Expiry | NOT RUN | | | |

---

### Suite G: Admin Management and Edition Protection

| Test ID | Test Title | Result | Actual Behavior Observed | Evidence Reference / Screenshot | Issue Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ADM-09** | Orders Ledger & CSV Export | NOT RUN | | | |
| **TC-ADM-10** | Edit Pricing with Audit Reason | NOT RUN | | | |
| **TC-ADM-11** | Protection for Past Orders | NOT RUN | | | |
| **TC-ADM-12** | Storefront Immediate Reflection | NOT RUN | | | |
| **TC-ADM-13** | Optimistic Concurrency 409 | NOT RUN | | | |
| **TC-ADM-14** | Immutability of Published Edition | NOT RUN | | | |
| **TC-ADM-15** | Create & Publish Revision Ed. 2 | NOT RUN | | | |
| **TC-ADM-16** | Customer Edition Preservation | NOT RUN | | | |
| **TC-ADM-17** | Withdraw Book from Active Sale | NOT RUN | | | |
| **TC-ADM-18** | Complimentary Grant & Audit | NOT RUN | | | |
| **TC-ADM-19** | Homepage CMS Draft & Publish | NOT RUN | | | |

---

### Suite H: Refunds

| Test ID | Test Title | Result | Actual Behavior Observed | Evidence Reference / Screenshot | Issue Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-RFD-01** | Full Refund on Base Purchase | NOT RUN | | | |
| **TC-RFD-02** | Partial Refund (Retain Access) | NOT RUN | | | |
| **TC-RFD-03** | Upgrade Refund (Online Kept) | NOT RUN | | | |
| **TC-RFD-04** | Rule C Base Refund Protection | NOT RUN | | | |
| **TC-RFD-05** | Linked Dual Refund (Co-Refund) | NOT RUN | | | |
| **TC-RFD-06** | Repeated Refund Prevention | NOT RUN | | | |
| **TC-RFD-07** | Interrupted Refund Recovery | NOT RUN | | | |

---

### Suite I: External Dependencies and Technical Checks

| Test ID | Test Title | Result | Actual Behavior Observed | Evidence Reference / Screenshot | Issue Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-TECH-01** | Email Receipts & Notifications | **BLOCKED** | Outbox queue verified; live email delivery blocked pending provider API keys & DNS. | `scripts/test_email_acceptance.ts` | Launch Gate 2 |
| **TC-TECH-02** | UPI Merchant Activation & Fallback | **BLOCKED (UPI)**<br>**PASS (Fallback)** | Razorpay account `upi: false`; modal cleanly presents Card/Netbanking fallback. | `scripts/test_upi_intent_qr_suite.ts` | Launch Gate 1 |
| **TC-TECH-03** | Mobile Browser Intent & Desktop QR | NOT RUN | Pending physical hardware testing post-merchant UPI activation. | | Section 5 |
| **TC-TECH-04** | API Rate Limiting & Recovery | **PASS** | HTTP 429 after 20 req/min; Retry-After header verified; DB invariant. | `scripts/rate_limit_worker.ts` | Remediation W1 |
| **TC-TECH-05** | Production Proxy Trust Configuration | **UNVERIFIED PROD** | Bug fixed (`rateLimit.ts`). Requires deployment behind real load balancer. | `lib/rateLimit.ts` code audit | Launch Gate 3 |
| **TC-TECH-06** | Code Quality, Lint & Build | **PASS** | `next build` exits 0; `tsc --noEmit` exits 0; 0 blocking lint errors. | `npm run build && npm run lint` | Remediation W2 |

---

## 4. Final Execution Totals Rollup

| Status Category | Count | Percentage |
| :--- | :--- | :--- |
| **Total Test Cases:** | **68** | **100%** |
| **PASS:** | `[Enter count]` | `[%]` |
| **FAIL:** | `[Enter count]` | `[%]` |
| **BLOCKED:** | `2` (Email Delivery, Native UPI) | `2.9%` |
| **NOT RUN:** | `[Enter count]` | `[%]` |

---

## 5. Defects & Issues Identified

List any unexpected discrepancies, UI rendering defects, or errors encountered during your manual run:

| Issue # | Related Test ID | Severity (Low / Med / High / Blocker) | Brief Description | Reproduction Steps / Screenshot |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | | | | |
| **DEF-02** | | | | |

---

## 6. Tester Sign-Off

- **Tester Signature:** `___________________________`
- **Date Signed:** `___________________________`
- **Recommended Verdict:** `[ ] READY FOR PRODUCTION   [ ] CONDITIONAL GO   [X] BLOCKED BY GATES`
