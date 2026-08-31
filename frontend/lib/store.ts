import { SupabaseClient } from '@supabase/supabase-js';
import { UserAccess } from '@/lib/subscription';
import { satisfiesPlanRequirement } from '@/config/plans';

export type ProductType = 
  | 'question_pack' 
  | 'note' 
  | 'note_bundle' 
  | 'interview_bundle'
  | 'timed_assessment'
  | 'ai_mock_interview'
  | 'resume_template';

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
  attached_notes?: {
    id: string;
    title: string;
    category?: string;
    file_size?: string;
    file_url?: string;
  }[];
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
  },
  timed_assessment: {
    label: 'Timed Assessment',
    color: 'bg-amber-50',
    textColor: 'text-amber-700',
    border: 'border-amber-200'
  },
  ai_mock_interview: {
    label: 'AI Mock Interview',
    color: 'bg-violet-50',
    textColor: 'text-violet-700',
    border: 'border-violet-200'
  },
  resume_template: {
    label: 'Resume Template',
    color: 'bg-teal-50',
    textColor: 'text-teal-700',
    border: 'border-teal-200'
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
 * Fetch all specific Note IDs unlocked via direct note purchase or note bundles
 */
export async function getStudentPurchasedNoteIds(supabase: SupabaseClient, studentId: string): Promise<Set<string>> {
  try {
    const purchasedProductIds = await getStudentPurchasedProductIds(supabase, studentId);
    if (purchasedProductIds.size === 0) return new Set();

    const productIdsArray = Array.from(purchasedProductIds);
    const unlockedNoteIds = new Set<string>();

    // 1. Direct item_reference_id from store_products
    const { data: productsData } = await supabase
      .from('store_products')
      .select('id, item_reference_id')
      .in('id', productIdsArray);

    if (productsData) {
      productsData.forEach((p: any) => {
        if (p.item_reference_id) unlockedNoteIds.add(p.item_reference_id);
      });
    }

    // 2. Multi-note bundle relationships from store_product_notes
    try {
      const { data: bundleNotes } = await supabase
        .from('store_product_notes')
        .select('note_id')
        .in('product_id', productIdsArray);

      if (bundleNotes) {
        bundleNotes.forEach((bn: any) => {
          if (bn.note_id) unlockedNoteIds.add(bn.note_id);
        });
      }
    } catch {
      // Table may be optional or gracefully fall back
    }

    return unlockedNoteIds;
  } catch (err) {
    console.error('Failed to get student purchased note IDs:', err);
    return new Set();
  }
}

/**
 * Fetch all resource reference IDs and direct product IDs permanently owned by the student
 */
export async function getStudentPurchasedResourceIds(supabase: SupabaseClient, studentId: string): Promise<Set<string>> {
  try {
    const purchasedProductIds = await getStudentPurchasedProductIds(supabase, studentId);
    if (purchasedProductIds.size === 0) return new Set();

    const productIdsArray = Array.from(purchasedProductIds);
    const unlockedIds = new Set<string>(purchasedProductIds);

    // 1. Direct item_reference_id from store_products (Notes, Assessments, Resume Templates)
    const { data: productsData } = await supabase
      .from('store_products')
      .select('id, item_reference_id')
      .in('id', productIdsArray);

    if (productsData) {
      productsData.forEach((p: any) => {
        if (p.item_reference_id) unlockedIds.add(p.item_reference_id);
      });
    }

    // 2. Multi-note bundle relationships from store_product_notes
    try {
      const { data: bundleNotes } = await supabase
        .from('store_product_notes')
        .select('note_id')
        .in('product_id', productIdsArray);

      if (bundleNotes) {
        bundleNotes.forEach((bn: any) => {
          if (bn.note_id) unlockedIds.add(bn.note_id);
        });
      }
    } catch {
      // Table may be optional or gracefully fall back
    }

    return unlockedIds;
  } catch (err) {
    console.error('Failed to get student purchased resource IDs:', err);
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
