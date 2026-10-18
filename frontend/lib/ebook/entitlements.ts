/**
 * Entitlement, Ownership & Purchase Intent Foundations for KnowledgePaat eBook Platform
 * - Evaluates customer digital rights, reading access, and PDF download permissions.
 * - Retains historical editions even after withdrawal from public sale.
 * - Distinguishes between new purchases, PDF upgrades, and historical editions.
 * - Strictly excludes private storage paths and paid content bodies from customer payloads.
 */

import { createClient, createAdminClient } from '@/utils/supabase/server';
import {
  CustomerOwnedBook,
  EBookAccessPlan,
  EBookEntitlement,
  EBookPurchaseIntent,
} from '@/types/ebook';

/**
 * Lists all books owned by a verified customer.
 * Retains withdrawn or archived editions that were purchased historically.
 * Projects safe library metadata only (no PDF paths, no chapter bodies).
 */
export async function getCustomerOwnedBooks(userId: string): Promise<CustomerOwnedBook[]> {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // Query entitlements with joined edition and master book
  const { data: entitlements, error } = await supabase
    .from('ebook_entitlements')
    .select(`
      id,
      customer_id,
      ebook_id,
      edition_id,
      plan,
      can_read_online,
      can_download_pdf,
      grant_type,
      is_active,
      created_at,
      ebook:ebooks (
        id,
        slug,
        title,
        subtitle,
        author,
        description,
        category,
        cover_image_url,
        status
      ),
      edition:ebook_editions (
        id,
        edition_number,
        version_name,
        status,
        is_current_edition
      )
    `)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });

  if (error || !entitlements) {
    console.error('Failed to query customer entitlements:', error);
    return [];
  }

  // Fetch real reading progress for this customer (if any exists)
  const { data: progressRows } = await supabase
    .from('ebook_reading_progress')
    .select('ebook_id, edition_id, last_chapter_id, scroll_percent, completed_at, updated_at')
    .eq('customer_id', userId);

  const progressMap = new Map<string, any>();
  if (progressRows) {
    for (const p of progressRows) {
      progressMap.set(`${p.ebook_id}_${p.edition_id}`, p);
    }
  }

  const ownedBooks: CustomerOwnedBook[] = [];

  for (const row of entitlements) {
    const book = Array.isArray(row.ebook) ? row.ebook[0] : row.ebook;
    const edition = Array.isArray(row.edition) ? row.edition[0] : row.edition;

    if (!book || !edition) continue;

    const prog = progressMap.get(`${row.ebook_id}_${row.edition_id}`);

    ownedBooks.push({
      entitlementId: row.id,
      bookId: row.ebook_id,
      slug: book.slug || '',
      title: book.title || 'Untitled Book',
      subtitle: book.subtitle || null,
      author: book.author || 'KnowledgePaat',
      description: book.description || '',
      category: book.category || 'General',
      coverImageUrl: book.cover_image_url || null,
      editionId: row.edition_id,
      editionNumber: edition.edition_number || 1,
      versionName: edition.version_name || `Edition ${edition.edition_number}`,
      editionStatus: edition.status,
      isCurrentEdition: Boolean(edition.is_current_edition),
      plan: row.plan as EBookAccessPlan,
      canReadOnline: Boolean(row.can_read_online && row.is_active),
      canDownloadPdf: Boolean(row.can_download_pdf && row.is_active),
      grantType: row.grant_type,
      isActive: Boolean(row.is_active),
      purchasedAt: row.created_at,
      readingProgress: prog
        ? {
            scrollPercent: Number(prog.scroll_percent) || 0,
            lastChapterId: prog.last_chapter_id || null,
            completedAt: prog.completed_at || null,
            updatedAt: prog.updated_at || prog.completed_at,
          }
        : null,
    });
  }

  return ownedBooks;
}

/**
 * Checks if a customer owns an active entitlement for a book (and optionally a specific edition).
 */
