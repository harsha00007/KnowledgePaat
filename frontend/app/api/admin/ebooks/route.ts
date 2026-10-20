import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { validateBookPayload, validateEditionPrices } from '@/lib/ebook/validation';
import { logAdminAuditEvent } from '@/lib/ebook/audit';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req, 'list');
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';

    const hasPagination = searchParams.has('page') || searchParams.has('limit');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;

    let query = auth.supabase
      .from('ebooks')
      .select(`
        *,
        editions:ebook_editions (
          id,
          edition_number,
          version_name,
          status,
          is_current_edition,
          price_read_online_paise,
          price_read_download_paise,
          price_upgrade_pdf_paise,
          page_count,
          pdf_storage_path,
          chapters:ebook_chapters (count)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: true });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    if (hasPagination) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: books, count, error } = await query;

    if (error) {
      if (error.code === 'PGRST103' || String(error.message || '').toLowerCase().includes('range')) {
        const { count: exactTotal } = await auth.supabase
          .from('ebooks')
          .select('id', { count: 'exact', head: true });
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
      console.error('Error fetching admin ebooks:', error);
      return NextResponse.json({ error: 'Failed to fetch eBooks.' }, { status: 500 });
    }

    // Attach current edition summary to each book for convenience
    const enrichedBooks = (books || []).map((b: any) => {
      const editions = b.editions || [];
      const current = editions.find((e: any) => e.is_current_edition) || editions[0] || null;
      return {
        ...b,
        current_edition: current
      };
    });

    const total = count ?? enrichedBooks.length;
    const totalPages = hasPagination ? (Math.ceil(total / limit) || 1) : 1;

    return NextResponse.json({
      success: true,
      books: enrichedBooks,
      pagination: {
        page: hasPagination ? page : 1,
        limit: hasPagination ? limit : total,
        total,
        totalPages,
        hasMore: hasPagination ? (page < totalPages) : false,
      }
    });
  } catch (err: any) {
    console.error('Unhandled error in admin ebooks GET:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req, 'create');
    if (!auth.authorized) return auth.response!;

    const rl = await checkRateLimit(
      `admin_book_create:${auth.user.id}`,
      RATE_LIMIT_POLICIES.ADMIN_SETTINGS
    );
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateBookPayload(body);

    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const bookData = validation.data!;

    // Check slug uniqueness
    const { data: existingSlug } = await auth.supabase
      .from('ebooks')
      .select('id')
      .eq('slug', bookData.slug)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json({ error: `The slug "${bookData.slug}" is already taken. Please choose another.` }, { status: 400 });
    }

    // Validate prices for initial edition
    const priceValidation = validateEditionPrices(body);
    const prices = priceValidation.data!;

    // 1. Create Book
    const { data: createdBook, error: bookErr } = await auth.supabase
      .from('ebooks')
      .insert({
        ...bookData,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (bookErr || !createdBook) {
      console.error('Error creating book:', bookErr);
      return NextResponse.json({ error: bookErr?.message || 'Failed to create eBook.' }, { status: 500 });
    }

    // 2. Automatically create Edition 1
    const { data: createdEdition, error: edErr } = await auth.supabase
      .from('ebook_editions')
      .insert({
        ebook_id: createdBook.id,
        edition_number: 1,
        version_name: 'First Edition',
        status: 'draft',
        is_current_edition: true,
        price_read_online_paise: prices.price_read_online_paise,
        price_read_download_paise: prices.price_read_download_paise,
        price_upgrade_pdf_paise: prices.price_upgrade_pdf_paise,
        currency: 'INR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (edErr) {
      console.warn('Non-fatal: Edition 1 creation failed:', edErr);
    } else if (createdEdition) {
      // Authoritatively provision initial pricing record in ebook_pricing
      const { error: pricingErr } = await auth.supabase
        .from('ebook_pricing')
        .insert({
          edition_id: createdEdition.id,
          online_original_price_paise: prices.price_read_online_paise,
          online_discount_type: 'none',
          online_discount_value: 0,
          online_price_paise: prices.price_read_online_paise,
          download_original_price_paise: prices.price_read_download_paise,
          download_discount_type: 'none',
          download_discount_value: 0,
          download_price_paise: prices.price_read_download_paise,
          upgrade_original_price_paise: prices.price_upgrade_pdf_paise,
          upgrade_discount_type: 'none',
          upgrade_discount_value: 0,
          upgrade_price_paise: prices.price_upgrade_pdf_paise,
          currency: 'INR',
          pricing_version: 1,
          change_reason: 'Initial edition creation pricing',
          updated_by: auth.user.id,
        });

      if (pricingErr) {
        console.warn('Non-fatal: Initial edition pricing creation failed:', pricingErr);
      }
    }

    // 3. Log Audit Event
    await logAdminAuditEvent(auth.supabase, {
      actorId: auth.user.id,
      action: 'book_created',
      entityType: 'ebook',
      entityId: createdBook.id,
      metadata: {
        title: createdBook.title,
        slug: createdBook.slug,
        editionId: createdEdition?.id
      }
    });

    return NextResponse.json({
      success: true,
      book: {
        ...createdBook,
        current_edition: createdEdition || null
      }
    });
  } catch (err: any) {
    console.error('Unhandled error in admin ebooks POST:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
