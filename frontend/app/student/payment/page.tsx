"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { 
  CreditCard, 
  ArrowLeft, 
  ShieldCheck, 
  Mail, 
  CheckCircle2, 
  Sparkles,
  Bot,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { normalizePlanId, PLANS, PlanId } from '@/config/plans';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = normalizePlanId(searchParams.get('plan') || 'pro');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(initialPlan === 'free' ? 'pro' : initialPlan);

  useEffect(() => {
    const qPlan = searchParams.get('plan');
    if (qPlan) {
      const normalized = normalizePlanId(qPlan);
      if (normalized !== 'free') setSelectedPlanId(normalized);
    }
  }, [searchParams]);

  const plan = PLANS[selectedPlanId];

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 sm:p-10 shadow-[var(--shadow-xs)] space-y-8">
        
        {/* HEADER */}
        <div className="text-center max-w-lg mx-auto">
          <div className="h-14 w-14 bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border border-[var(--color-brand-200)] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            <CreditCard className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Upgrade Your Membership</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium">
            Select your preferred monthly subscription plan to unlock exclusive fresher opportunities and mock interviews.
          </p>
        </div>

        {/* PLAN SELECTOR TABS */}
        <div className="grid grid-cols-3 gap-3">
          {(['starter', 'pro', 'premium'] as PlanId[]).map((pId) => {
            const p = PLANS[pId];
            const isSelected = selectedPlanId === pId;
            return (
              <button
                key={pId}
                onClick={() => setSelectedPlanId(pId)}
                className={`p-4 rounded-[var(--radius-xl)] border text-center transition-all ${
                  isSelected 
                    ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-50)]/40 ring-2 ring-[var(--color-brand-500)]/20 shadow-xs' 
                    : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-subtle)]'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isSelected ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-text-tertiary)]'}`}>
                  {p.name}
                </span>
                <span className="text-xl font-extrabold text-[var(--color-text-primary)] block">
                  ₹{p.price}
                </span>
                <span className="text-[10px] text-[var(--color-text-secondary)]">/ month</span>
              </button>
            );
          })}
        </div>

        {/* ORDER SUMMARY BOX */}
        <div className="rounded-[var(--radius-xl)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <div>
              <h3 className="font-bold text-sm text-[var(--color-text-primary)]">{plan.name} Membership</h3>
              <p className="text-[11px] text-[var(--color-text-secondary)]">Monthly Recurring Subscription</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-[var(--color-text-primary)]">₹{plan.price}</span>
              <span className="text-[10px] text-[var(--color-text-tertiary)] block">per month</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Plan Entitlements</p>
            {plan.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[var(--color-text-primary)] font-medium">{feat}</span>
              </div>
            ))}
          </div>

          {/* MVP Activation Notice */}
          <div className="p-3.5 rounded-[var(--radius-lg)] bg-amber-50/80 border border-amber-200 text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-xs text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-700" /> MVP Upgrade Flow
            </p>
            <p className="text-[11px] leading-relaxed">
              Automated Razorpay/Stripe checkout is in final stage integration. For immediate activation, contact our student support team or request manual activation via the admin console.
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/student/subscription')}
            className="w-full sm:w-auto text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Plans
          </Button>
          
          <Link href="/contact" className="w-full sm:w-auto">
            <Button 
              variant="primary" 
              size="sm" 
              className="w-full sm:w-auto text-xs shadow-xs"
            >
              <Mail className="w-3.5 h-3.5 mr-1.5" /> Request {plan.name} Activation (₹{plan.price}/mo)
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function PaymentPage() {
  const { isModuleEnabled } = useFeatureFlags();
  const isSubEnabled = isModuleEnabled('student_subscription');

  if (!isSubEnabled) {
    return (
      <StudentLayout>
        <FeatureComingSoon
          title="Plan Upgrades & Checkout Coming Soon"
          description="Membership subscriptions and upgrade checkouts are currently being prepared for rollout."
          icon={CreditCard}
          backHref="/student/dashboard"
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <Suspense fallback={
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
        </div>
      }>
        <PaymentContent />
      </Suspense>
    </StudentLayout>
  );
}