export async function checkBookOwnership(
  userId: string,
  bookId: string,
  editionId?: string
): Promise<EBookEntitlement | null> {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  let query = supabase
    .from('ebook_entitlements')
    .select('*')
    .eq('customer_id', userId)
    .eq('ebook_id', bookId)
    .eq('is_active', true);

  if (editionId) {
    query = query.eq('edition_id', editionId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as EBookEntitlement;
}

/**
 * Checks whether a customer has permission to read an edition online.
 */
export async function canReadOnline(
  userId: string,
  bookId: string,
  editionId: string
): Promise<boolean> {
  const entitlement = await checkBookOwnership(userId, bookId, editionId);
  if (!entitlement || !entitlement.is_active) return false;
  return entitlement.plan === 'read_online' || entitlement.plan === 'read_download';
}

/**
 * Checks whether a customer has permission to download a PDF for an edition.
 */
export async function canDownloadPdf(
  userId: string,
  bookId: string,
  editionId: string
): Promise<boolean> {
  const entitlement = await checkBookOwnership(userId, bookId, editionId);
  if (!entitlement || !entitlement.is_active) return false;
  return entitlement.plan === 'read_download' && Boolean(entitlement.can_download_pdf);
}

/**
 * Evaluates ownership-aware purchase intent for checkout pre-validation.
 * Correctly distinguishes between:
 * 1. New purchases (no ownership)
 * 2. PDF Upgrades (+₹50 delta) for existing read_online buyers on the same edition
 * 3. Already-owned complete access (read_download)
 * 4. Already-owned online access (attempting to purchase read_online again)
 * 5. New edition release for historical edition owners (not an upgrade; separate release)
 */
export async function evaluatePurchaseIntent(
  userId: string | null,
  bookId: string,
  requestedPlan: EBookAccessPlan
): Promise<EBookPurchaseIntent> {
  const supabase = await createClient();

  // 1. Fetch the master book and its current published edition
  const { data: book } = await supabase
    .from('ebooks')
    .select('id, title, status')
    .eq('id', bookId)
    .maybeSingle();

  if (!book) {
    throw new Error('Book not found.');
  }

  const { data: currentEdition } = await supabase
    .from('ebook_editions')
    .select('*')
    .eq('ebook_id', bookId)
    .eq('is_current_edition', true)
    .maybeSingle();

  if (!currentEdition) {
    throw new Error('No current published edition found for this book.');
  }

  const priceOnlinePaise = currentEdition.price_read_online_paise || 4900;
  const priceDownloadPaise = currentEdition.price_read_download_paise || 9900;
  const priceUpgradePaise = currentEdition.price_upgrade_pdf_paise || 5000;

  // Case A: Anonymous visitor (no user ID)
  if (!userId) {
    const pricePaise = requestedPlan === 'read_online' ? priceOnlinePaise : priceDownloadPaise;
    return {
      status: 'eligible_new_purchase',
      canPurchase: true,
      isUpgrade: false,
      bookId,
      targetEditionId: currentEdition.id,
      targetEditionNumber: currentEdition.edition_number,
      targetVersionName: currentEdition.version_name,
      plan: requestedPlan,
      pricePaise,
      priceRupees: Math.round(pricePaise / 100),
      message: `Eligible for new purchase (${requestedPlan === 'read_online' ? 'Read Online' : 'Read + Download'}).`,
    };
  }

  // Case B: Authenticated customer - query existing entitlements for this book
  const { data: existingEntitlements } = await supabase
    .from('ebook_entitlements')
    .select('*')
    .eq('customer_id', userId)
    .eq('ebook_id', bookId)
    .eq('is_active', true);

  if (!existingEntitlements || existingEntitlements.length === 0) {
    // No prior ownership
    const pricePaise = requestedPlan === 'read_online' ? priceOnlinePaise : priceDownloadPaise;
    return {
      status: 'eligible_new_purchase',
      canPurchase: true,
      isUpgrade: false,
      bookId,
      targetEditionId: currentEdition.id,
      targetEditionNumber: currentEdition.edition_number,
      targetVersionName: currentEdition.version_name,
      plan: requestedPlan,
      pricePaise,
      priceRupees: Math.round(pricePaise / 100),
      message: `Eligible for new purchase (${requestedPlan === 'read_online' ? 'Read Online' : 'Read + Download'}).`,
    };
  }

  // Check if user owns the CURRENT edition
  const currentEditionEntitlement = existingEntitlements.find(
    (e) => e.edition_id === currentEdition.id
  );

  if (currentEditionEntitlement) {
    // User already owns an entitlement for the current edition
    if (currentEditionEntitlement.plan === 'read_download') {
      return {
        status: 'already_owned_complete',
        canPurchase: false,
        isUpgrade: false,
        bookId,
        targetEditionId: currentEdition.id,
        targetEditionNumber: currentEdition.edition_number,
        targetVersionName: currentEdition.version_name,
        plan: requestedPlan,
        pricePaise: 0,
        priceRupees: 0,
        message: 'You already own complete access (Read + Download) for this edition.',
      };
    }

    if (currentEditionEntitlement.plan === 'read_online') {
      if (requestedPlan === 'read_download') {
        // Eligible for ₹50 PDF upgrade
        return {
          status: 'eligible_upgrade',
          canPurchase: true,
          isUpgrade: true,
          bookId,
          targetEditionId: currentEdition.id,
          targetEditionNumber: currentEdition.edition_number,
          targetVersionName: currentEdition.version_name,
          plan: 'read_download',
          pricePaise: priceUpgradePaise,
          priceRupees: Math.round(priceUpgradePaise / 100),
          message: `Upgrade existing online access to Read + Download (+₹${Math.round(priceUpgradePaise / 100)}).`,
        };
      }

      // Trying to buy read_online again
      return {
        status: 'already_owned_online',
        canPurchase: false,
        isUpgrade: false,
        bookId,
        targetEditionId: currentEdition.id,
        targetEditionNumber: currentEdition.edition_number,
        targetVersionName: currentEdition.version_name,
        plan: requestedPlan,
        pricePaise: 0,
        priceRupees: 0,
        message: 'You already own Read Online access for this edition. You can upgrade to Read + Download for ₹50.',
      };
    }
  }

  // Case C: User owns a historical edition, but not the current edition
  const historicalEntitlement = existingEntitlements[0];
  // Fetch historical edition number
  const { data: histEdition } = await supabase
    .from('ebook_editions')
    .select('edition_number, version_name')
    .eq('id', historicalEntitlement.edition_id)
    .maybeSingle();

  const ownedEditionNumber = histEdition?.edition_number || 1;
  const pricePaise = requestedPlan === 'read_online' ? priceOnlinePaise : priceDownloadPaise;

  return {
    status: 'new_edition_available',
    canPurchase: true,
    isUpgrade: false,
    bookId,
    targetEditionId: currentEdition.id,
    targetEditionNumber: currentEdition.edition_number,
    targetVersionName: currentEdition.version_name,
    plan: requestedPlan,
    pricePaise,
    priceRupees: Math.round(pricePaise / 100),
    ownedEditionNumber,
    currentEditionNumber: currentEdition.edition_number,
    message: `You own Edition ${ownedEditionNumber}. Edition ${currentEdition.edition_number} is a new revised release available for purchase.`,
  };
}
