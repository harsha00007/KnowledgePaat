import React from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/Button';
import { Check, X, HelpCircle, ShieldCheck } from 'lucide-react';

export default function PricingPage() {
  return (
    <PublicLayout>
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[var(--color-border)] pt-14 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-3.5 py-1 text-xs font-semibold text-[var(--color-brand-600)] mb-4">
            Transparent Pricing
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Simple plans for every career stage
          </h1>
          <p className="mt-4 text-base text-[var(--color-text-secondary)] leading-relaxed">
            Choose the plan that fits your career goals. Get started for free, upgrade when you need comprehensive interview prep and priority features.
          </p>
        </div>
      </section>

      {/* ── PRICING CARDS ─────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] py-16 flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* Free Plan */}
            <div className="rounded-[var(--radius-xl)] bg-white border border-[var(--color-border)] p-8 sm:p-10 shadow-[var(--shadow-sm)] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Free Plan</h2>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                  Essential tools to start discovering verified fresher job opportunities.
                </p>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-[var(--color-text-primary)]">₹0</span>
                  <span className="text-sm font-medium text-[var(--color-text-secondary)] ml-2">/ forever</span>
                </div>

                <div className="border-t border-[var(--color-border)] pt-6 space-y-3.5">
                  <Feature item="Browse all verified jobs" included={true} />
                  <Feature item="Apply via direct company links" included={true} />
                  <Feature item="Basic HR & Aptitude questions" included={true} />
                  <Feature item="Standard study notes" included={true} />
                  <Feature item="Company-specific questions" included={false} />
                  <Feature item="Advanced technical notes" included={false} />
                  <Feature item="Priority job alerts" included={false} />
                </div>
              </div>

              <div className="mt-10">
                <Link href="/register" className="block w-full">
                  <Button variant="outline" className="w-full h-11 text-sm justify-center">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>

            {/* Premium Plan */}
            <div className="rounded-[var(--radius-xl)] bg-white border-2 border-[var(--color-brand-500)] p-8 sm:p-10 shadow-[var(--shadow-md)] flex flex-col justify-between relative">
              <div className="absolute -top-3.5 right-8">
                <span className="inline-block rounded-full bg-[var(--color-brand-500)] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                  Recommended
                </span>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <h2 className="text-xl font-bold text-[var(--color-brand-600)]">Premium Plan</h2>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                  The complete toolkit to prepare for technical interviews and accelerate hiring.
                </p>
                <div className="mb-8 flex items-baseline">
                  <span className="text-4xl font-extrabold text-[var(--color-text-primary)]">₹999</span>
                  <span className="text-sm font-medium text-[var(--color-text-secondary)] ml-2">/ year</span>
                </div>

                <div className="border-t border-[var(--color-border)] pt-6 space-y-3.5">
                  <Feature item="Everything in Free Plan" included={true} isHighlight={true} />
                  <Feature item="Company-specific interview prep" included={true} />
                  <Feature item="Advanced technical study materials" included={true} />
                  <Feature item="Downloadable revision cheatsheets" included={true} />
                  <Feature item="Priority job alerts & updates" included={true} />
                  <Feature item="Comprehensive mock question bank" included={true} />
                  <Feature item="Dedicated student email support" included={true} />
                </div>
              </div>

              <div className="mt-10">
                <Link href="/student/payment" className="block w-full">
                  <Button variant="primary" className="w-full h-11 text-sm justify-center shadow-sm">
                    Upgrade to Premium
                  </Button>
                </Link>
              </div>
            </div>

          </div>

          {/* Guarantee / Trust notice */}
          <div className="mt-12 text-center flex items-center justify-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <ShieldCheck className="w-4 h-4 text-[var(--color-success)]" />
            <span>Secure payment • Upgrade or cancel your subscription anytime</span>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function Feature({ item, included, isHighlight = false }: { item: string; included: boolean; isHighlight?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {included ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-600)] shrink-0">
          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
        </span>
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 shrink-0">
          <X className="h-3.5 w-3.5" />
        </span>
      )}
      <span className={`${included ? (isHighlight ? 'text-[var(--color-brand-700)] font-semibold' : 'text-[var(--color-text-primary)] font-medium') : 'text-[var(--color-text-tertiary)] line-through'}`}>
        {item}
      </span>
    </div>
  );
}
