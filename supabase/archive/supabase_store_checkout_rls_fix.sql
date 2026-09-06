-- ==============================================================================
-- GRADZENX STORE & CHECKOUT RLS FIX
-- ==============================================================================
-- Fixes: "new row violates row-level security policy for table order_items"
-- Adds INSERT and SELECT policies for students on order_items (linked to their orders)
-- Adds UPDATE policy for students on student_purchases (for safe upserts)
-- ==============================================================================

-- 1. Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_purchases ENABLE ROW LEVEL SECURITY;

-- 2. ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "Users insert own order items" ON public.order_items;
CREATE POLICY "Users insert own order items" ON public.order_items
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_items.order_id AND o.student_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users view own order items" ON public.order_items;
CREATE POLICY "Users view own order items" ON public.order_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_items.order_id AND o.student_id = auth.uid()
    ) OR public.is_admin()
);

DROP POLICY IF EXISTS "Admins manage order items" ON public.order_items;
CREATE POLICY "Admins manage order items" ON public.order_items
FOR ALL USING (public.is_admin());

-- 3. ORDERS POLICIES
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders
FOR SELECT USING (auth.uid() = student_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own orders" ON public.orders;
CREATE POLICY "Users insert own orders" ON public.orders
FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders" ON public.orders
FOR ALL USING (public.is_admin());

-- 4. STUDENT PURCHASES POLICIES (Required for checkout upsert)
DROP POLICY IF EXISTS "Users view own purchases" ON public.student_purchases;
CREATE POLICY "Users view own purchases" ON public.student_purchases
FOR SELECT USING (auth.uid() = student_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own purchases" ON public.student_purchases;
CREATE POLICY "Users insert own purchases" ON public.student_purchases
FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users update own purchases" ON public.student_purchases;
CREATE POLICY "Users update own purchases" ON public.student_purchases
FOR UPDATE USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins manage purchases" ON public.student_purchases;
CREATE POLICY "Admins manage purchases" ON public.student_purchases
FOR ALL USING (public.is_admin());

-- 5. GRANTS
GRANT ALL ON TABLE public.orders TO authenticated, service_role;
GRANT ALL ON TABLE public.order_items TO authenticated, service_role;
GRANT ALL ON TABLE public.student_purchases TO authenticated, service_role;
