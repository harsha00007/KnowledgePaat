"use client";

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
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
  const [, startTransition] = useTransition();

  // URL state: Single source of truth for catalogue discovery
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const activeCategory = searchParams.get('category') || 'All';
  const sortBy = searchParams.get('sort') || 'latest';
  const urlSearch = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);

  // Sync searchInput when URL search param changes (e.g. Browser Back/Forward)
  if (prevUrlSearch !== urlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Accessible bottom sheet: keyboard Escape, scroll locking, and focus restoration
  useEffect(() => {
    if (!isFilterSheetOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFilterSheetOpen(false);
        filterTriggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isFilterSheetOpen]);

  // Homepage published configuration
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig | null>(null);

  // Catalogue books & pagination
  const [books, setBooks] = useState<BookCardData[]>([]);
  const [pagination, setPagination] = useState({
    page: currentPage,
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
            data.books.forEach((b: { book_id?: string; id?: string; access_plan?: string; edition_id?: string }) => {
              const bookKey = b.book_id || b.id;
              if (bookKey) {
                map.set(bookKey, {
                  accessType: b.access_plan === 'read_download' ? 'full' : 'online',
                  editionId: b.edition_id,
                });
              }
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
  const [retryNonce, setRetryNonce] = useState(0);

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

  // Fetch catalogue books (server-side pagination: 10 books per page with stale/unmount protection)
  useEffect(() => {
    let ignore = false;
    const requestId = ++activeRequestIdRef.current;

    async function loadCatalog() {
      try {
        const params = new URLSearchParams();
        if (urlSearch.trim()) params.set('search', urlSearch.trim());
        if (activeCategory && activeCategory !== 'All') params.set('category', activeCategory);
        params.set('page', String(currentPage));
        params.set('limit', '10');
        if (sortBy) params.set('sort', sortBy);

        const res = await fetch(`/api/ebooks?${params.toString()}`);
        const data = await res.json();

        if (ignore || requestId !== activeRequestIdRef.current) {
          return;
        }

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch published books.');
        }

        setBooks(data.books || []);
        setPagination(data.pagination || {
          page: currentPage,
          limit: 10,
          total: 0,
          totalPages: 1,
          hasMore: false,
        });
        setError(null);
      } catch (err: unknown) {
        if (!ignore && requestId === activeRequestIdRef.current) {
          console.error('Error loading bookstore catalog:', err);
          const errMsg = err instanceof Error ? err.message : 'Unable to connect to bookstore service.';
          setError(errMsg);
        }
      } finally {
        if (!ignore && requestId === activeRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      ignore = true;
    };
  }, [currentPage, activeCategory, urlSearch, sortBy, retryNonce]);

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
  const categoriesList =
    homepageConfig?.category_order && homepageConfig.category_order.length > 0
      ? ['All', ...homepageConfig.category_order.filter((c) => c !== 'All')]
      : DEFAULT_CATEGORIES;

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
              className="inline-flex items-center gap-1.5 ml-2 px-3 py-1 rounded-full bg-[#1D1855] text-white hover:bg-[#282273] text-xs font-bold transition-all shadow-xs hover:scale-105 touch-manipulation"
            >
              <span>Shop now</span>
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </aside>
      )}

      {/* ── ADMIN-MANAGED PROMOTIONAL MEDIA CARD ──────────────────────── */}
      <section className="pt-6 sm:pt-8 pb-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MediaCard
            config={homepageConfig?.media_card || DEFAULT_MEDIA_CARD}
            books={books}
            onOpenSample={handleOpenSample}
          />
        </div>
      </section>

      {/* ── CATALOGUE: EXPLORE THE COLLECTION ──────────────────────────── */}
      <section id="catalogue" className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Section Header */}
          <div className="pb-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6F42DD]/10 text-[#6F42DD] text-xs font-bold mb-2">
              <BookOpen className="w-3.5 h-3.5 text-[#6F42DD]" aria-hidden="true" />
              <span>Technical Library</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#18143F] tracking-tight">
              Explore the collection
            </h1>
            <p className="text-xs sm:text-sm text-[#4D4775] mt-1">
              Practical guides for system design, distributed architectures, and professional engineering.
            </p>
          </div>

          {/* ── CONSOLIDATED DISCOVERY TOOLBAR (Search, Categories & Sort in One Cohesive Unit) ── */}
          <div className="bg-white rounded-2xl border border-[#E8E5F5] p-3 shadow-xs space-y-3">
            {/* Top Toolbar Row: Search Input + Sort Dropdown + Mobile Filter Sheet Trigger */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-5 lg:gap-6">
              {/* Search Bar - 16px font across mobile and tablets to prevent iOS auto-zoom */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1 flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-[#756F99] pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search titles, topics, or technologies..."
                  className="w-full h-11 pl-10 pr-24 rounded-xl border border-[#E8E5F5] bg-[#F8F7FF] text-sm sm:text-base font-medium text-[#18143F] placeholder-[#756F99] focus:bg-white focus:border-[#6F42DD] focus:ring-2 focus:ring-[#6F42DD]/20 outline-none transition-all box-border"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-20 text-[#756F99] hover:text-[#18143F] p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 px-4 rounded-xl bg-[#6F42DD] hover:bg-[#5b33be] text-white text-xs font-bold cursor-pointer transition-colors flex items-center justify-center touch-manipulation shadow-2xs"
                >
                  Search
                </button>
              </form>

              {/* Action Tools: Sort Dropdown & Mobile Filter Trigger */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Mobile Filter & Sort Sheet Trigger Button (44px height) */}
                <button
                  ref={filterTriggerRef}
                  type="button"
                  onClick={() => setIsFilterSheetOpen(true)}
                  className="sm:hidden flex-1 h-11 flex items-center justify-center gap-1.5 px-3.5 rounded-xl border border-[#E8E5F5] bg-[#F8F7FF] hover:bg-white text-xs font-bold text-[#18143F] active:bg-slate-50 touch-manipulation cursor-pointer transition-colors"
                  aria-label="Open filter and sort sheet"
                  aria-expanded={isFilterSheetOpen}
                >
                  <Filter className="w-4 h-4 text-[#6F42DD]" />
                  <span>Filter</span>
                  {(activeCategory !== 'All' || sortBy !== 'latest') && (
                    <span className="w-2 h-2 rounded-full bg-[#6F42DD]" />
                  )}
                </button>

                {/* Sorting Dropdown (Desktop & Tablets - exact 44px / h-11 matching search input) */}
                <div className="hidden sm:flex relative items-center shrink-0">
                  <ArrowUpDown className="absolute left-3 w-4 h-4 text-[#756F99] pointer-events-none" />
                  <select
                    aria-label="Sort publications"
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="w-full sm:w-auto h-11 appearance-none pl-9 pr-9 rounded-xl border border-[#E8E5F5] bg-[#F8F7FF] hover:bg-white text-sm font-semibold text-[#18143F] hover:border-[#6F42DD]/40 focus:border-[#6F42DD] focus:ring-2 focus:ring-[#6F42DD]/20 outline-none transition-all cursor-pointer box-border"
                  >
                    <option value="latest">Latest Releases</option>
                    <option value="title_asc">Title (A–Z)</option>
                    <option value="title_desc">Title (Z–A)</option>
                  </select>
                  <div className="absolute right-3 pointer-events-none text-[#756F99] text-xs">▼</div>
                </div>
              </div>
            </div>

            {/* Category Filter Pills (Aligned directly with the left edge of cards) */}
            <div className="hidden sm:flex items-center gap-2 overflow-x-auto pt-2 border-t border-[#E8E5F5] scrollbar-none">
              {categoriesList.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs touch-manipulation ${
                      isActive
                        ? 'bg-[#6F42DD] text-white shadow-xs'
                        : 'bg-[#F8F7FF] text-[#18143F] border border-[#E8E5F5] hover:bg-white hover:border-[#6F42DD]/40 hover:text-[#6F42DD]'
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
              <p className="text-xs text-[#4D4775] font-medium">
                Showing{' '}
                <strong className="text-[#18143F] font-bold">
                  {(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, pagination.total)}
                </strong>{' '}
                of <strong className="text-[#18143F] font-bold">{pagination.total}</strong> publications
                {activeCategory !== 'All' && <span> in <strong className="text-[#6F42DD]">{activeCategory}</strong></span>}
                {searchInput && <span> matching &ldquo;<strong className="text-[#18143F]">{searchInput}</strong>&rdquo;</span>}
              </p>
            </div>
          )}

          {/* Catalogue Grid: Exactly 2 cards per row on desktop, 1 on mobile with compact gap */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-xl sm:rounded-2xl border border-[#E8E5F5] p-3 sm:p-5 flex flex-row gap-3 sm:gap-5 animate-pulse shadow-xs"
                >
                  <div className="w-20 xs:w-24 sm:w-32 md:w-36 lg:w-44 aspect-[3/4] bg-[#F8F7FF] rounded-lg sm:rounded-xl shrink-0 border border-[#E8E5F5]" />
                  <div className="flex-1 space-y-2.5 py-1 sm:py-2">
                    <div className="h-3.5 bg-[#F8F7FF] rounded w-1/3" />
                    <div className="h-5 bg-[#F8F7FF] rounded w-3/4" />
                    <div className="h-3 bg-[#F8F7FF] rounded w-1/4" />
                    <div className="h-8 bg-[#F8F7FF] rounded w-full mt-3 hidden xs:block" />
                    <div className="h-6 bg-[#F8F7FF] rounded w-1/2 mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="max-w-md mx-auto my-12">
              <ErrorState
                title="Catalog Unavailable"
                message={error}
                onRetry={() => {
                  setIsLoading(true);
                  setRetryNonce((n) => n + 1);
                }}
              />
            </div>
          ) : books.length === 0 ? (
            <div className="my-12">
              <EmptyState
                icon={<BookOpen className="w-8 h-8 text-[#6F42DD]" />}
                title="No technical guides found"
                description={
                  urlSearch || activeCategory !== 'All'
                    ? 'No published eBooks matched your filter criteria. Try clearing filters or exploring all categories.'
                    : 'Our editorial team is currently preparing new technical publications. Please check back shortly.'
                }
                action={
                  (urlSearch || activeCategory !== 'All') ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('');
                        updateUrl('', 'All', 1, sortBy, 'push');
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
            <div className="space-y-6 sm:space-y-8">
              {/* TWO CARDS PER ROW TABLET/DESKTOP, ONE COLUMN PHONE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
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

      {/* ── ACCESSIBLE MOBILE FILTER & SORT BOTTOM SHEET (Requirement 4) ─── */}
      {isFilterSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-sheet-title"
          className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden"
        >
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsFilterSheetOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet Drawer */}
          <div className="relative w-full bg-white rounded-t-3xl border-t border-[#E8E5F5] p-5 shadow-2xl z-10 space-y-5 animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto font-ebook">
            {/* Sheet Handle & Header */}
            <div>
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#6F42DD]" />
                  <h3 id="filter-sheet-title" className="text-base font-bold text-[#18143F]">
                    Filter & Sort Catalogue
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterSheetOpen(false);
                    filterTriggerRef.current?.focus();
                  }}
                  className="min-w-[44px] min-h-[44px] rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center touch-manipulation cursor-pointer"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Category Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4D4775] block">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categoriesList.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategorySelect(cat)}
                      className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-left truncate cursor-pointer touch-manipulation ${
                        isActive
                          ? 'bg-[#6F42DD] text-white shadow-xs'
                          : 'bg-[#F8F7FF] text-[#18143F] border border-[#E8E5F5] hover:bg-white'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort By Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4D4775] block">
                Sort Order
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Latest', value: 'latest' },
                  { label: 'Title (A–Z)', value: 'title_asc' },
                  { label: 'Title (Z–A)', value: 'title_desc' },
                ].map((opt) => {
                  const isSelected = sortBy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSortChange(opt.value)}
                      className={`min-h-[44px] px-2.5 py-2.5 rounded-xl text-xs font-bold transition-all text-center truncate cursor-pointer touch-manipulation ${
                        isSelected
                          ? 'bg-[#1D1855] text-[#FFCB35] shadow-xs'
                          : 'bg-[#F8F7FF] text-[#18143F] border border-[#E8E5F5] hover:bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons: Reset & Apply */}
            <div className="pt-2 flex items-center gap-2 border-t border-[#E8E5F5]">
              {(activeCategory !== 'All' || sortBy !== 'latest' || searchInput) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    updateUrl('', 'All', 1, 'latest', 'push');
                    setIsFilterSheetOpen(false);
                    filterTriggerRef.current?.focus();
                  }}
                  className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl border border-[#E8E5F5] text-xs font-bold text-[#4D4775] hover:bg-slate-50 transition-colors touch-manipulation cursor-pointer"
                >
                  Reset All
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsFilterSheetOpen(false);
                  filterTriggerRef.current?.focus();
                }}
                className="flex-1 min-h-[44px] btn-gold py-2.5 px-4 rounded-xl text-xs font-bold justify-center shadow-xs touch-manipulation cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
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
