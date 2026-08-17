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
  Menu,
  X,
  GraduationCap
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [studentName, setStudentName] = useState('Student');
  const [studentEmail, setStudentEmail] = useState('student@example.com');
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStudentName(user.user_metadata?.full_name || 'Student');
        setStudentEmail(user.email || 'student@example.com');
      }
    };
    fetchUser();
  }, [supabase]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', href: '/student/profile', icon: User },
    { name: 'Resume', href: '/student/resume', icon: FileUp },
    { name: 'Jobs', href: '/student/jobs', icon: Briefcase },
    { name: 'Interview Preparation', href: '/student/interview-preparation', icon: BookOpen },
    { name: 'Notes', href: '/student/notes', icon: FileText },
    { name: 'Subscription', href: '/student/subscription', icon: CreditCard },
  ];

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
        transform transition-transform duration-200 ease-in-out flex flex-col shrink-0 shadow-sm md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* LOGO */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--color-border)] shrink-0">
          <Link href="/student/dashboard" className="flex items-center gap-2 focus-ring rounded-[var(--radius-sm)]">
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
        <nav className="p-3.5 flex flex-col gap-1 flex-1 overflow-y-auto" aria-label="Student Navigation">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            Student Portal
          </div>
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/student/dashboard');
            const Icon = link.icon;
            
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                className={`
                  flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors
                  ${isActive 
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] font-semibold' 
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]'
                  }
                `}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--color-brand-500)]' : 'text-[var(--color-text-tertiary)]'}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* USER PROFILE & LOGOUT */}
        <div className="p-3.5 border-t border-[var(--color-border)] bg-white shrink-0">
          <div className="flex items-center justify-between p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-subtle)] transition-colors">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="h-8 w-8 rounded-full bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] flex items-center justify-center text-[var(--color-brand-600)] font-bold text-xs shrink-0 uppercase">
                {studentName.charAt(0)}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{studentName}</p>
                <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">{studentEmail}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] p-1.5 rounded-[var(--radius-sm)] transition-colors focus-ring"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[var(--color-bg-subtle)]">
        
        {/* TOP HEADER */}
        <header className="h-16 shrink-0 border-b border-[var(--color-border)] bg-white flex items-center justify-between px-4 sm:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] p-2 rounded-[var(--radius-md)] transition-colors -ml-1.5"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] tracking-tight">
                Welcome back, {studentName.split(' ')[0]} 👋
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/student/profile" 
              className="flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-600)] bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-3 py-1.5 rounded-full hover:bg-[var(--color-brand-100)] transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">My Profile</span>
            </Link>
          </div>
        </header>
        
        {/* PAGE CONTENT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-200">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}