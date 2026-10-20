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

  // Zero-price policy enforcement: Paid commercial offers must have final selling price > 0 paise.
  // Free acquisition is strictly administered via complimentary grants rather than financial checkout.
  if (onlineCalc.finalPricePaise <= 0) {
    errors.push('Read Online selling price must be greater than zero paise. Free eBook access must be granted via administrator complimentary access.');
  }
  if (downloadCalc.finalPricePaise <= 0) {
    errors.push('Read + Download selling price must be greater than zero paise. Free eBook access must be granted via administrator complimentary access.');
  }
  if (upgradeCalc.finalPricePaise <= 0) {
    errors.push('PDF Upgrade selling price must be greater than zero paise. Complimentary upgrades must be granted via administrator complimentary access.');
  }

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
 * Format paise into clean INR currency string.
 * If paise has fractional rupees (e.g. 18050 paise = ₹180.50), shows 2 decimals;
 * if exact rupees (e.g. 18000 paise = ₹180), shows without decimal zeros.
 */
export function formatPaise(paise: number, currency: string = 'INR'): string {
  const safePaise = Math.max(0, Math.round(paise || 0));
  const rupees = safePaise / 100;
  const symbol = currency === 'INR' ? '₹' : `${currency} `;
  if (safePaise % 100 === 0) {
    return `${symbol}${rupees.toLocaleString('en-IN')}`;
  }
  return `${symbol}${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

