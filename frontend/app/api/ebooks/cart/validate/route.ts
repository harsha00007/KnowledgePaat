import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { UUID_REGEX } from '@/lib/ebook/validation';
import { checkRateLimit, rateLimitResponse, getRealClientIp, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

interface CartInputItem {
  bookId: string;
  plan: 'read_online' | 'read_download';
  clientPricePaise?: number;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getRealClientIp(req);
    const rl = await checkRateLimit(`cart_validate:${clientIp}`, RATE_LIMIT_POLICIES.CART_VALIDATE);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json().catch(() => ({}));
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    if (rawItems.length > 50) {
      return NextResponse.json({
        success: false,
        error: 'Cart item count exceeds maximum permitted limit (50).'
      }, { status: 400 });
    }

    const warnings: string[] = [];
    const unsupportedPlanBookIds = new Set<string>();

    // 1. Sanitize input items and deduplicate (1 cart item per book)
    const validPlans = new Set(['read_online', 'read_download']);
    const uniqueItemsMap = new Map<string, CartInputItem>();

    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') continue;
      const bookId = String(raw.bookId || '').trim();
      let plan = String(raw.plan || '').trim();

      if (!UUID_REGEX.test(bookId)) continue;

      // Handle unsupported plans: reset to read_online with customer warning
      if (!validPlans.has(plan)) {
        unsupportedPlanBookIds.add(bookId);
        plan = 'read_online';
      }

      // Deduplication: Later occurrences update earlier ones for same book
      uniqueItemsMap.set(bookId, {
        bookId,
        plan: plan as 'read_online' | 'read_download',
        clientPricePaise: typeof raw.clientPricePaise === 'number' ? raw.clientPricePaise : undefined,
      });
    }

    const sanitizedInputs = Array.from(uniqueItemsMap.values());

    if (sanitizedInputs.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        total_paise: 0,
        formatted_total: '₹0',
        item_count: 0,
        warnings: warnings,
        unavailable_book_ids: []
      });
    }

    const supabase = await createClient();
    const bookIds = sanitizedInputs.map(i => i.bookId);

    // 2. Fetch authoritative book and current published edition data
    const { data: booksData, error: dbError } = await supabase
      .from('ebooks')
      .select(`
        id,
        slug,
        title,
        author,
        cover_image_url,
        status,
        editions:ebook_editions!inner (
          id,
          edition_number,
          version_name,
          status,
          is_current_edition,
          price_read_online_paise,
          price_read_download_paise,
          currency
        )
      `)
      .in('id', bookIds)
      .eq('status', 'published')
      .eq('editions.status', 'published')
      .eq('editions.is_current_edition', true);

    if (dbError) {
      console.error('Database error in cart validation:', dbError);
      return NextResponse.json({ success: false, error: 'Failed to validate cart items with server.' }, { status: 500 });
    }

    const dbBooksMap = new Map<string, any>();
    const editionIds: string[] = [];
    for (const b of (booksData || [])) {
      const editions = b.editions || [];
      const current = editions.find((e: any) => e.is_current_edition) || editions[0];
      if (current) {
        dbBooksMap.set(b.id, {
          ...b,
          current_edition: current
        });
        if (current.id) editionIds.push(current.id);
      }
    }

    const pricingMap = new Map<string, any>();
    if (editionIds.length > 0) {
      const { data: pricingRows } = await supabase
        .from('ebook_pricing')
        .select('*')
        .in('edition_id', editionIds);

      for (const pr of (pricingRows || [])) {
        pricingMap.set(pr.edition_id, pr);
      }
    }

    // Also query unpublished or missing book titles to give friendly notifications
    const missingIds = bookIds.filter(id => !dbBooksMap.has(id));
    if (missingIds.length > 0) {
      const { data: missingBooks } = await supabase
        .from('ebooks')
        .select('id, title, status')
        .in('id', missingIds);

      const titleMap = new Map((missingBooks || []).map(b => [b.id, b.title]));

      for (const mId of missingIds) {
        const title = titleMap.get(mId);
        if (title) {
          warnings.push(`"${title}" has been withdrawn or is no longer available and was removed from your cart.`);
        } else {
          warnings.push(`An unavailable title was removed from your cart.`);
        }
      }
    }

    // 3. Check existing user entitlements if user is signed in
    const { data: { user } } = await supabase.auth.getUser();
    const customerId = user?.id || null;
    let userEntitlements: any[] = [];

    if (customerId) {
      try {
        const { data: ents } = await supabase
          .from('ebook_entitlements')
          .select('id, ebook_id, edition_id, plan, is_active')
          .eq('customer_id', customerId)
          .eq('is_active', true)
          .in('ebook_id', bookIds);
        userEntitlements = ents || [];
      } catch {
        userEntitlements = [];
      }
    }

    const validatedItems: any[] = [];
    const unavailableBookIds: string[] = [...missingIds];
    let totalPaise = 0;

    for (const input of sanitizedInputs) {
      const dbBook = dbBooksMap.get(input.bookId);
      if (!dbBook) continue;

      const edition = dbBook.current_edition;
      const pricing = pricingMap.get(edition.id);
      const isDownload = input.plan === 'read_download';

      const authoritativePricePaise = isDownload
        ? (pricing?.download_price_paise ?? edition.price_read_download_paise ?? 0)
        : (pricing?.online_price_paise ?? edition.price_read_online_paise ?? 0);

      const originalPricePaise = isDownload
        ? (pricing?.download_original_price_paise ?? authoritativePricePaise)
        : (pricing?.online_original_price_paise ?? authoritativePricePaise);

      const discountType = isDownload
        ? (pricing?.download_discount_type ?? 'none')
        : (pricing?.online_discount_type ?? 'none');

      const discountValue = isDownload
        ? (pricing?.download_discount_value ?? 0)
        : (pricing?.online_discount_value ?? 0);

      // Check if plan was unsupported
      if (unsupportedPlanBookIds.has(dbBook.id)) {
        warnings.push(`An unsupported access plan was selected for "${dbBook.title}". It has been set to Read Online.`);
      }

      // Check if browser sent a different price (ignoring client price and informing customer)
      if (input.clientPricePaise !== undefined && input.clientPricePaise !== authoritativePricePaise) {
        warnings.push(`The price for "${dbBook.title}" has updated to ₹${(authoritativePricePaise / 100).toFixed(0)}.`);
      }

      // Ownership evaluation for authenticated customers
      const existingEnt = userEntitlements.find(e => e.ebook_id === dbBook.id);
      let ownershipStatus = 'eligible_new_purchase';

      if (existingEnt) {
        if (existingEnt.edition_id === edition.id) {
          if (existingEnt.plan === 'read_download') {
            ownershipStatus = 'already_owned_complete';
            warnings.push(`You already own complete access (Read + Download) for "${dbBook.title}".`);
          } else if (existingEnt.plan === 'read_online') {
            if (isDownload) {
              ownershipStatus = 'eligible_upgrade';
              const upgradePricePaise = pricing?.upgrade_price_paise ?? edition.price_upgrade_pdf_paise ?? 5000;
              warnings.push(`You own Read Online for "${dbBook.title}". You are eligible for a ₹${(upgradePricePaise / 100).toFixed(0)} upgrade to Read + Download.`);
            } else {
              ownershipStatus = 'already_owned_online';
              warnings.push(`You already own Read Online access for "${dbBook.title}".`);
            }
          }
        } else {
          ownershipStatus = 'new_edition_available';
        }
      }

      totalPaise += authoritativePricePaise;

      validatedItems.push({
        book_id: dbBook.id,
        edition_id: edition.id,
        slug: dbBook.slug,
        title: dbBook.title,
        author: dbBook.author,
        cover_image_url: dbBook.cover_image_url,
        plan: input.plan,
        plan_label: isDownload ? 'Read + Download (PDF)' : 'Read Online',
        price_paise: authoritativePricePaise,
        original_price_paise: originalPricePaise,
        discount_type: discountType,
        discount_value: discountValue,
        has_discount: discountType !== 'none',
        formatted_price: `₹${(authoritativePricePaise / 100).toFixed(0)}`,
        formatted_original_price: `₹${(originalPricePaise / 100).toFixed(0)}`,
        currency: edition.currency || 'INR',
        edition_number: edition.edition_number,
        version_name: edition.version_name,
        ownership_status: ownershipStatus,
      });
    }

    return NextResponse.json({
      success: true,
      items: validatedItems,
      total_paise: totalPaise,
      formatted_total: `₹${(totalPaise / 100).toFixed(0)}`,
      item_count: validatedItems.length,
      warnings,
      unavailable_book_ids: unavailableBookIds,
    });
  } catch (err: any) {
    console.error('Unhandled error in cart validation:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
