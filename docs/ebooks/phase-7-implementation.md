# KnowledgePaat — Phase 7 Implementation Report: Secure PDF Downloads & ₹50 Upgrades

**System:** KnowledgePaat LMS & Technical Bookstore  
**Target Phase:** Phase 7 of 9 (Secure PDF Downloads and Payment-Backed ₹50 Upgrades from Read Online to Read + Download)  
**Status:** IMPLEMENTED & DURABLY VERIFIED ON DEDICATED STAGING  
**Environment:** Dedicated Staging Supabase (`lzuinimbsdxnhzmjpxmr.supabase.co`)  
**Production Guard:** `csjywuflkvohytbvglxf` strictly guarded and blocked from mutations  
**Payment Gateway:** Razorpay Test Mode transactions only (no real money charged)  
**Date:** October 2026  

---

## 1. Executive Summary

Phase 7 establishes authenticated, server-authorized digital PDF delivery and payment-backed ₹50 upgrades for customers who previously purchased "Read Online" (₹49) licenses.

### Key Capabilities Delivered
1. **Server-Authorized Download Delivery**:
   - Short-lived, server-issued Supabase Storage signed URLs (60-second lifetime).
   - Authoritative verification: customer authentication, verified email, ownership check, active `read_download` entitlement.
   - Pinned edition resolution: historical editions withdrawn from sale remain accessible to eligible owners without silent substitution.
   - Response protection: strict `Cache-Control: private, no-store, no-cache, max-age=0, must-revalidate` and `Pragma: no-cache` headers.
   - Safe attachment headers enforcing collision-resistant filenames (`${book-slug}-edition-${editionNumber}.pdf`).
2. **Audit Logging & Transfer Distinction**:
   - Dedicated audit table `public.ebook_download_logs`.
   - Records link issuance with IP and User-Agent; explicitly distinguishes link issuance from completed file transfer (no false claim of completed client download).
   - Protects sensitive credentials: signed bearer URLs are never logged or stored.
3. **Server-Calculated ₹50 Upgrade Flow**:
   - Dedicated upgrade quote endpoint (`GET /api/ebooks/[bookId]/upgrade/quote`) and order endpoint (`POST /api/ebooks/[bookId]/upgrade`).
   - Strict server-authoritative ₹50 / 5000 paise pricing. Browser-supplied prices are completely ignored.
   - Strict upgrade verification: customer must own an active online license for the specified purchased edition.
   - Idempotency & duplicate charge protection: reuses existing active pending upgrade orders created in the last 15 minutes.
4. **Atomic Access Upgrade & Invariant Preservation**:
   - Upgrades entitlement in place: preserves original entitlement ID, reading progress, and bookmarks.
   - Preserves original purchase records: original ₹49 order is maintained untouched with its own financial snapshot.
   - Enhanced stored procedure `public.finalize_ebook_order_payment` handles both standard purchases and `upgrade_pdf` items atomically.
5. **Interactive UI Integration**:
   - **My Books**: Read + Download owners receive an active "Download PDF" button with loading spinners, duplicate click prevention, and error retry states. Read Online owners receive "Add PDF access — ₹50", opening an interactive upgrade modal with Razorpay checkout.
   - **Order History**: Modal distinguishes standard purchases from `PDF Upgrade` orders and items.
   - **Reader Client**: Top toolbar features direct PDF download for entitled owners, or quick upgrade access for online-only readers.

---

## 2. Delivery Mechanism & Limitations Architecture

### 2.1 Delivery Mechanism: Option A (Short-Lived Signed URLs)
- **Lifetime**: 60 seconds (`SIGNED_URL_EXPIRY_SECONDS = 60`).
- **Storage Target**: Private Supabase storage bucket `ebook-pdfs`. Anonymous access is blocked by RLS policies.
- **Attachment Header**: Signed URL is minted with `{ download: filename }`, instructing the browser to save as an attachment.
- **Cache Protection**: Responses carrying signed download URLs set:
  ```http
  Cache-Control: private, no-store, no-cache, max-age=0, must-revalidate
  Pragma: no-cache
  X-Content-Type-Options: nosniff
  ```

### 2.2 Revocation & Link Limitations (Truthful Technical Disclosure)
1. **Window of Usability**: Once a 60-second signed URL is issued to an entitled customer, it remains cryptographically valid until its timestamp expires (up to 60 seconds), even if the customer's entitlement is revoked in the database during that 60-second window. Any subsequent request after revocation will fail closed with HTTP 403 `ACCESS_REVOKED`.
2. **No Remote PDF Recall**: Downloaded PDF files saved locally to a customer's machine cannot be remotely recalled or purged.
3. **Shared File Preservation**: Revoking access for Customer A does **not** delete or mutate the underlying publication PDF asset in storage, ensuring other entitled owners and historical buyers retain uninterrupted access.
4. **Bearer Token Nature**: Signed URLs function as bearer tokens for their 60-second validity. They are not single-use; however, shared caching is explicitly forbidden, and download issuance is rate-limited to 15 requests per minute per authenticated customer.

---

## 3. Database Schema Updates (`supabase_ebook_phase7_downloads_setup.sql`)

