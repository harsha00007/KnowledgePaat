"use client";

import React, { useState } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

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
      // Password updated successfully
      alert("Password updated successfully!");
      router.push('/login');
    }
  };

  return (
    <PublicLayout>
      <section className="flex-1 flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Create new password
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Please enter your new password below.
            </p>
          </div>
          
          <Card className="p-8 shadow-xl border-gray-100 bg-white">
            <form className="space-y-6" onSubmit={handleUpdate}>
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <Input 
                  label="New Password" 
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
                  label="Confirm New Password" 
                  type="password" 
                  placeholder="Confirm your new password" 
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div>
                <Button type="submit" className="w-full" isLoading={isLoading}>
                  Update Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
