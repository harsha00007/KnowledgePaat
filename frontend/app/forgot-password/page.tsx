"use client";

import React, { useState } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(true);
    }

    setIsLoading(false);
  };

  return (
    <PublicLayout>
      <section className="flex-1 flex items-center justify-center bg-[var(--color-bg-subtle)] py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border border-[var(--color-brand-200)] shadow-sm mb-4">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
              Reset your password
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
              Enter your email and we'll send you a recovery link
            </p>
          </div>
          
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
            {success ? (
              <div className="text-center py-4 animate-in fade-in duration-300">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mb-4">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Check your email</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">
                  We've sent a password reset link to <strong className="text-[var(--color-text-primary)] font-semibold">{email}</strong>.
                </p>
                <Link href="/login" className="block w-full">
                  <Button variant="outline" className="w-full justify-center">Return to Sign in</Button>
                </Link>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleReset}>
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
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full h-10 text-sm font-semibold justify-center shadow-sm" isLoading={isLoading}>
                    Send Reset Link
                  </Button>
                </div>
              </form>
            )}
            
            {!success && (
              <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-secondary)]">
                Remember your password?{' '}
                <Link href="/login" className="font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition-colors">
                  Back to Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
