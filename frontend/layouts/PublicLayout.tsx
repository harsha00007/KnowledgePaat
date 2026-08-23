"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, ArrowRight, Home, Briefcase, BookOpen, FileText, CreditCard, ChevronRight } from 'lucide-react';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { createClient } from '@/utils/supabase/client';
import {
  fetchSocialLinks,
  SocialLinksSettings,
  DEFAULT_SOCIAL_LINKS,
  SOCIAL_PLATFORMS,
} from '@/lib/socialLinks';

const NAV_LINKS = [
  { href: '/',                      label: 'Home',           icon: Home },
  { href: '/jobs',                  label: 'Jobs',           icon: Briefcase },
  { href: '/interview-preparation', label: 'Interview Prep', icon: BookOpen },
  { href: '/notes',                 label: 'Notes',          icon: FileText },
  { href: '/pricing',               label: 'Pricing',        icon: CreditCard },
];

const FOOTER_PRODUCT = [
  { href: '/jobs',                  label: 'Find Jobs'           },
  { href: '/interview-preparation', label: 'Interview Prep'      },
  { href: '/notes',                 label: 'Study Notes'         },
  { href: '/pricing',               label: 'Pricing'             },
];

const FOOTER_COMPANY = [
  { href: '/about',   label: 'About Us'   },
  { href: '/contact', label: 'Contact'    },
];

const FOOTER_ACCOUNT = [
  { href: '/login',    label: 'Log In'   },
  { href: '/register', label: 'Register' },
  { href: '/admin/login', label: 'Admin Login →' },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser]             = useState<any>(null);
  const [userRole, setUserRole]     = useState<string>('student');
  const [socialLinks, setSocialLinks] = useState<SocialLinksSettings>(DEFAULT_SOCIAL_LINKS);
  const menuContainerRef            = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef             = useRef<NodeJS.Timeout | null>(null);

  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  // Close menu on route change
  useEffect(() => { setIsMenuOpen(false); }, [pathname]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Shadow nav on scroll
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auth state & Social links loading
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role) setUserRole(profile.role);
      }
    };
    fetchUser();

    // Fetch live social media settings
    const loadSocialSettings = async () => {
      const links = await fetchSocialLinks();
      setSocialLinks(links);
    };
    loadSocialSettings();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile?.role) setUserRole(profile.role);
      }
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsMenuOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsMenuOpen(false);
    }, 200);
  };

  const dashboardHref = userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard';

  // Filter only enabled social platforms that have a valid URL
  const enabledSocialPlatforms = SOCIAL_PLATFORMS.filter((platform) => {
    const config = socialLinks[platform.key];
    return Boolean(config && config.enabled && config.url.trim());
  });

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0B1D3A] font-sans antialiased selection:bg-blue-100 selection:text-blue-900">

      {/* ── HEADER / NAVBAR ────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 w-full bg-white/98 backdrop-blur-md border-b transition-all duration-200 ${
          isScrolled
            ? 'border-slate-200 shadow-2xs'
            : 'border-slate-200/80'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-18 items-center justify-between relative">

            {/* ── LEFT: Hamburger Menu Button with Hover & Click Flyout ── */}
            <div
              ref={menuContainerRef}
              className="relative z-20 flex items-center"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl text-[#0B1D3A] hover:bg-slate-100 hover:text-[#2563EB] transition-all border ${
                  isMenuOpen
                    ? 'bg-slate-100 border-slate-300 text-[#2563EB] shadow-2xs'
                    : 'bg-white border-slate-200/90 shadow-2xs'
                }`}
                aria-label="Toggle navigation menu"
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5 stroke-[2.2]" />
                ) : (
                  <Menu className="h-5 w-5 stroke-[2.2]" />
                )}
              </button>

              {/* Hamburger Flyout Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute top-full left-0 mt-2.5 w-64 rounded-2xl bg-white border border-slate-200 p-2.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">Navigation</p>
                  </div>
                  <nav className="space-y-1">
                    {NAV_LINKS.map((link) => {
                      const isActive = pathname === link.href;
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all font-display ${
                            isActive
                              ? 'bg-blue-50 text-[#2563EB]'
                              : 'text-[#0B1D3A] hover:bg-slate-50 hover:text-[#2563EB]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`h-4 w-4 ${isActive ? 'text-[#2563EB]' : 'text-slate-400'}`} />
                            <span>{link.label}</span>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              )}
            </div>

            {/* ── CENTER: KnowledgePaat Logo (Centered in Viewport, No Box) ── */}
            <div className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
              <Link
                href="/"
                className="flex items-center justify-center transition-opacity hover:opacity-90"
                aria-label="KnowledgePaat — go to home"
              >
                <Logo size="md" />
              </Link>
            </div>

            {/* ── RIGHT: Log In & Get Started Free CTA ── */}
            <div className="relative z-20 flex items-center gap-2 sm:gap-3.5">
              {user ? (
                <>
                  <Link href={dashboardHref}>
                    <Button variant="outline" size="sm" className="font-semibold text-xs sm:text-sm">
                      Dashboard
                    </Button>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="font-semibold text-xs sm:text-sm text-slate-600 hover:text-[#2563EB] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="font-bold text-xs sm:text-sm text-[#0B1D3A] hover:text-[#2563EB] hover:bg-transparent px-3 py-2 rounded-xl transition-colors font-display"
                  >
                    Log In
                  </Link>
                  <Link href="/register">
                    <Button
                      variant="primary"
                      size="sm"
                      className="shadow-brand font-bold text-xs sm:text-sm px-3.5 sm:px-5 gap-1.5 rounded-xl"
                    >
                      <span>Get Started Free</span>
                      <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
                    </Button>
                  </Link>
                </>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT ───────────────────────────────────────────────── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── 5-COLUMN COMPACT & CLEAN FOOTER ────────────────────────────── */}
      <footer className="bg-[#0B1D3A] text-white mt-auto border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-12">

          {/* Top: 5-Column Grid */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">

            {/* Col 1: Small KnowledgePaat Logo (Clean, No Box) */}
            <div className="flex flex-col items-start justify-start">
              <Link href="/" className="inline-flex items-center" aria-label="KnowledgePaat home">
                <Logo size="sm" className="w-auto max-w-[130px] sm:max-w-[145px]" />
              </Link>
            </div>

            {/* Col 2: Platform */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#00C2CB] mb-3.5 font-display">Platform</p>
              <ul className="space-y-2.5">
                {FOOTER_PRODUCT.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Company */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#00C2CB] mb-3.5 font-display">Company</p>
              <ul className="space-y-2.5">
                {FOOTER_COMPANY.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Account */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#00C2CB] mb-3.5 font-display">Account</p>
              <ul className="space-y-2.5">
                {FOOTER_ACCOUNT.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 5: Social Media */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#00C2CB] mb-3.5 font-display">Social</p>
              {enabledSocialPlatforms.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  {enabledSocialPlatforms.map((platform) => {
                    const linkConfig = socialLinks[platform.key];
                    return (
                      <a
                        key={platform.key}
                        href={linkConfig.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={platform.label}
                        className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-[#00C2CB] hover:border-[#00C2CB]/60 hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-[#00C2CB]"
                      >
                        <SocialIcon platformKey={platform.key} />
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400/80">Connect with us online</p>
              )}
            </div>

          </div>

          {/* Bottom Bar: Copyright Only (No duplicate tagline) */}
          <div className="mt-10 pt-6 border-t border-slate-800/80 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} KnowledgePaat. All rights reserved.
            </p>
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