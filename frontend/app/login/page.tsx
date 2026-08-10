"use client";

import React, { useState } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
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
        .single();
        
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
      <section className="flex-1 flex items-center justify-center bg-[var(--color-bg)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in to access your dashboard
            </p>
          </div>
          
          <Card className="p-8 shadow-xl border-slate-100 bg-white">
            <form className="space-y-6" onSubmit={handleLogin}>
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-[var(--radius-md)] text-sm font-medium border border-red-100 flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
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
                  type="password" 
                  placeholder="••••••••" 
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] focus-ring transition-colors"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-slate-700">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link href="/forgot-password" className="font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-500)] transition-colors focus-ring rounded-sm">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <Button type="submit" className="w-full h-11 text-base shadow-sm" isLoading={isLoading}>
                  Sign in
                </Button>
              </div>
            </form>
            
            <p className="mt-8 text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-500)] transition-colors focus-ring rounded-sm">
                Register here
              </Link>
            </p>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
