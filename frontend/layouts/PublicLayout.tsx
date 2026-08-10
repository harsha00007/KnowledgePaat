"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { createClient } from '@/utils/supabase/client';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('student');
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
        if (profile?.role) {
          setUserRole(profile.role);
        }
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
        if (profile?.role) {
          setUserRole(profile.role);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/jobs', label: 'Jobs' },
    { href: '/interview-preparation', label: 'Interview Prep' },
    { href: '/notes', label: 'Notes' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-slate-900 selection:bg-[var(--color-brand-100)] selection:text-[var(--color-brand-900)]">
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-lg transition-all">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-brand-600)] flex items-center gap-2.5">
            <span className="bg-[var(--color-brand-600)] text-white p-1.5 rounded-[var(--radius-md)] shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            CareerLaunch
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <ul className="flex items-center gap-7">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className={`text-sm font-semibold transition-colors focus-ring rounded-sm ${
                      pathname === link.href ? 'text-[var(--color-brand-600)]' : 'text-slate-600 hover:text-[var(--color-brand-600)]'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-8">
              {user ? (
                <>
                  <Link href={userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard'}>
                    <Button variant="outline" size="sm" className="font-semibold">Dashboard</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="font-semibold text-slate-600 hover:text-slate-900">Log out</Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="font-semibold text-slate-600 hover:text-slate-900">Log in</Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm" className="font-semibold">Register</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-[var(--radius-sm)] focus-ring transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-[calc(100%+1px)] left-0 w-full bg-white border-b border-slate-100 shadow-lg animate-in slide-in-from-top-2">
            <nav className="flex flex-col px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`px-4 py-3.5 rounded-[var(--radius-md)] text-base font-semibold ${
                    pathname === link.href ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-6 mt-4 border-t border-slate-100 px-2">
                {user ? (
                  <>
                    <Link href={userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard'} className="w-full">
                      <Button variant="outline" className="w-full justify-center h-12 text-base">Dashboard</Button>
                    </Link>
                    <Button variant="ghost" className="w-full justify-center h-12 text-base" onClick={handleLogout}>Log out</Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="w-full">
                      <Button variant="outline" className="w-full justify-center h-12 text-base">Log in</Button>
                    </Link>
                    <Link href="/register" className="w-full">
                      <Button variant="primary" className="w-full justify-center h-12 text-base shadow-sm">Register</Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col w-full animate-in fade-in duration-500">
        {children}
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
            <div className="md:col-span-1">
              <Link href="/" className="text-xl font-extrabold tracking-tight text-[var(--color-brand-600)] mb-5 flex items-center gap-2">
                <span className="bg-[var(--color-brand-600)] text-white p-1.5 rounded-[var(--radius-sm)] shadow-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                CareerLaunch
              </Link>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed max-w-xs">
                Empowering students to land their first job faster with verified opportunities and expert preparation resources.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-slate-900 mb-5 text-sm uppercase tracking-wider">Quick Links</h3>
              <ul className="space-y-3.5">
                <li><Link href="/jobs" className="text-sm font-medium text-slate-600 hover:text-[var(--color-brand-600)] transition-colors">Find Jobs</Link></li>
                <li><Link href="/interview-preparation" className="text-sm font-medium text-slate-600 hover:text-[var(--color-brand-600)] transition-colors">Interview Prep</Link></li>
                <li><Link href="/notes" className="text-sm font-medium text-slate-600 hover:text-[var(--color-brand-600)] transition-colors">Study Notes</Link></li>
                <li><Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-[var(--color-brand-600)] transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-slate-900 mb-5 text-sm uppercase tracking-wider">Support</h3>
              <ul className="space-y-3.5">
                <li><Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-[var(--color-brand-600)] transition-colors">Contact Us</Link></li>
                <li><Link href="/about" className="text-sm font-medium text-slate-600 hover:text-[var(--color-brand-600)] transition-colors">About Us</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm font-medium text-slate-500">
              © {new Date().getFullYear()} CareerLaunch. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}