### 3.1 Download Audit Logs Table
```sql
CREATE TABLE IF NOT EXISTS public.ebook_download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE,
  delivery_type TEXT NOT NULL DEFAULT 'signed_url' CHECK (delivery_type IN ('signed_url', 'direct_stream')),
  status TEXT NOT NULL DEFAULT 'url_issued' CHECK (status IN ('url_issued', 'download_completed', 'download_failed')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.2 Additive Order Columns & Item Constraints
```sql
ALTER TABLE public.ebook_orders 
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'purchase' CHECK (order_type IN ('purchase', 'upgrade')),
  ADD COLUMN IF NOT EXISTS original_order_id UUID REFERENCES public.ebook_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_entitlement_id UUID REFERENCES public.ebook_entitlements(id) ON DELETE SET NULL;

ALTER TABLE public.ebook_order_items DROP CONSTRAINT IF EXISTS ebook_order_items_plan_check;
ALTER TABLE public.ebook_order_items ADD CONSTRAINT ebook_order_items_plan_check 
  CHECK (plan IN ('read_online', 'read_download', 'upgrade_pdf'));
```

### 3.3 Atomic Upgrade Finalization (`finalize_ebook_order_payment`)
When `v_item.plan = 'upgrade_pdf'`:
- Verifies active existing online entitlement for the edition.
- Updates existing entitlement:
  ```sql
  UPDATE public.ebook_entitlements
  SET
    plan = 'read_download',
    can_download_pdf = TRUE,
    order_id = p_order_id,
    grant_type = 'upgrade',
    is_active = TRUE,
    updated_at = NOW()
  WHERE id = v_existing_ent.id;
  ```
- **Preserves existing bookmarks and reading progress**: Since bookmarks and progress reference `(customer_id, ebook_id, edition_id)` and foreign keys link to the unchanged entitlement/edition IDs, reading state survives upgrades 100% intact.

---

## 4. API Endpoints

| Endpoint | Method | Rate Limit | Purpose |
|---|---|---|---|
| `/api/ebooks/[bookId]/download` | `GET` | 15 req / min | Issues 60s signed URL for owned edition PDF |
| `/api/ebooks/[bookId]/upgrade/quote` | `GET` | 10 req / 5 min | Evaluates upgrade eligibility and returns ₹50 quote |
| `/api/ebooks/[bookId]/upgrade` | `POST` | 10 req / 5 min | Creates server-authoritative ₹50 upgrade order |
| `/api/ebooks/orders/verify` | `POST` | 20 req / 5 min | Verifies Razorpay signature & finalizes upgrade |

---

## 5. Automated Verification Evidence (20/20 Checks Passed)

The suite [`frontend/scripts/test_phase7_downloads_suite.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/scripts/test_phase7_downloads_suite.ts) ran against live dedicated staging Supabase (`lzuinimbsdxnhzmjpxmr`):

```text
========================================================================
PHASE 7 VERIFICATION SUITE SUMMARY
========================================================================
Total Checks: 20
Passed:       20
Failed:       0
Success Rate: 100%

ALL 20 PHASE 7 INVARIANTS HAVE BEEN MEANINGFULLY VERIFIED!
```

### Invariant Breakdown
1. **Test 1 — Anonymous rejection**: Denied with HTTP 401 `UNAUTHENTICATED`.
2. **Test 2 — ₹49 online-only rejection**: Denied with HTTP 403 `UPGRADE_REQUIRED`.
3. **Test 3 — ₹99 delivery verification**: Valid 60s signed URL returned; fetched 329 bytes over HTTPS; verified `%PDF-1.4` magic bytes.
4. **Test 4 — Customer isolation**: Customer B cannot use Customer A's entitlement (403 `NOT_OWNED`).
5. **Test 5 — Mismatched inputs**: Tampered cross-book edition inputs fail closed.
6. **Test 6 — Public access blocked**: Direct public URL attempt returned HTTP 400/404 (private bucket enforced).
7. **Test 7 — Revocation blocks downloads**: Entitlement with `is_active: false` blocked with 403 `ACCESS_REVOKED`.
8. **Test 8 — Historical edition preserved**: Archived Edition 1 delivers Edition 1's PDF, not newer Edition 2.
9. **Test 9 — Expiry & cache headers**: 60s expiry token and safe attachment download header verified.
10. **Test 10 — Truthful error reporting**: Missing storage path produces truthful HTTP 404.
11. **Test 11 — Authoritative quote**: ₹50 / 5000 paise quote delivered with exact edition metadata.
12. **Test 12 — Non-owner quote rejection**: Non-owners and complete owners blocked from upgrade.
13. **Test 13 — Genuine Razorpay Test Mode payment**: Real order created for ₹50; payment verified; entitlement upgraded to `can_download_pdf = true`.
14. **Test 14 — Payment integrity**: Forged signature and uncaptured payments rejected.
15. **Test 15 — Idempotent finalisation**: Repeated calls return `already_paid: true` without duplicate grants.
16. **Test 16 — Original purchase preserved**: Original order remains ₹49; upgrade is a separate ₹50 record.
17. **Test 17 — Reading progress preserved**: Bookmark and reading progress scroll percentages survived upgrade with identical IDs.
18. **Test 18 — Customer order history**: History displays both original ₹49 and ₹50 upgrade records.
19. **Test 19 — Admin audit security**: RLS protects download logs and orders from public access.
20. **Test 20 — Reader regression**: Online reader chapter access and bookmarks remain 100% functional.
