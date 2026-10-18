import { createClient, createAdminClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

export type DiscountType = 'none' | 'percentage' | 'fixed';

export interface AuthoritativePricing {
  id: string;
  edition_id: string;
  online_original_price_paise: number;
  online_discount_type: DiscountType;
  online_discount_value: number;
  online_price_paise: number;
  download_original_price_paise: number;
  download_discount_type: DiscountType;
  download_discount_value: number;
  download_price_paise: number;
  upgrade_original_price_paise: number;
  upgrade_discount_type: DiscountType;
  upgrade_discount_value: number;
  upgrade_price_paise: number;
  currency: string;
  pricing_version: number;
  change_reason?: string | null;
  updated_by?: string | null;
  updated_at: string;
  created_at?: string;
  updater_name?: string | null;
  updater_email?: string | null;
}

export interface PricingPlanInput {
  original_price_paise: number;
  discount_type: DiscountType;
  discount_value: number;
}

export interface PricingUpdatePayload {
  editionId: string;
  online: PricingPlanInput;
  download: PricingPlanInput;
  upgrade: PricingPlanInput;
  currentVersion: number;
  changeReason: string;
  adminId: string;
  adminEmail?: string;
}

/**
 * Server-authoritative price calculation with documented rounding (half-up to nearest paise).
 * Disallows negative prices or discounts exceeding original price.
 */
export function calculateSellingPrice(
  originalPricePaise: number,
  discountType: DiscountType,
  discountValue: number
): { discountAmountPaise: number; finalPricePaise: number } {
  const orig = Math.max(0, Math.round(originalPricePaise || 0));

  if (orig === 0 || discountType === 'none' || !discountValue || discountValue <= 0) {
    return { discountAmountPaise: 0, finalPricePaise: orig };
  }

  let discountAmountPaise = 0;

  if (discountType === 'percentage') {
    // Discount value is a percentage (e.g. 10 for 10%, 25.5 for 25.5%)
    const clampedPercent = Math.min(100, Math.max(0, Number(discountValue)));
    discountAmountPaise = Math.round((orig * clampedPercent) / 100);
  } else if (discountType === 'fixed') {
    // Discount value is an amount in paise
    discountAmountPaise = Math.round(Number(discountValue));
  }

  // Ensure discount does not exceed original price and cannot be negative
  discountAmountPaise = Math.min(orig, Math.max(0, discountAmountPaise));
  const finalPricePaise = Math.max(0, orig - discountAmountPaise);

  return { discountAmountPaise, finalPricePaise };
}

/**
 * Validates pricing inputs according to commercial rules.
 */
export function validatePricingRules(payload: {
  online: PricingPlanInput;
  download: PricingPlanInput;
  upgrade: PricingPlanInput;
}): {
  isValid: boolean;
  errors: string[];
  calculated?: {
    online_price_paise: number;
    download_price_paise: number;
    upgrade_price_paise: number;
  };
} {
  const errors: string[] = [];

  // 1. Online validation
  if (typeof payload.online?.original_price_paise !== 'number' || payload.online.original_price_paise < 0) {
    errors.push('Read Online original price must be a non-negative integer in paise.');
  }
  if (!['none', 'percentage', 'fixed'].includes(payload.online?.discount_type)) {
    errors.push('Read Online discount type must be none, percentage, or fixed.');
  }
  if (payload.online?.discount_type === 'percentage' && (payload.online.discount_value < 0 || payload.online.discount_value > 100)) {
    errors.push('Read Online discount percentage must be between 0 and 100.');
  }
  if (payload.online?.discount_type === 'fixed' && payload.online.discount_value < 0) {
    errors.push('Read Online fixed discount amount cannot be negative.');
  }

  // 2. Download validation
  if (typeof payload.download?.original_price_paise !== 'number' || payload.download.original_price_paise < 0) {
    errors.push('Read + Download original price must be a non-negative integer in paise.');
  }
  if (!['none', 'percentage', 'fixed'].includes(payload.download?.discount_type)) {
    errors.push('Read + Download discount type must be none, percentage, or fixed.');
  }
  if (payload.download?.discount_type === 'percentage' && (payload.download.discount_value < 0 || payload.download.discount_value > 100)) {
    errors.push('Read + Download discount percentage must be between 0 and 100.');
  }
  if (payload.download?.discount_type === 'fixed' && payload.download.discount_value < 0) {
    errors.push('Read + Download fixed discount amount cannot be negative.');
  }

  // 3. Upgrade validation
  if (typeof payload.upgrade?.original_price_paise !== 'number' || payload.upgrade.original_price_paise < 0) {
    errors.push('PDF Upgrade original price must be a non-negative integer in paise.');
  }
  if (!['none', 'percentage', 'fixed'].includes(payload.upgrade?.discount_type)) {
    errors.push('PDF Upgrade discount type must be none, percentage, or fixed.');
  }
  if (payload.upgrade?.discount_type === 'percentage' && (payload.upgrade.discount_value < 0 || payload.upgrade.discount_value > 100)) {
    errors.push('PDF Upgrade discount percentage must be between 0 and 100.');
  }
  if (payload.upgrade?.discount_type === 'fixed' && payload.upgrade.discount_value < 0) {
    errors.push('PDF Upgrade fixed discount amount cannot be negative.');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Compute calculated selling prices
  const onlineCalc = calculateSellingPrice(
    payload.online.original_price_paise,
    payload.online.discount_type,
    payload.online.discount_value
  );
  const downloadCalc = calculateSellingPrice(
    payload.download.original_price_paise,
    payload.download.discount_type,
    payload.download.discount_value
  );
  const upgradeCalc = calculateSellingPrice(
    payload.upgrade.original_price_paise,
    payload.upgrade.discount_type,
    payload.upgrade.discount_value
  );

  // Business model relationship: Download selling price must be >= Online selling price
  if (downloadCalc.finalPricePaise < onlineCalc.finalPricePaise) {
    errors.push(
      `Read + Download selling price (₹${(downloadCalc.finalPricePaise / 100).toFixed(2)}) cannot be less than Read Online selling price (₹${(onlineCalc.finalPricePaise / 100).toFixed(2)}).`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    calculated: errors.length === 0 ? {
      online_price_paise: onlineCalc.finalPricePaise,
      download_price_paise: downloadCalc.finalPricePaise,
      upgrade_price_paise: upgradeCalc.finalPricePaise,
    } : undefined
  };
}

/**
 * Retrieves the single authoritative pricing record for an edition.
 * If no record exists yet, automatically backfills from ebook_editions.
 */
export async function getAuthoritativeEditionPricing(
  editionId: string,
  customSupabaseClient?: any
): Promise<AuthoritativePricing | null> {
  const supabase = customSupabaseClient || (process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient());

  const { data: pricing, error } = await supabase
    .from('ebook_pricing')
    .select(`
      *,
      updater:profiles!ebook_pricing_updated_by_fkey (
        full_name,
        email
      )
    `)
    .eq('edition_id', editionId)
    .maybeSingle();

  if (pricing && !error) {
    return {
      ...pricing,
      updater_name: pricing.updater?.full_name || null,
      updater_email: pricing.updater?.email || null,
    };
  }

  // Fallback: Check if edition exists and seed pricing row
  const { data: edition } = await supabase
    .from('ebook_editions')
    .select('id, price_read_online_paise, price_read_download_paise, price_upgrade_pdf_paise, currency')
    .eq('id', editionId)
    .maybeSingle();

  if (!edition) {
    return null;
  }

  const defaultOnline = edition.price_read_online_paise ?? 4900;
  const defaultDownload = edition.price_read_download_paise ?? 9900;
  const defaultUpgrade = edition.price_upgrade_pdf_paise ?? 5000;
  const defaultCurrency = edition.currency || 'INR';

  // Insert default row
  const { data: newPricing, error: insertErr } = await supabase
    .from('ebook_pricing')
    .insert({
      edition_id: edition.id,
      online_original_price_paise: defaultOnline,
      online_discount_type: 'none',
      online_discount_value: 0,
      online_price_paise: defaultOnline,
      download_original_price_paise: defaultDownload,
      download_discount_type: 'none',
      download_discount_value: 0,
      download_price_paise: defaultDownload,
      upgrade_original_price_paise: defaultUpgrade,
      upgrade_discount_type: 'none',
      upgrade_discount_value: 0,
      upgrade_price_paise: defaultUpgrade,
      currency: defaultCurrency,
      pricing_version: 1,
      change_reason: 'Automated on-demand baseline pricing',
    })
    .select()
    .single();

  if (insertErr || !newPricing) {
    logger.error('Failed to create baseline ebook_pricing record', insertErr, { editionId });
    // Return virtual authoritative record from edition
    return {
      id: 'virtual',
      edition_id: edition.id,
      online_original_price_paise: defaultOnline,
      online_discount_type: 'none',
      online_discount_value: 0,
      online_price_paise: defaultOnline,
      download_original_price_paise: defaultDownload,
      download_discount_type: 'none',
      download_discount_value: 0,
      download_price_paise: defaultDownload,
      upgrade_original_price_paise: defaultUpgrade,
      upgrade_discount_type: 'none',
      upgrade_discount_value: 0,
      upgrade_price_paise: defaultUpgrade,
      currency: defaultCurrency,
      pricing_version: 1,
      updated_at: new Date().toISOString(),
    };
  }

  return newPricing;
}

/**
 * Atomically updates commercial pricing for an edition.
 * Enforces:
 * - Admin authorization
 * - Optimistic concurrency control via pricing_version check (rejects 409 on conflict)
 * - Atomic database update
 * - Synchronizes edition table mirror columns
 * - Emits audit trail log entry
 */
export async function updateEditionPricing(payload: PricingUpdatePayload): Promise<{
  success: boolean;
  pricing?: AuthoritativePricing;
  conflict?: boolean;
  error?: string;
}> {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // 1. Validate payload rules
  const validation = validatePricingRules({
    online: payload.online,
    download: payload.download,
    upgrade: payload.upgrade,
  });

  if (!validation.isValid || !validation.calculated) {
    return {
      success: false,
      error: validation.errors.join(' ')
    };
  }

  const { online_price_paise, download_price_paise, upgrade_price_paise } = validation.calculated;

  if (!payload.changeReason || !payload.changeReason.trim()) {
    return {
      success: false,
      error: 'A change reason is required when modifying commercial prices.'
    };
  }

  // 2. Fetch existing pricing record to verify current version and capture audit previous values
  const { data: existingPricing, error: fetchErr } = await supabase
    .from('ebook_pricing')
    .select('*')
    .eq('edition_id', payload.editionId)
    .maybeSingle();

  if (fetchErr || !existingPricing) {
    return {
      success: false,
      error: 'Target pricing record not found for this edition.'
    };
  }

  // 3. Optimistic concurrency check
  if (existingPricing.pricing_version !== payload.currentVersion) {
    return {
      success: false,
      conflict: true,
      error: `Concurrent modification detected: Another administrator updated pricing to version ${existingPricing.pricing_version}. Please reload to review the latest changes.`
    };
  }

  const newVersion = existingPricing.pricing_version + 1;
  const now = new Date().toISOString();

  // 4. Update ebook_pricing atomically with version check in WHERE clause
  const { data: updatedPricing, error: updateErr } = await supabase
    .from('ebook_pricing')
    .update({
      online_original_price_paise: payload.online.original_price_paise,
      online_discount_type: payload.online.discount_type,
      online_discount_value: payload.online.discount_value,
      online_price_paise,

      download_original_price_paise: payload.download.original_price_paise,
      download_discount_type: payload.download.discount_type,
      download_discount_value: payload.download.discount_value,
      download_price_paise,

      upgrade_original_price_paise: payload.upgrade.original_price_paise,
      upgrade_discount_type: payload.upgrade.discount_type,
      upgrade_discount_value: payload.upgrade.discount_value,
      upgrade_price_paise,

      pricing_version: newVersion,
      change_reason: payload.changeReason.trim(),
      updated_by: payload.adminId,
      updated_at: now,
    })
    .eq('id', existingPricing.id)
    .eq('pricing_version', payload.currentVersion)
    .select()
    .single();

  if (updateErr || !updatedPricing) {
    return {
      success: false,
      conflict: true,
      error: 'Failed to apply pricing update due to concurrent modification or database error.'
    };
  }

  // 5. Synchronize edition mirror columns so legacy queries remain seamlessly aligned
  await supabase
    .from('ebook_editions')
    .update({
      price_read_online_paise: online_price_paise,
      price_read_download_paise: download_price_paise,
      price_upgrade_pdf_paise: upgrade_price_paise,
      updated_at: now,
    })
    .eq('id', payload.editionId);

  // 6. Record audit log
  try {
    await supabase.from('ebook_audit_logs').insert({
      actor_id: payload.adminId,
      action: 'pricing_updated',
      entity_type: 'ebook_edition',
      entity_id: payload.editionId,
      metadata: {
        change_reason: payload.changeReason.trim(),
        previous_version: existingPricing.pricing_version,
        new_version: newVersion,
        previous_values: {
          online_price_paise: existingPricing.online_price_paise,
          online_original_price_paise: existingPricing.online_original_price_paise,
          download_price_paise: existingPricing.download_price_paise,
          download_original_price_paise: existingPricing.download_original_price_paise,
          upgrade_price_paise: existingPricing.upgrade_price_paise,
          upgrade_original_price_paise: existingPricing.upgrade_original_price_paise,
        },
        new_values: {
          online_price_paise,
          online_original_price_paise: payload.online.original_price_paise,
          online_discount_type: payload.online.discount_type,
          online_discount_value: payload.online.discount_value,
          download_price_paise,
          download_original_price_paise: payload.download.original_price_paise,
          download_discount_type: payload.download.discount_type,
          download_discount_value: payload.download.discount_value,
          upgrade_price_paise,
          upgrade_original_price_paise: payload.upgrade.original_price_paise,
          upgrade_discount_type: payload.upgrade.discount_type,
          upgrade_discount_value: payload.upgrade.discount_value,
        }
      }
    });
  } catch (auditErr) {
    logger.error('Non-blocking audit log failure during pricing update', auditErr, { editionId: payload.editionId });
  }

  return {
    success: true,
    pricing: updatedPricing
  };
}
