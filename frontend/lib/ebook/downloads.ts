/**
 * KnowledgePaat — Phase 7: Secure PDF Downloads & ₹50 Upgrades
 * 
 * - Server-authorized PDF download delivery via short-lived signed URLs.
 * - Enforces customer authentication, email verification, and active PDF entitlements.
 * - Resolves purchased edition assets (including historical withdrawn editions).
 * - Never trusts client-supplied storage paths or arbitrary URLs.
 * - Audit logs all download link issuances without logging bearer URLs or credentials.
 * - Server-side upgrade quote and order creation for ₹50 / 5000 paise upgrades.
 * - Preserves original purchase records, bookmarks, and reading progress.
 */

import { createClient, createAdminClient } from '@/utils/supabase/server';
import { getVerifiedCustomer, VerifiedCustomer } from './customerAuth';
import { STORAGE_BUCKETS } from './storage';
import { getAuthoritativeEditionPricing } from './pricing';
import {
  createRazorpayOrder,
  getRazorpayCredentials,
} from '@/lib/razorpay';
import { logger } from '@/lib/logger';
import {
  CustomerOwnedBook,
  EBookAccessPlan,
  EBookEntitlement,
  EBookUpgradeQuote,
  EBookDownloadResponse,
} from '@/types/ebook';
import crypto from 'crypto';

export const SIGNED_URL_EXPIRY_SECONDS = 60; // Configurable short lifetime: 60 seconds
export const DEFAULT_UPGRADE_PRICE_PAISE = 5000; // Launch default ₹50

/**
 * Generates a safe, sanitized download filename for customer file saving.
 */
function generateDownloadFilename(slug: string, editionNumber: number): string {
  const cleanSlug = (slug || 'ebook')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
  return `${cleanSlug}-edition-${editionNumber}.pdf`;
}

/**
 * Authoritatively issues a secure, short-lived signed URL for a customer's purchased edition PDF.
 * 
 * Invariants Enforced:
 * 1. Verified authenticated customer only.
 * 2. Active PDF-download entitlement required (read_download plan).
 * 3. Resolves the customer's actual purchased edition (never substitutes a newer public edition).
 * 4. Preserves access to eligible purchased historical editions withdrawn from sale.
 * 5. Private publication asset path resolved entirely on the server.
 * 6. Audit logged in ebook_download_logs (distinguishing link issuance from complete transfer).
 */
