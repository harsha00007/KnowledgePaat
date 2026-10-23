"use client";

import React, { useState, useEffect, useCallback, useTransition, useMemo, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  X,
  BookOpen,
  Sparkles,
  Filter,
  ArrowUpDown,
  Quote,
} from 'lucide-react';
import { BookCard, BookCardData } from '@/components/ebook/BookCard';
import { MediaCard } from '@/components/ebook/MediaCard';
import { Pagination } from '@/components/ebook/Pagination';
import { FreeSampleDrawer } from '@/components/ebook/FreeSampleDrawer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useEBookCart } from '@/lib/ebook/cartContext';
import { DEFAULT_MEDIA_CARD, MediaCardConfig } from '@/types/ebook';

const DEFAULT_CATEGORIES = [
  'All',
  'Engineering',
  'System Design',
  'Career Prep',
  'Quality Assurance',
  'DevOps & Cloud',
  'Frontend & Mobile',
];

interface HomepageConfig {
  hero?: {
    eyebrow?: string;
    heading?: string;
    highlighted_text?: string;
    description?: string;
  };
  media_card?: MediaCardConfig;
  category_order?: string[];
  promotional_banner?: {
    text: string;
    link?: string;
    is_active: boolean;
  };
  testimonials?: Array<{
    id: string;
    quote: string;
    author: string;
    role?: string;
  }>;
}

