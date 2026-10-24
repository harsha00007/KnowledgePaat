import { createClient, createAdminClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { invalidateServerCache } from '@/lib/serverCache';

import { AuthoritativePricing, PricingUpdatePayload, validatePricingRules } from './pricingShared';
export * from './pricingShared';


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
    // If another concurrent request inserted the baseline row first (PostgreSQL unique violation 23505)
    if (insertErr?.code === '23505') {
      const { data: existingPricing } = await supabase
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

      if (existingPricing) {
        return {
          ...existingPricing,
          updater_name: existingPricing.updater?.full_name || null,
          updater_email: existingPricing.updater?.email || null,
        };
      }
    }

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

  // Invalidate catalogue cache so public prices update immediately
  invalidateServerCache('catalogue');

  return {
    success: true,
    pricing: updatedPricing
  };
}
