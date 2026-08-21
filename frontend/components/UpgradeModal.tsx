"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  ArrowRight,
  ShoppingBag,
  ShieldCheck
} from 'lucide-react';
import { normalizePlanId, PLANS } from '@/config/plans';

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPlan?: string | null;
  featureTitle?: string;
  matchingProduct?: {
    id: string;
    title: string;
    price: number;
  } | null;
}

export function UpgradeModal({ 
  isOpen, 
  onClose, 
  requiredPlan = 'pro', 
  featureTitle = 'this exclusive resource',
  matchingProduct = null
}: UpgradeModalProps) {
  const router = useRouter();
  const planId = normalizePlanId(requiredPlan || 'pro');
  const targetPlan = PLANS[planId === 'free' ? 'starter' : planId];

  const handleUpgradeClick = () => {
    onClose();
    router.push('/student/subscription');
  };

  const handleBuyIndividuallyClick = () => {
    onClose();
    router.push('/student/store');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Unlock Premium Content" className="max-w-md">
      <div className="space-y-5 text-xs text-[var(--color-text-secondary)]">
        
        {/* HERO ICON & HEADLINE */}
        <div className="text-center pt-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border border-[var(--color-brand-200)] shadow-xs mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            {targetPlan.name} Plan or Direct Purchase Required
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)] leading-relaxed">
            Unlock {featureTitle} through a monthly membership or a one-time individual store purchase.
          </p>
        </div>

        {/* OPTION 1: MONTHLY SUBSCRIPTION */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-200)] bg-[var(--color-brand-50)]/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-brand-700)] uppercase tracking-wider">
              Option 1: {targetPlan.name} Membership
            </span>
            <span className="text-sm font-extrabold text-[var(--color-text-primary)]">
              ₹{targetPlan.price} <span className="text-[10px] font-normal text-[var(--color-text-secondary)]">/ month</span>
            </span>
          </div>

          <p className="text-[11px] text-[var(--color-text-secondary)] leading-snug">
            Get unlimited access to all {targetPlan.name} tier job openings, interview question archives, and study notes.
          </p>

          <Button variant="primary" size="sm" onClick={handleUpgradeClick} className="w-full justify-center text-xs shadow-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> View Subscription Plans
          </Button>
        </div>

        {/* OPTION 2: ONE-TIME STORE PURCHASE */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
              Option 2: Buy from Digital Store
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Permanent Ownership
            </span>
          </div>

          <p className="text-[11px] text-[var(--color-text-secondary)] leading-snug">
            Purchase this individual question pack or study notes guide once and keep permanent access forever.
          </p>

          <Button variant="outline" size="sm" onClick={handleBuyIndividuallyClick} className="w-full justify-center text-xs">
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Explore Store Packs
          </Button>
        </div>

        {/* CANCEL */}
        <div className="pt-2 text-center">
          <button 
            onClick={onClose} 
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Maybe Later
          </button>
        </div>

      </div>
    </Modal>
  );
}
