"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle, Eye, EyeOff, Lock, Loader2 } from 'lucide-react';
import { sanitizeInternalRedirectUrl } from '@/lib/safeRedirect';

function LoginForm() {
  const { isFeatureEnabled } = useFeatureFlags();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const rawRedirect = searchParams.get('redirectTo');

  // Redirect if already authenticated
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: isAdminRpc } = await supabase.rpc('is_admin');
        let role = isAdminRpc ? 'admin' : null;
        if (!role) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          role = profile?.role || 'student';
        }

        const fallback = role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
        const destination = sanitizeInternalRedirectUrl(rawRedirect, fallback);
        router.replace(destination);
      }
    };
    checkSession();
  }, [router, supabase, rawRedirect]);

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
      const { data: isAdminRpc } = await supabase.rpc('is_admin');
      let role = isAdminRpc ? 'admin' : null;

      if (!role) {
        let { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profile && !isAdminRpc) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            user_id: data.user.id,
            email: data.user.email || '',
            full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Student',
            role: 'student',
            is_active: true,
          }, { onConflict: 'id' });
        }

        role = profile?.role || 'student';
      }

      const fallback = role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
      const destination = sanitizeInternalRedirectUrl(rawRedirect, fallback);
      router.replace(destination);
    }
  };

  // Feature Flag: Student Login Gating
  if (!isFeatureEnabled('student_login')) {
    return (
      <section className="flex-1 flex items-center justify-center bg-[var(--color-bg-subtle)] py-16 px-4">
        <FeatureComingSoon
          title="Student Login Coming Soon"
          description="Student sign in is temporarily unavailable while we prepare the next release. If you are an administrator, please use the dedicated Admin Login portal."
          icon={Lock}
          backHref="/"
          backLabel="Back to Home"
          badgeText="Access Suspended"
        />
      </section>
    );
  }

  const registerHref = rawRedirect
    ? `/register?redirectTo=${encodeURIComponent(rawRedirect)}`
    : '/register';

  return (
    <section className="flex-1 flex items-center justify-center bg-[var(--color-bg-subtle)] py-12 sm:py-16 px-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Welcome back
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 font-medium">
              Sign in to your account to continue
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-[var(--radius-lg)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--color-error)] shrink-0 mt-0.5" />
              <div className="text-sm text-[var(--color-error)] leading-relaxed font-medium">
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input 
                label="Email address" 
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
                    className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] focus:outline-none cursor-pointer"
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
            <Link href={registerHref} className="font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition-colors">
              Create free account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="min-h-[50vh] flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </PublicLayout>
  );
}
