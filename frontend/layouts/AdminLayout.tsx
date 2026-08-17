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
  ShieldCheck,
  Search
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Students', href: '/admin/students', icon: Users },
    { name: 'Jobs', href: '/admin/jobs', icon: Briefcase },
    { name: 'Interview Questions', href: '/admin/interview-questions', icon: MessageSquare },
    { name: 'Notes', href: '/admin/notes', icon: BookOpen },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const activeItem = navItems.find(item => item.href === pathname);

  return (
    <div className="min-h-screen flex bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] font-sans antialiased">
      
      {/* MOBILE BACKDROP OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[var(--color-border)] flex flex-col transform transition-transform duration-200 ease-out lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'}
      `}>
        {/* BRAND LOGO */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--color-border)]">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 font-extrabold text-base tracking-tight text-[var(--color-text-primary)]">
            <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--color-brand-600)] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>GradZen<span className="text-[var(--color-brand-600)]">X</span></span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)] px-1.5 py-0.5 rounded">Admin</span>
          </Link>
          <button 
            className="lg:hidden p-1 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* NAVIGATION LINKS */}
        <nav className="p-3 flex flex-col gap-1 flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            Management
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href} 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-[var(--radius-md)] transition-colors ${
                  isActive 
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-bold' 
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-tertiary)]'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="p-3 border-t border-[var(--color-border)]">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-red-50 hover:text-[var(--color-error)] rounded-[var(--radius-md)] transition-colors w-full"
          >
            <LogOut className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* TOPBAR HEADER */}
        <header className="h-16 border-b border-[var(--color-border)] bg-white flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 sticky top-0">
          
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] rounded-[var(--radius-md)]"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-[var(--color-text-primary)]">
                {activeItem?.name || 'Admin Console'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 pl-3 border-l border-[var(--color-border)]">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-[var(--color-text-primary)] leading-tight">Admin Console</p>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">Super Admin</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)] flex items-center justify-center text-xs font-bold shrink-0">
                AD
              </div>
            </div>
          </div>

        </header>

        {/* MAIN BODY */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[var(--color-bg-subtle)]">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}