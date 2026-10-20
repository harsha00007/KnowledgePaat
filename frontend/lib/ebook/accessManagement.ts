
/**
 * KnowledgePaat — Phase 8: Audited Customer Access Management
 * 
 * Provides administrative inspection, revocation, restoration, and
 * complimentary grant capabilities.
 * 
 * Rules:
 * - Complimentary grants must NEVER create fake orders or gateway transactions.
 * - Every administrative access alteration requires a mandatory audit reason.
 * - Full before/after snapshots are durably recorded in public.ebook_audit_logs.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { EBookEntitlement, EBookAccessPlan } from '@/types/ebook';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export interface AccessManagementResult {
  success: boolean;
  action: 'revoke' | 'restore' | 'grant_complimentary';
  entitlementId?: string;
  isActive?: boolean;
  plan?: string;
  message: string;
}

/**
 * Inspect detailed customer access, active entitlements, and funding origins.
 */
export async function getCustomerAccessOverview(customerId: string) {
  const supabase = getServiceSupabase();

  const { data: entitlements, error: entErr } = await supabase
    .from('ebook_entitlements')
    .select(`
      id,
      customer_id,
      ebook_id,
      edition_id,
      plan,
      can_read_online,
      can_download_pdf,
      order_id,
      grant_type,
      granted_by,
      grant_reason,
      is_active,
      created_at,
      updated_at,
      ebook:ebooks (
        id,
        title,
        slug,
        author,
        cover_image_url
      ),
      edition:ebook_editions (
        id,
        edition_number,
        version_name,
        status
      ),
      order:ebook_orders!fk_ebook_entitlements_order (
        id,
        order_number,
        order_type,
        total_amount_paise,
        payment_status,
        paid_at
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (entErr) {
    logger.error('Failed to query customer access overview', entErr, { customerId });
    throw new Error('Failed to retrieve customer access overview.');
  }

  return entitlements || [];
}

/**
 * Revoke customer access with required administrative reason.
 */
export async function revokeCustomerAccess(params: {
  customerId: string;
  ebookId: string;
  editionId: string;
  reason: string;
  adminId: string;
}): Promise<AccessManagementResult> {
  const { customerId, ebookId, editionId, reason, adminId } = params;
  const supabase = getServiceSupabase();

  if (!reason || reason.trim().length < 5) {
    throw new Error('A detailed reason (at least 5 characters) is required to revoke customer access.');
  }

  const { data, error } = await supabase.rpc('admin_manage_ebook_access', {
    p_action: 'revoke',
    p_customer_id: customerId,
    p_ebook_id: ebookId,
    p_edition_id: editionId,
    p_plan: 'read_online',
    p_reason: reason.trim(),
    p_admin_id: adminId,
  });

  if (error || !data?.success) {
    logger.error('Failed to execute admin revocation', error, { customerId, ebookId, editionId });
    throw new Error(data?.error || error?.message || 'Failed to revoke customer access.');
  }

  return {
    success: true,
    action: 'revoke',
    entitlementId: data.entitlement_id,
    isActive: false,
    message: 'Access has been successfully revoked and logged.',
  };
}

/**
 * Restore customer access with required administrative reason.
 */
export async function restoreCustomerAccess(params: {
  customerId: string;
  ebookId: string;
  editionId: string;
  reason: string;
  adminId: string;
}): Promise<AccessManagementResult> {
  const { customerId, ebookId, editionId, reason, adminId } = params;
  const supabase = getServiceSupabase();

  if (!reason || reason.trim().length < 5) {
    throw new Error('A detailed reason (at least 5 characters) is required to restore customer access.');
  }

  const { data, error } = await supabase.rpc('admin_manage_ebook_access', {
    p_action: 'restore',
    p_customer_id: customerId,
    p_ebook_id: ebookId,
    p_edition_id: editionId,
    p_plan: 'read_online',
    p_reason: reason.trim(),
    p_admin_id: adminId,
  });

  if (error || !data?.success) {
    logger.error('Failed to execute admin restoration', error, { customerId, ebookId, editionId });
    throw new Error(data?.error || error?.message || 'Failed to restore customer access.');
  }

  return {
    success: true,
    action: 'restore',
    entitlementId: data.entitlement_id,
    isActive: true,
    message: 'Access has been successfully restored and logged.',
  };
}

/**
 * Issue a complimentary grant to a customer.
 * NEVER creates fake paid orders or fake payment gateway records.
 */
export async function grantComplimentaryAccess(params: {
  customerId: string;
  ebookId: string;
  editionId: string;
  plan: EBookAccessPlan;
  reason: string;
  adminId: string;
}): Promise<AccessManagementResult> {
  const { customerId, ebookId, editionId, plan, reason, adminId } = params;
  const supabase = getServiceSupabase();

  if (!reason || reason.trim().length < 5) {
    throw new Error('A detailed reason (at least 5 characters) is required for complimentary access.');
  }

  if (!['read_online', 'read_download'].includes(plan)) {
    throw new Error(`Invalid plan for complimentary grant: ${plan}`);
  }

  const { data, error } = await supabase.rpc('admin_manage_ebook_access', {
    p_action: 'grant_complimentary',
    p_customer_id: customerId,
    p_ebook_id: ebookId,
    p_edition_id: editionId,
    p_plan: plan,
    p_reason: reason.trim(),
    p_admin_id: adminId,
  });

  if (error || !data?.success) {
    logger.error('Failed to grant complimentary access', error, { customerId, ebookId, editionId, plan });
    throw new Error(data?.error || error?.message || 'Failed to grant complimentary access.');
  }

  return {
    success: true,
    action: 'grant_complimentary',
    entitlementId: data.entitlement_id,
    plan: data.plan,
    isActive: true,
    message: `Complimentary ${plan === 'read_download' ? 'Read + Download' : 'Read Online'} access granted.`,
  };
}
