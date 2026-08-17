"use client";

import React, { useState } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle, Lock } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createClient();

  const handleUpdate = async (e: React.FormEvent) => {
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

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
    } else {
      alert("Password updated successfully!");
      router.push('/login');
    }
  };

  return (
    <PublicLayout>
      <section className="flex-1 flex items-center justify-center bg-[var(--color-bg-subtle)] py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border border-[var(--color-brand-200)] shadow-sm mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
              Create new password
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
              Enter your new secure password below
            </p>
          </div>
          
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
            <form className="space-y-4" onSubmit={handleUpdate}>
              {error && (
                <div className="bg-red-50 text-[var(--color-error)] p-3.5 rounded-[var(--radius-md)] text-sm font-medium border border-red-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <div>
                <Input 
                  label="New Password" 
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
                  label="Confirm New Password" 
                  type="password" 
                  placeholder="Re-enter new password" 
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full h-10 text-sm font-semibold justify-center shadow-sm" isLoading={isLoading}>
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
