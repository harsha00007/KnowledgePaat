-- =============================================================================
-- KnowledgePaat — Phase 8: Admin Operations, Refunds, Purchase History,
-- Access Management, Reporting, and Financial Reconciliation
-- Migration File: supabase_ebook_phase8_admin_refunds_setup.sql
-- Description: Creates public.ebook_refunds, adds refund columns to orders/items,
--              defines atomic stored procedures for refund intents and finalization,
--              configures access management RPCs, RLS policies, and audit triggers.
-- Target Environment: Staging Supabase (lzuinimbsdxnhzmjpxmr)
-- =============================================================================

-- 1. Update Payment Status Constraint on ebook_orders to include 'partially_refunded'
ALTER TABLE public.ebook_orders DROP CONSTRAINT IF EXISTS ebook_orders_payment_status_check;
ALTER TABLE public.ebook_orders ADD CONSTRAINT ebook_orders_payment_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded'));

-- 2. Add Refund Tracking Columns to ebook_orders
ALTER TABLE public.ebook_orders
  ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'none' 
    CHECK (refund_status IN ('none', 'pending', 'partial', 'full', 'failed')),
  ADD COLUMN IF NOT EXISTS refunded_amount_paise INTEGER NOT NULL DEFAULT 0 
    CHECK (refunded_amount_paise >= 0);

-- 3. Add Refund Tracking Columns to ebook_order_items
ALTER TABLE public.ebook_order_items
  ADD COLUMN IF NOT EXISTS refunded_paise INTEGER NOT NULL DEFAULT 0 
    CHECK (refunded_paise >= 0),
  ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'none' 
    CHECK (refund_status IN ('none', 'pending', 'partial', 'full', 'failed'));

