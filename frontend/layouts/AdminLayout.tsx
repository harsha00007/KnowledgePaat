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
  Search
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Students', href: '/admin/students', icon: <Users className="w-5 h-5" /> },
    { name: 'Jobs', href: '/admin/jobs', icon: <Briefcase className="w-5 h-5" /> },
    { name: 'Interview Questions', href: '/admin/interview-questions', icon: <MessageSquare className="w-5 h-5" /> },
    { name: 'Notes', href: '/admin/notes', icon: <BookOpen className="w-5 h-5" /> },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: <CreditCard className="w-5 h-5" /> },
  ];

  const NavLinks = () => (
    <>
      {navItems.map(item => {
        const isActive = pathname === item.href;
        return (
          <Link 
            key={item.name} 
            href={item.href} 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-[var(--radius-md)] transition-all ${
              isActive 
                ? 'bg-[var(--color-brand-600)] text-white shadow-sm' 
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {item.icon}
            {item.name}
          </Link>
        );
      })}
    </>
  );
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[var(--color-brand-950)] flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
          <Link href="/admin/dashboard" className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="bg-[var(--color-brand-500)] text-white p-1.5 rounded-lg shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            CareerLaunch
          </Link>
          <button className="lg:hidden text-slate-400 hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="p-4 flex flex-col gap-1.5 flex-1 overflow-y-auto custom-scrollbar">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white rounded-[var(--radius-md)] transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[var(--color-bg)]">
        
        {/* TOP HEADER */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-8 shrink-0 z-10 sticky top-0">
          
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-[var(--radius-sm)] transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block tracking-tight">
              {navItems.find(item => item.href === pathname)?.name || 'Admin'}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            
            {/* Search (UI Only) */}
            <div className="relative hidden md:block w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-100)] rounded-[var(--radius-lg)] text-sm transition-all outline-none"
              />
            </div>

            <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 leading-none">Admin User</p>
                <p className="text-xs text-slate-500 mt-1">admin@careerlaunch.com</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)] flex items-center justify-center font-bold border border-[var(--color-brand-200)] shadow-sm">
                A
              </div>
            </div>
          </div>

        </header>

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-300">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}