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
    <div className="min-h-screen flex flex-col bg-white font-sans text-gray-900">
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md transition-all">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold tracking-tight text-blue-600 flex items-center gap-2">
            <span className="bg-blue-600 text-white p-1 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            CareerLaunch
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <ul className="flex items-center gap-6">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                      pathname === link.href ? 'text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
              {user ? (
                <>
                  <Link href={userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard'}>
                    <Button variant="ghost" size="sm">Dashboard</Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={handleLogout}>Log out</Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Log in</Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm">Register</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-100 shadow-lg animate-in slide-in-from-top-2">
            <nav className="flex flex-col px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`px-3 py-3 rounded-md text-base font-medium ${
                    pathname === link.href ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-gray-100">
                {user ? (
                  <>
                    <Link href={userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard'} className="w-full">
                      <Button variant="outline" className="w-full justify-center">Dashboard</Button>
                    </Link>
                    <Button variant="primary" className="w-full justify-center" onClick={handleLogout}>Log out</Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="w-full">
                      <Button variant="outline" className="w-full justify-center">Log in</Button>
                    </Link>
                    <Link href="/register" className="w-full">
                      <Button variant="primary" className="w-full justify-center">Register</Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col w-full">
        {children}
      </main>

      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
            <div className="md:col-span-1">
              <Link href="/" className="text-xl font-extrabold tracking-tight text-blue-600 mb-4 flex items-center gap-2">
                <span className="bg-blue-600 text-white p-1 rounded-md">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                CareerLaunch
              </Link>
              <p className="text-sm text-gray-500 mt-4 leading-relaxed">
                Empowering students to land their first job faster with verified opportunities and expert preparation resources.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-3">
                <li><Link href="/jobs" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Find Jobs</Link></li>
                <li><Link href="/interview-preparation" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Interview Prep</Link></li>
                <li><Link href="/notes" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Study Notes</Link></li>
                <li><Link href="/pricing" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-3">
                <li><Link href="/contact" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Contact Us</Link></li>
                <li><Link href="/about" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">About Us</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} CareerLaunch. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}