export function BookstoreClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // URL state synchronization
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'All';
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const initialSort = searchParams.get('sort') || 'latest';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [sortBy, setSortBy] = useState(initialSort);

  // Homepage published configuration
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  // Catalogue books & pagination
  const [books, setBooks] = useState<BookCardData[]>([]);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User library entitlements for ownership-aware CTAs
  const [ownedBooksMap, setOwnedBooksMap] = useState<Map<string, { accessType: 'online' | 'full'; editionId?: string }>>(new Map());

  // Free Sample Drawer State
  const [sampleDrawerBook, setSampleDrawerBook] = useState<BookCardData | null>(null);
  const [sampleDrawerOpen, setSampleDrawerOpen] = useState(false);
  const [initialChapterId, setInitialChapterId] = useState<string | null>(null);

  const { addToCart } = useEBookCart();

  // Load published homepage configuration
  useEffect(() => {
    let isMounted = true;
    async function loadHomepageConfig() {
      try {
        const res = await fetch('/api/ebooks/homepage');
        const data = await res.json();
        if (isMounted && data.success) {
          setHomepageConfig(data);
        }
      } catch (err) {
        console.error('Failed to load homepage config:', err);
      } finally {
        if (isMounted) setIsConfigLoading(false);
      }
    }
    loadHomepageConfig();
    return () => { isMounted = false; };
  }, []);

  // Check user library ownership if authenticated
  useEffect(() => {
    let isMounted = true;
    async function loadUserOwnership() {
      try {
        const res = await fetch('/api/ebooks/my-books');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.books)) {
            const map = new Map<string, { accessType: 'online' | 'full'; editionId?: string }>();
            data.books.forEach((b: any) => {
              map.set(b.book_id || b.id, {
                accessType: b.access_plan === 'read_download' ? 'full' : 'online',
                editionId: b.edition_id,
              });
            });
            setOwnedBooksMap(map);
          }
        }
      } catch {
        // Unauthenticated or network error — fallback to unowned states
      }
    }
    loadUserOwnership();
    return () => { isMounted = false; };
  }, []);

  // Request ID ref to protect against stale out-of-order API responses
  const activeRequestIdRef = useRef(0);

  // Sync state to URL search parameters (push for intentional page/filter steps, replace for URL normalization)
  const updateUrl = useCallback((
    newSearch: string,
    newCat: string,
    newPage: number,
    newSort: string,
    mode: 'push' | 'replace' = 'push'
  ) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set('search', newSearch.trim());
    if (newCat && newCat !== 'All') params.set('category', newCat);
    if (newPage > 1) params.set('page', String(newPage));
    if (newSort && newSort !== 'latest') params.set('sort', newSort);

    const query = params.toString();
    const targetUrl = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      if (mode === 'push') {
        router.push(targetUrl, { scroll: false });
      } else {
        router.replace(targetUrl, { scroll: false });
      }
    });
  }, [pathname, router]);

  // Fetch catalogue books (server-side pagination: 10 books per page with stale response guard)
  const fetchBooks = useCallback(async (
    pageToLoad: number,
    catToLoad: string,
    searchToLoad: string,
    sortToLoad: string
  ) => {
    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchToLoad.trim()) params.set('search', searchToLoad.trim());
      if (catToLoad && catToLoad !== 'All') params.set('category', catToLoad);
      params.set('page', String(pageToLoad));
      params.set('limit', '10');
      if (sortToLoad) params.set('sort', sortToLoad);

      const res = await fetch(`/api/ebooks?${params.toString()}`);
      const data = await res.json();

      // Discard stale out-of-order response if another request was triggered
      if (requestId !== activeRequestIdRef.current) {
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch published books.');
      }

      setBooks(data.books || []);
      setPagination(data.pagination || {
        page: pageToLoad,
        limit: 10,
        total: 0,
        totalPages: 1,
        hasMore: false,
      });
    } catch (err: any) {
      if (requestId === activeRequestIdRef.current) {
        console.error('Error loading bookstore catalog:', err);
        setError(err.message || 'Unable to connect to bookstore service.');
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Synchronize state and trigger query whenever URL searchParams change
  // Ensures Browser Back, Browser Forward, Direct Links, and Refresh retain exact state
  useEffect(() => {
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const urlCat = searchParams.get('category') || 'All';
    const urlSearch = searchParams.get('search') || '';
    const urlSort = searchParams.get('sort') || 'latest';

    setCurrentPage(urlPage);
    setActiveCategory(urlCat);
    setSearchInput(urlSearch);
    setSortBy(urlSort);

    fetchBooks(urlPage, urlCat, urlSearch, urlSort);
  }, [searchParams, fetchBooks]);

  // Handle search submission (intentional search -> push to history)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl(searchInput, activeCategory, 1, sortBy, 'push');
  };

  // Handle clear search (inline reset -> replace URL)
  const handleClearSearch = () => {
    setSearchInput('');
    updateUrl('', activeCategory, 1, sortBy, 'replace');
  };

  // Handle category selection (intentional filter -> push to history)
  const handleCategorySelect = (cat: string) => {
    updateUrl(searchInput, cat, 1, sortBy, 'push');
  };

  // Handle sort change (intentional sort selection -> push to history)
  const handleSortChange = (newSort: string) => {
    updateUrl(searchInput, activeCategory, 1, newSort, 'push');
  };

  // Handle catalogue pagination (intentional page change -> push to history, Back navigates to page - 1)
  const handlePageChange = (newPage: number) => {
    updateUrl(searchInput, activeCategory, newPage, sortBy, 'push');

    // Smooth scroll to top of catalogue section
    const catalogueEl = document.getElementById('catalogue');
    if (catalogueEl) {
      catalogueEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenSample = async (book: BookCardData) => {
    setSampleDrawerBook(book);
    setInitialChapterId(null);
    setSampleDrawerOpen(true);

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

  // Categories list (custom order from config if specified)
  const categoriesList = useMemo(() => {
    if (homepageConfig?.category_order && homepageConfig.category_order.length > 0) {
      return ['All', ...homepageConfig.category_order.filter(c => c !== 'All')];
    }
    return DEFAULT_CATEGORIES;
  }, [homepageConfig?.category_order]);

  return (
    <div className="min-h-screen bg-[#F8F7FF] text-[#18143F] font-ebook selection:bg-[#6F42DD]/20 selection:text-[#18143F]">

      {/* ── PROMOTIONAL BANNER (If Active) ─────────────────────────── */}
      {homepageConfig?.promotional_banner?.is_active && (
        <aside
          aria-label="Promotional Announcement"
          className="bg-gradient-to-r from-[#FFCB35] via-[#F5A000] to-[#FFCB35] text-[#1D1855] py-2 px-4 text-center text-xs font-bold shadow-xs flex items-center justify-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span>{homepageConfig.promotional_banner.text}</span>
          {homepageConfig.promotional_banner.link && (
            <Link
              href={homepageConfig.promotional_banner.link}
              className="underline hover:opacity-80 transition-opacity ml-1"
            >
              Shop now →
            </Link>
          )}
        </aside>
      )}

      {/* ── ADMIN-MANAGED PROMOTIONAL MEDIA CARD ──────────────────────── */}
      <section className="pt-6 sm:pt-8 pb-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MediaCard config={homepageConfig?.media_card || DEFAULT_MEDIA_CARD} />
        </div>
      </section>

      {/* ── CATALOGUE: EXPLORE THE COLLECTION ──────────────────────────── */}
      <section id="catalogue" className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Section Header & Search / Sort Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6F42DD]/10 text-[#6F42DD] text-xs font-bold uppercase tracking-wider mb-2">
                <BookOpen className="w-3.5 h-3.5 text-[#6F42DD]" />
                <span>Technical Library</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#18143F] tracking-tight">
                Explore the collection
              </h1>
              <p className="text-xs sm:text-sm text-[#18143F]/70 mt-1">
                Practical guides for system design, distributed architectures, and professional engineering.
              </p>
            </div>

            {/* Search and Sort Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full sm:w-72">
                <Search className="absolute left-3 w-4 h-4 text-[#18143F]/40 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search titles, authors, topics..."
                  className="w-full pl-9 pr-16 py-2 rounded-xl border border-[#E8E5F5] bg-white text-xs font-medium text-[#18143F] placeholder-[#18143F]/40 focus:bg-white focus:border-[#6F42DD] focus:ring-2 focus:ring-[#6F42DD]/20 outline-none transition-all shadow-xs"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-12 text-[#18143F]/40 hover:text-[#18143F] p-1"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-1 px-2.5 py-1 rounded-lg bg-[#6F42DD] hover:bg-[#5b33be] text-white text-[11px] font-bold cursor-pointer transition-colors"
                >
                  Search
                </button>
              </form>

              {/* Sorting Dropdown */}
              <div className="relative flex items-center shrink-0">
                <ArrowUpDown className="absolute left-3 w-3.5 h-3.5 text-[#18143F]/50 pointer-events-none" />
                <select
                  aria-label="Sort publications"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full sm:w-auto appearance-none pl-8 pr-8 py-2 rounded-xl border border-[#E8E5F5] bg-white text-xs font-bold text-[#18143F] hover:border-[#6F42DD]/40 focus:border-[#6F42DD] focus:ring-2 focus:ring-[#6F42DD]/20 outline-none transition-all shadow-xs cursor-pointer"
                >
                  <option value="latest">Latest Releases</option>
                  <option value="title_asc">Title (A–Z)</option>
                  <option value="title_desc">Title (Z–A)</option>
                </select>
                <div className="absolute right-3 pointer-events-none text-[#18143F]/40 text-xs">▼</div>
              </div>
            </div>
          </div>

          {/* Category Filter Pills Toolbar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-[#18143F]/60 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#6F42DD]" /> Categories:
            </span>
            <div className="flex gap-1.5 shrink-0">
              {categoriesList.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#6F42DD] text-white shadow-xs'
                        : 'bg-white text-[#18143F]/70 hover:bg-[#6F42DD]/5 hover:text-[#6F42DD] border border-[#E8E5F5] shadow-xs'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Summary Bar */}
          {!isLoading && !error && pagination.total > 0 && (
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E5F5]">
              <p className="text-xs text-[#18143F]/70 font-medium">
                Showing{' '}
                <strong className="text-[#18143F] font-bold">
                  {(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, pagination.total)}
                </strong>{' '}
                of <strong className="text-[#18143F] font-bold">{pagination.total}</strong> published technical guides
                {activeCategory !== 'All' && <span> in <strong className="text-[#6F42DD]">{activeCategory}</strong></span>}
                {searchInput && <span> matching &ldquo;<strong className="text-[#18143F]">{searchInput}</strong>&rdquo;</span>}
              </p>
            </div>
          )}

          {/* Catalogue Grid: Exactly 2 cards per row on desktop, 1 on mobile */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl border border-[#E8E5F5] p-5 flex flex-col sm:flex-row gap-5 animate-pulse shadow-xs"
                >
                  <div className="sm:w-44 aspect-[3/4] bg-[#F8F7FF] rounded-xl shrink-0 border border-[#E8E5F5]" />
                  <div className="flex-1 space-y-3 py-2">
                    <div className="h-4 bg-[#F8F7FF] rounded w-1/3" />
                    <div className="h-6 bg-[#F8F7FF] rounded w-3/4" />
                    <div className="h-3 bg-[#F8F7FF] rounded w-1/4" />
                    <div className="h-12 bg-[#F8F7FF] rounded w-full mt-4" />
                    <div className="h-8 bg-[#F8F7FF] rounded w-1/2 mt-6" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="max-w-md mx-auto my-12">
              <ErrorState
                title="Catalog Unavailable"
                message={error}
                onRetry={() => fetchBooks(currentPage, activeCategory, searchInput, sortBy)}
              />
            </div>
          ) : books.length === 0 ? (
            <div className="my-12">
              <EmptyState
                icon={<BookOpen className="w-8 h-8 text-[#6F42DD]" />}
                title="No technical guides found"
                description={
                  searchInput || activeCategory !== 'All'
                    ? 'No published eBooks matched your filter criteria. Try clearing filters or exploring all categories.'
                    : 'Our editorial team is currently preparing new technical publications. Please check back shortly.'
                }
                action={
                  (searchInput || activeCategory !== 'All') ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('');
                        setActiveCategory('All');
                        setCurrentPage(1);
                        updateUrl('', 'All', 1, sortBy);
                        fetchBooks(1, 'All', '', sortBy);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#6F42DD] hover:bg-[#5b33be] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="space-y-8">
              {/* TWO CARDS PER ROW DESKTOP, ONE COLUMN MOBILE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {books.map((book) => {
                  const ownership = ownedBooksMap.get(book.id);
                  return (
                    <BookCard
                      key={book.id}
                      book={book}
                      isOwned={Boolean(ownership)}
                      ownedPlan={ownership?.accessType}
                      onOpenSample={handleOpenSample}
                    />
                  );
                })}
              </div>

              {/* NUMBERED SERVER-SIDE PAGINATION DIRECTLY BELOW GRID */}
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalRecords={pagination.total}
                pageSize={10}
                onPageChange={handlePageChange}
                isLoading={isLoading}
              />
            </div>
          )}

        </div>
      </section>

      {/* ── GENUINE TESTIMONIALS SECTION ──────────────────────────────── */}
      {homepageConfig?.testimonials && homepageConfig.testimonials.length > 0 && (
        <section className="py-12 sm:py-16 bg-white border-t border-[#E8E5F5]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6F42DD]">
                Reader Endorsements
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18143F] mt-1">
                What Engineers Say About KnowledgePaat
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {homepageConfig.testimonials.map((t) => (
                <div
                  key={t.id}
                  className="p-6 rounded-2xl bg-[#F8F7FF] border border-[#E8E5F5] shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <Quote className="w-6 h-6 text-[#6F42DD]/40 mb-3" />
                    <p className="text-xs sm:text-sm text-[#18143F]/80 italic leading-relaxed mb-4">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>
                  <div className="border-t border-[#E8E5F5] pt-3">
                    <p className="font-bold text-xs text-[#18143F]">{t.author}</p>
                    {t.role && (
                      <p className="text-[11px] text-[#18143F]/60 font-medium">{t.role}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FREE SAMPLE READER DRAWER ─────────────────────────────────── */}
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
