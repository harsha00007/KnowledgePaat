import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitResponse, getRealClientIp, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // 60s cache revalidation

export async function GET(req: NextRequest) {
  try {
    const clientIp = getRealClientIp(req);
    const rl = await checkRateLimit(`catalogue_search:${clientIp}`, RATE_LIMIT_POLICIES.CATALOGUE_SEARCH);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';
    const readerRole = searchParams.get('reader_role')?.trim() || '';

    // Bounded pagination: 1-indexed page, max 50 items per page
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10) || 12));
    const offset = (page - 1) * limit;

    // Deterministic query on published books only
    // Exposing deliberately public columns ONLY
    let query = supabase
      .from('ebooks')
      .select(`
        id,
        slug,
        title,
        subtitle,
        author,
        description,
        category,
        reader_role,
        language,
        cover_image_url,
        status,
        created_at,
        updated_at,
        editions:ebook_editions!inner (
          id,
          edition_number,
          version_name,
          status,
          is_current_edition,
          page_count,
          price_read_online_paise,
          price_read_download_paise,
          price_upgrade_pdf_paise,
          currency,
          published_at,
          chapters:ebook_chapters (
            id,
            is_free_sample,
            status
          )
        )
      `, { count: 'exact' })
      .eq('status', 'published')
      .eq('editions.status', 'published')
      .eq('editions.is_current_edition', true)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true });

    if (category && category !== 'all' && category !== 'All') {
      query = query.eq('category', category);
    }

    if (readerRole && readerRole !== 'all' && readerRole !== 'All') {
      query = query.ilike('reader_role', `%${readerRole}%`);
    }

    if (search) {
      // Safe parameterized search matching title, author, description, or slug
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,slug.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: booksData, count, error } = await query;

    if (error) {
      if (error.code === 'PGRST103' || String(error.message || '').toLowerCase().includes('range')) {
        // Out-of-range page requested: get total count and return empty page
        const { count: exactTotal } = await supabase
          .from('ebooks')
          .select('id, editions:ebook_editions!inner(id)', { count: 'exact', head: true })
          .eq('status', 'published')
          .eq('editions.status', 'published')
          .eq('editions.is_current_edition', true);

        const total = exactTotal || 0;
        const totalPages = Math.ceil(total / limit) || 1;

        return NextResponse.json({
          success: true,
          books: [],
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: false,
          }
        });
      }

      console.error('Error fetching public ebooks catalog:', error);
      return NextResponse.json({ success: false, error: 'Failed to load bookstore catalog.' }, { status: 500 });
    }

    // Collect edition IDs for batch authoritative pricing lookup
    const editionIds: string[] = [];
    for (const b of (booksData || [])) {
      const editions = b.editions || [];
      const current = editions.find((e: any) => e.is_current_edition) || editions[0];
      if (current?.id) editionIds.push(current.id);
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

    // Transform and sanitize: never expose private storage paths or unapproved fields
    const sanitizedBooks = (booksData || []).map((b: any) => {
      const editions = b.editions || [];
      const current = editions.find((e: any) => e.is_current_edition) || editions[0] || null;
      const pricing = current ? pricingMap.get(current.id) : null;

      const chapters = current?.chapters || [];
      const readyChapters = chapters.filter((c: any) => c.status === 'ready');
      const freeSampleChapters = readyChapters.filter((c: any) => c.is_free_sample);

      const onlineSellingPrice = pricing?.online_price_paise ?? current?.price_read_online_paise ?? 0;
      const downloadSellingPrice = pricing?.download_price_paise ?? current?.price_read_download_paise ?? 0;

      const minPricePaise = current
        ? Math.min(onlineSellingPrice, downloadSellingPrice)
        : 0;

      return {
        id: b.id,
        slug: b.slug,
        title: b.title,
        subtitle: b.subtitle,
        author: b.author,
        description: b.description,
        category: b.category,
        reader_role: b.reader_role,
        language: b.language,
        cover_image_url: b.cover_image_url,
        current_edition: current ? {
          id: current.id,
          edition_number: current.edition_number,
          version_name: current.version_name,
          page_count: current.page_count,
          price_read_online_paise: onlineSellingPrice,
          price_read_download_paise: downloadSellingPrice,
          currency: current.currency || 'INR',
          published_at: current.published_at,
          pricing: pricing ? {
            online_original_price_paise: pricing.online_original_price_paise,
            online_discount_type: pricing.online_discount_type,
            online_discount_value: pricing.online_discount_value,
            online_price_paise: pricing.online_price_paise,
            download_original_price_paise: pricing.download_original_price_paise,
            download_discount_type: pricing.download_discount_type,
            download_discount_value: pricing.download_discount_value,
            download_price_paise: pricing.download_price_paise,
            upgrade_original_price_paise: pricing.upgrade_original_price_paise,
            upgrade_discount_type: pricing.upgrade_discount_type,
            upgrade_discount_value: pricing.upgrade_discount_value,
            upgrade_price_paise: pricing.upgrade_price_paise,
          } : null,
        } : null,
        min_price_paise: minPricePaise,
        has_discount: Boolean(
          pricing && (pricing.online_discount_type !== 'none' || pricing.download_discount_type !== 'none')
        ),
        has_free_sample: freeSampleChapters.length > 0,
        sample_chapter_count: freeSampleChapters.length,
        total_chapter_count: readyChapters.length,
      };
    });

    const total = count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      books: sanitizedBooks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (err: any) {
    console.error('Unhandled error in public ebooks GET:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
