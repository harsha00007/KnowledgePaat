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
import { AlertCircle, CheckCircle2, Eye, EyeOff, ArrowRight, UserPlus, Loader2 } from 'lucide-react';
import { sanitizeInternalRedirectUrl } from '@/lib/safeRedirect';

function RegisterForm() {
  const { isFeatureEnabled } = useFeatureFlags();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const rawRedirect = searchParams.get('redirectTo');
  const initialStep = searchParams.get('step') === 'verify' ? 'verify' : 'register';
  const initialEmail = searchParams.get('email') || '';

  const [step, setStep] = useState<'register' | 'verify' | 'verified'>(initialStep);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  const loginHref = rawRedirect
    ? `/login?redirectTo=${encodeURIComponent(rawRedirect)}`
    : '/login';

  // Resend timer countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
        const fallback = role === 'admin' ? '/admin/dashboard' : '/e-books';
        const destination = sanitizeInternalRedirectUrl(rawRedirect, fallback);
        router.replace(destination);
      }
    };
    checkSession();
  }, [router, supabase, rawRedirect]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
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

      // Transition to OTP verification step
      setStep('verify');
      setResendCooldown(60);
      setVerifyError(null);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    if (isVerifying) return;
    const code = (codeToVerify || otpCode).trim();
    if (code.length < 6 || code.length > 8) {
      setVerifyError('Please enter a valid verification code (6–8 digits).');
      return;
    }

    setVerifyError(null);
    setResendNotice(null);
    setIsVerifying(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: code,
        type: 'signup',
      });

      if (verifyErr) {
        const msg = verifyErr.message?.toLowerCase() || '';
        if (msg.includes('expired')) {
          setVerifyError('The verification code has expired. Please request a new code below.');
        } else if (msg.includes('invalid') || msg.includes('token')) {
          setVerifyError('Invalid verification code. Please check your inbox and try again.');
        } else {
          setVerifyError(verifyErr.message || 'Verification failed. Please try again.');
        }
        setIsVerifying(false);
        return;
      }

      // Session established via Supabase Auth
      setStep('verified');

      // Safe redirect restoration
      const role = data?.user?.user_metadata?.role || 'student';
      const fallback = role === 'admin' ? '/admin/dashboard' : '/e-books';
      const destination = sanitizeInternalRedirectUrl(rawRedirect, fallback);

      setTimeout(() => {
        router.replace(destination);
      }, 1200);
    } catch (err: any) {
      setVerifyError(err?.message || 'An unexpected error occurred while verifying the code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setVerifyError(null);
    setResendNotice(null);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
      });

      if (resendErr) {
        const msg = resendErr.message?.toLowerCase() || '';
        if (resendErr.status === 429 || msg.includes('rate') || msg.includes('limit')) {
          setVerifyError('Too many resend attempts. Please wait 60 seconds before trying again.');
          setResendCooldown(60);
        } else {
          setVerifyError(resendErr.message || 'Unable to resend verification code right now.');
        }
      } else {
        setResendNotice('A new verification code has been dispatched to your email.');
        setResendCooldown(60);
      }
    } catch (err: any) {
      setVerifyError(err?.message || 'Network error while requesting a new code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanDigits = rawVal.replace(/\D/g, '').slice(0, 8);
    setOtpCode(cleanDigits);
    setVerifyError(null);

    // Auto-verify if 8 digits are fully entered or pasted and not already verifying
    if (cleanDigits.length === 8 && !isVerifying) {
      handleVerifyOtp(cleanDigits);
    }
  };

  // Feature Flag: Student Registration Gating
  if (!isFeatureEnabled('student_registration')) {
    return (
      <section className="flex-1 flex items-center justify-center bg-[var(--color-bg-subtle)] py-16 px-4">
        <FeatureComingSoon
          title="Registration Coming Soon"
          description="New student registrations are temporarily unavailable while we prepare the next phase of KnowledgePaat. If you already have an account, please sign in."
          icon={UserPlus}
          backHref="/"
          backLabel="Back to Home"
          badgeText="Registration Paused"
        />
      </section>
    );
  }

  return (
    <section className="flex-1 flex items-center justify-center bg-[var(--color-bg-subtle)] py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight font-display">
            {step === 'register' && 'Create your account'}
            {step === 'verify' && 'Verify your email'}
            {step === 'verified' && 'Account Confirmed!'}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
            {step === 'register' && 'Join thousands of students and eBook readers on KnowledgePaat'}
            {step === 'verify' && 'Enter the verification code sent to your inbox'}
            {step === 'verified' && 'Establishing your session and redirecting...'}
          </p>
        </div>
        
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
          {step === 'verified' ? (
            <div className="text-center py-4 animate-in fade-in duration-300">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Welcome to KnowledgePaat!</h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">
                Your email has been verified. Redirecting you to your books and dashboard...
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-brand-600)] font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecting...</span>
              </div>
            </div>
          ) : step === 'verify' ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-[#F8F7FF] border border-[#E8E5F5] rounded-[var(--radius-lg)] p-4 text-center">
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  We sent a verification code to:
                </p>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-0.5 break-all">
                  {email}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep('register');
                    setVerifyError(null);
                    setResendNotice(null);
                  }}
                  className="mt-2 text-xs font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] underline focus:outline-none"
                >
                  Wrong email address? Edit details
                </button>
              </div>

              {verifyError && (
                <div className="bg-red-50 text-[var(--color-error)] p-3.5 rounded-[var(--radius-md)] text-sm font-medium border border-red-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{verifyError}</span>
                </div>
              )}

              {resendNotice && (
                <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-[var(--radius-md)] text-sm font-medium border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resendNotice}</span>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyOtp();
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="otp-input" className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5 text-center">
                    Verification Code
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    pattern="[0-9]*"
                    placeholder="••••••••"
                    value={otpCode}
                    onChange={handleOtpChange}
                    disabled={isVerifying}
                    className="w-full h-12 text-center text-2xl font-mono font-bold tracking-[0.35em] rounded-[var(--radius-md)] border border-[var(--color-border)] focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20 outline-none transition-all placeholder:tracking-widest placeholder:text-slate-300"
                    required
                  />
                  <p className="text-[11px] text-[var(--color-text-tertiary)] text-center mt-1.5">
                    Paste or type the confirmation code from your email
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 text-sm font-semibold justify-center shadow-sm"
                  isLoading={isVerifying}
                  disabled={otpCode.length < 6 || isVerifying}
                >
                  Verify and Continue
                </Button>
              </form>

              <div className="pt-2 border-t border-[var(--color-border)] text-center space-y-3">
                <div className="text-xs text-[var(--color-text-secondary)]">
                  Didn&apos;t get the email?{' '}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || isResending}
                    className={`font-semibold transition-colors ${
                      resendCooldown > 0
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] cursor-pointer'
                    }`}
                  >
                    {isResending ? (
                      'Sending...'
                    ) : resendCooldown > 0 ? (
                      `Resend code in ${resendCooldown}s`
                    ) : (
                      'Resend verification code'
                    )}
                  </button>
                </div>
              </div>
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
                      <Link href={loginHref}>
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
          
          {step === 'register' && (
            <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-secondary)]">
              Already have an account?{' '}
              <Link href={loginHref} className="font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition-colors">
                Sign in here
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function RegisterPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="min-h-[50vh] flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </PublicLayout>
  );
}
