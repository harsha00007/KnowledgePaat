import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { resolvePurchasedEdition } from '@/lib/ebook/reader';
import { createClient } from '@/utils/supabase/server';
import { BookOpen, AlertCircle, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/Button';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ editionId?: string }>;
}

export default async function ReadEntryPage({ params, searchParams }: PageProps) {
  const { bookId } = await params;
  const { editionId } = await searchParams;

  // 1. Check verified customer
  const authResult = await getVerifiedCustomer();
  if (!authResult.success) {
    if (authResult.status === 401) {
      redirect(`/login?redirectTo=/read/${bookId}`);
    }
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-ebook">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#0B1D3A] mb-2">Email Verification Required</h1>
          <p className="text-sm text-slate-600 mb-6">{authResult.message}</p>
          <Link href="/student/profile">
            <Button variant="primary">Verify Account</Button>
          </Link>
        </div>
      </div>
    );
  }

  const customer = authResult.customer;

  // 2. Resolve purchased edition
  const resolution = await resolvePurchasedEdition(customer.userId, bookId, editionId);

  if (!resolution.authorized || !resolution.edition || !resolution.book) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-ebook">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#0B1D3A] mb-2">Reading Access Required</h1>
          <p className="text-sm text-slate-600 mb-6">
            {resolution.reason || 'You do not own an active online reading license for this book.'}
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`/e-books/${bookId}`}>
              <Button variant="primary" className="w-full">
                <ShoppingBag className="w-4 h-4 mr-2" />
                View in Bookstore
              </Button>
            </Link>
            <Link href="/my-books">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to My Books
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  // 3. Check reading progress for last read chapter
  const { data: progress } = await supabase
    .from('ebook_reading_progress')
    .select('last_chapter_id')
    .eq('customer_id', customer.userId)
    .eq('edition_id', resolution.edition.id)
    .maybeSingle();

  let targetChapterId = progress?.last_chapter_id;

  // Verify target chapter exists
  if (targetChapterId) {
    const { data: validChapter } = await supabase
      .from('ebook_chapters')
      .select('id')
      .eq('id', targetChapterId)
      .eq('edition_id', resolution.edition.id)
      .eq('status', 'ready')
      .maybeSingle();

    if (!validChapter) targetChapterId = null;
  }

  // If no previous chapter, grab the first chapter
  if (!targetChapterId) {
    const { data: firstChapter } = await supabase
      .from('ebook_chapters')
      .select('id')
      .eq('edition_id', resolution.edition.id)
      .eq('status', 'ready')
      .order('chapter_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    targetChapterId = firstChapter?.id || null;
  }

  if (!targetChapterId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-ebook">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#0B1D3A] mb-2">Chapters Being Formatted</h1>
          <p className="text-sm text-slate-600 mb-6">
            The chapters for this edition ({resolution.edition.versionName}) are currently being finalized.
          </p>
          <Link href="/my-books">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to My Books
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Redirect to the resolved chapter
  redirect(`/read/${resolution.book.slug || resolution.book.id}/${targetChapterId}`);
}
