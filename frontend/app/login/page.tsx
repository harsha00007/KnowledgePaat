"use client";

import React, { useState, useEffect } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle, GraduationCap, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createClient();

  // Redirect if already authenticated
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
        router.replace(role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
      }
    };
    checkSession();
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();
        
      if (profileError) {
        console.error("Profile fetch error:", profileError);
      }
      
      const role = profile?.role || 'student';
      
      router.refresh(); 
      if (role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/student/dashboard');
      }
    }
  };

  return (
    <PublicLayout>
      <section className="flex-1 flex items-center justify-center bg-[var(--color-bg-subtle)] py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand-500)] text-white shadow-sm mb-4">
              <GraduationCap className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
              Sign in to GradZen<span className="text-[var(--color-brand-500)]">X</span>
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
              Access your student dashboard and career resources
            </p>
          </div>
          
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
            <form className="space-y-4" onSubmit={handleLogin}>
              {error && (
                <div className="bg-red-50 text-[var(--color-error)] p-3.5 rounded-[var(--radius-md)] text-sm font-medium border border-red-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <div>
                <Input 
                  label="Email Address" 
                  type="email" 
                  placeholder="you@example.com" 
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Input 
                  label="Password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center text-xs text-[var(--color-text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[var(--color-border)] text-[var(--color-brand-500)] focus:ring-[var(--color-brand-500)]"
                  />
                  <span className="ml-2">Remember me</span>
                </label>

                <div className="text-xs">
                  <Link href="/forgot-password" className="font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition-colors">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full h-10 text-sm font-semibold justify-center shadow-sm" isLoading={isLoading}>
                  Sign in
                </Button>
              </div>
            </form>
            
            <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-secondary)]">
              Don't have an account yet?{' '}
              <Link href="/register" className="font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition-colors">
                Create free account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
