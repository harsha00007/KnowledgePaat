"use client";

import React, { useState, useEffect } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle, CheckCircle2, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [success, setSuccess] = useState(false);
  
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsAlreadyRegistered(false);

    // 1A. Full Name Validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Full Name is required.');
      return;
    }
    if (trimmedName.length > 20) {
      setError('Full Name must not exceed 20 characters.');
      return;
    }

    // 1B. Email Validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Email address is required.');
      return;
    }
    if (trimmedEmail.length > 255) {
      setError('Email address must not exceed 255 characters.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    // 1C. Password Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password.length > 20) {
      setError('Password must not exceed 20 characters.');
      return;
    }

    // 1D. Confirm Password Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            role: 'student',
          }
        }
      });

      if (signUpError) {
        const msg = signUpError.message || '';
        const lower = msg.toLowerCase();
        
        if (
          lower.includes('already registered') ||
          lower.includes('already exists') ||
          lower.includes('user already exists') ||
          lower.includes('identity already exists') ||
          signUpError.status === 422
        ) {
          setIsAlreadyRegistered(true);
          setError('This email is already registered. Please log in.');
        } else {
          setError(msg);
        }
        setIsLoading(false);
        return;
      }

      // Check if user identity already existed (Supabase returns user with empty identities when email is taken)
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setIsAlreadyRegistered(true);
        setError('This email is already registered. Please log in.');
        setIsLoading(false);
        return;
      }

      // Safe fallback profile creation
      if (data?.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          user_id: data.user.id,
          email: data.user.email || trimmedEmail,
          full_name: trimmedName,
          role: 'student',
          is_active: true,
        }, { onConflict: 'id' });
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <section className="flex-1 flex items-center justify-center bg-[var(--color-bg-subtle)] py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight font-display">
              Create your account
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
                  <div className="bg-red-50 text-[var(--color-error)] p-3.5 rounded-[var(--radius-md)] text-sm font-medium border border-red-200 flex flex-col gap-2">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                    {isAlreadyRegistered && (
                      <div className="pt-1">
                        <Link href="/login">
                          <Button variant="primary" size="sm" className="w-full justify-center text-xs">
                            Go to Login <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Input 
                    label="Full Name" 
                    type="text" 
                    placeholder="John Doe" 
                    autoComplete="name"
                    required
                    maxLength={20}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-[11px] ${name.length > 20 ? 'text-[var(--color-error)] font-bold' : 'text-[var(--color-text-tertiary)]'}`}>
                      {name.length}/20
                    </span>
                  </div>
                </div>

                <div>
                  <Input 
                    label="Email Address" 
                    type="email" 
                    placeholder="you@example.com" 
                    autoComplete="email"
                    required
                    maxLength={255}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <Input 
                    label="Password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="8–20 characters" 
                    required
                    minLength={8}
                    maxLength={20}
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
                  <div className="flex justify-between items-center mt-1 text-[11px] text-[var(--color-text-tertiary)]">
                    <span>Must be 8–20 characters</span>
                    <span className={password.length > 20 ? 'text-[var(--color-error)] font-bold' : ''}>
                      {password.length}/20
                    </span>
                  </div>
                </div>
                
                <div>
                  <Input 
                    label="Confirm Password" 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Re-enter password" 
                    required
                    minLength={8}
                    maxLength={20}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] focus:outline-none"
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
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
