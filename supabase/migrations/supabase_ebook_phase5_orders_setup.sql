-- =============================================================================
-- KnowledgePaat — Phase 5: eBook Orders, Payments & Atomic Purchase Entitlements
-- Migration File: supabase_ebook_phase5_orders_setup.sql
-- Description: Creates public.ebook_orders, public.ebook_order_items,
--              public.ebook_receipt_outbox, and public.ebook_webhook_events tables,
--              performance indexes, RLS policies, and the atomic stored procedure
--              public.finalize_ebook_order_payment() for idempotent finalization.
-- Target Environment: Staging Supabase (lzuinimbsdxnhzmjpxmr)
-- =============================================================================

-- 1. EBook Orders Table (Immutable snapshot of customer order & financial total)
CREATE TABLE IF NOT EXISTS public.ebook_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  total_amount_paise INTEGER NOT NULL CHECK (total_amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_gateway TEXT NOT NULL DEFAULT 'razorpay',
  gateway_order_id TEXT UNIQUE,
  gateway_payment_id TEXT UNIQUE,
  gateway_signature TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'completed', 'cancelled')),
  customer_email TEXT,
  customer_name TEXT,
  notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. EBook Order Line Items Table (Immutable snapshot of purchased book, edition, & plan)
CREATE TABLE IF NOT EXISTS public.ebook_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.ebook_orders(id) ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE RESTRICT,
  edition_id UUID NOT NULL REFERENCES public.ebook_editions(id) ON DELETE RESTRICT,
  plan TEXT NOT NULL CHECK (plan IN ('read_online', 'read_download')),
  price_paise INTEGER NOT NULL CHECK (price_paise > 0),
  title TEXT NOT NULL,
  edition_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_order_ebook_item UNIQUE (order_id, ebook_id)
);

-- 3. EBook Receipt Outbox Table (Durable background email queue)
CREATE TABLE IF NOT EXISTS public.ebook_receipt_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.ebook_orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_receipt_order UNIQUE (order_id)
);

-- 4. EBook Webhook Events Table (Durable provider webhook idempotency tracking)
CREATE TABLE IF NOT EXISTS public.ebook_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  gateway TEXT NOT NULL DEFAULT 'razorpay',
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'ignored')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Link Foreign Key from ebook_entitlements to ebook_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ebook_entitlements_order'
  ) THEN
    ALTER TABLE public.ebook_entitlements
      ADD CONSTRAINT fk_ebook_entitlements_order
      FOREIGN KEY (order_id) REFERENCES public.ebook_orders(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 6. Updated_at Triggers
DROP TRIGGER IF EXISTS tr_ebook_orders_updated_at ON public.ebook_orders;
CREATE TRIGGER tr_ebook_orders_updated_at
  BEFORE UPDATE ON public.ebook_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_ebook_receipt_outbox_updated_at ON public.ebook_receipt_outbox;
CREATE TRIGGER tr_ebook_receipt_outbox_updated_at
  BEFORE UPDATE ON public.ebook_receipt_outbox
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_ebook_orders_customer ON public.ebook_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_ebook_orders_order_number ON public.ebook_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_ebook_orders_gateway_order ON public.ebook_orders(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_ebook_orders_gateway_payment ON public.ebook_orders(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_ebook_orders_status ON public.ebook_orders(order_status, payment_status);

CREATE INDEX IF NOT EXISTS idx_ebook_order_items_order ON public.ebook_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_ebook_order_items_ebook ON public.ebook_order_items(ebook_id);
CREATE INDEX IF NOT EXISTS idx_ebook_order_items_edition ON public.ebook_order_items(edition_id);

CREATE INDEX IF NOT EXISTS idx_ebook_receipt_outbox_status ON public.ebook_receipt_outbox(status);
CREATE INDEX IF NOT EXISTS idx_ebook_webhook_events_id ON public.ebook_webhook_events(event_id);

-- 8. Atomic Stored Procedure: Finalize EBook Order Payment
CREATE OR REPLACE FUNCTION public.finalize_ebook_order_payment(
  p_order_id UUID,
  p_payment_id TEXT,
  p_gateway_order_id TEXT,
  p_signature TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_existing_ent RECORD;
  v_items_processed INTEGER := 0;
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

    v_items_processed := v_items_processed + 1;
  END LOOP;

  -- 5. Persist durable receipt entry in outbox
  INSERT INTO public.ebook_receipt_outbox (
    order_id,
    customer_id,
    recipient_email,
    recipient_name,
    status,
    payload
  ) VALUES (
    p_order_id,
    v_order.customer_id,
    COALESCE(v_order.customer_email, 'customer@knowledgepaat.test'),
    v_order.customer_name,
    'pending',
    jsonb_build_object(
      'order_id', p_order_id,
      'order_number', v_order.order_number,
      'payment_id', p_payment_id,
      'total_amount_paise', v_order.total_amount_paise,
      'currency', v_order.currency,
      'items_count', v_items_processed
    )
  )
  ON CONFLICT (order_id) DO NOTHING;

  -- 6. Return structured success result
  RETURN jsonb_build_object(
    'success', true,
    'already_paid', false,
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'customer_id', v_order.customer_id,
    'total_amount_paise', v_order.total_amount_paise,
    'items_count', v_items_processed
  );
END;
$$;

-- 9. Row Level Security (RLS) Configuration
ALTER TABLE public.ebook_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_receipt_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_webhook_events ENABLE ROW LEVEL SECURITY;

-- --- EBOOK_ORDERS POLICIES ---

-- Customers can view only their own orders
DROP POLICY IF EXISTS "Customers can view own orders" ON public.ebook_orders;
CREATE POLICY "Customers can view own orders"
ON public.ebook_orders FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- Administrators can view all orders
DROP POLICY IF EXISTS "Admins can view all orders" ON public.ebook_orders;
CREATE POLICY "Admins can view all orders"
ON public.ebook_orders FOR SELECT
TO authenticated
USING (public.is_admin());

-- Regular customers have ZERO insert/update/delete permissions on ebook_orders directly
-- (Order creation and finalization happen via verified server endpoints with service role)

-- --- EBOOK_ORDER_ITEMS POLICIES ---

-- Customers can view only their own order items
DROP POLICY IF EXISTS "Customers can view own order items" ON public.ebook_order_items;
CREATE POLICY "Customers can view own order items"
ON public.ebook_order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ebook_orders o
    WHERE o.id = public.ebook_order_items.order_id
      AND o.customer_id = auth.uid()
  )
);

-- Administrators can view all order items
DROP POLICY IF EXISTS "Admins can view all order items" ON public.ebook_order_items;
CREATE POLICY "Admins can view all order items"
ON public.ebook_order_items FOR SELECT
TO authenticated
USING (public.is_admin());

-- --- EBOOK_RECEIPT_OUTBOX POLICIES ---

-- Only administrators can view receipt outbox records
DROP POLICY IF EXISTS "Admins can view receipt outbox" ON public.ebook_receipt_outbox;
CREATE POLICY "Admins can view receipt outbox"
ON public.ebook_receipt_outbox FOR SELECT
TO authenticated
USING (public.is_admin());

-- --- EBOOK_WEBHOOK_EVENTS POLICIES ---

-- Only administrators can view webhook audit logs
DROP POLICY IF EXISTS "Admins can view webhook events" ON public.ebook_webhook_events;
CREATE POLICY "Admins can view webhook events"
ON public.ebook_webhook_events FOR SELECT
TO authenticated
USING (public.is_admin());
