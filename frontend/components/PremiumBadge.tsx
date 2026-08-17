import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { normalizePlanId, PLANS } from '@/config/plans';

export interface PremiumBadgeProps {
  accessType?: string | null;
  minimumPlan?: string | null;
  className?: string;
  showLockIfPaid?: boolean;
}

export function PremiumBadge({ 
  accessType, 
  minimumPlan, 
  className = '', 
  showLockIfPaid = true 
}: PremiumBadgeProps) {
  const planId = normalizePlanId(minimumPlan || accessType);
  const planConfig = PLANS[planId];

  if (planId === 'free') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
        Free
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${planConfig.badgeColor} ${planConfig.badgeTextColor} border ${planConfig.badgeBorderColor} shadow-xs ${className}`}>
      {showLockIfPaid ? (
        <Lock className="w-3 h-3 shrink-0" />
      ) : (
        <Sparkles className="w-3 h-3 shrink-0" />
      )}
      {planConfig.name}
    </span>
  );
}
