"use client";

import React from 'react';
import { Lock } from 'lucide-react';
import { UserAccess, canViewCompanyName } from '@/lib/subscription';
import { normalizePlanId, PLANS } from '@/config/plans';

export interface CompanyNameGateProps {
  companyName: string | null | undefined;
  minimumPlan: string | null | undefined;
  userAccess?: UserAccess | null;
  onUpgradeClick?: (requiredPlan: string) => void;
  className?: string;
  showBadge?: boolean;
  inline?: boolean;
}

/**
 * CompanyNameGate
 * Centralized component to enforce subscription-based company privacy.
 * If student does not meet the minimum required plan level, company name is hidden
 * and a locked/blurred treatment with upgrade trigger is displayed.
 */
export function CompanyNameGate({
  companyName,
  minimumPlan,
  userAccess,
  onUpgradeClick,
  className = "text-xs font-semibold text-[var(--color-text-secondary)]",
  showBadge = true,
  inline = false,
}: CompanyNameGateProps) {
  const reqPlan = minimumPlan || 'free';
  const isAllowed = canViewCompanyName(userAccess, reqPlan);
  const targetPlan = PLANS[normalizePlanId(reqPlan)];

  // Allowed: Render real company name cleanly
  if (isAllowed) {
    return (
      <span className={className}>
        {companyName || 'Verified Employer'}
      </span>
    );
  }

  // Locked: Render privacy-protected masked/blurred placeholder (Never expose companyName to DOM)
  const handleClick = (e: React.MouseEvent) => {
    if (onUpgradeClick) {
      e.stopPropagation();
      e.preventDefault();
      onUpgradeClick(reqPlan);
    }
  };

  return (
    <div 
      onClick={handleClick}
      role={onUpgradeClick ? "button" : undefined}
      tabIndex={onUpgradeClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onUpgradeClick && (e.key === 'Enter' || e.key === ' ')) {
          e.stopPropagation();
          e.preventDefault();
          onUpgradeClick(reqPlan);
        }
      }}
      className={`inline-flex items-center gap-1.5 group/company-gate ${onUpgradeClick ? 'cursor-pointer' : ''} ${inline ? 'inline-flex' : 'flex flex-wrap items-center'}`}
      title={`Company details are locked. Upgrade to ${targetPlan.name} to view.`}
    >
      {/* Blurred Mask Placeholder */}
      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-mono text-[11px] tracking-widest select-none blur-[2.5px] group-hover/company-gate:blur-[1px] transition-all">
        ••••••••••••
      </span>

      {/* Lock Requirement Badge */}
      {showBadge && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/80 group-hover/company-gate:bg-[var(--color-brand-50)] group-hover/company-gate:border-[var(--color-brand-300)] group-hover/company-gate:text-[var(--color-brand-700)] transition-all shrink-0">
          <Lock className="w-2.5 h-2.5 text-slate-500 group-hover/company-gate:text-[var(--color-brand-600)]" />
          {targetPlan.name} Required
        </span>
      )}
    </div>
  );
}
