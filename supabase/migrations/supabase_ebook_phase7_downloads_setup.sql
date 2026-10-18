-- =============================================================================
-- KnowledgePaat — Phase 7: Secure PDF Downloads & ₹50 Upgrades
-- Migration File: supabase_ebook_phase7_downloads_setup.sql
-- Description: Creates public.ebook_download_logs audit table, adds upgrade
--              provenance columns and check constraints to public.ebook_orders
--              and public.ebook_order_items, and updates the atomic finalisation
--              procedure public.finalize_ebook_order_payment() to support
--              payment-backed ₹50 upgrades from read_online to read_download.
-- Target Environment: Staging Supabase (lzuinimbsdxnhzmjpxmr)
-- =============================================================================

-- 1. EBook Download Logs Table (Audit record of download requests and link issuances)
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

-- Indexes for download audit queries
CREATE INDEX IF NOT EXISTS idx_ebook_download_logs_customer ON public.ebook_download_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_ebook_download_logs_edition ON public.ebook_download_logs(edition_id);
CREATE INDEX IF NOT EXISTS idx_ebook_download_logs_created ON public.ebook_download_logs(created_at DESC);

-- Enable Row Level Security (RLS) on download logs
ALTER TABLE public.ebook_download_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own download logs" ON public.ebook_download_logs;
CREATE POLICY "Customers can view own download logs"
  ON public.ebook_download_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Service role manages all download logs" ON public.ebook_download_logs;
CREATE POLICY "Service role manages all download logs"
  ON public.ebook_download_logs FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- 2. Additive Schema Updates for EBook Orders and Order Line Items
-- Add order_type and original reference columns to public.ebook_orders
ALTER TABLE public.ebook_orders 
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'purchase' CHECK (order_type IN ('purchase', 'upgrade')),
  ADD COLUMN IF NOT EXISTS original_order_id UUID REFERENCES public.ebook_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_entitlement_id UUID REFERENCES public.ebook_entitlements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ebook_orders_type ON public.ebook_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_ebook_orders_original_order ON public.ebook_orders(original_order_id);

-- Update check constraint on public.ebook_order_items to permit 'upgrade_pdf'
ALTER TABLE public.ebook_order_items DROP CONSTRAINT IF EXISTS ebook_order_items_plan_check;
ALTER TABLE public.ebook_order_items ADD CONSTRAINT ebook_order_items_plan_check 
  CHECK (plan IN ('read_online', 'read_download', 'upgrade_pdf'));

-- 3. Atomic Idempotent Finalization Procedure with Upgrade Support
CREATE OR REPLACE FUNCTION public.finalize_ebook_order_payment(
  p_order_id UUID,
  p_payment_id TEXT DEFAULT NULL,
  p_gateway_order_id TEXT DEFAULT NULL,
  p_signature TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_existing_ent RECORD;
  v_items_processed INTEGER := 0;
  v_receipt_id UUID;
BEGIN
  -- 1. Lock the order row for update to prevent concurrent race conditions
  SELECT * INTO v_order
  FROM public.ebook_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found with ID: %', p_order_id;
  END IF;

  -- 2. Idempotency check: If order is already paid, return cleanly without duplicate operations
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_paid', true,
      'order_id', p_order_id,
      'order_number', v_order.order_number,
      'customer_id', v_order.customer_id,
      'total_amount_paise', v_order.total_amount_paise
    );
  END IF;

  -- 3. Mark the internal order as paid and completed
  UPDATE public.ebook_orders
  SET
    payment_status = 'paid',
    order_status = 'completed',
    gateway_payment_id = COALESCE(p_payment_id, gateway_payment_id),
    gateway_order_id = COALESCE(p_gateway_order_id, gateway_order_id),
    gateway_signature = COALESCE(p_signature, gateway_signature),
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_order_id;

  -- 4. Process each purchased order line item into public.ebook_entitlements
  FOR v_item IN
    SELECT * FROM public.ebook_order_items
    WHERE order_id = p_order_id
  LOOP
    -- Check if an entitlement already exists for this customer, book, and edition
    SELECT * INTO v_existing_ent
    FROM public.ebook_entitlements
    WHERE customer_id = v_order.customer_id
      AND ebook_id = v_item.ebook_id
      AND edition_id = v_item.edition_id;

    IF v_item.plan = 'upgrade_pdf' THEN
      -- Strict upgrade verification: Customer MUST own an active online reading license for this edition
      IF NOT FOUND OR v_existing_ent.is_active = FALSE THEN
        RAISE EXCEPTION 'Cannot finalize upgrade: No active online entitlement found for customer % on edition %', 
          v_order.customer_id, v_item.edition_id;
      END IF;

      -- Upgrade existing entitlement atomically: preserve ID, progress, and bookmarks
      UPDATE public.ebook_entitlements
      SET
        plan = 'read_download',
        can_download_pdf = TRUE,
        order_id = p_order_id,
        grant_type = 'upgrade',
        is_active = TRUE,
        updated_at = NOW()
      WHERE id = v_existing_ent.id;

    ELSE
      -- Standard purchase flow (read_online or read_download)
      IF NOT FOUND THEN
        -- Fresh entitlement grant
        INSERT INTO public.ebook_entitlements (
          customer_id,
          ebook_id,
          edition_id,
          plan,
          can_read_online,
          can_download_pdf,
          order_id,
          grant_type,
          is_active
        ) VALUES (
          v_order.customer_id,
          v_item.ebook_id,
          v_item.edition_id,
          v_item.plan,
          TRUE,
          (v_item.plan = 'read_download'),
          p_order_id,
          'purchase',
          TRUE
        );
      ELSE
        -- Existing entitlement: upgrade if new plan is read_download and current plan is read_online
        IF v_existing_ent.plan = 'read_online' AND v_item.plan = 'read_download' THEN
          UPDATE public.ebook_entitlements
          SET
            plan = 'read_download',
            can_download_pdf = TRUE,
            order_id = p_order_id,
            grant_type = 'upgrade',
            is_active = TRUE,
            updated_at = NOW()
          WHERE id = v_existing_ent.id;
        ELSE
          -- Ensure active status is maintained; do NOT downgrade stronger access
          UPDATE public.ebook_entitlements
          SET
            is_active = TRUE,
            updated_at = NOW()
          WHERE id = v_existing_ent.id;
        END IF;
      END IF;
    END IF;

    v_items_processed := v_items_processed + 1;
  END LOOP;

  -- 5. Persist durable receipt entry in outbox
  INSERT INTO public.ebook_receipt_outbox (
    order_id,
    customer_id,
    recipient_email,
    recipient_name,
    payload,
    status
  ) VALUES (
    p_order_id,
    v_order.customer_id,
    COALESCE(v_order.customer_email, 'customer@knowledgepaat.test'),
    COALESCE(v_order.customer_name, 'Valued Customer'),
    jsonb_build_object(
      'order_id', p_order_id,
      'order_number', v_order.order_number,
      'order_type', v_order.order_type,
      'total_amount_paise', v_order.total_amount_paise,
      'currency', v_order.currency,
      'gateway_payment_id', p_payment_id,
      'paid_at', NOW()
    ),
    'pending'
  )
  ON CONFLICT (order_id) DO NOTHING
  RETURNING id INTO v_receipt_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'order_type', v_order.order_type,
    'customer_id', v_order.customer_id,
    'items_processed', v_items_processed,
    'receipt_id', v_receipt_id
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.finalize_ebook_order_payment(UUID, TEXT, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.finalize_ebook_order_payment(UUID, TEXT, TEXT, TEXT) FROM authenticated, anon, public;
