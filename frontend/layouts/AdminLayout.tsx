"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  MessageSquare, 
  BookOpen, 
  CreditCard,
  ShoppingBag,
  Receipt,
  ShieldCheck,
  Bot,
  ChevronRight,
  Settings
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { name: 'Dashboard',           href: '/admin/dashboard',            icon: LayoutDashboard },
  { name: 'Students',            href: '/admin/students',             icon: Users },
  { name: 'Jobs',                href: '/admin/jobs',                 icon: Briefcase },
  { name: 'Interview Prep',      href: '/admin/interview-questions',  icon: MessageSquare, matchPrefix: '/admin/interview' },
  { name: 'Notes',               href: '/admin/notes',                icon: BookOpen },
  { name: 'Mock Interviews',     href: '/admin/mock-interviews',      icon: Bot },
  { name: 'Store Products',      href: '/admin/store',                icon: ShoppingBag },
  { name: 'Orders',              href: '/admin/orders',               icon: Receipt },
  { name: 'Subscriptions',       href: '/admin/subscriptions',        icon: CreditCard },
  { name: 'Settings',            href: '/admin/settings',             icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const activeItem = NAV_ITEMS.find(item => item.href === pathname || (item.matchPrefix && pathname.startsWith(item.matchPrefix)));

  return (
    <div className="min-h-screen flex bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] font-sans antialiased">

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden animate-in fade-in duration-150"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[var(--color-border)]
        flex flex-col transform transition-transform duration-200 ease-out lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'}
      `}>

        {/* BRAND */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-[var(--color-border)] shrink-0">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 font-bold tracking-tight text-[var(--color-text-primary)] focus-ring rounded"
          >
            <div className="h-7 w-7 rounded-[var(--radius-sm)] bg-[var(--color-brand-600)] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm">
              GradZen<span className="text-[var(--color-brand-600)]">X</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)] px-1.5 py-0.5 rounded">
              Admin
            </span>
          </Link>
          <button
            className="lg:hidden p-1 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAV */}
        <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Admin Navigation">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)]">
            Management
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(item => {
              const Icon     = item.icon;
              const isActive = pathname === item.href || (item.matchPrefix && pathname.startsWith(item.matchPrefix));
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-colors ${
                      isActive
                        ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-tertiary)]'}`} />
                    <span className="flex-1 truncate">{item.name}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-[var(--color-brand-400)]" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ADMIN FOOTER */}
        <div className="p-3 border-t border-[var(--color-border)] shrink-0">
          <div className="flex items-center justify-between p-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-full bg-[var(--color-brand-600)] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                A
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">Admin Console</p>
                <p className="text-[10px] text-[var(--color-text-tertiary)]">System Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] p-1.5 rounded transition-colors focus-ring"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* TOP HEADER */}
        <header className="h-14 shrink-0 border-b border-[var(--color-border)] bg-white flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] p-1.5 rounded-[var(--radius-sm)] transition-colors -ml-1"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--color-text-tertiary)] hidden sm:inline">Admin</span>
              {activeItem && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] hidden sm:inline" />
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {activeItem.name}
                  </span>
                </>
              )}
              {!activeItem && (
                <span className="font-semibold text-[var(--color-text-primary)]">
                  Internal Management
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            <span className="text-xs text-[var(--color-text-tertiary)] hidden sm:inline font-medium">
              GradZenX Admin v1.0
            </span>
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