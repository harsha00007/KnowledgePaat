"use client";

import React, { useState } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle, CheckCircle2, GraduationCap } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
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
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand-500)] text-white shadow-sm mb-4">
              <GraduationCap className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
              Create your GradZen<span className="text-[var(--color-brand-500)]">X</span> account
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
              Join thousands of students finding verified fresher jobs
            </p>
          </div>
          
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
            {success ? (
              <div className="text-center py-4 animate-in fade-in duration-300">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mb-4">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Registration Successful!</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">
                  We've sent a verification link to <strong className="text-[var(--color-text-primary)] font-semibold">{email}</strong>. Please check your inbox to confirm your account and sign in.
                </p>
                <Link href="/login" className="block w-full">
                  <Button className="w-full justify-center">Go to Sign in</Button>
                </Link>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                {error && (
                  <div className="bg-red-50 text-[var(--color-error)] p-3.5 rounded-[var(--radius-md)] text-sm font-medium border border-red-200 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <Input 
                    label="Full Name" 
                    type="text" 
                    placeholder="John Doe" 
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

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
                    placeholder="Min 8 characters" 
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                <div>
                  <Input 
                    label="Confirm Password" 
                    type="password" 
                    placeholder="Re-enter password" 
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full h-10 text-sm font-semibold justify-center shadow-sm" isLoading={isLoading}>
                    Create Free Account
                  </Button>
                </div>
              </form>
            )}
            
            {!success && (
              <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-secondary)]">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition-colors">
                  Sign in here
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
