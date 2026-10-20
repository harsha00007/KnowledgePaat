-- =====================================================================
-- KnowledgePaat — UI Enhancement Phase 4 of 4:
-- Index Optimizations for Rate Limiting and Deterministic Pagination
-- Migration File: supabase_ui_phase4_performance.sql
-- =====================================================================

-- 1. Optimize shared multi-instance rate limiting sliding window counts:
-- Pattern: WHERE entity_type = 'rate_limit' AND entity_id = $1 AND created_at >= $2
CREATE INDEX IF NOT EXISTS idx_ebook_audit_ratelimit_window
  ON public.ebook_audit_logs (entity_type, entity_id, created_at DESC);

-- 2. Optimize deterministic pagination on orders:
-- Pattern: WHERE payment_status = $1 ORDER BY created_at DESC, id ASC
CREATE INDEX IF NOT EXISTS idx_ebook_orders_created_id
  ON public.ebook_orders (created_at DESC, id ASC);

-- 3. Optimize customer access deterministic pagination:
-- Pattern: WHERE role = 'student' ORDER BY created_at DESC, id ASC
CREATE INDEX IF NOT EXISTS idx_profiles_created_id
  ON public.profiles (created_at DESC, id ASC);

-- 4. Optimize public catalogue deterministic pagination:
-- Pattern: WHERE status = 'published' ORDER BY created_at DESC, id ASC
CREATE INDEX IF NOT EXISTS idx_ebooks_status_created_id
  ON public.ebooks (status, created_at DESC, id ASC);

-- 5. Optimize download logs deterministic pagination:
-- Pattern: WHERE customer_id = $1 ORDER BY created_at DESC, id ASC
CREATE INDEX IF NOT EXISTS idx_ebook_downloads_created_id
  ON public.ebook_download_logs (created_at DESC, id ASC);
