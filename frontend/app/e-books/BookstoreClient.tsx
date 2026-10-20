"use client";

import React, { useState, useEffect, useCallback, useTransition, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  X,
  BookOpen,
  Sparkles,
  Filter,
  RefreshCw,
  ShoppingCart,
  ChevronRight,
  Download,
  ArrowRight,
  CheckCircle2,
  Star,
  Quote,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { BookCard, BookCardData } from '@/components/ebook/BookCard';
import { FeaturedBookCard, FeaturedBookData } from '@/components/ebook/FeaturedBookCard';
import { HighlightedBookSection, HighlightedBookData } from '@/components/ebook/HighlightedBookSection';
import { FreeSampleDrawer } from '@/components/ebook/FreeSampleDrawer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useEBookCart } from '@/lib/ebook/cartContext';
import { formatPaise } from '@/lib/ebook/pricingShared';

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
    artwork_url?: string | null;
    artwork_alt?: string;
    primary_button?: { label: string; url: string };
    secondary_button?: { label: string; url: string };
  };
  featured_books?: any[];
  highlighted_book?: any;
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
    rating?: number;
  }>;
}

export function BookstoreClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // URL search and filter states
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'All';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  // Homepage published configuration
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  // Catalogue books & pagination
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
      } catch (err) {
        // Unauthenticated or network error — fallback to unowned states
      }
    }
    loadUserOwnership();
    return () => { isMounted = false; };
  }, []);

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

  // Fetch published catalogue books
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
      console.error('Error loading bookstore catalog:', err);
      setError(err.message || 'Unable to connect to bookstore service.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [searchInput, activeCategory]);

  useEffect(() => {
    fetchBooks(1, false);
  }, [fetchBooks]);

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

  // Derive 4 featured books: use admin-configured featured books, and pad with catalogue books if < 4
  const displayFeaturedBooks = useMemo<FeaturedBookData[]>(() => {
    const configured = (homepageConfig?.featured_books || []).map((b: any) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      subtitle: b.subtitle,
      author: b.author,
      description: b.description || b.subtitle,
      category: b.category,
      cover_image_url: b.cover_image_url,
      min_price_paise: b.min_price_paise,
      pricing: b.pricing,
      has_discount: b.has_discount,
      rating: b.rating,
      review_count: b.review_count,
    }));

    if (configured.length >= 4) {
      return configured.slice(0, 4);
    }

    // Pad with catalogue books gracefully
    const seenIds = new Set(configured.map((b) => b.id));
    const padded = [...configured];

    for (const b of books) {
      if (!seenIds.has(b.id)) {
        seenIds.add(b.id);
        padded.push({
          id: b.id,
          slug: b.slug,
          title: b.title,
          subtitle: b.subtitle,
          author: b.author,
          description: b.description,
          category: b.category,
          cover_image_url: b.cover_image_url,
          min_price_paise: b.min_price_paise,
          pricing: b.current_edition ? {
            online_price_paise: b.current_edition.price_read_online_paise,
            online_original_price_paise: b.current_edition.price_read_online_paise,
            download_price_paise: b.current_edition.price_read_download_paise,
            download_original_price_paise: b.current_edition.price_read_download_paise,
            currency: 'INR',
          } : null,
          has_discount: false,
          rating: null,
          review_count: null,
        });
      }
      if (padded.length >= 4) break;
    }

    return padded;
  }, [homepageConfig?.featured_books, books]);

  // Derive highlighted book: use admin-selected highlighted book, or fallback to first featured/catalogue book
  const highlightedBook = useMemo<HighlightedBookData | null>(() => {
    if (homepageConfig?.highlighted_book) {
      return homepageConfig.highlighted_book;
    }
    if (displayFeaturedBooks.length > 0) {
      return displayFeaturedBooks[0] as HighlightedBookData;
    }
    if (books.length > 0) {
      const b = books[0];
      return {
        id: b.id,
        slug: b.slug,
        title: b.title,
        subtitle: b.subtitle,
        author: b.author,
        category: b.category,
        cover_image_url: b.cover_image_url,
        description: b.description,
        edition_number: b.current_edition?.edition_number || 1,
        min_price_paise: b.min_price_paise,
        pricing: b.current_edition ? {
          online_price_paise: b.current_edition.price_read_online_paise,
          online_original_price_paise: b.current_edition.price_read_online_paise,
          download_price_paise: b.current_edition.price_read_download_paise,
          download_original_price_paise: b.current_edition.price_read_download_paise,
          currency: 'INR',
        } : null,
      };
    }
    return null;
  }, [homepageConfig?.highlighted_book, displayFeaturedBooks, books]);

  // Derive categories list (custom order from config if specified)
  const categoriesList = useMemo(() => {
    if (homepageConfig?.category_order && homepageConfig.category_order.length > 0) {
      return ['All', ...homepageConfig.category_order.filter(c => c !== 'All')];
    }
    return DEFAULT_CATEGORIES;
  }, [homepageConfig?.category_order]);

  // Hero content derived from homepage configuration with graceful defaults
  const heroEyebrow = homepageConfig?.hero?.eyebrow || '⭐ KNOWLEDGEPAAT E-LIBRARY';
  const heroHeading = homepageConfig?.hero?.heading || 'Expand Your Horizons With Curated';
  const heroHighlighted = homepageConfig?.hero?.highlighted_text || 'Engineering & Tech E-Books';
  const heroDescription = homepageConfig?.hero?.description ||
    'Master practical software engineering, cloud systems, and system design from first principles. Enjoy instant browser reading and optional DRM-free offline PDF editions.';
  const heroPrimaryLabel = homepageConfig?.hero?.primary_button?.label || 'Explore E-Books';
  const heroArtwork = homepageConfig?.hero?.artwork_url;

  // 3 Books for Right Hero Display
  const heroBooks = useMemo(() => {
    if (displayFeaturedBooks.length >= 3) {
      return displayFeaturedBooks.slice(0, 3);
    }
    return books.slice(0, 3);
  }, [displayFeaturedBooks, books]);

  return (
    <div className="min-h-screen bg-[#FAF9FD] text-[#130B24] font-sans selection:bg-purple-200 selection:text-purple-950">

      {/* ── PROMOTIONAL BANNER (If Active) ─────────────────────────── */}
      {homepageConfig?.promotional_banner?.is_active && (
        <aside
          aria-label="Promotional Announcement"
          className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-[#130B24] py-2 px-4 text-center text-xs font-bold font-display shadow-xs flex items-center justify-center gap-2"
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

      {/* ── REQUIREMENT 3: REFERENCE TWO-COLUMN HERO ─────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#130B24] via-[#1B0E36] to-[#160B2E] text-white pt-12 sm:pt-18 pb-16 sm:pb-24 border-b border-purple-900/50">
        {/* Ambient violet and gold glow orbs */}
        <div
          className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-10 left-10 w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)' }}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">

            {/* LEFT COLUMN: Eyebrow, Large Serif Heading, Highlights, Description, Benefit Pills, Gold CTA */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Gold Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-[#FBBF24] text-xs font-bold tracking-wider uppercase font-display">
                <Sparkles className="w-3.5 h-3.5 text-[#FBBF24]" />
                <span>{heroEyebrow}</span>
              </div>

              {/* Large White Serif Heading with Gold Highlighted Text */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-serif tracking-tight leading-[1.12] text-white">
                {heroHeading}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-[#FBBF24] to-amber-200">
                  {heroHighlighted}
                </span>
              </h1>

              {/* Supporting Description */}
              <p className="text-sm sm:text-base text-purple-200/90 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-sans">
                {heroDescription}
              </p>

              {/* Compact Benefit Pills */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-900/50 border border-purple-700/50 text-xs font-semibold text-purple-200">
                  <BookOpen className="w-3.5 h-3.5 text-[#FBBF24]" />
                  <span>Instant Browser Reading</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-900/50 border border-purple-700/50 text-xs font-semibold text-purple-200">
                  <Download className="w-3.5 h-3.5 text-[#FBBF24]" />
                  <span>Offline PDF Editions</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-900/50 border border-purple-700/50 text-xs font-semibold text-purple-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FBBF24]" />
                  <span>Authoritative Editions</span>
                </div>
              </div>

              {/* Prominent Gold Primary CTA */}
              <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
                <a
                  href="#catalogue"
                  className="btn-gold px-7 py-3 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 inline-flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <span>{heroPrimaryLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                {homepageConfig?.hero?.secondary_button?.url && (
                  <Link
                    href={homepageConfig.hero.secondary_button.url}
                    className="px-5 py-3 rounded-xl border border-purple-700/70 hover:bg-purple-900/40 text-purple-200 text-sm font-bold transition-all"
                  >
                    {homepageConfig.hero.secondary_button.label}
                  </Link>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Three-Book 3D Display with Purple Stage */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md flex flex-col items-center">
                {/* 3D Showcase Stage */}
                <div
                  className="relative flex items-center justify-center h-72 sm:h-80 w-full"
                  style={{ perspective: '1200px' }}
                >
                  {/* Left Angled Book */}
                  <div
                    className="absolute left-4 sm:left-6 z-10 w-32 sm:w-36 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border border-purple-300/30 transition-transform duration-300"
                    style={{
                      transform: 'rotateY(20deg) scale(0.85) translateZ(-30px)',
                      boxShadow: '-15px 15px 30px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    {heroBooks[1]?.cover_image_url ? (
                      <img
                        src={heroBooks[1].cover_image_url}
                        alt={`Cover of ${heroBooks[1].title}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1C1037] via-[#2D1656] to-[#49228E] p-3 text-white flex flex-col justify-between">
                        <span className="text-[8px] font-bold text-[#FBBF24] uppercase">{heroBooks[1]?.category || 'Guide'}</span>
                        <p className="text-[10px] font-bold font-serif line-clamp-3">{heroBooks[1]?.title || 'Cloud Architecture'}</p>
                        <p className="text-[8px] text-purple-300">KnowledgePaat</p>
                      </div>
                    )}
                  </div>

                  {/* Right Angled Book */}
                  <div
                    className="absolute right-4 sm:right-6 z-10 w-32 sm:w-36 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border border-purple-300/30 transition-transform duration-300"
                    style={{
                      transform: 'rotateY(-20deg) scale(0.85) translateZ(-30px)',
                      boxShadow: '15px 15px 30px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    {heroBooks[2]?.cover_image_url ? (
                      <img
                        src={heroBooks[2].cover_image_url}
                        alt={`Cover of ${heroBooks[2].title}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1B0E36] via-[#241447] to-[#3B1A7A] p-3 text-white flex flex-col justify-between">
                        <span className="text-[8px] font-bold text-[#FBBF24] uppercase">{heroBooks[2]?.category || 'System Design'}</span>
                        <p className="text-[10px] font-bold font-serif line-clamp-3">{heroBooks[2]?.title || 'Distributed Systems'}</p>
                        <p className="text-[8px] text-purple-300">KnowledgePaat</p>
                      </div>
                    )}
                  </div>

                  {/* Central Book (Larger & Forward) */}
                  <div
                    className="relative z-20 w-40 sm:w-48 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-400/40 transition-transform duration-300 hover:scale-[1.03]"
                    style={{
                      transform: 'translateZ(40px)',
                      boxShadow: '0 25px 50px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(168, 85, 247, 0.25)',
                    }}
                  >
                    {heroBooks[0]?.cover_image_url || heroArtwork ? (
                      <img
                        src={heroBooks[0]?.cover_image_url || heroArtwork!}
                        alt={heroBooks[0]?.title || 'Featured Publication'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#130B24] via-[#241447] to-[#3D256E] p-4 text-white flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-bold text-[#FBBF24] uppercase tracking-wider font-display">
                            {heroBooks[0]?.category || 'Engineering'}
                          </span>
                          <p className="text-xs sm:text-sm font-bold font-serif mt-1 line-clamp-3 text-white">
                            {heroBooks[0]?.title || 'Cloud Architecture & DevOps'}
                          </p>
                        </div>
                        <div className="border-t border-purple-400/20 pt-2">
                          <p className="text-[10px] text-purple-200">{heroBooks[0]?.author || 'KnowledgePaat Press'}</p>
                          <p className="text-[8px] text-[#FBBF24] uppercase font-display mt-0.5">Verified Edition</p>
                        </div>
                      </div>
                    )}

                    {/* Spine highlight and glass sheen */}
                    <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 via-white/20 to-transparent pointer-events-none" />
                  </div>
                </div>

                {/* Purple Elliptical Stage Pedestal */}
                <div className="w-64 sm:w-80 h-7 bg-gradient-to-r from-transparent via-purple-600/40 to-transparent rounded-full blur-md -mt-3 pointer-events-none" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── REQUIREMENT 4: FEATURED BOOKS SECTION ───────────────────── */}
      {displayFeaturedBooks.length > 0 && (
        <section className="py-12 sm:py-16 bg-[#FAF9FD] border-b border-purple-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 font-display">
                  Curated Selection
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#130B24]">
                  Featured Publications
                </h2>
              </div>
              <a
                href="#catalogue"
                className="text-xs sm:text-sm font-bold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1 font-display"
              >
                <span>Browse all {pagination.total || books.length} titles</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Four Featured Cards Across Desktop, Stacked on Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {displayFeaturedBooks.map((book) => {
                const ownership = ownedBooksMap.get(book.id);
                return (
                  <FeaturedBookCard
                    key={book.id}
                    book={book}
                    isOwned={Boolean(ownership)}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── REQUIREMENT 5: HIGHLIGHTED BOOK & ACCESS PLANS ─────────── */}
      {highlightedBook && (
        <HighlightedBookSection
          book={highlightedBook}
          ownership={
            ownedBooksMap.has(highlightedBook.id)
              ? {
                  isOwned: true,
                  accessType: ownedBooksMap.get(highlightedBook.id)!.accessType,
                  editionId: ownedBooksMap.get(highlightedBook.id)!.editionId,
                }
              : undefined
          }
        />
      )}

      {/* ── REQUIREMENT 6: PUBLIC CATALOGUE AT #catalogue ────────────── */}
      <section id="catalogue" className="py-12 sm:py-16 bg-[#FAF9FD]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Section Heading & Category Filter Toolbar */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B] font-display">
                  Full Catalogue
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#130B24]">
                  Browse Technical E-Books
                </h2>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full sm:w-80">
                <Search className="absolute left-3.5 w-4 h-4 text-purple-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search titles, authors, topics..."
                  className="w-full pl-9 pr-18 py-2 rounded-xl border border-purple-200/90 bg-white text-xs font-medium text-[#130B24] placeholder-purple-300 focus:bg-white focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24] outline-none transition-all shadow-2xs"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-12 text-purple-400 hover:text-purple-600 p-1"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-1 px-2.5 py-1 rounded-lg btn-gold text-[11px] font-bold cursor-pointer"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Category Pills Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
              <span className="text-xs font-bold text-purple-500 uppercase tracking-wider shrink-0 flex items-center gap-1 font-display">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              <div className="flex gap-1.5 shrink-0">
                {categoriesList.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategorySelect(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap font-display ${
                        isActive
                          ? 'bg-[#130B24] text-[#FBBF24] border border-amber-400/40 shadow-xs'
                          : 'bg-white text-purple-900/70 hover:bg-purple-50 hover:text-purple-950 border border-purple-100 shadow-2xs'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Summary Bar */}
          {!isLoading && !error && (
            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
              <p className="text-xs text-purple-900/60 font-medium">
                Showing <strong className="text-[#130B24] font-bold">{books.length}</strong> of{' '}
                <strong className="text-[#130B24] font-bold">{pagination.total}</strong> published technical guides
                {activeCategory !== 'All' && <span> in <strong className="text-purple-900">{activeCategory}</strong></span>}
                {searchInput && <span> matching &ldquo;<strong className="text-purple-900">{searchInput}</strong>&rdquo;</span>}
              </p>
            </div>
          )}

          {/* Catalogue Grid: Exactly 2 cards per row on desktop, 1 on mobile */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl border border-purple-100 p-6 flex flex-col sm:flex-row gap-6 animate-pulse"
                >
                  <div className="sm:w-48 aspect-[3/4] bg-purple-100/60 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-3 py-2">
                    <div className="h-4 bg-purple-100 rounded w-1/3" />
                    <div className="h-6 bg-purple-100 rounded w-3/4" />
                    <div className="h-3 bg-purple-100/70 rounded w-1/4" />
                    <div className="h-12 bg-purple-50 rounded w-full mt-4" />
                    <div className="h-8 bg-purple-100 rounded w-1/2 mt-6" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="max-w-md mx-auto my-12">
              <ErrorState
                title="Catalog Unavailable"
                message={error}
                onRetry={() => fetchBooks(1, false)}
              />
            </div>
          ) : books.length === 0 ? (
            <div className="my-12">
              <EmptyState
                icon={<BookOpen className="w-6 h-6 text-purple-400" />}
                title="No published eBooks found"
                description={
                  searchInput || activeCategory !== 'All'
                    ? 'No published eBooks matched your search criteria. Try modifying your search term or exploring all categories.'
                    : 'Our editorial team is currently preparing new technical publications. Please check back shortly.'
                }
                action={
                  (searchInput || activeCategory !== 'All') ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('');
                        setActiveCategory('All');
                        updateUrl('', 'All');
                      }}
                      className="btn-gold px-4 py-2 rounded-xl text-xs font-bold"
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
                  <button
                    type="button"
                    disabled={isLoadingMore}
                    onClick={() => fetchBooks(pagination.page + 1, true)}
                    className="px-8 py-2.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-xs font-bold text-purple-900 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMore ? 'animate-spin' : ''}`} />
                    <span>Load More Books ({pagination.total - books.length} remaining)</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </section>

      {/* ── REQUIREMENT 7: GENUINE TESTIMONIALS SECTION ──────────────── */}
      {homepageConfig?.testimonials && homepageConfig.testimonials.length > 0 && (
        <section className="py-14 sm:py-20 bg-gradient-to-b from-[#FAF9FD] to-purple-50/40 border-t border-purple-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 font-display">
                Reader Endorsements
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#130B24] mt-1">
                What Engineers Say About KnowledgePaat
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {homepageConfig.testimonials.map((t) => (
                <div
                  key={t.id}
                  className="p-6 rounded-2xl bg-white border border-purple-100 shadow-xs flex flex-col justify-between"
                >
                  <Quote className="w-6 h-6 text-purple-300 mb-3" />
                  <p className="text-xs sm:text-sm text-purple-950/80 italic leading-relaxed mb-4">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="border-t border-purple-50 pt-3">
                    <p className="font-bold text-xs text-[#130B24] font-display">{t.author}</p>
                    {t.role && (
                      <p className="text-[11px] text-purple-900/60 font-medium">{t.role}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FREE SAMPLE READER DRAWER ────────────────────────────────── */}
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