-- 4. EBook Refunds Table (Authoritative ledger of provider and local refunds)
CREATE TABLE IF NOT EXISTS public.ebook_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.ebook_orders(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  reason TEXT NOT NULL,
  refund_type TEXT NOT NULL DEFAULT 'full' CHECK (refund_type IN ('full', 'partial', 'goodwill')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  gateway TEXT NOT NULL DEFAULT 'razorpay',
  gateway_refund_id TEXT UNIQUE,
  gateway_payment_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  allocated_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  access_action TEXT NOT NULL DEFAULT 'revoke' 
    CHECK (access_action IN ('revoke', 'downgrade_to_online', 'retain', 'custom')),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to maintain updated_at on ebook_refunds
DROP TRIGGER IF EXISTS tr_ebook_refunds_updated_at ON public.ebook_refunds;
CREATE TRIGGER tr_ebook_refunds_updated_at
  BEFORE UPDATE ON public.ebook_refunds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Performance Indexes on ebook_refunds
CREATE INDEX IF NOT EXISTS idx_ebook_refunds_order ON public.ebook_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_ebook_refunds_customer ON public.ebook_refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_ebook_refunds_gateway_refund ON public.ebook_refunds(gateway_refund_id);
CREATE INDEX IF NOT EXISTS idx_ebook_refunds_gateway_payment ON public.ebook_refunds(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_ebook_refunds_status ON public.ebook_refunds(status);
CREATE INDEX IF NOT EXISTS idx_ebook_orders_refund_status ON public.ebook_orders(refund_status);

-- 5. Row Level Security for ebook_refunds
ALTER TABLE public.ebook_refunds ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all refunds
DROP POLICY IF EXISTS admin_manage_all_refunds ON public.ebook_refunds;
CREATE POLICY admin_manage_all_refunds ON public.ebook_refunds
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Customers can view only their own refunds
DROP POLICY IF EXISTS customer_view_own_refunds ON public.ebook_refunds;
CREATE POLICY customer_view_own_refunds ON public.ebook_refunds
  FOR SELECT
  USING (customer_id = auth.uid());

-- Ensure audit log RLS permits admin viewing and service-role/admin inserting
DROP POLICY IF EXISTS admin_view_audit_logs ON public.ebook_audit_logs;
CREATE POLICY admin_view_audit_logs ON public.ebook_audit_logs
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS admin_insert_audit_logs ON public.ebook_audit_logs;
CREATE POLICY admin_insert_audit_logs ON public.ebook_audit_logs
  FOR INSERT
  WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- =============================================================================
-- STORED PROCEDURE 1: public.create_ebook_refund_intent()
-- Creates a durable pending refund intent with row locking before provider call.
-- Guarantees no concurrent over-refunding can occur.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_ebook_refund_intent(
  p_order_id UUID,
  p_amount_paise INTEGER,
  p_reason TEXT,
  p_refund_type TEXT,
  p_access_action TEXT,
  p_allocated_items JSONB,
  p_admin_id UUID,
  p_idempotency_key TEXT,
  p_gateway_payment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_pending_sum INTEGER;
  v_available_paise INTEGER;
  v_refund RECORD;
BEGIN
  -- 1. Idempotency check: If a refund with this idempotency key already exists, return it
  SELECT * INTO v_refund
  FROM public.ebook_refunds
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_exists', true,
      'refund_id', v_refund.id,
      'order_id', v_refund.order_id,
      'status', v_refund.status,
      'amount_paise', v_refund.amount_paise,
      'gateway_refund_id', v_refund.gateway_refund_id,
      'idempotency_key', v_refund.idempotency_key
    );
  END IF;

  -- 2. Lock the order row FOR UPDATE to prevent race conditions
  SELECT * INTO v_order
  FROM public.ebook_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found with ID: %', p_order_id;
  END IF;

  -- 3. Check order payment status
  IF v_order.payment_status NOT IN ('paid', 'partially_refunded') THEN
    RAISE EXCEPTION 'Cannot refund order %: Payment status is % (must be paid or partially_refunded)',
      p_order_id, v_order.payment_status;
  END IF;

  -- 4. Calculate pending refund sum
  SELECT COALESCE(SUM(amount_paise), 0) INTO v_pending_sum
  FROM public.ebook_refunds
  WHERE order_id = p_order_id
    AND status = 'pending';

  -- 5. Calculate remaining available balance
  v_available_paise := v_order.total_amount_paise - (v_order.refunded_amount_paise + v_pending_sum);

  IF p_amount_paise > v_available_paise THEN
    RAISE EXCEPTION 'Cannot refund % paise: Exceeds available refundable balance of % paise (total: %, refunded: %, pending: %)',
      p_amount_paise, v_available_paise, v_order.total_amount_paise, v_order.refunded_amount_paise, v_pending_sum;
  END IF;

  -- 6. Insert the durable pending refund record
  INSERT INTO public.ebook_refunds (
    order_id,
    customer_id,
    amount_paise,
    currency,
    reason,
    refund_type,
    status,
    gateway,
    gateway_payment_id,
    idempotency_key,
    allocated_items,
    access_action,
    admin_id
  ) VALUES (
    p_order_id,
    v_order.customer_id,
    p_amount_paise,
    v_order.currency,
    p_reason,
    p_refund_type,
    'pending',
    v_order.payment_gateway,
    COALESCE(p_gateway_payment_id, v_order.gateway_payment_id),
    p_idempotency_key,
    COALESCE(p_allocated_items, '[]'::jsonb),
    p_access_action,
    p_admin_id
  )
  RETURNING * INTO v_refund;

  -- 7. Update order refund_status to pending
  UPDATE public.ebook_orders
  SET
    refund_status = 'pending',
    updated_at = NOW()
  WHERE id = p_order_id;

  -- 8. Return created refund intent
  RETURN jsonb_build_object(
    'success', true,
    'already_exists', false,
    'refund_id', v_refund.id,
    'order_id', v_refund.order_id,
    'status', v_refund.status,
    'amount_paise', v_refund.amount_paise,
    'gateway_payment_id', v_refund.gateway_payment_id,
    'idempotency_key', v_refund.idempotency_key,
    'created_at', v_refund.created_at
  );
END;
$$;

-- =============================================================================
-- STORED PROCEDURE 2: public.finalize_ebook_refund()
-- Authoritative transition called after Razorpay refund response or recovery.
-- Atomically transitions order and customer entitlement state.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.finalize_ebook_refund(
  p_refund_id UUID,
  p_gateway_refund_id TEXT,
  p_status TEXT, -- 'processed' or 'failed'
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_refund RECORD;
  v_order RECORD;
  v_new_refunded_total INTEGER;
  v_new_payment_status TEXT;
  v_new_refund_status TEXT;
  v_item JSONB;
  v_item_id UUID;
  v_item_amount INTEGER;
  v_ent RECORD;
BEGIN
  -- 1. Lock the refund record FOR UPDATE
  SELECT * INTO v_refund
  FROM public.ebook_refunds
  WHERE id = p_refund_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund not found with ID: %', p_refund_id;
  END IF;

  -- 2. Idempotency: If already processed, return current state
  IF v_refund.status = 'processed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'refund_id', p_refund_id,
      'order_id', v_refund.order_id,
      'status', 'processed',
      'gateway_refund_id', v_refund.gateway_refund_id
    );
  END IF;

  -- 3. Lock the order row FOR UPDATE
  SELECT * INTO v_order
  FROM public.ebook_orders
  WHERE id = v_refund.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found with ID: %', v_refund.order_id;
  END IF;

  -- 4. Handle 'processed' transition
  IF p_status = 'processed' THEN
    v_new_refunded_total := v_order.refunded_amount_paise + v_refund.amount_paise;

    IF v_new_refunded_total >= v_order.total_amount_paise THEN
      v_new_payment_status := 'refunded';
      v_new_refund_status := 'full';
    ELSE
      v_new_payment_status := 'partially_refunded';
      v_new_refund_status := 'partial';
    END IF;

    -- Update refund record
    UPDATE public.ebook_refunds
    SET
      status = 'processed',
      gateway_refund_id = COALESCE(p_gateway_refund_id, gateway_refund_id),
      processed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_refund_id;

    -- Update order record
    UPDATE public.ebook_orders
    SET
      refunded_amount_paise = v_new_refunded_total,
      payment_status = v_new_payment_status,
      refund_status = v_new_refund_status,
      updated_at = NOW()
    WHERE id = v_order.id;

    -- Update line items if allocated
    IF jsonb_array_length(v_refund.allocated_items) > 0 THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_refund.allocated_items)
      LOOP
        v_item_id := (v_item->>'item_id')::UUID;
        v_item_amount := (v_item->>'amount_paise')::INTEGER;

        UPDATE public.ebook_order_items
        SET
          refunded_paise = refunded_paise + v_item_amount,
          refund_status = CASE 
            WHEN (refunded_paise + v_item_amount) >= price_paise THEN 'full'
            ELSE 'partial'
          END
        WHERE id = v_item_id AND order_id = v_order.id;
      END LOOP;
    ELSE
      -- Full order refund without specific item allocation -> mark all items full
      IF v_new_refund_status = 'full' THEN
        UPDATE public.ebook_order_items
        SET
          refunded_paise = price_paise,
          refund_status = 'full'
        WHERE order_id = v_order.id;
      END IF;
    END IF;

    -- =========================================================================
    -- ENTITLEMENT POLICY EXECUTION
    -- =========================================================================
    -- Case A: Full purchase refund (revoke all access funded by this order)
    IF v_refund.access_action = 'revoke' THEN
      UPDATE public.ebook_entitlements
      SET
        is_active = FALSE,
        can_read_online = FALSE,
        can_download_pdf = FALSE,
        updated_at = NOW()
      WHERE (order_id = v_order.id OR (
        customer_id = v_order.customer_id AND ebook_id IN (
          SELECT ebook_id FROM public.ebook_order_items WHERE order_id = v_order.id
        )
      )) AND grant_type IN ('purchase', 'upgrade');

    -- Case B: Upgrade refund (downgrade to online reading only)
    ELSIF v_refund.access_action = 'downgrade_to_online' THEN
      UPDATE public.ebook_entitlements
      SET
        plan = 'read_online',
        can_download_pdf = FALSE,
        can_read_online = TRUE,
        is_active = TRUE,
        updated_at = NOW()
      WHERE customer_id = v_order.customer_id 
        AND (order_id = v_order.id OR ebook_id IN (
          SELECT ebook_id FROM public.ebook_order_items WHERE order_id = v_order.id
        ));

    -- Case D: Goodwill or retain (do not revoke access)
    ELSIF v_refund.access_action = 'retain' THEN
      -- Intentionally retain access without mutation
      NULL;
    END IF;

    -- Record audit log
    INSERT INTO public.ebook_audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      v_refund.admin_id,
      'refund_processed',
      'ebook_order',
      v_order.id::TEXT,
      jsonb_build_object(
        'refund_id', p_refund_id,
        'gateway_refund_id', p_gateway_refund_id,
        'amount_paise', v_refund.amount_paise,
        'refund_type', v_refund.refund_type,
        'access_action', v_refund.access_action,
        'new_order_payment_status', v_new_payment_status,
        'new_order_refund_status', v_new_refund_status
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'processed',
      'refund_id', p_refund_id,
      'order_id', v_order.id,
      'order_payment_status', v_new_payment_status,
      'order_refund_status', v_new_refund_status,
      'refunded_amount_paise', v_new_refunded_total
    );

  -- 5. Handle 'failed' transition
  ELSIF p_status = 'failed' THEN
    UPDATE public.ebook_refunds
    SET
      status = 'failed',
      error_message = p_error_message,
      updated_at = NOW()
    WHERE id = p_refund_id;

    -- Recompute order refund_status based on remaining refunds
    SELECT 
      CASE 
        WHEN EXISTS (SELECT 1 FROM public.ebook_refunds WHERE order_id = v_order.id AND status = 'pending') THEN 'pending'
        WHEN v_order.refunded_amount_paise >= v_order.total_amount_paise THEN 'full'
        WHEN v_order.refunded_amount_paise > 0 THEN 'partial'
        ELSE 'none'
      END
    INTO v_new_refund_status;

    UPDATE public.ebook_orders
    SET
      refund_status = v_new_refund_status,
      updated_at = NOW()
    WHERE id = v_order.id;

    -- Record audit log
    INSERT INTO public.ebook_audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      v_refund.admin_id,
      'refund_failed',
      'ebook_order',
      v_order.id::TEXT,
      jsonb_build_object(
        'refund_id', p_refund_id,
        'error_message', p_error_message,
        'amount_paise', v_refund.amount_paise
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'failed',
      'refund_id', p_refund_id,
      'order_id', v_order.id,
      'error_message', p_error_message
    );

  ELSE
    RAISE EXCEPTION 'Invalid status for finalize_ebook_refund: % (must be processed or failed)', p_status;
  END IF;
END;
$$;

-- =============================================================================
-- STORED PROCEDURE 3: public.admin_manage_ebook_access()
-- Administrative customer access management with required audit trail.
-- Supports revoking, restoring, and issuing complimentary grants.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_manage_ebook_access(
  p_action TEXT, -- 'revoke', 'restore', 'grant_complimentary'
  p_customer_id UUID,
  p_ebook_id UUID,
  p_edition_id UUID,
  p_plan TEXT, -- 'read_online' or 'read_download' (for complimentary grants)
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ent RECORD;
  v_old_state JSONB;
  v_new_state JSONB;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A mandatory administrative reason is required to manage customer access.';
  END IF;

  -- 1. Revoke Access
  IF p_action = 'revoke' THEN
    SELECT * INTO v_ent
    FROM public.ebook_entitlements
    WHERE customer_id = p_customer_id
      AND ebook_id = p_ebook_id
      AND edition_id = p_edition_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No entitlement found for customer % on book % edition %',
        p_customer_id, p_ebook_id, p_edition_id;
    END IF;

    v_old_state := to_jsonb(v_ent);

    UPDATE public.ebook_entitlements
    SET
      is_active = FALSE,
      can_read_online = FALSE,
      can_download_pdf = FALSE,
      grant_reason = p_reason,
      updated_at = NOW()
    WHERE id = v_ent.id
    RETURNING * INTO v_ent;

    v_new_state := to_jsonb(v_ent);

    -- Record in audit logs
    INSERT INTO public.ebook_audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      p_admin_id,
      'admin_access_revoked',
      'ebook_entitlement',
      v_ent.id::TEXT,
      jsonb_build_object(
        'customer_id', p_customer_id,
        'ebook_id', p_ebook_id,
        'edition_id', p_edition_id,
        'reason', p_reason,
        'old_state', v_old_state,
        'new_state', v_new_state
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'revoke',
      'entitlement_id', v_ent.id,
      'is_active', false
    );

  -- 2. Restore Access
  ELSIF p_action = 'restore' THEN
    SELECT * INTO v_ent
    FROM public.ebook_entitlements
    WHERE customer_id = p_customer_id
      AND ebook_id = p_ebook_id
      AND edition_id = p_edition_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No entitlement found to restore for customer % on book % edition %',
        p_customer_id, p_ebook_id, p_edition_id;
    END IF;

    v_old_state := to_jsonb(v_ent);

    UPDATE public.ebook_entitlements
    SET
      is_active = TRUE,
      can_read_online = TRUE,
      can_download_pdf = CASE WHEN v_ent.plan = 'read_download' THEN TRUE ELSE FALSE END,
      grant_reason = p_reason,
      grant_type = CASE WHEN v_ent.grant_type = 'purchase' THEN 'purchase' ELSE 'admin_override' END,
      updated_at = NOW()
    WHERE id = v_ent.id
    RETURNING * INTO v_ent;

    v_new_state := to_jsonb(v_ent);

    INSERT INTO public.ebook_audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      p_admin_id,
      'admin_access_restored',
      'ebook_entitlement',
      v_ent.id::TEXT,
      jsonb_build_object(
        'customer_id', p_customer_id,
        'ebook_id', p_ebook_id,
        'edition_id', p_edition_id,
        'reason', p_reason,
        'old_state', v_old_state,
        'new_state', v_new_state
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'restore',
      'entitlement_id', v_ent.id,
      'is_active', true
    );

  -- 3. Grant Complimentary Access
  ELSIF p_action = 'grant_complimentary' THEN
    IF p_plan NOT IN ('read_online', 'read_download') THEN
      RAISE EXCEPTION 'Invalid complimentary grant plan: % (must be read_online or read_download)', p_plan;
    END IF;

    SELECT * INTO v_ent
    FROM public.ebook_entitlements
    WHERE customer_id = p_customer_id
      AND ebook_id = p_ebook_id
      AND edition_id = p_edition_id;

    IF FOUND THEN
      v_old_state := to_jsonb(v_ent);

      UPDATE public.ebook_entitlements
      SET
        is_active = TRUE,
        plan = p_plan,
        can_read_online = TRUE,
        can_download_pdf = (p_plan = 'read_download'),
        grant_type = 'complimentary',
        granted_by = p_admin_id,
        grant_reason = p_reason,
        updated_at = NOW()
      WHERE id = v_ent.id
      RETURNING * INTO v_ent;

      v_new_state := to_jsonb(v_ent);
    ELSE
      v_old_state := '{}'::jsonb;

      INSERT INTO public.ebook_entitlements (
        customer_id,
        ebook_id,
        edition_id,
        plan,
        can_read_online,
        can_download_pdf,
        grant_type,
        granted_by,
        grant_reason,
        is_active
      ) VALUES (
        p_customer_id,
        p_ebook_id,
        p_edition_id,
        p_plan,
        TRUE,
        (p_plan = 'read_download'),
        'complimentary',
        p_admin_id,
        p_reason,
        TRUE
      )
      RETURNING * INTO v_ent;

      v_new_state := to_jsonb(v_ent);
    END IF;

    INSERT INTO public.ebook_audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      p_admin_id,
      'admin_complimentary_grant',
      'ebook_entitlement',
      v_ent.id::TEXT,
      jsonb_build_object(
        'customer_id', p_customer_id,
        'ebook_id', p_ebook_id,
        'edition_id', p_edition_id,
        'plan', p_plan,
        'reason', p_reason,
        'old_state', v_old_state,
        'new_state', v_new_state
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'grant_complimentary',
      'entitlement_id', v_ent.id,
      'plan', v_ent.plan,
      'is_active', true
    );

  ELSE
    RAISE EXCEPTION 'Unknown admin access action: %', p_action;
  END IF;
END;
$$;

-- =============================================================================
-- STORED PROCEDURE 4: public.finalize_ebook_order_payment() [Hardened for Phase 8]
-- Ensures that refunded orders or revoked access cannot be accidentally
-- restored by delayed callbacks or payment recovery checks.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.finalize_ebook_order_payment(
  p_order_id UUID,
  p_payment_id TEXT DEFAULT NULL,
  p_gateway_order_id TEXT DEFAULT NULL,
  p_signature TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_existing_ent RECORD;
BEGIN
  -- 1. Lock the order row for update
  SELECT * INTO v_order
  FROM public.ebook_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found with ID: %', p_order_id;
  END IF;

  -- 2. Refund safeguard: If order has already been refunded or partially refunded, refuse to revert it
  IF v_order.payment_status IN ('refunded', 'partially_refunded') OR v_order.refund_status IN ('full', 'partial') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order has already been refunded or partially refunded. Cannot finalize payment or restore access.',
      'order_id', p_order_id,
      'payment_status', v_order.payment_status,
      'refund_status', v_order.refund_status
    );
  END IF;

  -- 3. Idempotency check: If order is already paid, return cleanly
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

  -- 4. Mark internal order as paid and completed
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

  -- 5. Process each purchased line item into public.ebook_entitlements
  FOR v_item IN
    SELECT * FROM public.ebook_order_items
    WHERE order_id = p_order_id
  LOOP
    SELECT * INTO v_existing_ent
    FROM public.ebook_entitlements
    WHERE customer_id = v_order.customer_id
      AND ebook_id = v_item.ebook_id
      AND edition_id = v_item.edition_id;

    IF v_item.plan = 'upgrade_pdf' THEN
      IF NOT FOUND OR v_existing_ent.is_active = FALSE THEN
        RAISE EXCEPTION 'Cannot finalize upgrade: No active online entitlement found for customer % on edition %', 
          v_order.customer_id, v_item.edition_id;
      END IF;

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
      IF NOT FOUND THEN
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
        UPDATE public.ebook_entitlements
        SET
          plan = CASE 
            WHEN v_item.plan = 'read_download' THEN 'read_download'
            ELSE plan
          END,
          can_read_online = TRUE,
          can_download_pdf = CASE
            WHEN v_item.plan = 'read_download' THEN TRUE
            ELSE can_download_pdf
          END,
          order_id = p_order_id,
          is_active = TRUE,
          updated_at = NOW()
        WHERE id = v_existing_ent.id;
      END IF;
    END IF;
  END LOOP;

  -- 6. Insert durable receipt outbox entry
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
    COALESCE(v_order.customer_name, 'Valued Customer'),
    'pending',
    jsonb_build_object(
      'order_id', p_order_id,
      'order_number', v_order.order_number,
      'total_amount_paise', v_order.total_amount_paise,
      'currency', v_order.currency,
      'paid_at', NOW()
    )
  )
  ON CONFLICT (order_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'already_paid', false,
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'customer_id', v_order.customer_id,
    'total_amount_paise', v_order.total_amount_paise
  );
END;
$$;

