# KnowledgePaat Live Environment Database Migration Guide

**Target Environment:** Production Supabase Project `csjywuflkvohytbvglxf`  
**Migration Script:** [`supabase/migrations/live_production_complete_migration.sql`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/supabase/migrations/live_production_complete_migration.sql)  
**Execution Strategy:** Non-destructive, Idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)  
**Estimated Execution Time:** < 15 seconds  
**Downtime Required:** Zero (Online DDL)  

---

## 1. Safety & Pre-Migration Checklist

Before executing the migration script on the live environment (`csjywuflkvohytbvglxf`):

- [ ] **1. Create Point-In-Time Backup:**
  - Navigate to [Supabase Dashboard](https://supabase.com/dashboard/project/csjywuflkvohytbvglxf).
  - Go to **Database** $\rightarrow$ **Backups**.
  - Trigger a manual backup snapshot or note the latest automated backup timestamp.
- [ ] **2. Confirm Environment Target:**
  - Verify that the active project in the SQL Editor displays project reference: `csjywuflkvohytbvglxf`.
  - Confirm staging project `lzuinimbsdxnhzmjpxmr` is NOT confused with production.
- [ ] **3. Inspect Live Table Preservation:**
  - The script does **NOT** drop or alter existing student profiles, notes, interview questions, or subscriptions.
  - It safely adds missing columns (`full_name`, `email`, `role`) with `ADD COLUMN IF NOT EXISTS`.

---

## 2. Migration Execution Instructions

### Step 1: Open the SQL Editor
1. Log into the [Supabase Dashboard](https://supabase.com/dashboard/project/csjywuflkvohytbvglxf).
2. Click on the **SQL Editor** tab in the left navigation sidebar.
3. Click **New query** (or press `Ctrl + Enter`).

### Step 2: Paste and Execute the Migration
1. Open [`supabase/migrations/live_production_complete_migration.sql`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/supabase/migrations/live_production_complete_migration.sql).
2. Copy the entire contents of the file.
3. Paste the SQL into the Supabase query editor.
4. Click **Run** (or press `Ctrl + Enter`).

### Step 3: Verify the Output Notice
The script concludes with an automated PL/pgSQL health check:
```
NOTICE:  =========================================================
NOTICE:  POST-MIGRATION HEALTH CHECK:
NOTICE:    - Verified Tables Created/Present: 16 of 16
NOTICE:    - Verified Stored Procedures Present: 4 of 4
NOTICE:  =========================================================
Success. No rows returned.
```
If any table or procedure failed to create, the script automatically raises an exception and aborts without partial corruption.

---

## 3. Inventory of Schema Elements Created

### 3.1 Tables (16 Master Entities)
1. `public.profiles` — Student and administrator role accounts (preserved).
2. `public.platform_settings` — Feature flags and dynamic footer/social settings.
3. `public.ebooks` — Master eBook catalogue entries, descriptions, and statuses.
4. `public.ebook_assets` — Cover images, sample PDFs, and marketing assets.
5. `public.ebook_editions` — Edition numbers, current flags, PDF paths, and plan prices.
6. `public.ebook_chapters` — Structured reading chapters, word counts, and sample flags.
7. `public.ebook_homepage_featured` — Storefront homepage showcase carousel.
8. `public.ebook_entitlements` — Customer purchased reading and download permissions.
9. `public.ebook_reading_progress` — Scroll percentages, chapter completions, and timestamps.
10. `public.ebook_bookmarks` — Reader chapter bookmarks and personal annotations.
11. `public.ebook_download_logs` — Audit log of authorized offline PDF downloads.
12. `public.ebook_orders` — Master checkout order records with Razorpay payment IDs.
13. `public.ebook_order_items` — Itemized line items, editions, and paise amounts.
14. `public.ebook_receipt_outbox` — Durable transactional email dispatch queue.
15. `public.ebook_webhook_events` — Cross-instance cache invalidation epochs and rate limits.
16. `public.ebook_refunds` — Razorpay refund tracking with access revocation rules.

### 3.2 Atomic Stored Procedures (Financial & Concurrency Safeguards)
- `public.is_admin()` — Fast security-definer role check.
- `public.publish_ebook_edition(...)` — Atomic prerequisite validation, cover/PDF checks, and current-edition promotion with row locks (`FOR UPDATE`).
- `public.withdraw_ebook_edition(...)` — Atomic edition demotion and catalogue status synchronization.
- `public.finalize_ebook_order_payment(...)` — Atomically activates customer entitlements and enqueues receipt outbox in a single transaction.

### 3.3 Supabase Storage Buckets
- `ebook-covers` — Public read bucket for storefront book card covers.
- `ebook-pdfs` — Private, authenticated-only bucket for encrypted eBook PDF downloads.

---

## 4. Post-Migration Verification Queries

Run the following SQL query in the Supabase SQL Editor to verify complete schema integrity:

```sql
SELECT 
  t.table_name,
  (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count,
  (SELECT count(*) FROM pg_indexes i WHERE i.tablename = t.table_name) as index_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name LIKE 'ebook_%'
ORDER BY t.table_name;
```

---

## 5. Rollback Runbook (Contingency)

Because the script is strictly additive and idempotent:
- **No Data Loss:** No pre-existing tables or rows are dropped.
- **Rollback of New Tables (If Ever Required):**
  ```sql
  DROP TABLE IF EXISTS public.ebook_bookmarks CASCADE;
  DROP TABLE IF EXISTS public.ebook_reading_progress CASCADE;
  DROP TABLE IF EXISTS public.ebook_download_logs CASCADE;
  DROP TABLE IF EXISTS public.ebook_entitlements CASCADE;
  DROP TABLE IF EXISTS public.ebook_chapters CASCADE;
  DROP TABLE IF EXISTS public.ebook_assets CASCADE;
  DROP TABLE IF EXISTS public.ebook_editions CASCADE;
  DROP TABLE IF EXISTS public.ebook_homepage_featured CASCADE;
  DROP TABLE IF EXISTS public.ebook_order_items CASCADE;
  DROP TABLE IF EXISTS public.ebook_orders CASCADE;
  DROP TABLE IF EXISTS public.ebook_receipt_outbox CASCADE;
  DROP TABLE IF EXISTS public.ebook_webhook_events CASCADE;
  DROP TABLE IF EXISTS public.ebook_refunds CASCADE;
  DROP TABLE IF EXISTS public.ebook_audit_logs CASCADE;
  DROP TABLE IF EXISTS public.ebooks CASCADE;
  ```
- **Supabase Point-in-Time Restore:** If unforeseen issues occur, restore the database backup snapshot taken in Step 1 via the Supabase Dashboard.
