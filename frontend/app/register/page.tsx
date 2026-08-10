"use client";

import React, { useState } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

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
      <section className="flex-1 flex items-center justify-center bg-[var(--color-bg)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Create an account
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Start your career journey with CareerLaunch
            </p>
          </div>
          
          <Card className="p-8 shadow-xl border-slate-100 bg-white">
            {success ? (
              <div className="text-center animate-in fade-in zoom-in duration-300">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-[var(--color-success-50)] border border-[var(--color-success-200)] mb-5">
                  <svg className="h-7 w-7 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Successful!</h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  We've sent a verification email to <strong className="text-slate-900 font-semibold">{email}</strong>. Please check your inbox and verify your email to log in.
                </p>
                <Link href="/login">
                  <Button className="w-full h-11 text-base shadow-sm">Go to Login</Button>
                </Link>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleRegister}>
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
                    placeholder="Create a strong password (min 8 chars)" 
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
                    placeholder="Confirm your password" 
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full h-11 text-base shadow-sm" isLoading={isLoading}>
                    Create Account
                  </Button>
                </div>
              </form>
            )}
            
            {!success && (
              <p className="mt-8 text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-500)] transition-colors focus-ring rounded-sm">
                  Sign in
                </Link>
              </p>
            )}
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
