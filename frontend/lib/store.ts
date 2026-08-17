import { SupabaseClient } from '@supabase/supabase-js';
import { UserAccess } from '@/lib/subscription';
import { satisfiesPlanRequirement } from '@/config/plans';

export type ProductType = 'question_pack' | 'note' | 'note_bundle' | 'interview_bundle';
export type OrderStatus = 'pending' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export interface StoreProduct {
  id: string;
  title: string;
  description: string;
  product_type: ProductType;
  price: number;
  original_price: number | null;
  thumbnail_url: string | null;
  item_reference_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  student_id: string;
  product_id: string;
  created_at: string;
  product?: StoreProduct;
}

export interface Order {
  id: string;
  student_id: string;
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  price: number;
  created_at: string;
  product?: StoreProduct;
}

export interface StudentPurchase {
  id: string;
  student_id: string;
  product_id: string;
  order_id: string | null;
  purchased_at?: string;
  unlocked_at?: string;
  created_at?: string;
  product?: StoreProduct;
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, { label: string; color: string; textColor: string; border: string }> = {
  question_pack: {
    label: 'Question Pack',
    color: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    border: 'border-indigo-200'
  },
  note: {
    label: 'Study Note',
    color: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  note_bundle: {
    label: 'Notes Bundle',
    color: 'bg-blue-50',
    textColor: 'text-blue-700',
    border: 'border-blue-200'
  },
  interview_bundle: {
    label: 'Master Bundle',
    color: 'bg-purple-50',
    textColor: 'text-purple-700',
    border: 'border-purple-200'
  }
};

/**
 * Fetch all active store products
 */
export async function getStoreProducts(supabase: SupabaseClient): Promise<StoreProduct[]> {
  try {
    const { data, error } = await supabase
      .from('store_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching store products:', error);
      return [];
    }

    const activeItems = (data || []).filter((p: any) => {
      if (p.is_active === false) return false;
      if (p.status && p.status.toLowerCase() === 'inactive') return false;
      return true;
    });

    return activeItems as StoreProduct[];
  } catch (err) {
    console.error('Failed to get store products:', err);
    return [];
  }
}

/**
 * Fetch all product IDs permanently owned by the student
 */
export async function getStudentPurchasedProductIds(supabase: SupabaseClient, studentId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('student_purchases')
      .select('product_id')
      .eq('student_id', studentId);

    if (error) {
      console.error('Error fetching student purchases:', error);
      return new Set();
    }

    return new Set((data || []).map((p: any) => p.product_id));
  } catch (err) {
    console.error('Failed to get student purchases:', err);
    return new Set();
  }
}

/**
 * Central Access Engine evaluating both Monthly Subscription Tier and Individual Permanent Store Purchases.
 */
export function canStudentAccessResource(
  requiredPlan: string | null | undefined,
  userAccess: UserAccess,
  purchasedProductIds: Set<string> = new Set(),
  resourceReferenceId?: string | null,
  matchingStoreProductId?: string | null
): boolean {
  // 1. Check if user's subscription satisfies the requirement
  if (userAccess.hasAccess(requiredPlan)) {
    return true;
  }

  // 2. Check if student directly owns the specific product linked to this item
  if (matchingStoreProductId && purchasedProductIds.has(matchingStoreProductId)) {
    return true;
  }

  // 3. Check if student owns a global bundle or reference product
  if (resourceReferenceId && purchasedProductIds.has(resourceReferenceId)) {
    return true;
  }

  return false;
}
