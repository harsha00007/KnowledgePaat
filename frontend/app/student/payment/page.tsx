"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { 
  CreditCard, 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  Bot,
  AlertCircle,
  Lock,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { normalizePlanId, PLANS, PlanId } from '@/config/plans';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';
import { launchRazorpayCheckout } from '@/lib/razorpayClient';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = normalizePlanId(searchParams.get('plan') || 'pro');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(initialPlan === 'free' ? 'pro' : initialPlan);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    orderId: string;
    paymentId?: string;
    planName: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    const qPlan = searchParams.get('plan');
    if (qPlan) {
      const normalized = normalizePlanId(qPlan);
      if (normalized !== 'free') setSelectedPlanId(normalized);
    }
  }, [searchParams]);

  const plan = PLANS[selectedPlanId];

  const handleInitiateRazorpayPayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Create order on server (server performs trusted price lookup)
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: 'subscription',
          planId: selectedPlanId
        })
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize payment order.');
      }

      // 2. Launch Razorpay Test Mode Checkout
      await launchRazorpayCheckout({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: orderData.name || 'KnowledgePaat',
        description: orderData.description || `${plan.name} Membership Plan`,
        order_id: orderData.orderId,
        prefill: orderData.prefill,
        notes: orderData.notes,
        handler: async (response) => {
          try {
            // 3. Verify payment signature on server
            const verifyRes = await fetch('/api/payments/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                internalOrderId: orderData.internalOrderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderType: 'subscription',
                planId: selectedPlanId
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setPaymentSuccess({
                orderId: orderData.internalOrderId,
                paymentId: response.razorpay_payment_id,
                planName: plan.name,
                amount: plan.price
              });
            } else {
              setErrorMessage(verifyData.error || 'Payment verification failed. Please contact support.');
            }
          } catch (err: any) {
            setErrorMessage(err.message || 'Error verifying payment.');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          }
        }
      });
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      setErrorMessage(err.message || 'Unable to proceed with checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  // SUCCESS STATE VIEW
  if (paymentSuccess) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="rounded-[var(--radius-xl)] border border-emerald-200 bg-white p-8 text-center shadow-[var(--shadow-md)] space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="h-16 w-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Payment Verified • Razorpay Test Mode
            </span>
            <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)]">
              Welcome to {paymentSuccess.planName} Plan!
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] max-w-md mx-auto">
              Your subscription is now active for 30 days. You have unlocked all exclusive fresher interview questions and mock credits.
            </p>
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-left text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-text-tertiary)]">Order Reference:</span>
              <span className="font-mono font-bold text-[var(--color-text-primary)]">
                {paymentSuccess.orderId.slice(0, 12)}...
              </span>
            </div>
            {paymentSuccess.paymentId && (
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-tertiary)]">Payment ID:</span>
                <span className="font-mono text-emerald-700 font-semibold">{paymentSuccess.paymentId}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-text-tertiary)]">Amount Paid:</span>
              <span className="font-extrabold text-[var(--color-text-primary)]">₹{paymentSuccess.amount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-text-tertiary)]">Status:</span>
              <span className="font-bold text-emerald-600">Active</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/student/subscription')}
              className="text-xs"
            >
              View Subscription
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => router.push('/student/dashboard')}
              className="text-xs shadow-xs"
            >
              Go to Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Razorpay Test Mode Badge Notice */}
          <div className="p-3.5 rounded-[var(--radius-lg)] bg-indigo-50/80 border border-indigo-200 text-indigo-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-xs text-indigo-950">
              <ShieldCheck className="w-4 h-4 text-indigo-700" /> Razorpay Test Mode Active
            </p>
            <p className="text-[11px] leading-relaxed text-indigo-800">
              Instant test payment with test UPI ID or QR Code scan. No real money will be charged.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-[var(--radius-md)] bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/student/subscription')}
            className="w-full sm:w-auto text-xs"
            disabled={isProcessing}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Plans
          </Button>
          
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleInitiateRazorpayPayment}
            disabled={isProcessing}
            className="w-full sm:w-auto text-xs shadow-xs font-bold"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Connecting to Razorpay...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" /> Pay & Upgrade to {plan.name} (₹{plan.price}/mo)
              </>
            )}
          </Button>
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