export async function getAuthorizedDownloadUrl(
  bookId: string,
  editionId?: string | null,
  clientIp?: string | null,
  userAgent?: string | null,
  explicitCustomer?: VerifiedCustomer
): Promise<EBookDownloadResponse> {
  // 1. Resolve verified authenticated customer
  let customer = explicitCustomer;
  if (!customer) {
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      const err = new Error(authResult.message) as any;
      err.status = authResult.status;
      err.code = authResult.code;
      throw err;
    }
    customer = authResult.customer;
  }

  // Use admin client for storage and entitlement lookup to ensure consistent RLS & service checks
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // 2. Query customer entitlements for this book
  let entQuery = supabase
    .from('ebook_entitlements')
    .select(`
      id,
      customer_id,
      ebook_id,
      edition_id,
      plan,
      can_read_online,
      can_download_pdf,
      is_active,
      grant_type
    `)
    .eq('customer_id', customer.userId)
    .eq('ebook_id', bookId);

  if (editionId) {
    entQuery = entQuery.eq('edition_id', editionId);
  }

  const { data: entitlements, error: entErr } = await entQuery;

  if (entErr || !entitlements || entitlements.length === 0) {
    const err = new Error('You do not have an active purchase record for this book.') as any;
    err.status = 403;
    err.code = 'NOT_OWNED';
    throw err;
  }

  // Find matching entitlement
  const activeEntitlement = entitlements.find((e) => e.is_active);

  if (!activeEntitlement) {
    const err = new Error('Your digital access for this book has been revoked or refunded.') as any;
    err.status = 403;
    err.code = 'ACCESS_REVOKED';
    throw err;
  }

  // 3. Enforce PDF-download tier
  if (!activeEntitlement.can_download_pdf || activeEntitlement.plan !== 'read_download') {
    const err = new Error(
      'Your current license is Read Online only. Add PDF access for ₹50 to unlock downloads.'
    ) as any;
    err.status = 403;
    err.code = 'UPGRADE_REQUIRED';
    throw err;
  }

  // 4. Resolve the immutable publication asset server-side for the purchased edition
  const { data: edition, error: edErr } = await supabase
    .from('ebook_editions')
    .select('id, ebook_id, edition_number, version_name, status, pdf_storage_path')
    .eq('id', activeEntitlement.edition_id)
    .maybeSingle();

  if (edErr || !edition) {
    const err = new Error('Purchased edition record could not be found.') as any;
    err.status = 404;
    err.code = 'EDITION_NOT_FOUND';
    throw err;
  }

  // Cross-book / cross-edition validation guard
  if (edition.ebook_id !== bookId) {
    const err = new Error('Security violation: Requested edition does not match book.') as any;
    err.status = 400;
    err.code = 'CROSS_BOOK_MISMATCH';
    throw err;
  }

  if (!edition.pdf_storage_path) {
    const err = new Error('Publication PDF asset is currently unavailable for this edition.') as any;
    err.status = 404;
    err.code = 'PDF_ASSET_MISSING';
    throw err;
  }

  // 5. Fetch book slug for safe filename
  const { data: book } = await supabase
    .from('ebooks')
    .select('slug, title')
    .eq('id', bookId)
    .maybeSingle();

  const safeFilename = generateDownloadFilename(book?.slug || 'ebook', edition.edition_number);

  // 6. Issue short-lived signed URL with attachment download header
  const { data: signedData, error: signErr } = await supabase.storage
    .from(STORAGE_BUCKETS.PDFS)
    .createSignedUrl(edition.pdf_storage_path, SIGNED_URL_EXPIRY_SECONDS, {
      download: safeFilename,
    });

  if (signErr || !signedData?.signedUrl) {
    logger.error('Failed to create storage signed URL for PDF download', signErr, {
      module: 'ebook_downloads',
      editionId: edition.id,
      path: edition.pdf_storage_path,
      customerId: customer.userId,
    });
    const err = new Error('Storage service error: Unable to generate secure download link.') as any;
    err.status = 500;
    err.code = 'STORAGE_ERROR';
    throw err;
  }

  // 7. Audit log download link issuance
  // Note: We record status as 'url_issued'. This does NOT claim the file was completely saved to disk.
  try {
    await supabase.from('ebook_download_logs').insert({
      customer_id: customer.userId,
      ebook_id: bookId,
      edition_id: edition.id,
      delivery_type: 'signed_url',
      status: 'url_issued',
      ip_address: clientIp || null,
      user_agent: userAgent ? userAgent.slice(0, 500) : null,
    });
  } catch (logErr) {
    // Non-blocking log failure
    logger.warn('Failed to insert download audit log entry', {
      module: 'ebook_downloads',
      error: (logErr as any)?.message,
      customerId: customer.userId,
      editionId: edition.id,
    });
  }

  logger.info('Authorized eBook download link issued', {
    module: 'ebook_downloads',
    customerId: customer.userId,
    bookId,
    editionId: edition.id,
    editionNumber: edition.edition_number,
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  });

  return {
    success: true,
    downloadUrl: signedData.signedUrl,
    expiresInSeconds: SIGNED_URL_EXPIRY_SECONDS,
    filename: safeFilename,
    editionNumber: edition.edition_number,
    versionName: edition.version_name,
  };
}

/**
 * Evaluates upgrade eligibility and returns an authoritative server-calculated upgrade quote.
 * Launch default is ₹50 / 5000 paise.
 */
