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
      <section className="flex-1 flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Create an account
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Start your career journey with CareerLaunch
            </p>
          </div>
          
          <Card className="p-8 shadow-xl border-gray-100 bg-white">
            {success ? (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
                <p className="text-gray-600 mb-6">
                  We've sent a verification email to <strong>{email}</strong>. Please check your inbox and verify your email to log in.
                </p>
                <Link href="/login">
                  <Button className="w-full">Go to Login</Button>
                </Link>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleRegister}>
                {error && (
                  <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
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

                <div>
                  <Button type="submit" className="w-full" isLoading={isLoading}>
                    Create Account
                  </Button>
                </div>
              </form>
            )}
            
            {!success && (
              <p className="mt-8 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
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
