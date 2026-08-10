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
  Search,
  Bell
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
    { name: 'Dashboard', href: '/student/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'My Profile', href: '/student/profile', icon: <User className="w-5 h-5" /> },
    { name: 'Resume Upload', href: '/student/resume', icon: <FileUp className="w-5 h-5" /> },
    { name: 'Jobs', href: '/student/jobs', icon: <Briefcase className="w-5 h-5" /> },
    { name: 'Interview Preparation', href: '/student/interview-preparation', icon: <BookOpen className="w-5 h-5" /> },
    { name: 'Notes', href: '/student/notes', icon: <FileText className="w-5 h-5" /> },
    { name: 'Subscription', href: '/student/subscription', icon: <CreditCard className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex font-sans bg-[var(--color-bg)]">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 
        transform transition-transform duration-300 ease-in-out flex flex-col shadow-[var(--shadow-soft)] md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
          <Link href="/student/dashboard" className="text-xl font-bold text-[var(--color-brand-600)] tracking-tight flex items-center gap-2">
            <span className="bg-[var(--color-brand-100)] text-[var(--color-brand-600)] p-1.5 rounded-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            CareerLaunch
          </Link>
          <button 
            className="md:hidden text-slate-400 hover:text-slate-600 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="p-4 flex flex-col gap-1.5 flex-1 overflow-y-auto custom-scrollbar">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/student/dashboard');
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                className={`
                  flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-[var(--radius-md)] transition-all
                  ${isActive 
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <span className={isActive ? 'text-[var(--color-brand-600)]' : 'text-slate-400'}>
                  {link.icon}
                </span>
                {link.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="flex items-center justify-between p-4 border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors shrink-0"
          onClick={handleLogout}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--color-brand-100)] flex items-center justify-center text-[var(--color-brand-700)] font-bold border border-[var(--color-brand-200)] uppercase shrink-0">
              {studentName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">{studentName}</p>
              <p className="text-xs text-slate-500 truncate">{studentEmail}</p>
            </div>
          </div>
          <LogOut className="h-5 w-5 text-slate-400 shrink-0" />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-16 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-slate-600 hover:bg-slate-100 p-2 rounded-[var(--radius-sm)] transition-colors -ml-2"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Welcome back, {studentName.split(' ')[0]}! 👋</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            
            {/* Search Box */}
            <div className="hidden md:flex relative items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-[var(--radius-lg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] focus:border-[var(--color-brand-400)] focus:bg-white transition-all w-64"
              />
            </div>

            {/* Notification */}
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100 focus-ring">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            {/* Profile Avatar Mobile Only */}
            <div className="sm:hidden h-9 w-9 rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)] flex items-center justify-center font-bold text-sm shrink-0 border border-[var(--color-brand-200)]">
              {studentName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        
        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-300">
            {/* Mobile Welcome Message (hidden on sm+) */}
            <div className="sm:hidden mb-6">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Welcome back, {studentName.split(' ')[0]}! 👋</h1>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}