export async function getUpgradeQuote(
  bookId: string,
  editionId?: string | null,
  explicitCustomer?: VerifiedCustomer | { userId: string; email?: string }
): Promise<EBookUpgradeQuote> {
  let customer = explicitCustomer;
  if (!customer) {
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      throw new Error(authResult.message || 'Authentication required to calculate upgrade quote.');
    }
    customer = authResult.customer;
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // 1. Fetch book master
  const { data: book, error: bookErr } = await supabase
    .from('ebooks')
    .select('id, title, slug')
    .eq('id', bookId)
    .maybeSingle();

  if (bookErr || !book) {
    throw new Error('Book not found.');
  }

  // 2. Query entitlements for customer and book
  let entQuery = supabase
    .from('ebook_entitlements')
    .select('*')
    .eq('customer_id', customer.userId)
    .eq('ebook_id', bookId);

  if (editionId) {
    entQuery = entQuery.eq('edition_id', editionId);
  }

  const { data: entitlements, error: entErr } = await entQuery;

  if (entErr || !entitlements || entitlements.length === 0) {
    return {
      eligible: false,
      bookId,
      bookTitle: book.title,
      editionId: editionId || '',
      editionNumber: 0,
      versionName: '',
      currentPlan: 'read_online',
      targetPlan: 'read_download',
      upgradePricePaise: DEFAULT_UPGRADE_PRICE_PAISE,
      upgradePriceRupees: DEFAULT_UPGRADE_PRICE_PAISE / 100,
      currency: 'INR',
      originalEntitlementId: '',
      message: 'You do not own Read Online access for this book.',
    };
  }

  // Sort: active entitlements first
  const activeEntitlement = entitlements.find((e) => e.is_active) || entitlements[0];

  if (!activeEntitlement.is_active) {
    return {
      eligible: false,
      bookId,
      bookTitle: book.title,
      editionId: activeEntitlement.edition_id,
      editionNumber: 0,
      versionName: '',
      currentPlan: activeEntitlement.plan,
      targetPlan: 'read_download',
      upgradePricePaise: DEFAULT_UPGRADE_PRICE_PAISE,
      upgradePriceRupees: DEFAULT_UPGRADE_PRICE_PAISE / 100,
      currency: 'INR',
      originalEntitlementId: activeEntitlement.id,
      originalOrderId: activeEntitlement.order_id,
      message: 'Access for this book has been revoked or refunded. Upgrades are not permitted.',
    };
  }

  // 3. Resolve edition
  const { data: edition } = await supabase
    .from('ebook_editions')
    .select('*')
    .eq('id', activeEntitlement.edition_id)
    .maybeSingle();

  if (!edition) {
    throw new Error('Associated edition record not found.');
  }

  // 4. Check if already upgraded / already owns read_download
  if (activeEntitlement.can_download_pdf || activeEntitlement.plan === 'read_download') {
    return {
      eligible: false,
      bookId,
      bookTitle: book.title,
      editionId: edition.id,
      editionNumber: edition.edition_number,
      versionName: edition.version_name,
      currentPlan: 'read_download',
      targetPlan: 'read_download',
      upgradePricePaise: 0,
      upgradePriceRupees: 0,
      currency: edition.currency || 'INR',
      originalEntitlementId: activeEntitlement.id,
      originalOrderId: activeEntitlement.order_id,
      message: 'You already own complete access (Read + Download) for this edition.',
    };
  }

  // Authoritative server upgrade price in paise for the specific purchased edition
  const authoritativePricing = await getAuthoritativeEditionPricing(edition.id, supabase);
  const upgradePricePaise = authoritativePricing?.upgrade_price_paise ?? (edition.price_upgrade_pdf_paise ?? DEFAULT_UPGRADE_PRICE_PAISE);
  const upgradePriceRupees = Math.round(upgradePricePaise / 100);

  return {
    eligible: true,
    bookId,
    bookTitle: book.title,
    editionId: edition.id,
    editionNumber: edition.edition_number,
    versionName: edition.version_name,
    currentPlan: 'read_online',
    targetPlan: 'read_download',
    upgradePricePaise,
    upgradePriceRupees,
    currency: edition.currency || 'INR',
    originalEntitlementId: activeEntitlement.id,
    originalOrderId: activeEntitlement.order_id,
    message: `Upgrade ${edition.version_name} to Read + Download for ₹${upgradePriceRupees}.`,
  };
}

export interface CreateUpgradeOrderResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  amountPaise: number;
  amountRupees: number;
  currency: string;
  keyId: string;
  bookTitle: string;
  edition: {
    id: string;
    editionNumber: number;
    versionName: string;
  };
}

/**
 * Creates a server-side upgrade order linked to the customer's original online purchase.
 * Enforces server-authoritative ₹50 price and initializes Razorpay Test Mode order.
 */
