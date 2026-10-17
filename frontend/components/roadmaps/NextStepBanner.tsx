'use client';

import React from 'react';
import type { NextStepRecommendation } from '@/types/roadmap';
import { Button } from '@/components/Button';
import {
  Compass,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Trophy,
} from 'lucide-react';

interface NextStepBannerProps {
  recommendation: NextStepRecommendation | null;
  onSelectNode: (nodeId: string) => void;
  isAllCompleted?: boolean;
}

export function NextStepBanner({
  recommendation,
  onSelectNode,
  isAllCompleted = false,
}: NextStepBannerProps) {
  if (isAllCompleted) {
    return (
      <div className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Roadmap Completed!
            </p>
            <h3 className="text-sm sm:text-base font-extrabold text-[var(--color-text-primary)]">
              Congratulations! You have completed all topics in this career pathway.
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Next step: build your portfolio projects and schedule mock interviews.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendation) return null;

  return (
    <div className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
          <Compass className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              NEXT RECOMMENDED STEP
            </span>
            <span className="text-xs font-medium text-[var(--color-text-tertiary)] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{Math.round(recommendation.estimatedMinutes / 60)} hrs
            </span>
            <span className="text-xs font-medium text-[var(--color-text-tertiary)]">
              · {recommendation.sectionTitle}
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-extrabold text-[var(--color-text-primary)]">
            {recommendation.nodeTitle}
          </h3>

          <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{recommendation.rationale}</span>
          </p>
        </div>
      </div>

      <div className="shrink-0 self-start sm:self-auto pt-1 sm:pt-0">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSelectNode(recommendation.nodeId)}
          className="shadow-sm group inline-flex items-center gap-2"
        >
          <span>Continue Learning</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
