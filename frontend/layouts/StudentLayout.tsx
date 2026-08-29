"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LogOut, 
  LayoutDashboard, 
  User, 
  FileUp, 
  Briefcase, 
  BookOpen, 
  FileText, 
  CreditCard,
  ShoppingBag,
  PackageCheck,
  ShoppingCart,
  Menu,
  X,
  GraduationCap,
  Bot,
  Sparkles,
  TrendingUp,
  ChevronRight,
  Lock
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { createClient } from '@/utils/supabase/client';
import { useCart } from '@/hooks/useCart';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';
import { FeatureKey } from '@/lib/featureFlags';

interface NavLinkItem {
  name: string;
  href: string;
  icon: any;
  featureKey: FeatureKey;
}

interface NavGroupItem {
  label: string;
  links: NavLinkItem[];
}

const NAV_GROUPS: NavGroupItem[] = [
  {
    label: 'Overview',
    links: [
      { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard, featureKey: 'student_dashboard' },
    ],
  },
  {
    label: 'Career Tools',
    links: [
      { name: 'Resume', href: '/student/resume', icon: FileUp, featureKey: 'student_resume' },
      { name: 'Jobs', href: '/student/jobs', icon: Briefcase, featureKey: 'student_jobs' },
      { name: 'Career Progress', href: '/student/career-progress', icon: TrendingUp, featureKey: 'student_career_progress' },
      { name: 'Career Intelligence', href: '/student/career-intelligence', icon: Sparkles, featureKey: 'student_career_intelligence' },
    ],
  },
  {
    label: 'Preparation',
    links: [
      { name: 'Interview Prep', href: '/student/interview-preparation', icon: BookOpen, featureKey: 'student_interview_prep' },
      { name: 'Mock Interviews', href: '/student/mock-interview', icon: Bot, featureKey: 'student_mock_interviews' },
      { name: 'Notes', href: '/student/notes', icon: FileText, featureKey: 'student_notes' },
    ],
  },
  {
    label: 'Account',
    links: [
      { name: 'Store', href: '/student/store', icon: ShoppingBag, featureKey: 'student_store' },
      { name: 'My Purchases', href: '/student/purchases', icon: PackageCheck, featureKey: 'student_purchases' },
      { name: 'Subscription', href: '/student/subscription', icon: CreditCard, featureKey: 'student_subscription' },
    ],
  },
];

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [studentName, setStudentName] = useState('Student');
  const [studentEmail, setStudentEmail] = useState('');
  const profileMenuRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { cartCount } = useCart();
  const { isModuleEnabled, isPortalEnabled } = useFeatureFlags();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStudentName(user.user_metadata?.full_name || 'Student');
        setStudentEmail(user.email || '');
      }
    };
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) =>
    href === '/student/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/');

  const initials = studentName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden flex bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] font-sans antialiased">

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 md:hidden animate-in fade-in duration-150"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR - INDEPENDENT SCROLL CONTAINER */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 h-full md:h-screen md:h-[100dvh] max-h-screen max-h-[100dvh]
        bg-white border-r border-[var(--color-border)] overflow-hidden
        transform transition-transform duration-200 ease-in-out flex flex-col shrink-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* LOGO */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--color-border)] shrink-0 bg-white">
          <Link href="/student/dashboard" className="flex items-center gap-2 focus-ring rounded">
            <Logo size="sm" />
          </Link>
          <button
            className="md:hidden text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1 rounded transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION LINKS - INDEPENDENT SCROLL */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 scroll-smooth" aria-label="Student Navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)]">
                {group.label}
              </p>
              <ul className="px-2 space-y-0.5">
                {group.links.map((link) => {
                  const active = isActive(link.href);
                  const isEnabled = isModuleEnabled(link.featureKey);
                  const Icon = link.icon;

                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-colors group ${
                          active
                            ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]'
                            : isEnabled
                            ? 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]'
                            : 'text-slate-400 hover:bg-amber-50/50 hover:text-slate-600'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${
                          active 
                            ? 'text-[var(--color-brand-500)]' 
                            : isEnabled 
                            ? 'text-[var(--color-text-tertiary)]' 
                            : 'text-slate-300'
                        }`} />
                        <span className="flex-1 truncate">{link.name}</span>
                        
                        {!isEnabled && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80 px-1.5 py-0.5 rounded font-display">
                            <Lock className="w-2.5 h-2.5 text-amber-600" />
                            Soon
                          </span>
                        )}

                        {isEnabled && active && <ChevronRight className="w-3.5 h-3.5 text-[var(--color-brand-400)]" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* USER FOOTER */}
        <div className="p-3 border-t border-[var(--color-border)] shrink-0 bg-white">
          <div className="flex items-center gap-3 p-2 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-subtle)] transition-colors">
            <div className="h-8 w-8 rounded-full bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] flex items-center justify-center text-[var(--color-brand-600)] font-bold text-xs shrink-0 uppercase">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{studentName}</p>
              {studentEmail && (
                <p className="text-[10px] text-[var(--color-text-tertiary)] truncate">{studentEmail}</p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] p-1.5 rounded transition-colors focus-ring"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-full md:h-screen md:h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden">

        {/* TOP HEADER */}
        <header className="h-16 shrink-0 border-b border-[var(--color-border)] bg-white flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] p-1.5 rounded-[var(--radius-sm)] transition-colors -ml-1"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo visible on mobile only when sidebar is closed */}
            <Link href="/student/dashboard" className="md:hidden flex items-center gap-1.5">
              <Logo size="sm" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle (renders only when Admin enables Theme Support) */}
            <ThemeToggle size="sm" />

            {/* Cart */}
            <Link
              href="/student/cart"
              className="relative p-2 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-brand-600)] transition-colors"
              title="View Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[var(--color-brand-500)] text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white leading-none">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Top-Right Profile Menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-600)] bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-brand-100)] transition-colors cursor-pointer"
                aria-expanded={isProfileMenuOpen}
                aria-label="User profile menu"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline truncate max-w-[120px]">{studentName.split(' ')[0]}</span>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-[var(--radius-lg)] bg-white border border-[var(--color-border)] shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-[var(--color-border)] mb-1">
                    <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{studentName}</p>
                    {studentEmail && (
                      <p className="text-[10px] text-[var(--color-text-secondary)] truncate">{studentEmail}</p>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <Link
                      href="/student/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-brand-600)] rounded-[var(--radius-sm)] transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      href="/student/subscription"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-brand-600)] rounded-[var(--radius-sm)] transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                      <span>Subscription</span>
                    </Link>
                  </div>

                  <div className="border-t border-[var(--color-border)] mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-[var(--radius-sm)] transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT - INDEPENDENT SCROLL */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-[var(--color-bg-subtle)] scroll-smooth min-w-0">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-200">
            {!isPortalEnabled ? (
              <FeatureComingSoon
                title="Student Portal Coming Soon"
                description="KnowledgePaat Student Portal is currently undergoing scheduled platform updates and feature rollout. Please check back shortly."
                backHref="/"
                backLabel="Return to Homepage"
                badgeText="Portal Paused"
              />
            ) : (
              children
            )}
          </div>
        </div>
      </main>
    </div>
  );
}