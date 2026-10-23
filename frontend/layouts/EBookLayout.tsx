"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Search,
  ShoppingCart,
  ChevronDown,
  Menu,
  X,
  User,
  ArrowRight,
  LogOut,
  LayoutDashboard,
  Filter,
  Check,
  ChevronRight,
  Mail,
  Home,
  Briefcase,
  FileText,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { createClient } from '@/utils/supabase/client';
import { useEBookCart } from '@/lib/ebook/cartContext';
import { SectionTransitionLink } from '@/components/SectionTransition';
import {
  fetchSocialLinks,
  SocialLinksSettings,
  DEFAULT_SOCIAL_LINKS,
  SOCIAL_PLATFORMS,
} from '@/lib/socialLinks';

export const EBOOK_CATEGORIES = [
  { name: 'All Categories', slug: '' },
  { name: 'Engineering', slug: 'Engineering' },
  { name: 'System Design', slug: 'System Design' },
  { name: 'Career Prep', slug: 'Career Prep' },
  { name: 'Quality Assurance', slug: 'Quality Assurance' },
  { name: 'DevOps & Cloud', slug: 'DevOps & Cloud' },
  { name: 'Frontend & Mobile', slug: 'Frontend & Mobile' },
];

export function EBookLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { cartCount } = useEBookCart();

  // Navigation states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  // User & Social states
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('student');
  const [socialLinks, setSocialLinks] = useState<SocialLinksSettings>(DEFAULT_SOCIAL_LINKS);

  // Focus and click-outside references
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCategoryDropdownOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  // Click outside to close category dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key handler for accessible modal / menu close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
          menuButtonRef.current?.focus();
        }
        if (isCategoryDropdownOpen) {
          setIsCategoryDropdownOpen(false);
        }
        if (isSearchOpen) {
          setIsSearchOpen(false);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, isCategoryDropdownOpen, isSearchOpen]);

  // Focus trap / management for mobile drawer
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        const closeBtn = mobileMenuRef.current?.querySelector<HTMLButtonElement>('button[data-close-btn]');
        closeBtn?.focus();
      }, 50);
      return () => {
        document.body.style.overflow = '';
        clearTimeout(timer);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isMobileMenuOpen]);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auth session tracking
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.role) setUserRole(profile.role);
      }
    };
    fetchUser();

    const loadSocial = async () => {
      const links = await fetchSocialLinks();
      setSocialLinks(links);
    };
    loadSocial();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile?.role) setUserRole(profile.role);
      }
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/e-books');
    router.refresh();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/e-books?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setIsMobileMenuOpen(false);
    }
  };

  // Safe login return path pointing back to the eBook portal
  const loginReturnHref = `/login?redirectTo=${encodeURIComponent(pathname || '/e-books')}`;
  const registerReturnHref = `/register?redirectTo=${encodeURIComponent(pathname || '/e-books')}`;
  const dashboardHref = userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard';

  // Filter enabled social platforms
  const enabledSocialPlatforms = SOCIAL_PLATFORMS.filter((platform) => {
    const config = socialLinks[platform.key];
    return Boolean(config && config.enabled && config.url?.trim());
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7FF] text-[#18143F] font-ebook antialiased selection:bg-[#6F42DD]/20 selection:text-[#18143F]">

      {/* ── DEDICATED EBOOK HEADER (Deep Indigo #1D1855 & Gold System) ───────── */}
      <header
        className={`sticky top-0 z-40 w-full bg-[#1D1855] backdrop-blur-md border-b transition-all duration-200 ${
          isScrolled ? 'border-indigo-950/70 shadow-lg shadow-black/25' : 'border-indigo-900/40'
        }`}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-18 items-center justify-between gap-2 sm:gap-4 relative">

            {/* ── LEFT: Logo (links to /) + eBooks Store Badge ── */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
              <SectionTransitionLink
                href="/"
                direction="to-main"
                id="ebook-header-logo-link"
                className="flex items-center bg-white hover:bg-white/95 px-2.5 py-1.5 rounded-xl transition-all shadow-xs border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#FFCB35]"
                aria-label="KnowledgePaat — Return to main home"
              >
                <Logo size="sm" />
              </SectionTransitionLink>

              {/* Dedicated eBook Portal Badge */}
              <Link
                href="/e-books"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#6F42DD]/25 text-[#FFCB35] border border-[#6F42DD]/40 hover:bg-[#6F42DD]/35 transition-colors"
                aria-label="eBooks Bookstore Home"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#FFCB35]" />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider font-ebook">
                  eBooks
                </span>
              </Link>
            </div>

            {/* ── CENTER: Primary Desktop Navigation ── */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="eBook Primary Navigation">
              {/* eBook Home */}
              <Link
                href="/e-books"
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold font-ebook transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFCB35] ${
                  pathname === '/e-books'
                    ? 'text-[#FFCB35] bg-[#6F42DD]/30 border border-[#6F42DD]/50 shadow-xs'
                    : 'text-indigo-100/90 hover:text-white hover:bg-white/10'
                }`}
              >
                Store Home
              </Link>

              {/* Browse E-Books / Catalogue Anchor */}
              <Link
                href="/e-books#catalogue"
                className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold font-ebook text-indigo-100/90 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFCB35]"
              >
                Browse Books
              </Link>

              {/* Categories Dropdown */}
              <div ref={categoryMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'Enter') {
                      setIsCategoryDropdownOpen(true);
                    }
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold font-ebook transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFCB35] ${
                    isCategoryDropdownOpen
                      ? 'text-[#FFCB35] bg-[#6F42DD]/30 border border-[#6F42DD]/50'
                      : 'text-indigo-100/90 hover:text-white hover:bg-white/10'
                  }`}
                  aria-expanded={isCategoryDropdownOpen}
                  aria-haspopup="true"
                  aria-label="eBook Categories"
                >
                  <span>Categories</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCategoryDropdownOpen && (
                  <div
                    className="absolute top-full left-0 mt-2 w-56 rounded-2xl bg-[#1D1855] border border-[#6F42DD]/40 p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-50"
                    role="menu"
                    aria-label="Categories menu"
                  >
                    <div className="px-3 py-1.5 border-b border-indigo-900/60 mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFCB35] font-ebook">
                        Filter by Topic
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {EBOOK_CATEGORIES.map((cat) => {
                        const href = cat.slug ? `/e-books?category=${encodeURIComponent(cat.slug)}` : '/e-books';
                        return (
                          <Link
                            key={cat.name}
                            href={href}
                            onClick={() => setIsCategoryDropdownOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-indigo-100 hover:bg-[#6F42DD]/30 hover:text-[#FFCB35] transition-colors font-ebook"
                            role="menuitem"
                          >
                            <span>{cat.name}</span>
                            <ChevronRight className="w-3 h-3 text-indigo-300" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* My Books (Visible to visitors; prompts login if unauthenticated) */}
              <Link
                href="/my-books"
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold font-ebook transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFCB35] ${
                  pathname === '/my-books'
                    ? 'text-[#FFCB35] bg-[#6F42DD]/30 border border-[#6F42DD]/50 shadow-xs'
                    : 'text-indigo-100/90 hover:text-white hover:bg-white/10'
                }`}
              >
                My Books
              </Link>
            </nav>

            {/* ── RIGHT: Search + Cart + Account Controls + Mobile Hamburger ── */}
            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 shrink-0">

              {/* Search Toggle / Quick Search Bar */}
              <div className="relative">
                {isSearchOpen ? (
                  <form onSubmit={handleSearchSubmit} className="flex items-center relative animate-in fade-in duration-150">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search technical eBooks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-44 sm:w-64 pl-8 pr-7 py-1.5 rounded-full border border-[#6F42DD]/50 bg-[#140F3E] text-xs font-medium text-white placeholder-indigo-300/60 focus:outline-none focus:border-[#FFCB35] focus:ring-1 focus:ring-[#FFCB35] shadow-inner font-ebook"
                      autoFocus
                    />
                    <Search className="w-3.5 h-3.5 text-indigo-300 absolute left-2.5 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(false)}
                      className="absolute right-2 text-indigo-300 hover:text-white p-0.5"
                      aria-label="Close search input"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(true);
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }}
                    className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full text-indigo-100 hover:bg-white/10 hover:text-white transition-colors border border-indigo-800/60 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#FFCB35]"
                    aria-label="Search technical eBooks"
                  >
                    <Search className="w-4 h-4 stroke-[2.2]" />
                  </button>
                )}
              </div>

              {/* eBook Shopping Cart Icon Link */}
              <Link
                href="/cart"
                id="ebook-header-cart-btn"
                className={`relative flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full text-indigo-100 hover:bg-white/10 hover:text-white transition-colors border shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#FFCB35] ${
                  pathname === '/cart' ? 'bg-[#6F42DD]/30 border-[#6F42DD]/50 text-[#FFCB35]' : 'border-indigo-800/60'
                }`}
                aria-label={`eBook Shopping Cart with ${cartCount} items`}
              >
                <ShoppingCart className="w-4.5 h-4.5 stroke-[2.2]" />
                {cartCount > 0 && (
                  <span
                    id="ebook-header-cart-badge"
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFCB35] text-[10px] font-black text-[#1D1855] shadow-md animate-in zoom-in-75 font-ebook"
                  >
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Desktop User Account Controls */}
              <div className="hidden sm:flex items-center gap-2">
                {user ? (
                  <div className="flex items-center gap-1.5">
                    <Link href={dashboardHref}>
                      <button className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-100 hover:text-white bg-[#6F42DD]/30 border border-[#6F42DD]/50 transition-colors font-ebook">
                        Dashboard
                      </button>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-200 hover:text-red-400 hover:bg-white/10 transition-colors font-ebook cursor-pointer"
                      title="Sign out of account"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log out</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={loginReturnHref}
                      className="font-bold text-xs sm:text-sm text-indigo-100 hover:text-white px-2.5 py-1.5 rounded-xl transition-colors font-ebook whitespace-nowrap"
                    >
                      Sign In
                    </Link>
                    <Link href={registerReturnHref} className="shrink-0">
                      <button
                        className="btn-gold px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap flex items-center gap-1 font-ebook"
                      >
                        <span>Get Started</span>
                        <ArrowRight className="w-3.5 h-3.5 hidden lg:inline" />
                      </button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile Navigation Drawer Toggle */}
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex md:hidden items-center justify-center h-9 w-9 rounded-xl text-indigo-100 hover:bg-white/10 hover:text-white transition-colors border border-indigo-800/60 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#FFCB35]"
                aria-label="Toggle eBook navigation menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="ebook-mobile-menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-4.5 h-4.5 stroke-[2.2]" />
                ) : (
                  <Menu className="w-4.5 h-4.5 stroke-[2.2]" />
                )}
              </button>

            </div>

          </div>
        </div>
      </header>

      {/* ── ACCESSIBLE MOBILE NAVIGATION DRAWER (Requirement 8 & 9) ─── */}
      {isMobileMenuOpen && (
        <div
          id="ebook-mobile-menu"
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="eBook Mobile Navigation"
        >
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            ref={mobileMenuRef}
            className="relative ml-auto w-full max-w-xs sm:max-w-sm h-full bg-[#1D1855] border-l border-indigo-900/60 shadow-2xl flex flex-col justify-between overflow-y-auto overflow-x-hidden animate-in slide-in-from-right duration-200 z-10 p-5 text-indigo-100 font-ebook"
          >
            {/* Top Bar inside Drawer */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40">
                <div className="flex items-center gap-2">
                  <div className="bg-white hover:bg-white/95 px-2.5 py-1 rounded-xl border border-white/20">
                    <Logo size="xs" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#6F42DD]/25 text-[#FFCB35] border border-[#6F42DD]/40 uppercase tracking-wider font-ebook">
                    eBooks
                  </span>
                </div>
                <button
                  data-close-btn
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    menuButtonRef.current?.focus();
                  }}
                  className="p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFCB35]"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                </button>
              </div>

              {/* Mobile Search input */}
              <form onSubmit={handleSearchSubmit} className="mt-4 relative">
                <input
                  type="text"
                  placeholder="Search technical eBooks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#6F42DD]/50 bg-[#140F3E] text-xs font-medium text-white placeholder-indigo-300/60 focus:bg-[#1A144F] focus:border-[#FFCB35] focus:outline-none focus:ring-2 focus:ring-[#FFCB35]/20 font-ebook"
                />
                <Search className="w-4 h-4 text-indigo-300 absolute left-3 top-2.5 pointer-events-none" />
              </form>

              {/* Primary eBook Navigation Links */}
              <nav className="mt-5 space-y-1.5" aria-label="Mobile Navigation Links">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFCB35] font-ebook px-2 mb-2">
                  Bookstore Navigation
                </p>

                <Link
                  href="/e-books"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold font-ebook transition-colors ${
                    pathname === '/e-books'
                      ? 'bg-[#6F42DD]/30 text-[#FFCB35] border border-[#6F42DD]/50'
                      : 'text-indigo-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-[#FBBF24]" />
                    <span>Store Home</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400" />
                </Link>

                <Link
                  href="/e-books#catalogue"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold font-display text-purple-200 hover:bg-purple-900/40 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Filter className="w-4 h-4 text-purple-400" />
                    <span>Browse Catalogue</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400" />
                </Link>

                <Link
                  href="/my-books"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold font-display transition-colors ${
                    pathname === '/my-books'
                      ? 'bg-amber-400/15 text-[#FBBF24] border border-amber-400/30'
                      : 'text-purple-200 hover:bg-purple-900/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>My Books</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400" />
                </Link>

                <Link
                  href="/cart"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold font-display transition-colors ${
                    pathname === '/cart'
                      ? 'bg-amber-400/15 text-[#FBBF24] border border-amber-400/30'
                      : 'text-purple-200 hover:bg-purple-900/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="w-4 h-4 text-[#FBBF24]" />
                    <span>Shopping Cart</span>
                  </div>
                  {cartCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#F59E0B] text-[#130B24] text-[11px] font-black font-display">
                      {cartCount}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-purple-400" />
                  )}
                </Link>

                {/* Categories Submenu */}
                <div className="pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400 font-display px-2 mb-2">
                    Categories
                  </p>
                  <div className="space-y-1">
                    {EBOOK_CATEGORIES.filter((c) => c.slug).map((cat) => (
                      <Link
                        key={cat.name}
                        href={`/e-books?category=${encodeURIComponent(cat.slug)}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-200 hover:bg-purple-900/40 hover:text-[#FBBF24] transition-colors"
                      >
                        <span>{cat.name}</span>
                        <ChevronRight className="w-3 h-3 text-purple-500" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* KnowledgePaat Main Site Jump */}
                <div className="pt-3 border-t border-purple-900/40">
                  <SectionTransitionLink
                    href="/"
                    direction="to-main"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-300 hover:text-white hover:bg-purple-900/40 transition-colors font-display"
                  >
                    <Home className="w-4 h-4 text-purple-400" />
                    <span>KnowledgePaat Main Home</span>
                  </SectionTransitionLink>
                </div>
              </nav>
            </div>

            {/* Bottom Auth Section inside Drawer */}
            <div className="pt-5 border-t border-purple-900/40">
              {user ? (
                <div className="space-y-2">
                  <div className="px-2 py-1">
                    <p className="text-xs font-bold text-white truncate">{user.email}</p>
                    <p className="text-[11px] text-purple-400 capitalize">{userRole} Account</p>
                  </div>
                  <Link href={dashboardHref} onClick={() => setIsMobileMenuOpen(false)}>
                    <button className="w-full justify-center font-bold text-xs h-9 rounded-xl bg-purple-900/50 border border-purple-700/60 text-purple-200 hover:text-white flex items-center gap-1.5">
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Open Dashboard</span>
                    </button>
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-purple-900/40 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link href={loginReturnHref} onClick={() => setIsMobileMenuOpen(false)} className="block">
                    <button className="w-full justify-center font-bold text-xs h-9 rounded-xl border border-purple-700/60 text-purple-200 hover:text-white hover:bg-purple-900/40">
                      Sign In
                    </button>
                  </Link>
                  <Link href={registerReturnHref} onClick={() => setIsMobileMenuOpen(false)} className="block">
                    <button className="btn-gold w-full justify-center font-bold text-xs h-9 rounded-xl">
                      Get Started Free
                    </button>
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── MAIN CONTENT OUTLET ──────────────────────────────────────── */}
      <div className="flex-1">
        {children}
      </div>

      {/* ── DEDICATED EBOOK FOOTER (Deep Indigo #1D1855 & Gold System) ───── */}
      <footer className="border-t border-indigo-900/50 bg-[#1D1855] pt-12 sm:pt-16 pb-8 sm:pb-12 text-indigo-200/80 font-ebook">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 pb-12 border-b border-indigo-900/40">

            {/* Col 1 & 2: Brand & Bookstore Mission */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <SectionTransitionLink
                  href="/"
                  direction="to-main"
                  className="bg-white hover:bg-white/95 px-2.5 py-1.5 rounded-xl transition-all shadow-xs border border-white/20 inline-block focus:outline-none focus:ring-2 focus:ring-[#FFCB35]"
                >
                  <Logo size="sm" />
                </SectionTransitionLink>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#6F42DD]/25 text-[#FFCB35] border border-[#6F42DD]/40 uppercase tracking-wider font-ebook">
                  Bookstore
                </span>
              </div>
              <p className="text-xs sm:text-sm text-indigo-200/80 leading-relaxed max-w-sm font-ebook">
                Authoritative technical publications and engineering guides from KnowledgePaat. Instant browser reading, offline PDF editions, and continuous curriculum updates.
              </p>
              <div className="pt-2">
                <SectionTransitionLink
                  href="/"
                  direction="to-main"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFCB35] hover:text-amber-300 font-ebook transition-colors"
                >
                  <span>← Return to KnowledgePaat Platform Home</span>
                </SectionTransitionLink>
              </div>
            </div>

            {/* Col 3: Bookstore Navigation */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FFCB35] font-ebook mb-3">
                eBook Bookstore
              </p>
              <ul className="space-y-2 text-xs sm:text-sm font-medium">
                <li>
                  <Link href="/e-books" className="hover:text-white transition-colors">
                    Store Home
                  </Link>
                </li>
                <li>
                  <Link href="/e-books#catalogue" className="hover:text-white transition-colors">
                    Browse All Books
                  </Link>
                </li>
                <li>
                  <Link href="/my-books" className="hover:text-white transition-colors">
                    My Books Library
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="hover:text-white transition-colors">
                    Shopping Cart
                  </Link>
                </li>
                <li>
                  <Link href="/e-books?category=Engineering" className="hover:text-white transition-colors">
                    Engineering Guides
                  </Link>
                </li>
                <li>
                  <Link href="/e-books?category=System+Design" className="hover:text-white transition-colors">
                    System Design Guides
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Platform Resources */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FFCB35] font-ebook mb-3">
                Career Platform
              </p>
              <ul className="space-y-2 text-xs sm:text-sm font-medium">
                <li>
                  <Link href="/jobs" className="hover:text-white transition-colors">
                    Fresher Jobs
                  </Link>
                </li>
                <li>
                  <Link href="/interview-preparation" className="hover:text-white transition-colors">
                    Interview Preparation
                  </Link>
                </li>
                <li>
                  <Link href="/notes" className="hover:text-white transition-colors">
                    Study Notes
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">
                    Platform Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    About KnowledgePaat
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact Support
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 5: Account & Governance */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FFCB35] font-ebook mb-3">
                Account & Governance
              </p>
              <ul className="space-y-2 text-xs sm:text-sm font-medium">
                <li>
                  <Link href={loginReturnHref} className="hover:text-white transition-colors">
                    Student Sign In
                  </Link>
                </li>
                <li>
                  <Link href={registerReturnHref} className="hover:text-white transition-colors">
                    Register Free Account
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="hover:text-white transition-colors">
                    Refund & Cancellation
                  </Link>
                </li>
                <li>
                  <Link href="/admin/login" className="text-indigo-300 hover:text-[#FFCB35] transition-colors">
                    Admin Console →
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar: Copyright & Social Links */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-indigo-300">
            <p>
              © {new Date().getFullYear()} KnowledgePaat. All rights reserved. Authoritative commercial technical publications.
            </p>

            {/* Social Links */}
            {enabledSocialPlatforms.length > 0 && (
              <div className="flex items-center gap-2.5">
                {enabledSocialPlatforms.map((platform) => (
                  <a
                    key={platform.key}
                    href={socialLinks[platform.key]?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-950/60 border border-indigo-800/50 text-indigo-200 hover:text-[#FFCB35] hover:border-[#FFCB35]/40 hover:bg-[#6F42DD]/30 transition-all p-1.5 focus:outline-none focus:ring-2 focus:ring-[#FFCB35]"
                    aria-label={`KnowledgePaat on ${platform.label}`}
                  >
                    <SocialIcon platformKey={platform.key} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </footer>

    </div>
  );
}

/**
 * Clean, modern vector social icons
 */
function SocialIcon({ platformKey }: { platformKey: string }) {
  switch (platformKey) {
    case 'facebook':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    case 'x':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case 'linkedin':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      );
    case 'youtube':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case 'instagram':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      );
    default:
      return null;
  }
}

