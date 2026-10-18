import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { getAuthoritativeEditionPricing } from '@/lib/ebook/pricing';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isPreview = searchParams.get('preview') === 'true';

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Draft isolation: only verified admins can view draft preview
    let targetStatus: 'draft' | 'published' = 'published';
    if (isPreview) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: isAdmin } = await supabase.rpc('is_admin');
        if (isAdmin) {
          targetStatus = 'draft';
        }
      }
    }

    // 1. Fetch homepage configuration for target status
    const { data: content, error: contentErr } = await adminClient
      .from('ebook_homepage_content')
      .select('*')
      .eq('status', targetStatus)
      .maybeSingle();

    if (contentErr || !content) {
      // Fallback to published if draft was requested but missing
      const { data: fallbackPublished } = await adminClient
        .from('ebook_homepage_content')
        .select('*')
        .eq('status', 'published')
        .maybeSingle();

      if (!fallbackPublished) {
        return NextResponse.json({ success: false, error: 'Homepage content is currently unavailable.' }, { status: 404 });
      }
    }

    const activeConfig = content || {};
    const featuredBookIds = Array.isArray(activeConfig.featured_book_ids) ? activeConfig.featured_book_ids : [];
    const highlightedBookId = activeConfig.highlighted_book_id || null;

    // Collect all relevant book IDs to query
    const targetBookIds = Array.from(new Set([...featuredBookIds, ...(highlightedBookId ? [highlightedBookId] : [])]));

    let booksMap = new Map<string, any>();
    let pricingMap = new Map<string, any>();

    if (targetBookIds.length > 0) {
      // 2. Fetch published books from catalog ONLY (filtering out draft/archived books)
      const { data: booksData } = await adminClient
        .from('ebooks')
        .select(`
          id,
          slug,
          title,
          subtitle,
          author,
          category,
          reader_role,
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
        .in('id', targetBookIds)
        .eq('status', 'published')
        .eq('editions.status', 'published')
        .eq('editions.is_current_edition', true);

      const editionIds: string[] = [];
      for (const b of (booksData || [])) {
        const currentEdition = b.editions?.[0] || null;
        if (currentEdition) {
          booksMap.set(b.id, {
            ...b,
            current_edition: currentEdition
          });
          if (currentEdition.id) editionIds.push(currentEdition.id);
        }
      }

      // 3. Resolve authoritative pricing dynamically (never duplicating or hardcoding prices)
      if (editionIds.length > 0) {
        const { data: pricingRows } = await adminClient
          .from('ebook_pricing')
          .select('*')
          .in('edition_id', editionIds);

        for (const pr of (pricingRows || [])) {
          pricingMap.set(pr.edition_id, pr);
        }
      }
    }

    // Assemble featured books in exact ordered sequence, filtering out any unpublished/missing books
    const resolvedFeaturedBooks = featuredBookIds
      .map((id: string) => booksMap.get(id))
      .filter(Boolean)
      .map((b: any) => {
        const edition = b.current_edition;
        const pricing = pricingMap.get(edition.id);

        const onlineSellingPrice = pricing?.online_price_paise ?? edition.price_read_online_paise ?? 0;
        const downloadSellingPrice = pricing?.download_price_paise ?? edition.price_read_download_paise ?? 0;

        return {
          id: b.id,
          slug: b.slug,
          title: b.title,
          subtitle: b.subtitle,
          author: b.author,
          category: b.category,
          reader_role: b.reader_role,
          cover_image_url: b.cover_image_url,
          edition_number: edition.edition_number,
          version_name: edition.version_name,
          pricing: {
            online_original_price_paise: pricing?.online_original_price_paise ?? onlineSellingPrice,
            online_price_paise: onlineSellingPrice,
            online_discount_type: pricing?.online_discount_type ?? 'none',
            online_discount_value: pricing?.online_discount_value ?? 0,
            download_original_price_paise: pricing?.download_original_price_paise ?? downloadSellingPrice,
            download_price_paise: downloadSellingPrice,
            download_discount_type: pricing?.download_discount_type ?? 'none',
            download_discount_value: pricing?.download_discount_value ?? 0,
            currency: edition.currency || 'INR',
          },
          has_discount: Boolean(pricing && (pricing.online_discount_type !== 'none' || pricing.download_discount_type !== 'none')),
          min_price_paise: Math.min(onlineSellingPrice, downloadSellingPrice),
        };
      });

    // Assemble highlighted book if published
    const highlightedDbBook = highlightedBookId ? booksMap.get(highlightedBookId) : null;
    let resolvedHighlightedBook: any = null;
    if (highlightedDbBook) {
      const edition = highlightedDbBook.current_edition;
      const pricing = pricingMap.get(edition.id);
      const onlineSellingPrice = pricing?.online_price_paise ?? edition.price_read_online_paise ?? 0;
      const downloadSellingPrice = pricing?.download_price_paise ?? edition.price_read_download_paise ?? 0;

      resolvedHighlightedBook = {
        id: highlightedDbBook.id,
        slug: highlightedDbBook.slug,
        title: highlightedDbBook.title,
        subtitle: highlightedDbBook.subtitle,
        author: highlightedDbBook.author,
        category: highlightedDbBook.category,
        reader_role: highlightedDbBook.reader_role,
        cover_image_url: highlightedDbBook.cover_image_url,
        edition_number: edition.edition_number,
        version_name: edition.version_name,
        pricing: {
          online_original_price_paise: pricing?.online_original_price_paise ?? onlineSellingPrice,
          online_price_paise: onlineSellingPrice,
          download_original_price_paise: pricing?.download_original_price_paise ?? downloadSellingPrice,
          download_price_paise: downloadSellingPrice,
          currency: edition.currency || 'INR',
        },
        min_price_paise: Math.min(onlineSellingPrice, downloadSellingPrice),
      };
    }

    return NextResponse.json({
      success: true,
      status: targetStatus,
      is_preview: targetStatus === 'draft',
      version: activeConfig.version || 1,
      published_at: activeConfig.published_at || null,
      hero: {
        eyebrow: activeConfig.hero_eyebrow,
        heading: activeConfig.hero_heading,
        highlighted_text: activeConfig.hero_highlighted_text,
        description: activeConfig.hero_description,
        artwork_url: activeConfig.hero_artwork_url || null,
        artwork_alt: activeConfig.hero_artwork_alt || 'KnowledgePaat eBook Library',
        primary_button: {
          label: activeConfig.primary_button_label,
          url: activeConfig.primary_button_url,
        },
        secondary_button: {
          label: activeConfig.secondary_button_label,
          url: activeConfig.secondary_button_url,
        },
      },
      featured_books: resolvedFeaturedBooks,
      highlighted_book: resolvedHighlightedBook,
      category_order: activeConfig.category_order,
      promotional_banner: activeConfig.promotional_banner,
      section_visibility: activeConfig.section_visibility,
      testimonials: activeConfig.testimonials,
    }, {
      headers: {
        'Cache-Control': targetStatus === 'draft' ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (err: any) {
    console.error('Error fetching public homepage content:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
