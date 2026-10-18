import { NextResponse } from 'next/server';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { getCustomerOwnedBooks } from '@/lib/ebook/entitlements';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    const ownedBooks = await getCustomerOwnedBooks(authResult.customer.userId);

    return NextResponse.json(
      {
        success: true,
        customer: {
          id: authResult.customer.userId,
          email: authResult.customer.email,
          fullName: authResult.customer.fullName,
        },
        books: ownedBooks,
        count: ownedBooks.length,
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
