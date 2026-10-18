"use client";

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, X, BookOpen, Sparkles, Filter, RefreshCw, ShoppingCart, ChevronRight } from 'lucide-react';
import { BookCard, BookCardData } from '@/components/ebook/BookCard';
import { FreeSampleDrawer } from '@/components/ebook/FreeSampleDrawer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/Button';
import { useEBookCart } from '@/lib/ebook/cartContext';

const CATEGORIES = [
  'All',
  'Engineering',
  'System Design',
  'Career Prep',
  'Quality Assurance',
  'DevOps & Cloud',
  'Frontend & Mobile',
];

export function BookstoreClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Search and Filter states derived from URL
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'All';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  const [books, setBooks] = useState<BookCardData[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Free Sample Drawer State
  const [sampleDrawerBook, setSampleDrawerBook] = useState<BookCardData | null>(null);
  const [sampleDrawerOpen, setSampleDrawerOpen] = useState(false);
  const [initialChapterId, setInitialChapterId] = useState<string | null>(null);

  const { addToCart } = useEBookCart();

  // URL sync helper
  const updateUrl = useCallback((newSearch: string, newCat: string) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set('search', newSearch.trim());
    if (newCat && newCat !== 'All') params.set('category', newCat);

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }, [pathname, router]);

  // Fetch published books from public catalogue API
  const fetchBooks = useCallback(async (pageToLoad: number, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams();
      if (searchInput.trim()) params.set('search', searchInput.trim());
      if (activeCategory && activeCategory !== 'All') params.set('category', activeCategory);
      params.set('page', String(pageToLoad));
      params.set('limit', '12');

      const res = await fetch(`/api/ebooks?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch published books.');
      }

      setBooks(prev => append ? [...prev, ...(data.books || [])] : (data.books || []));
      setPagination(data.pagination || {
        page: pageToLoad,
        limit: 12,
        total: 0,
        totalPages: 1,
        hasMore: false,
      });
    } catch (err: any) {
      console.error('Error loading bookstore:', err);
      setError(err.message || 'Unable to connect to bookstore service.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [searchInput, activeCategory]);

  // Initial and reactive fetch on category/search change
  useEffect(() => {
    fetchBooks(1, false);
  }, [fetchBooks]);

  // Handle Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl(searchInput, activeCategory);
    fetchBooks(1, false);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    updateUrl('', activeCategory);
  };

  const handleCategorySelect = (cat: string) => {
    setActiveCategory(cat);
    updateUrl(searchInput, cat);
  };

  const handleOpenSample = async (book: BookCardData) => {
    setSampleDrawerBook(book);
    setInitialChapterId(null);
    setSampleDrawerOpen(true);

    // Fetch book details to grab first sample chapter ID
    try {
      const res = await fetch(`/api/ebooks/${encodeURIComponent(book.slug || book.id)}`);
      const data = await res.json();
      if (data.success && data.first_sample_chapter_id) {
        setInitialChapterId(data.first_sample_chapter_id);
      }
    } catch (err) {
      console.error('Could not prefetch first sample chapter ID:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* ── HERO BANNER ────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white via-slate-50 to-slate-100/60 border-b border-slate-200/80 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#2563EB] border border-blue-200/80 mb-4 uppercase tracking-wider font-display">
              <BookOpen className="w-3.5 h-3.5" />
              <span>KnowledgePaat Public Bookstore</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B1D3A] tracking-tight font-display leading-tight">
              Master Practical Engineering & System Design
            </h1>
            <p className="mt-3.5 text-base sm:text-lg text-slate-600 leading-relaxed font-sans">
              Comprehensive technical guides written for engineering students and working professionals.
              Read approved free samples online without registration, or unlock full lifetime access from just ₹49.
            </p>
          </div>
        </div>
      </section>

      {/* ── TOOLBAR: SEARCH & CATEGORY FILTERS ────────────────────── */}
      <section className="sticky top-14 sm:top-18 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-3.5">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center max-w-xl">
            <Search className="absolute left-3.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, author, keyword, or topic..."
              className="w-full pl-10 pr-20 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-[#0B1D3A] placeholder-slate-400 focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-12 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Category filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 font-display">
              <Filter className="w-3 h-3" /> Categories:
            </span>
            <div className="flex gap-1.5 shrink-0">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap font-display ${
                      isActive
                        ? 'bg-[#0B1D3A] text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CATALOG CONTENT ────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        {/* Results Header */}
        {!isLoading && !error && (
          <div className="flex items-center justify-between pb-6">
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Showing <span className="font-bold text-[#0B1D3A]">{books.length}</span> of{' '}
              <span className="font-bold text-[#0B1D3A]">{pagination.total}</span> published books
              {activeCategory !== 'All' && <span> in <strong className="text-[#2563EB]">{activeCategory}</strong></span>}
            </p>
          </div>
        )}

        {/* Loading State: Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row gap-6 animate-pulse"
              >
                <div className="sm:w-48 aspect-[3/4] bg-slate-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/4" />
                  <div className="h-12 bg-slate-100 rounded w-full mt-4" />
                  <div className="h-8 bg-slate-200 rounded w-1/2 mt-6" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="max-w-md mx-auto my-12">
            <ErrorState
              title="Catalog Unavailable"
              message={error}
              onRetry={() => fetchBooks(1, false)}
            />
          </div>
        ) : books.length === 0 ? (
          /* Empty State */
          <div className="my-12">
            <EmptyState
              icon={<BookOpen className="w-6 h-6" />}
              title="No published eBooks found"
              description={
                searchInput || activeCategory !== 'All'
                  ? 'No published eBooks matched your search criteria. Try modifying your search term or exploring all categories.'
                  : 'Our editorial team is currently preparing new technical publications. Please check back shortly.'
              }
              action={
                (searchInput || activeCategory !== 'All') ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchInput('');
                      setActiveCategory('All');
                      updateUrl('', 'All');
                    }}
                  >
                    Reset All Filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          /* EXACTLY TWO CARDS PER ROW ON DESKTOP, ONE ON MOBILE */
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onOpenSample={handleOpenSample}
                />
              ))}
            </div>

            {/* Pagination / Load More */}
            {pagination.hasMore && (
              <div className="flex justify-center pt-8">
                <Button
                  variant="outline"
                  size="md"
                  isLoading={isLoadingMore}
                  onClick={() => fetchBooks(pagination.page + 1, true)}
                  className="px-8 font-semibold shadow-2xs hover:border-[#2563EB]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Load More Books ({pagination.total - books.length} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Free Sample Reader Drawer */}
      {sampleDrawerBook && (
        <FreeSampleDrawer
          isOpen={sampleDrawerOpen}
          onClose={() => setSampleDrawerOpen(false)}
          bookId={sampleDrawerBook.slug || sampleDrawerBook.id}
          initialChapterId={initialChapterId}
          bookTitle={sampleDrawerBook.title}
          onSelectPlan={async (plan) => {
            await addToCart(sampleDrawerBook.id, plan);
            router.push('/cart');
          }}
        />
      )}
    </div>
  );
}
