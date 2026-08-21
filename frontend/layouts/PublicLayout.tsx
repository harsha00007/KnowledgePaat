"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/Button';
import { createClient } from '@/utils/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_LINKS = [
  { href: '/',                      label: 'Home'           },
  { href: '/jobs',                  label: 'Jobs'           },
  { href: '/interview-preparation', label: 'Interview Prep' },
  { href: '/notes',                 label: 'Notes'          },
  { href: '/pricing',               label: 'Pricing'        },
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
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled]             = useState(false);
  const [user, setUser]         = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('student');

  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  // Close mobile menu on route change
  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);

  // Shadow nav on scroll
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auth state
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

  const dashboardHref = userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] font-sans text-[var(--color-text-primary)] selection:bg-[var(--color-brand-100)] selection:text-[var(--color-brand-800)]">

      {/* ── NAVBAR ────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b transition-all duration-200 ${
          isScrolled
            ? 'border-[var(--color-border)] shadow-[var(--shadow-sm)]'
            : 'border-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 focus-ring rounded-[var(--radius-sm)]"
              aria-label="GradZenX — go to home"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-500)] text-white shadow-sm">
                <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <span className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
                GradZen<span className="text-[var(--color-brand-500)]">X</span>
              </span>
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Primary navigation">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors focus-ring
                      ${isActive
                        ? 'text-[var(--color-brand-500)] bg-[var(--color-brand-50)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-muted)]'
                      }
                    `}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop auth buttons */}
            <div className="hidden lg:flex items-center gap-2">
              <ThemeToggle size="sm" />
              {user ? (
                <>
                  <Link href={dashboardHref}>
                    <Button variant="outline" size="sm">Dashboard</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Log in</Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <div className="lg:hidden flex items-center gap-1.5">
              <ThemeToggle size="sm" />
              <button
                className="rounded-[var(--radius-md)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)] transition-colors focus-ring"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav panel */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-[var(--color-border)] bg-white animate-in slide-in-from-top-2 duration-150">
            <nav className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-col gap-0.5" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      px-4 py-2.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors
                      ${isActive
                        ? 'text-[var(--color-brand-500)] bg-[var(--color-brand-50)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-muted)]'
                      }
                    `}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 border-t border-[var(--color-border)] flex flex-col gap-2.5">
              {user ? (
                <>
                  <Link href={dashboardHref} className="w-full">
                    <Button variant="outline" className="w-full justify-center">Dashboard</Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-center" onClick={handleLogout}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className="w-full">
                    <Button variant="outline" className="w-full justify-center">Log in</Button>
                  </Link>
                  <Link href="/register" className="w-full">
                    <Button variant="primary" className="w-full justify-center">Get Started Free</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col w-full">
        {children}
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="bg-[var(--color-dark)] text-[var(--color-text-inverse)] mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-16">

          {/* Top: Brand + Links */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">

            {/* Brand column */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2 focus-ring rounded-[var(--radius-sm)]" aria-label="GradZenX home">
                <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-500)] text-white">
                  <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <span className="text-base font-bold tracking-tight text-white">
                  GradZen<span className="text-[var(--color-brand-400)]">X</span>
                </span>
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-white/60 max-w-xs">
                Your career launchpad. Verified jobs, expert interview prep, and curated resources — built for students and fresh graduates.
              </p>
            </div>

            {/* Product links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Platform</p>
              <ul className="space-y-3">
                {FOOTER_PRODUCT.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/60 hover:text-white transition-colors focus-ring rounded-sm">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Company</p>
              <ul className="space-y-3">
                {FOOTER_COMPANY.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/60 hover:text-white transition-colors focus-ring rounded-sm">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Account</p>
              <ul className="space-y-3">
                {FOOTER_ACCOUNT.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/60 hover:text-white transition-colors focus-ring rounded-sm">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} GradZenX. All rights reserved.
            </p>
            <p className="text-xs text-white/30">
              Helping students launch careers with confidence.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}