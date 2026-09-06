"use client";

import React from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/Button';
import { Check, Bot, Lock, ChevronDown, X } from 'lucide-react';
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
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {PLANS_LIST.map((plan) => {
              const isPopular = plan.popular;

              return (
                <div 
                  key={plan.id}
                  className={`rounded-[var(--radius-xl)] bg-white p-4 sm:p-7 flex flex-col justify-between shadow-[var(--shadow-sm)] relative border transition-all ${
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

          {/* ── PLAN FEATURE COMPARISON MATRIX ────────────────────────────── */}
          <div className="mt-14 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 sm:p-6 shadow-[var(--shadow-xs)]">
            <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-1">Feature Comparison Matrix</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-6">Detailed entitlement breakdown by subscription tier.</p>

            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-left text-xs border-collapse min-w-[540px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[11px] uppercase font-bold text-[var(--color-text-tertiary)]">
                    <th className="py-2.5 sm:py-3 px-2.5 sm:px-4">Feature / Resource</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-center">Free (₹0)</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-center">Starter (₹49)</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-center">Pro (₹99)</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-center">Premium (₹149)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  <tr>
                    <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 font-semibold text-[var(--color-text-primary)]">Verified Fresher Jobs</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 font-semibold text-[var(--color-text-primary)]">Starter Tier Openings & Prep</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><X className="w-4 h-4 text-slate-300 inline" /></td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 font-semibold text-[var(--color-text-primary)]">Pro Tier Content & Company Banks</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><X className="w-4 h-4 text-slate-300 inline" /></td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><X className="w-4 h-4 text-slate-300 inline" /></td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 font-semibold text-[var(--color-text-primary)]">Premium Archive & Model Answers</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><X className="w-4 h-4 text-slate-300 inline" /></td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><X className="w-4 h-4 text-slate-300 inline" /></td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><X className="w-4 h-4 text-slate-300 inline" /></td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 font-semibold text-[var(--color-text-primary)]">Monthly Mock Interview Credits</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center font-bold text-slate-400">0</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center font-bold text-blue-700">1 / month</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center font-bold text-indigo-700">2 / month</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center font-bold text-purple-700">4 / month</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 font-semibold text-[var(--color-text-primary)]">PDF Study Notes Downloads</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center text-[11px] text-[var(--color-text-tertiary)]">Basic Only</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center text-[11px] text-blue-700 font-medium">Starter + Basic</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center text-[11px] text-indigo-700 font-medium">Pro + Starter + Basic</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center text-[11px] text-purple-700 font-bold">All Notes (Unlimited)</td>
                  </tr>
                </tbody>
              </table>
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[var(--color-text-secondary)]">
            <details className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4 transition-all duration-150 ease-out open:shadow-xs">
              <summary className="font-bold text-[var(--color-text-primary)] text-sm cursor-pointer list-none flex items-center justify-between">
                <span>Can I switch plans anytime?</span>
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-150 ease-out group-open:rotate-180 shrink-0 ml-2" />
              </summary>
              <p className="leading-relaxed mt-2.5 pt-2 border-t border-[var(--color-border)]/60">
                Yes, you can upgrade or adjust your subscription tier anytime directly from your student portal dashboard.
              </p>
            </details>

            <details className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4 transition-all duration-150 ease-out open:shadow-xs">
              <summary className="font-bold text-[var(--color-text-primary)] text-sm cursor-pointer list-none flex items-center justify-between">
                <span>How do Mock Interview credits work?</span>
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-150 ease-out group-open:rotate-180 shrink-0 ml-2" />
              </summary>
              <p className="leading-relaxed mt-2.5 pt-2 border-t border-[var(--color-border)]/60">
                Depending on your plan, credits are replenished each billing cycle for upcoming AI & panel interview prep rounds.
              </p>
            </details>

            <details className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4 transition-all duration-150 ease-out open:shadow-xs">
              <summary className="font-bold text-[var(--color-text-primary)] text-sm cursor-pointer list-none flex items-center justify-between">
                <span>Are there any hidden fees?</span>
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-150 ease-out group-open:rotate-180 shrink-0 ml-2" />
              </summary>
              <p className="leading-relaxed mt-2.5 pt-2 border-t border-[var(--color-border)]/60">
                None at all. You pay the exact monthly amount listed with zero placement commissions or unexpected fees.
              </p>
            </details>

            <details className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4 transition-all duration-150 ease-out open:shadow-xs">
              <summary className="font-bold text-[var(--color-text-primary)] text-sm cursor-pointer list-none flex items-center justify-between">
                <span>What happens when my plan expires?</span>
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-150 ease-out group-open:rotate-180 shrink-0 ml-2" />
              </summary>
              <p className="leading-relaxed mt-2.5 pt-2 border-t border-[var(--color-border)]/60">
                Your account seamlessly reverts to the Free tier. Your saved jobs, resume, and profile progress remain completely intact.
              </p>
            </details>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
