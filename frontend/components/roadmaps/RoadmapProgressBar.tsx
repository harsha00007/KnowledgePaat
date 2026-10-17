'use client';

import React from 'react';
import type { RoadmapProgressStats } from '@/types/roadmap';
import { Route, CheckCircle2, Zap, CornerDownRight } from 'lucide-react';

interface RoadmapProgressBarProps {
  roadmapTitle: string;
  stats: RoadmapProgressStats;
  isLoggedIn?: boolean;
}

export function RoadmapProgressBar({
  roadmapTitle,
  stats,
  isLoggedIn = false,
}: RoadmapProgressBarProps) {
  const { totalTopics, completedCount, progressPercent, doneCount, learningCount, skipCount } = stats;

  return (
    <div className="sticky top-16 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-[var(--color-border)] shadow-xs transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title & Percentage */}
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Route className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-[var(--color-text-primary)] truncate max-w-[180px] sm:max-w-[260px]">
                {roadmapTitle}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                {progressPercent}% Complete
              </span>
              {!isLoggedIn && (
                <span className="hidden md:inline-flex text-[11px] text-[var(--color-text-tertiary)] italic">
                  (Local progress)
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar & Topic Metrics */}
          <div className="flex-1 max-w-md flex flex-col gap-1.5">
            {/* Progress track */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${roadmapTitle} completion progress`}
              />
            </div>

            {/* Metrics Breakdown */}
            <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] font-medium">
              <span className="text-[var(--color-text-secondary)] font-semibold">
                {completedCount} of {totalTopics} topics
              </span>

              <div className="flex items-center gap-2.5">
                {doneCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    {doneCount} Done
                  </span>
                )}
                {learningCount > 0 && (
                  <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                    <Zap className="w-3 h-3" />
                    {learningCount} Learning
                  </span>
                )}
                {skipCount > 0 && (
                  <span className="flex items-center gap-1 text-slate-500">
                    <CornerDownRight className="w-3 h-3" />
                    {skipCount} Skipped
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
