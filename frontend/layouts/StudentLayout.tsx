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
    <div className="min-h-screen flex bg-gray-50">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-200 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <Link href="/student/dashboard" className="text-xl font-bold text-blue-600">
            CareerLaunch
          </Link>
          <button 
            className="md:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="p-4 flex flex-col gap-1 flex-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/student/dashboard');
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                className={`
                  flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>
                  {link.icon}
                </span>
                {link.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="flex items-center justify-between p-4 border-t border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={handleLogout}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase shrink-0">
              {studentName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{studentName}</p>
              <p className="text-xs text-gray-500 truncate">{studentEmail}</p>
            </div>
          </div>
          <LogOut className="h-5 w-5 text-gray-400 shrink-0" />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-16 shrink-0 border-b border-gray-200 bg-white flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900">Welcome back, {studentName.split(' ')[0]}! 👋</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            
            {/* Search Box */}
            <div className="hidden md:flex relative items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all w-64"
              />
            </div>

            {/* Notification */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

            {/* Profile Avatar */}
            <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
              {studentName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        
        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          {/* Mobile Welcome Message (hidden on sm+) */}
          <div className="sm:hidden mb-6">
            <h1 className="text-xl font-bold text-gray-900">Welcome back, {studentName.split(' ')[0]}! 👋</h1>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}