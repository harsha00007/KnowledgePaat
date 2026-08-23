"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { 
  Lock, 
  Sparkles, 
  ArrowLeft, 
  Clock, 
  ShieldCheck, 
  Layers, 
  Compass,
  LucideIcon
} from 'lucide-react';

export interface FeatureComingSoonProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  backHref?: string;
  backLabel?: string;
  badgeText?: string;
  phase?: string;
  className?: string;
}

export function FeatureComingSoon({
  title,
  description = "This module is currently in active development and scheduled for upcoming rollout. Please check back soon.",
  icon: Icon = Sparkles,
  backHref = "/student/dashboard",
  backLabel = "Back to Dashboard",
  badgeText = "Coming Soon",
  phase = "Phase 2 Rollout",
  className = "",
}: FeatureComingSoonProps) {
  return (
    <div className={`w-full flex items-center justify-center min-h-[60vh] p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300 ${className}`}>
      <div className="w-full max-w-2xl bg-white border border-[var(--color-border)] rounded-[var(--radius-3xl)] p-8 sm:p-12 text-center shadow-[var(--shadow-md)] relative overflow-hidden">
        
        {/* Background Decorative Gradient Blobs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Badges */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200/80 text-amber-800 shadow-2xs font-display">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            {badgeText}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 font-display">
            <Clock className="w-3 h-3 text-slate-500" />
            {phase}
          </span>
        </div>

        {/* Icon Frame */}
        <div className="mx-auto mb-6 relative">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[var(--radius-2xl)] bg-gradient-to-tr from-[#0B1D3A] via-[#2563EB] to-[#00C2CB] p-0.5 shadow-lg mx-auto flex items-center justify-center">
            <div className="w-full h-full bg-white dark:bg-[#0B1D3A] rounded-[calc(var(--radius-2xl)-2px)] flex items-center justify-center text-[#2563EB]">
              <Icon className="w-9 h-9 sm:w-11 sm:h-11" strokeWidth={1.75} />
            </div>
          </div>
          <div className="absolute -bottom-1.5 right-1/2 translate-x-7 bg-amber-500 text-white p-1 rounded-full border-2 border-white shadow-xs">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] font-display tracking-tight mb-3">
          {title}
        </h2>
        
        <p className="text-sm sm:text-base text-[var(--color-text-secondary)] max-w-lg mx-auto leading-relaxed mb-8">
          {description}
        </p>

        {/* Status Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-4 sm:p-5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#22D3A2] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)]">Admin Managed</p>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">Controlled feature release</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)]">Data Preserved</p>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">All records remain intact</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Compass className="w-4 h-4 text-[#00C2CB] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)]">Instant Access</p>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">Available once enabled</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={backHref} className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full sm:w-auto font-semibold shadow-xs justify-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backLabel}
            </Button>
          </Link>
          <Link href="/student/notes" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full sm:w-auto font-semibold justify-center">
              Explore Available Resources
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
}
