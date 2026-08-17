"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { CreditCard, ArrowLeft, ShieldCheck, Mail } from 'lucide-react';
import Link from 'next/link';

export default function PaymentPage() {
  const router = useRouter();

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh] py-8">
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-8 sm:p-10 shadow-[var(--shadow-xs)] text-center flex flex-col items-center w-full">
          
          <div className="h-16 w-16 bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border border-[var(--color-brand-200)] rounded-full flex items-center justify-center mb-5">
            <CreditCard className="w-8 h-8" />
          </div>
          
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Upgrade to GradZenX Premium</h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6 max-w-md">
            Direct online payment integration is currently undergoing final security testing. To activate your annual premium membership immediately, please reach out to our team or return to your subscription dashboard.
          </p>

          <div className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 text-xs text-[var(--color-text-secondary)] mb-8 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Premium Plan • ₹999 / year • Unlimited access to all interview banks & notes</span>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => router.push('/student/subscription')}
              className="w-full sm:w-auto text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Return to Subscription
            </Button>
            <Link href="/contact" className="w-full sm:w-auto">
              <Button 
                variant="primary" 
                className="w-full sm:w-auto text-xs"
              >
                <Mail className="w-3.5 h-3.5 mr-1.5" /> Contact Support
              </Button>
            </Link>
          </div>

        </div>
      </div>
    </StudentLayout>
  );
}
