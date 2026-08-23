"use client";

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createClient();

  // Redirect if already authenticated as Admin
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const role = profile?.role || 'student';
        if (role === 'admin') {
          router.replace('/admin/dashboard');
        } else {
          // If a student is logged in and visits /admin/login, don't auto redirect silently so they know they are not an admin
        }
      }
    };
    checkSession();
  }, [router, supabase]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(signInError.message || "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Critical: Verify user role from profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        const role = profile?.role;

        if (role === 'admin') {
          router.replace('/admin/dashboard');
        } else {
          // Deny access and sign out the student account from the admin session
          await supabase.auth.signOut();
          setError("Admin access is restricted to authorized administrators.");
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during authentication.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-600/15 via-teal-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="px-6 py-6 flex items-center justify-between z-10 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded font-display">
            Admin Console
          </span>
        </Link>

        <Link 
          href="/" 
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Main Site
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 z-10">
        <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 shadow-2xs font-display">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22D3A2]" />
              Authorized Personnel Only
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Admin Login
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              Sign in to manage platform settings, student controls, store catalog, and system oversight.
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-[var(--radius-2xl)] border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-8 shadow-2xl space-y-5">
            
            {error && (
              <div className="bg-red-950/70 text-red-200 p-3.5 rounded-[var(--radius-md)] text-xs font-medium border border-red-800/80 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleAdminLogin}>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Admin Email Address
                </label>
                <input
                  type="email"
                  placeholder="admin@knowledgepaat.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-[var(--radius-md)] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-[var(--radius-md)] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full h-11 text-sm font-bold justify-center shadow-lg bg-blue-600 hover:bg-blue-500 text-white border-0"
                  isLoading={isLoading}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Sign in as Administrator
                </Button>
              </div>
            </form>

            <div className="pt-4 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-500">
                Are you a student?{' '}
                <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                  Student Sign In
                </Link>
              </p>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-slate-600 z-10">
        <p>© {new Date().getFullYear()} KnowledgePaat Administration. All rights reserved.</p>
      </footer>

    </div>
  );
}
