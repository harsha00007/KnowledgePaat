import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { UUID_REGEX } from '@/lib/ebook/validation';
import { getAuthoritativeEditionPricing } from '@/lib/ebook/pricing';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    if (!bookId) {
      return NextResponse.json({ success: false, error: 'Book identifier is required.' }, { status: 400 });
    }

    const supabase = await createClient();
    const isUuid = UUID_REGEX.test(bookId);

    // 1. Fetch book record (strictly published status)
    let bookQuery = supabase
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
        updated_at
      `)
      .eq('status', 'published');

    if (isUuid) {
      bookQuery = bookQuery.eq('id', bookId);
    } else {
      bookQuery = bookQuery.eq('slug', bookId.toLowerCase().trim());
    }

    const { data: book, error: bookError } = await bookQuery.maybeSingle();

    if (bookError || !book) {
      // Return uniform 404 for missing or draft/archived books
      return NextResponse.json({
        success: false,
        error: 'The requested eBook is currently unavailable or does not exist.'
      }, { status: 404 });
    }

    // 2. Fetch published current edition
    // Deliberately omit pdf_storage_path and private credentials
    const { data: edition, error: editionError } = await supabase
      .from('ebook_editions')
      .select(`
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
        created_at
      `)
      .eq('ebook_id', book.id)
      .eq('status', 'published')
      .eq('is_current_edition', true)
      .maybeSingle();

    if (editionError || !edition) {
      return NextResponse.json({
        success: false,
        error: 'The published edition for this eBook is currently unavailable.'
      }, { status: 404 });
    }

    // Fetch authoritative commercial pricing
    const authoritativePricing = await getAuthoritativeEditionPricing(edition.id, supabase);

    // 3. Fetch table of contents (chapter metadata ONLY)
    // CRITICAL SECURITY INVARIANT: NEVER query or return `content_body` here.
    const { data: chapters, error: chaptersError } = await supabase
      .from('ebook_chapters')
      .select(`
        id,
        chapter_index,
        title,
        slug,
        word_count,
        is_free_sample
      `)
      .eq('edition_id', edition.id)
      .eq('status', 'ready')
      .order('chapter_index', { ascending: true });

    if (chaptersError) {
      console.error('Error fetching table of contents:', chaptersError);
    }

    const tableOfContents = (chapters || []).map((ch: any) => ({
      id: ch.id,
      chapter_index: ch.chapter_index,
      title: ch.title,
      slug: ch.slug,
      word_count: ch.word_count || 0,
      is_free_sample: Boolean(ch.is_free_sample),
    }));

    const sampleChapters = tableOfContents.filter((ch: any) => ch.is_free_sample);
    const hasFreeSample = sampleChapters.length > 0;
    const firstSampleChapterId = hasFreeSample ? sampleChapters[0].id : null;

    const onlinePrice = authoritativePricing?.online_price_paise ?? edition.price_read_online_paise ?? 0;
    const downloadPrice = authoritativePricing?.download_price_paise ?? edition.price_read_download_paise ?? 0;
    const upgradePrice = authoritativePricing?.upgrade_price_paise ?? edition.price_upgrade_pdf_paise ?? 0;

    return NextResponse.json({
      success: true,
      book: {
        id: book.id,
        slug: book.slug,
        title: book.title,
        subtitle: book.subtitle,
        author: book.author,
        description: book.description,
        category: book.category,
        reader_role: book.reader_role,
        language: book.language,
        cover_image_url: book.cover_image_url,
        updated_at: book.updated_at,
      },
      current_edition: {
        id: edition.id,
        edition_number: edition.edition_number,
        version_name: edition.version_name,
        page_count: edition.page_count,
        price_read_online_paise: onlinePrice,
        price_read_download_paise: downloadPrice,
        price_upgrade_pdf_paise: upgradePrice,
        currency: edition.currency || 'INR',
        published_at: edition.published_at,
        pricing: authoritativePricing ? {
          online_original_price_paise: authoritativePricing.online_original_price_paise,
          online_discount_type: authoritativePricing.online_discount_type,
          online_discount_value: authoritativePricing.online_discount_value,
          online_price_paise: authoritativePricing.online_price_paise,
          download_original_price_paise: authoritativePricing.download_original_price_paise,
          download_discount_type: authoritativePricing.download_discount_type,
          download_discount_value: authoritativePricing.download_discount_value,
          download_price_paise: authoritativePricing.download_price_paise,
          upgrade_original_price_paise: authoritativePricing.upgrade_original_price_paise,
          upgrade_discount_type: authoritativePricing.upgrade_discount_type,
          upgrade_discount_value: authoritativePricing.upgrade_discount_value,
          upgrade_price_paise: authoritativePricing.upgrade_price_paise,
        } : null,
      },
      table_of_contents: tableOfContents,
      has_free_sample: hasFreeSample,
      first_sample_chapter_id: firstSampleChapterId,
      sample_chapter_count: sampleChapters.length,
      total_chapter_count: tableOfContents.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (err: any) {
    console.error('Unhandled error in public ebook detail GET:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
