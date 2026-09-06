-- GradZenX Phase G3: Digital Store & Cart System Setup
-- Run this script in your Supabase SQL Editor

-- 1. Store Products Table
CREATE TABLE IF NOT EXISTS public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('question_pack', 'note', 'note_bundle', 'interview_bundle')),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  original_price NUMERIC(10, 2) CHECK (original_price >= 0),
  thumbnail_url TEXT,
  item_reference_id TEXT, -- Optional ID linking to note_id, category, or tag
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_student_product_cart UNIQUE (student_id, product_id)
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled')),
  order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Student Purchases Table (Permanent Entitlements)
CREATE TABLE IF NOT EXISTS public.student_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_student_product_purchase UNIQUE (student_id, product_id)
);

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_store_products_status ON public.store_products(status);
CREATE INDEX IF NOT EXISTS idx_cart_items_student ON public.cart_items(student_id);
CREATE INDEX IF NOT EXISTS idx_orders_student ON public.orders(student_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_student_purchases_student ON public.student_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_student_purchases_product ON public.student_purchases(product_id);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_purchases ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies

-- Store Products: Anyone authenticated can view active products; Admins have full access
DROP POLICY IF EXISTS "Anyone can view active store products" ON public.store_products;
CREATE POLICY "Anyone can view active store products"
ON public.store_products FOR SELECT
TO authenticated
USING (status = 'active' OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

DROP POLICY IF EXISTS "Admins can manage store products" ON public.store_products;
CREATE POLICY "Admins can manage store products"
ON public.store_products FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Cart Items: Students can only view and manage their own cart
DROP POLICY IF EXISTS "Students can manage their own cart" ON public.cart_items;
CREATE POLICY "Students can manage their own cart"
ON public.cart_items FOR ALL
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- Orders: Students can view and create their own orders; Admins can view and update all
DROP POLICY IF EXISTS "Students can view their own orders" ON public.orders;
CREATE POLICY "Students can view their own orders"
ON public.orders FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

DROP POLICY IF EXISTS "Students can insert their own orders" ON public.orders;
CREATE POLICY "Students can insert their own orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Admins and owners can update orders" ON public.orders;
CREATE POLICY "Admins and owners can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (student_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Order Items: Viewable by order owner or admin; Insertable by order owner
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
CREATE POLICY "Users can view their order items"
ON public.order_items FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders WHERE id = order_items.order_id AND (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ))
));

DROP POLICY IF EXISTS "Users can insert order items for their orders" ON public.order_items;
CREATE POLICY "Users can insert order items for their orders"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders WHERE id = order_items.order_id AND student_id = auth.uid()
));

-- Student Purchases: Students can view their own; Admins can view all; Insertable on order fulfillment
DROP POLICY IF EXISTS "Students can view their own purchases" ON public.student_purchases;
CREATE POLICY "Students can view their own purchases"
ON public.student_purchases FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

DROP POLICY IF EXISTS "Students can create purchase records upon checkout" ON public.student_purchases;
CREATE POLICY "Students can create purchase records upon checkout"
ON public.student_purchases FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

-- 9. Seed Sample Digital Store Products (If not already present)
INSERT INTO public.store_products (title, description, product_type, price, original_price, status)
SELECT 
  'Complete TCS NQT & Infosys Technical Question Pack',
  'Over 150+ frequently asked coding, DBMS, and OOPs interview questions with complete model answers.',
  'question_pack',
  29.00,
  59.00,
  'active'
WHERE NOT EXISTS (SELECT 1 FROM public.store_products WHERE title = 'Complete TCS NQT & Infosys Technical Question Pack');

INSERT INTO public.store_products (title, description, product_type, price, original_price, status)
SELECT 
  'Aptitude Mastery Formula Cheatsheet (PDF)',
  'Comprehensive 45-page formula handbook covering Quantitative Aptitude, Logical Reasoning, and Data Interpretation.',
  'note',
  19.00,
  39.00,
  'active'
WHERE NOT EXISTS (SELECT 1 FROM public.store_products WHERE title = 'Aptitude Mastery Formula Cheatsheet (PDF)');

INSERT INTO public.store_products (title, description, product_type, price, original_price, status)
SELECT 
  'All-in-One Fresher Study Notes Revision Bundle',
  'Instant lifetime download access to all technical, HR, programming, and aptitude study guides and cheatsheets.',
  'note_bundle',
  49.00,
  99.00,
  'active'
WHERE NOT EXISTS (SELECT 1 FROM public.store_products WHERE title = 'All-in-One Fresher Study Notes Revision Bundle');

INSERT INTO public.store_products (title, description, product_type, price, original_price, status)
SELECT 
  'Comprehensive Placement Preparation Master Bundle',
  'The complete digital package containing all interview question packs, technical cheat sheets, and aptitude formula books.',
  'interview_bundle',
  79.00,
  149.00,
  'active'
WHERE NOT EXISTS (SELECT 1 FROM public.store_products WHERE title = 'Comprehensive Placement Preparation Master Bundle');
