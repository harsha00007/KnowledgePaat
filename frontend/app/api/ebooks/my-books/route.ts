import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { getCustomerOwnedBooks } from '@/lib/ebook/entitlements';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await getVerifiedCustomer();

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.message,
          code: authResult.code,
        },
        {
          status: authResult.status,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const plan = searchParams.get('plan')?.trim() || '';
    const hasPaginationParam = searchParams.has('page') || searchParams.has('limit');

    const ownedBooks = await getCustomerOwnedBooks(authResult.customer.userId);

    // Server-side filtering
    let filtered = ownedBooks;
    if (plan && plan !== 'all') {
      filtered = filtered.filter(b => b.plan === plan);
    }
    if (search) {
      filtered = filtered.filter(b => 
        (b.title && b.title.toLowerCase().includes(search)) ||
        (b.author && b.author.toLowerCase().includes(search)) ||
        (b.category && b.category.toLowerCase().includes(search)) ||
        (b.description && b.description.toLowerCase().includes(search))
      );
    }

    // Stable deterministic sorting: purchasedAt DESC, then bookId ASC
    filtered.sort((a, b) => {
      const timeA = new Date(a.purchasedAt || 0).getTime();
      const timeB = new Date(b.purchasedAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return String(a.bookId).localeCompare(String(b.bookId));
    });

    const total = filtered.length;

    if (hasPaginationParam) {
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10) || 12));
      const totalPages = Math.ceil(total / limit) || 1;
      const offset = (page - 1) * limit;
      const paginatedBooks = filtered.slice(offset, offset + limit);

      return NextResponse.json(
        {
          success: true,
          customer: {
            id: authResult.customer.userId,
            email: authResult.customer.email,
            fullName: authResult.customer.fullName,
          },
          books: paginatedBooks,
          count: paginatedBooks.length,
          all_books_count: ownedBooks.length,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
          },
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        customer: {
          id: authResult.customer.userId,
          email: authResult.customer.email,
          fullName: authResult.customer.fullName,
        },
        books: filtered,
        count: filtered.length,
        all_books_count: ownedBooks.length,
        pagination: {
          page: 1,
          limit: filtered.length || 1,
          total,
          totalPages: 1,
          hasMore: false,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (err: any) {
    console.error('Error in GET /api/ebooks/my-books:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error fetching library.' },
      { status: 500 }
    );
  }
}
