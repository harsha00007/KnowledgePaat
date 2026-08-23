"use client";

import React from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/Button';
import { Check, Bot, Lock } from 'lucide-react';
import { PLANS_LIST } from '@/config/plans';
import { useFeatureFlags } from '@/context/FeatureFlagContext';

export default function PricingPage() {
  const { isFeatureEnabled } = useFeatureFlags();
  const isPricingBlurred = isFeatureEnabled('blur_homepage_pricing');

  return (
    <PublicLayout>
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[var(--color-border)] pt-14 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-3.5 py-1 text-xs font-semibold text-[var(--color-brand-600)] mb-4">
            Transparent Monthly Pricing
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Flexible plans designed for fresher placement success
          </h1>
          <p className="mt-4 text-base text-[var(--color-text-secondary)] leading-relaxed">
            Choose the subscription tier that fits your preparation goals. Upgrade anytime, cancel whenever you want.
          </p>
        </div>
      </section>

      {/* ── 4-TIER PRICING CARDS ──────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] py-16 flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {PLANS_LIST.map((plan) => {
              const isPopular = plan.popular;

              return (
                <div 
                  key={plan.id}
                  className={`rounded-[var(--radius-xl)] bg-white p-6 sm:p-7 flex flex-col justify-between shadow-[var(--shadow-sm)] relative border transition-all ${
                    isPopular 
                      ? 'border-2 border-[var(--color-brand-500)] shadow-[var(--shadow-md)]' 
                      : 'border-[var(--color-border)] hover:border-[var(--color-brand-300)]'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 right-6">
                      <span className="inline-block rounded-full bg-[var(--color-brand-600)] px-3.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{plan.name} Plan</h2>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mb-4 min-h-[36px] leading-relaxed">
                      {plan.description}
                    </p>
                    
                    {/* Price container with Admin-Controlled Blur */}
                    <div className="mb-6 pb-4 border-b border-[var(--color-border)]">
                      <div className="relative min-h-[44px] flex items-center">
                        <div className={`transition-all duration-300 ${
                          isPricingBlurred ? 'filter blur-[8px] select-none opacity-30 pointer-events-none' : ''
                        }`}>
                          <span className="text-3xl font-extrabold text-[var(--color-text-primary)] font-display">{plan.currency}{plan.price}</span>
                          <span className="text-xs font-semibold text-[var(--color-text-secondary)] ml-1">/{plan.interval}</span>
                        </div>

                        {isPricingBlurred && (
                          <div className="absolute inset-0 flex items-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-[11px] font-bold tracking-wide shadow-xs font-display backdrop-blur-xs">
                              <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>Hidden</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {plan.mockInterviewsPerMonth > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-brand-700)] bg-[var(--color-brand-50)] px-2.5 py-1 rounded border border-[var(--color-brand-200)]">
                          <Bot className="w-3.5 h-3.5" />
                          <span>{plan.mockInterviewsPerMonth} Mock Interview credit{plan.mockInterviewsPerMonth > 1 ? 's' : ''}/mo</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-[var(--color-text-secondary)] leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-[var(--color-border)]">
                    <Link href={plan.id === 'free' ? '/register' : `/student/payment?plan=${plan.id}`} className="block w-full">
                      <Button 
                        variant={isPopular ? 'primary' : 'outline'} 
                        className="w-full h-10 text-xs justify-center shadow-xs"
                      >
                        {plan.id === 'free' ? 'Get Started Free' : `Upgrade to ${plan.name}`}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ──────────────────────────────────────────────── */}
      <section className="bg-white py-16 border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] font-display">Frequently Asked Questions</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Everything you need to know about KnowledgePaat subscriptions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[var(--color-text-secondary)]">
            <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] space-y-1.5">
              <h3 className="font-bold text-[var(--color-text-primary)] text-sm">Can I switch plans anytime?</h3>
              <p className="leading-relaxed">Yes, you can upgrade or adjust your subscription tier anytime directly from your student portal dashboard.</p>
            </div>
            <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] space-y-1.5">
              <h3 className="font-bold text-[var(--color-text-primary)] text-sm">How do Mock Interview credits work?</h3>
              <p className="leading-relaxed">Depending on your plan, credits are replenished each billing cycle for upcoming AI & panel interview prep rounds.</p>
            </div>
            <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] space-y-1.5">
              <h3 className="font-bold text-[var(--color-text-primary)] text-sm">Are there any hidden fees?</h3>
              <p className="leading-relaxed">None at all. You pay the exact monthly amount listed with zero placement commissions or unexpected fees.</p>
            </div>
            <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] space-y-1.5">
              <h3 className="font-bold text-[var(--color-text-primary)] text-sm">What happens when my plan expires?</h3>
              <p className="leading-relaxed">Your account seamlessly reverts to the Free tier. Your saved jobs, resume, and profile progress remain completely intact.</p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
