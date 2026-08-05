"use client";

import React, { useState } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

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
      <section className="flex-1 flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
          
          <Card className="p-8 shadow-xl border-gray-100 bg-white">
            {success ? (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
                <p className="text-gray-600 mb-6">
                  We have sent a password reset link to <strong>{email}</strong>.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full">Return to login</Button>
                </Link>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleReset}>
                {error && (
                  <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                    {error}
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

                <div>
                  <Button type="submit" className="w-full" isLoading={isLoading}>
                    Send Reset Link
                  </Button>
                </div>
              </form>
            )}
            
            {!success && (
              <p className="mt-8 text-center text-sm text-gray-600">
                Remember your password?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Back to login
                </Link>
              </p>
            )}
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