export async function createEBookUpgradeOrder(
  bookId: string,
  editionId?: string | null,
  explicitCustomer?: VerifiedCustomer
): Promise<CreateUpgradeOrderResult> {
  let customer = explicitCustomer;
  if (!customer) {
    const authResult = await getVerifiedCustomer();
    if (!authResult.success) {
      const err = new Error(authResult.message) as any;
      err.status = authResult.status;
      throw err;
    }
    customer = authResult.customer;
  }

  // 1. Evaluate upgrade eligibility on the server
  const quote = await getUpgradeQuote(bookId, editionId, customer);
  if (!quote.eligible) {
    throw new Error(quote.message);
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // 2. Prevent duplicate chargeable upgrade attempts:
  // Check if a pending upgrade order was created in the last 15 minutes for this entitlement
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: existingPendingOrders } = await supabase
    .from('ebook_orders')
    .select('id, order_number, gateway_order_id, total_amount_paise, created_at')
    .eq('customer_id', customer.userId)
    .eq('order_type', 'upgrade')
    .eq('original_entitlement_id', quote.originalEntitlementId)
    .eq('payment_status', 'pending')
    .gte('created_at', fifteenMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(1);

  const { keyId } = getRazorpayCredentials();

  if (existingPendingOrders && existingPendingOrders.length > 0 && existingPendingOrders[0].gateway_order_id) {
    const pendingOrder = existingPendingOrders[0];
    logger.info('Reusing existing active pending upgrade order to prevent duplicate charges', {
      module: 'ebook_upgrades',
      orderId: pendingOrder.id,
      orderNumber: pendingOrder.order_number,
      customerId: customer.userId,
    });
    return {
      success: true,
      orderId: pendingOrder.id,
      orderNumber: pendingOrder.order_number,
      razorpayOrderId: pendingOrder.gateway_order_id,
      amountPaise: pendingOrder.total_amount_paise,
      amountRupees: pendingOrder.total_amount_paise / 100,
      currency: 'INR',
      keyId,
      bookTitle: quote.bookTitle,
      edition: {
        id: quote.editionId,
        editionNumber: quote.editionNumber,
        versionName: quote.versionName,
      },
    };
  }

  // 3. Create fresh upgrade order
  const orderNumber = `KP-UPG-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const { data: newOrder, error: orderErr } = await supabase
    .from('ebook_orders')
    .insert({
      order_number: orderNumber,
      customer_id: customer.userId,
      order_type: 'upgrade',
      original_order_id: quote.originalOrderId || null,
      original_entitlement_id: quote.originalEntitlementId,
      total_amount_paise: quote.upgradePricePaise,
      currency: 'INR',
      payment_gateway: 'razorpay',
      payment_status: 'pending',
      order_status: 'pending',
      customer_email: customer.email,
      customer_name: customer.fullName,
      notes: {
        orderType: 'ebook_upgrade',
        bookId,
        editionId: quote.editionId,
        originalEntitlementId: quote.originalEntitlementId,
      },
    })
    .select('id, order_number')
    .single();

  if (orderErr || !newOrder) {
    logger.error('Failed to create ebook upgrade order record', orderErr, {
      module: 'ebook_upgrades',
      customerId: customer.userId,
    });
    throw new Error('Unable to create upgrade order. Please try again.');
  }

  // 4. Create upgrade order item
  const { error: itemErr } = await supabase.from('ebook_order_items').insert({
    order_id: newOrder.id,
    ebook_id: bookId,
    edition_id: quote.editionId,
    plan: 'upgrade_pdf',
    price_paise: quote.upgradePricePaise,
    title: quote.bookTitle,
    edition_label: quote.versionName,
  });

  if (itemErr) {
    logger.error('Failed to create ebook upgrade order item', itemErr, {
      module: 'ebook_upgrades',
      orderId: newOrder.id,
    });
    throw new Error('Unable to record upgrade item.');
  }

  // 5. Create Razorpay Test Mode Order for ₹50
  const razorpayOrder = await createRazorpayOrder({
    amountInRupees: quote.upgradePriceRupees,
    receipt: orderNumber.slice(0, 40),
    notes: {
      internalOrderId: newOrder.id,
      orderNumber,
      customerId: customer.userId,
      orderType: 'ebook_upgrade',
      originalEntitlementId: quote.originalEntitlementId,
    },
  });

  // 6. Associate gateway order ID with internal order
  await supabase
    .from('ebook_orders')
    .update({ gateway_order_id: razorpayOrder.id })
    .eq('id', newOrder.id);

  logger.info('eBook upgrade order created successfully', {
    module: 'ebook_upgrades',
    orderId: newOrder.id,
    orderNumber,
    razorpayOrderId: razorpayOrder.id,
    amountPaise: quote.upgradePricePaise,
  });

  return {
    success: true,
    orderId: newOrder.id,
    orderNumber,
    razorpayOrderId: razorpayOrder.id,
    amountPaise: quote.upgradePricePaise,
    amountRupees: quote.upgradePriceRupees,
    currency: 'INR',
    keyId,
    bookTitle: quote.bookTitle,
    edition: {
      id: quote.editionId,
      editionNumber: quote.editionNumber,
      versionName: quote.versionName,
    },
  };
}
