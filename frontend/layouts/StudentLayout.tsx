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
  ChevronRight
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useCart } from '@/hooks/useCart';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_GROUPS = [
  {
    label: 'Overview',
    links: [
      { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Career Tools',
    links: [
      { name: 'My Profile', href: '/student/profile', icon: User },
      { name: 'Resume', href: '/student/resume', icon: FileUp },
      { name: 'Jobs', href: '/student/jobs', icon: Briefcase },
      { name: 'Career Progress', href: '/student/career-progress', icon: TrendingUp },
      { name: 'Career Intelligence', href: '/student/career-intelligence', icon: Sparkles },
    ],
  },
  {
    label: 'Preparation',
    links: [
      { name: 'Interview Prep', href: '/student/interview-preparation', icon: BookOpen },
      { name: 'Mock Interviews', href: '/student/mock-interview', icon: Bot },
      { name: 'Notes', href: '/student/notes', icon: FileText },
    ],
  },
  {
    label: 'Account',
    links: [
      { name: 'Store', href: '/student/store', icon: ShoppingBag },
      { name: 'My Purchases', href: '/student/purchases', icon: PackageCheck },
      { name: 'Subscription', href: '/student/subscription', icon: CreditCard },
    ],
  },
];

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [studentName, setStudentName] = useState('Student');
  const [studentEmail, setStudentEmail] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { cartCount } = useCart();

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
  }, [pathname]);

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
    <div className="min-h-screen flex bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] font-sans antialiased">

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 md:hidden animate-in fade-in duration-150"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-[var(--color-border)]
        transform transition-transform duration-200 ease-in-out flex flex-col shrink-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* LOGO */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--color-border)] shrink-0">
          <Link href="/student/dashboard" className="flex items-center gap-2 focus-ring rounded">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-500)] text-white shadow-sm">
              <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="text-base font-bold tracking-tight text-[var(--color-text-primary)]">
              GradZen<span className="text-[var(--color-brand-500)]">X</span>
            </span>
          </Link>
          <button
            className="md:hidden text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1 rounded transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 overflow-y-auto py-4" aria-label="Student Navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)]">
                {group.label}
              </p>
              <ul className="px-2 space-y-0.5">
                {group.links.map((link) => {
                  const active = isActive(link.href);
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-colors ${
                          active
                            ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]'
                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[var(--color-brand-500)]' : 'text-[var(--color-text-tertiary)]'}`} />
                        <span className="flex-1 truncate">{link.name}</span>
                        {active && <ChevronRight className="w-3.5 h-3.5 text-[var(--color-brand-400)]" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* USER FOOTER */}
        <div className="p-3 border-t border-[var(--color-border)] shrink-0">
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
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* TOP HEADER */}
        <header className="h-14 shrink-0 border-b border-[var(--color-border)] bg-white flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0">
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
              <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-500)] text-white">
                <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span className="text-sm font-bold">GradZen<span className="text-[var(--color-brand-500)]">X</span></span>
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

            {/* Profile */}
            <Link
              href="/student/profile"
              className="flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-600)] bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-brand-100)] transition-colors"
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline truncate max-w-[120px]">{studentName.split(' ')[0]}</span>
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[var(--color-bg-subtle)]">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-200">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}