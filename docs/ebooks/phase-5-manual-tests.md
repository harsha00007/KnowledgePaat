# KnowledgePaat — Phase 5 Manual Test Guide: eBook Checkout & Payments

**Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Gateway:** Razorpay Test Mode  
**Test Mode Card Details:** `4111 1111 1111 1111`, Expiry: Any future date, CVV: `123`, OTP: `1234`  

---

## Scenario 1: Unauthenticated Visitor Checkout Redirect
- **Precondition:** Visitor is not signed in.
- **Steps:**
  1. Navigate to `/cart` with an item in cart.
  2. Click "Proceed to Checkout".
- **Expected Result:**
  - Browser navigates to `/login?redirectTo=%2Fcheckout`.
  - Stored cart choices in browser LocalStorage (`knowledgepaat_ebook_cart_v1`) remain intact.
  - After sign-in, customer is redirected straight to `/checkout`.

---

## Scenario 2: Unverified Customer Checkout Gate
- **Precondition:** User registers an account with an unconfirmed email.
- **Steps:**
  1. Sign in as unconfirmed user.
  2. Navigate to `/checkout`.
- **Expected Result:**
  - Red banner displays: "Checkout Authentication Blocked: Email verification is required before checkout. Please check your inbox."
  - Payment button is not presented until email is verified.

---

## Scenario 3: ₹49 Read Online Order & Test Mode Payment
- **Steps:**
  1. Add a book with "Read Online" plan selected (₹49 / 4900 paise).
  2. Proceed to `/checkout`.
  3. Verify Order Summary displays ₹49.
  4. Click "Pay ₹49 via Razorpay".
  5. In Razorpay Test Mode popup, select "Card", enter test card numbers, and click "Pay".
- **Expected Result:**
  - Payment succeeds in Test Mode.
  - User is redirected to `/checkout/success?orderId=...`.
  - Purchased book is pruned from cart.
  - Navigating to `/my-books` shows the book on shelf with "Read Online" badge.
  - "Read Online" button is visible and gated with Phase 6 notice.

---

## Scenario 4: ₹99 Read + Download Order & PDF Permission Grant
- **Steps:**
  1. Add a book with "Read + Download" plan selected (₹99 / 9900 paise).
  2. Proceed to `/checkout` and complete payment with test card.
- **Expected Result:**
  - Order completes atomically.
  - In `/my-books`, the book displays "Read + Download" tier.
  - "Download PDF" button is present and gated with Phase 7 notice.

---

## Scenario 5: Duplicate Complete Access Purchase Rejection
- **Steps:**
  1. Attempt to add the same book (which user already owns complete access to) to cart.
  2. View cart or checkout.
- **Expected Result:**
  - Notice displays: "You already own complete access to this title."
  - Server order creation rejects item with 400 Bad Request if forced.

---

## Scenario 6: Customer Order History Modal
- **Steps:**
  1. Navigate to `/my-books`.
  2. Click "Order History" in the header.
- **Expected Result:**
  - Modal opens listing all completed purchases, dates, order numbers (`EB-...`), and amount paid in ₹.

---

## Scenario 7: Administrator Order Oversight
- **Precondition:** Authenticated as an administrator.
- **Steps:**
  1. Navigate to `/admin/e-books`.
  2. Click "View Orders" button in header (navigates to `/admin/e-books/orders`).
- **Expected Result:**
  - Full table of customer orders is displayed with search and status filters.
  - Clicking "Details" on an order displays immutable snapshot details (items, customer, gateway payment reference).
  - No manual "mark paid" buttons exist.
