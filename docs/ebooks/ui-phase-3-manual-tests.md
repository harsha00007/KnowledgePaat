# KnowledgePaat — UI Enhancement Phase 3: Manual Test Procedures & QA Workbook
**Reference-Based eBook Storefront Redesign**

**Target System:** KnowledgePaat LMS & Technical Bookstore ([https://www.knowledgepaat.com](https://www.knowledgepaat.com))  
**Target Phase:** UI Enhancement Phase 3 of 4: Reference-Based eBook Storefront Redesign  
**Environment:** Staging Supabase `lzuinimbsdxnhzmjpxmr`  
**Test Base URL:** `http://localhost:3000` (or staging deployment)  
**Test Accounts:**
- **Student User:** `student@knowledgepaat.test` / `StudentPassword@2026!`
- **Admin User:** `admin@knowledgepaat.test` / `AdminPassword@2026!`

---

## Test Scenarios Overview

| Scenario | Objective | Target Roles | Verification Status |
| :--- | :--- | :--- | :---: |
| **Scenario 1** | Two-Column Hero Visual System & 3D Showcase Stage | Anonymous / All | ✅ PASS |
| **Scenario 2** | Curated Selection (4 Horizontal Cards) & Dynamic Padding | Anonymous / All | ✅ PASS |
| **Scenario 3** | Spotlight Publication & Dual Plan Selection | Anonymous / All | ✅ PASS |
| **Scenario 4** | Full Catalogue Search, Filter Pills & 2-Column Desktop Grid | Anonymous / All | ✅ PASS |
| **Scenario 5** | Authoritative Pricing & Zero Hardcoded ₹49 / ₹99 Validation | Anonymous / All | ✅ PASS |
| **Scenario 6** | Book Detail Page Aesthetic Harmony & Plan Selection | Anonymous / All | ✅ PASS |
| **Scenario 7** | Shopping Cart Tier Modification & Downstream Consistency | Anonymous / Student | ✅ PASS |
| **Scenario 8** | Customer Digital Shelf (`/my-books`) Aesthetic Harmony | Student | ✅ PASS |
| **Scenario 9** | Mobile Viewport Layout & Touch Responsiveness (390x844) | Mobile User | ✅ PASS |

---

## Scenario 1: Two-Column Hero Visual System & 3D Showcase Stage

### Test Steps:
1. Open a browser and navigate to `http://localhost:3000/e-books`.
2. Inspect the top header:
   - Verify official KnowledgePaat logo is displayed inside a high-contrast white container (`bg-white/95 px-2.5 py-1 rounded-xl`).
   - Header surface is deep purple (`#130B24`) with gold "Get Started" and amber cart/search controls.
3. Inspect the Hero section:
   - Verify gold eyebrow badge (`⭐ KNOWLEDGEPAAT E-LIBRARY`).
   - Verify heading rendered in `Playfair Display` serif with white main text and gold gradient highlighted text.
   - Verify 3 benefit pills: "Instant Browser Reading", "Offline PDF Editions", "Authoritative Editions".
   - Verify primary CTA button "Explore Catalogue" uses `.btn-gold` with hover micro-animation.
   - Click "Explore Catalogue" and verify smooth scroll to `#catalogue`.
4. Inspect the Right Column 3D Showcase Stage:
   - Verify three-book layout with 3D perspective tilt.
   - Left book tilted with `rotateY(20deg)`.
   - Right book tilted with `rotateY(-20deg)`.
   - Central book positioned forward with glass sheen and spine highlight.
   - Purple elliptical pedestal glowing underneath the books.

### Acceptance Criteria:
- Visual fidelity matches reference screenshot layout, typography, and color palette.
- No layout overflow or misaligned book covers.

---

## Scenario 2: Curated Selection (4 Horizontal Cards) & Dynamic Padding

### Test Steps:
1. On `http://localhost:3000/e-books`, scroll down to "Curated Selection: Featured Publications".
2. Inspect desktop layout:
   - Verify exactly 4 horizontal cards arranged in a 4-column grid.
   - Each card contains 3D book cover thumbnail, category tag, serif title, author credit, and genuine rating.
   - If a title has no ratings, verify no empty or fake stars are displayed.
3. Inspect pricing:
   - Verify authoritative price displayed in `font-display` bold.
   - If discounted, verify original price has strikethrough styling.
   - Verify prices match server edition pricing (no hardcoded ₹49 / ₹99 text).
4. Click the "Add" cart button on one of the featured cards.
   - Verify button updates state to "In Cart" or adds item.
   - Verify cart counter in header increments by 1.

### Acceptance Criteria:
- Desktop renders 4 cards without layout collapse.
- If admin publishes fewer than 4 featured books, the remaining slots are gracefully padded from published catalogue books.

---

## Scenario 3: Spotlight Publication & Dual Plan Selection

### Test Steps:
1. On `http://localhost:3000/e-books`, inspect the "Spotlight Publication" section.
2. Verify 3-column composition:
   - **Left**: Large 3D book cover with perspective tilt and elliptical shadow.
   - **Center**: Spotlight eyebrow, Playfair Display title, author, description, and green checklist of platform benefits (*Instant Browser Reader*, *Device Sync*, *Lifetime Errata*).
   - **Right**: Two distinct access plan cards:
     - Card 1: "Read Online" with authoritative price and "Select Read Online".
     - Card 2: "Read + Download" with gold "Recommended" badge, authoritative price, and gold CTA "Get Full Access (Online + PDF)".
3. Click "Select Read Online":
   - Verify item is added to cart with `read_online` plan.
   - Verify button transitions to "In Cart — Proceed to Checkout".
4. Click "Get Full Access (Online + PDF)":
   - Verify plan updates in cart to `read_download`.
   - Verify button updates state accordingly.

### Acceptance Criteria:
- Dual plan selection works smoothly and synchronizes with cart state.
- Server-authoritative pricing strictly enforced with discount strikethrough when present.

---

## Scenario 4: Full Catalogue Search, Filter Pills & 2-Column Grid

### Test Steps:
1. Scroll down to `#catalogue` on `http://localhost:3000/e-books`.
2. Inspect the catalogue heading and toolbar:
   - Heading "Browse Technical E-Books" in Playfair Display serif.
   - Search bar with search icon and gold Search button.
   - Category filter pills: "All", "Engineering", "System Design", "DevOps & Cloud", etc.
3. Type a query into search (e.g., "DevOps"):
   - Verify catalogue filters to matching books.
   - Verify clear button (`X`) appears and resets search when clicked.
4. Click a category pill (e.g., "System Design"):
   - Verify category becomes active with dark purple background and white text.
   - Verify displayed book cards update to matching category.
5. Inspect the book card grid:
   - On desktop, verify 2 cards per row (`grid-cols-2`).
   - Cards feature `.card-ebook` styling with white surface, purple border, serif title, author, description snippet, authoritative price, and gold CTA.

### Acceptance Criteria:
- Search and category filters operate seamlessly without page reloads.
- Responsive layout transitions cleanly from 2 columns on desktop to 1 column on mobile.

---

## Scenario 5: Authoritative Pricing & Zero Hardcoded ₹49 / ₹99 Validation

### Test Steps:
1. Open browser developer tools and inspect page source for `/e-books`, `/cart`, `/checkout`, and `/my-books`.
2. Search page source and DOM text for standalone hardcoded strings `(₹49)` or `(₹99)` or fallback pricing labels.
3. Verify that all prices are rendered from server-calculated paise values formatted via `formatPaise()`.
4. Open `/cart` with an item in the cart:
   - Inspect the access plan buttons in the cart item row:
   - Verify "Read Online" shows dynamic price (or "Online").
   - Verify "Read + PDF" shows dynamic price (or "Online + PDF").
   - Neither button displays hardcoded ₹49 or ₹99.
5. Open `/checkout`:
   - Inspect license agreement terms and summary totals.
   - Verify no static `(₹49)` / `(₹99)` strings exist.

### Acceptance Criteria:
- Zero occurrences of hardcoded fallback prices across the application.
- All monetary amounts dynamically represent server-authoritative paise.

---

## Scenario 6: Book Detail Page Aesthetic Harmony

### Test Steps:
1. On `http://localhost:3000/e-books`, click on any book card.
2. Verify URL is `http://localhost:3000/e-books/[bookId]`.
3. Inspect page design:
   - Background is pale lavender/off-white (`#FAF9FD`).
   - Book title is rendered in large Playfair Display serif (`font-serif`).
   - Metadata badges have purple/blue borders and clean typography.
   - Dual access plan radio cards are styled with purple borders and gold highlights.
   - Primary action button "Add to Cart" uses `.btn-gold`.

### Acceptance Criteria:
- Complete visual consistency with the Phase 3 design system.
- Full compatibility with Phase 1 server pricing.

---

## Scenario 7: Shopping Cart Tier Modification & Downstream Consistency

### Test Steps:
1. Navigate to `http://localhost:3000/cart` with items in cart.
2. Inspect page layout:
   - Dark `#130B24` header with official logo.
   - Off-white `#FAF9FD` page background.
   - Cart item rows with white surface, purple accents, and cover thumbnail.
3. Switch tier from "Read Online" to "Read + PDF":
   - Verify total price updates dynamically to reflect the higher plan.
   - Verify button selection state updates with purple border and background highlight.
4. Click "Proceed to Checkout" (`.btn-gold`):
   - Opens checkout flow with identical visual tokens.

### Acceptance Criteria:
- Cart tier modifications update pricing and cart state without errors.
- Visual system remains coherent from cart through checkout.

---

## Scenario 8: Customer Digital Shelf (`/my-books`) Aesthetic Harmony

### Test Steps:
1. Log in as a student using `student@knowledgepaat.test`.
2. Navigate to `http://localhost:3000/my-books`.
3. Inspect the shelf interface:
   - Header title "My Books" rendered in Playfair Display serif (`font-serif`).
   - Customer Digital Shelf pill badge in gold accent.
   - Filter pills ("All Books", "Read Online", "Read + Download") styled with dark purple active states.
   - Search bar styled with purple focus rings.
   - Book cards in 2-column desktop grid with reading action buttons.

### Acceptance Criteria:
- Student library experience matches bookstore visual quality while preserving reading entitlements.

---

## Scenario 9: Mobile Viewport Layout & Touch Responsiveness (390x844)

### Test Steps:
1. Open browser developer tools and toggle device emulation to iPhone 12/13/14 Pro (390 x 844 px).
2. Navigate to `http://localhost:3000/e-books`.
3. Inspect mobile hero:
   - Eyebrow, serif heading, description, benefit pills, and gold CTA stack vertically without horizontal scrollbars.
   - 3D book stage scales gracefully within mobile viewport width.
4. Scroll to Featured Publications:
   - Cards stack vertically in a clean single column.
5. Scroll to Highlighted Book:
   - Large book cover, spotlight description, and 2 plan cards stack cleanly.
6. Scroll to Catalogue:
   - Category filter pills scroll horizontally.
   - Book cards render in a single column with full touch target buttons.
7. Click the hamburger menu icon:
   - Opens the accessible mobile navigation drawer with Bookstore links, categories, and account options.

### Acceptance Criteria:
- Flawless mobile responsiveness with zero horizontal layout overflow.
- All touch targets satisfy minimum 44x44 px accessibility requirements.
