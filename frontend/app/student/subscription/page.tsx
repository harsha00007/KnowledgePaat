"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { 
  Check, 
  X,
  Star, 
  ShieldCheck, 
  Zap, 
  Briefcase, 
  BookOpen,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  Bot,
  Video
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { calculateUserAccess, UserAccess } from '@/lib/subscription';
import { PLANS, PLANS_LIST, PlanId } from '@/config/plans';

export default function SubscriptionPage() {
  const router = useRouter();
  const [access, setAccess] = useState<UserAccess>(calculateUserAccess(null));
  const [isFetching, setIsFetching] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setAccess(calculateUserAccess(data));
    } catch (err) {
      console.error("Error fetching subscription:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSelectPlan = (planId: PlanId) => {
    if (planId === 'free') return;
    router.push(`/student/payment?plan=${planId}`);
  };

  const currentPlanConfig = PLANS[access.effectivePlan];

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Membership & Subscriptions</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
            Choose the subscription plan that accelerates your fresher placement journey with curated questions and mock credits.
          </p>
        </div>

        {/* CURRENT PLAN STATUS CARD */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-4">Your Active Membership</h2>
          
          {isFetching ? (
            <div className="flex items-center gap-3 py-2">
              <div className="animate-spin h-5 w-5 border-2 border-[var(--color-brand-500)] border-t-transparent rounded-full"></div>
              <p className="text-xs text-[var(--color-text-tertiary)]">Checking subscription status...</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center border shrink-0 ${
                  access.isSubscriptionActive && access.effectivePlan !== 'free'
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border-[var(--color-brand-200)]' 
                    : access.isExpired
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)] border-[var(--color-border)]'
                }`}>
                  {access.effectivePlan !== 'free' && access.isSubscriptionActive ? (
                    <Star className="w-6 h-6 fill-current" />
                  ) : access.isExpired ? (
                    <Clock className="w-6 h-6" />
                  ) : (
                    <ShieldCheck className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      {currentPlanConfig.name} Plan
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                      access.isSubscriptionActive && access.effectivePlan !== 'free'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : access.isExpired 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {access.status.toUpperCase()}
                    </span>
                    {currentPlanConfig.mockInterviewsPerMonth > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)]">
                        {currentPlanConfig.mockInterviewsPerMonth} Mock Interviews / Mo
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 flex items-center gap-2">
                    {access.isSubscriptionActive && access.effectivePlan !== 'free' ? (
                      <>
                        <Calendar className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                        <span>Valid until <strong>{access.expiresAt ? new Date(access.expiresAt).toLocaleDateString() : 'Monthly Renews'}</strong></span>
                      </>
                    ) : access.isExpired ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Your {access.plan} subscription expired on <strong>{access.expiresAt ? new Date(access.expiresAt).toLocaleDateString() : 'Recent'}</strong></span>
                      </>
                    ) : (
                      <span>You are currently using the Free plan. Upgrade anytime to unlock advanced interview prep and study notes.</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {access.isSubscriptionActive && access.effectivePlan !== 'free' ? (
                  <Button variant="outline" size="sm" onClick={() => router.push('/student/jobs')}>
                    Explore {currentPlanConfig.name} Resources
                  </Button>
                ) : (
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => router.push('/student/payment?plan=pro')}
                    className="shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    {access.isExpired ? 'Renew Subscription' : 'Upgrade Plan'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 4-TIER SUBSCRIPTION CARDS ─────────────────────────────────── */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Monthly Subscription Plans</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">Transparent pricing with no hidden lock-in contracts.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS_LIST.map((plan) => {
              const isCurrent = access.effectivePlan === plan.id;
              const isPopular = plan.popular;

              return (
                <div 
                  key={plan.id}
                  className={`rounded-[var(--radius-xl)] bg-white p-5 flex flex-col justify-between shadow-[var(--shadow-xs)] relative border transition-all ${
                    isCurrent 
                      ? 'border-[var(--color-brand-600)] ring-2 ring-[var(--color-brand-500)]/20' 
                      : isPopular
                      ? 'border-[var(--color-brand-400)] shadow-[var(--shadow-md)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-brand-300)]'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-[var(--color-brand-600)] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute -top-3 left-4">
                      <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-[var(--color-text-primary)]">{plan.name}</h3>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mb-4 min-h-[32px] leading-snug">
                      {plan.description}
                    </p>

                    <div className="mb-5 pb-4 border-b border-[var(--color-border)]">
                      <span className="text-3xl font-extrabold text-[var(--color-text-primary)]">
                        {plan.currency}{plan.price}
                      </span>
                      <span className="text-xs font-semibold text-[var(--color-text-secondary)] ml-1">
                        /{plan.interval}
                      </span>
                      
                      {plan.mockInterviewsPerMonth > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-brand-700)] bg-[var(--color-brand-50)] px-2 py-1 rounded border border-[var(--color-brand-200)]">
                          <Bot className="w-3.5 h-3.5" />
                          <span>{plan.mockInterviewsPerMonth} Mock Interview credit{plan.mockInterviewsPerMonth > 1 ? 's' : ''}/mo</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-[var(--color-text-secondary)]">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-tight text-[11px]">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                    {plan.id === 'free' ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={isCurrent}
                        className="w-full justify-center text-xs"
                      >
                        {isCurrent ? 'Active Plan' : 'Free Tier'}
                      </Button>
                    ) : (
                      <Button 
                        variant={isCurrent ? "outline" : isPopular ? "primary" : "outline"} 
                        size="sm" 
                        onClick={() => handleSelectPlan(plan.id)}
                        className="w-full justify-center text-xs shadow-xs"
                      >
                        {isCurrent ? 'Manage Plan' : `Get ${plan.name} (₹${plan.price}/mo)`}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PLAN FEATURE COMPARISON MATRIX ────────────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
          <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-1">Feature Comparison Matrix</h2>
          <p className="text-xs text-[var(--color-text-secondary)] mb-6">Detailed entitlement breakdown by subscription tier.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[11px] uppercase font-bold text-[var(--color-text-tertiary)]">
                  <th className="py-3 px-4">Feature / Resource</th>
                  <th className="py-3 px-4 text-center">Free (₹0)</th>
                  <th className="py-3 px-4 text-center">Starter (₹49)</th>
                  <th className="py-3 px-4 text-center">Pro (₹99)</th>
                  <th className="py-3 px-4 text-center">Premium (₹149)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                <tr>
                  <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">Verified Fresher Jobs</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">Starter Tier Openings & Prep</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 inline" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">Pro Tier Content & Company Banks</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 inline" /></td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 inline" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">Premium Archive & Advanced Model Answers</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 inline" /></td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 inline" /></td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 inline" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 inline" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">Monthly Mock Interview Credits</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-400">0</td>
                  <td className="py-3 px-4 text-center font-bold text-blue-700">1 / month</td>
                  <td className="py-3 px-4 text-center font-bold text-indigo-700">2 / month</td>
                  <td className="py-3 px-4 text-center font-bold text-purple-700">4 / month</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">PDF Study Notes Downloads</td>
                  <td className="py-3 px-4 text-center text-[11px] text-[var(--color-text-tertiary)]">Basic Only</td>
                  <td className="py-3 px-4 text-center text-[11px] text-blue-700 font-medium">Starter + Basic</td>
                  <td className="py-3 px-4 text-center text-[11px] text-indigo-700 font-medium">Pro + Starter + Basic</td>
                  <td className="py-3 px-4 text-center text-[11px] text-purple-700 font-bold">All Notes (Unlimited)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </StudentLayout>
  );
}
