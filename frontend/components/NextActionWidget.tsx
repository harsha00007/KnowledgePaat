"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Loader } from '@/components/Loader';
import { 
  Target, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Brain, 
  RefreshCw,
  Layers,
  BookOpen,
  Compass
} from 'lucide-react';
import type { PersonalizedRoadmap, ProjectionState } from '@/types/personalizedRoadmap';

export interface NextActionWidgetProps {
  targetCareer: {
    id: string;
    name: string;
    slug: string;
  } | null;
  roadmapData: PersonalizedRoadmap | null;
  isLoading: boolean;
  error: {
    code: string;
    message: string;
  } | null;
  onOpenCareerModal: () => void;
  onRetry: () => void;
}

export function formatProjectionState(state: ProjectionState): {
  label: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (state) {
    case 'ACTIONABLE':
      return {
        label: 'Ready to start',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
      };
    case 'BLOCKED':
      return {
        label: 'Prerequisite required',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: AlertCircle,
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: CheckCircle2,
      };
    case 'SATISFIED':
      return {
        label: 'Already covered',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: Sparkles,
      };
    case 'SUPPORTING_PREREQUISITE':
      return {
        label: 'Foundation skill',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: Brain,
      };
    case 'NOT_YET_RELEVANT':
    default:
      return {
        label: 'Later',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: Layers,
      };
  }
}

export function NextActionWidget({
  targetCareer,
  roadmapData,
  isLoading,
  error,
  onOpenCareerModal,
  onRetry,
}: NextActionWidgetProps) {
  // ── 1. LOADING STATE ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Loader size="md" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
              <div className="h-5 w-64 bg-slate-100 rounded"></div>
              <div className="h-3 w-48 bg-slate-50 rounded"></div>
            </div>
          </div>
          <div className="h-9 w-28 bg-slate-100 rounded-md"></div>
        </div>
      </div>
    );
  }

  // ── 2. TARGET CAREER GATE (NO CAREER SET) ──────────────────────────────────
  const isTargetCareerRequired = !targetCareer || error?.code === 'TARGET_CAREER_REQUIRED';

  if (isTargetCareerRequired) {
    return (
      <div className="rounded-[var(--radius-xl)] border-2 border-dashed border-[var(--color-brand-300)] bg-gradient-to-r from-[var(--color-brand-50)]/40 via-white to-[var(--color-brand-50)]/20 p-6 md:p-8 shadow-[var(--shadow-xs)] transition-all">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-600)] flex items-center justify-center shrink-0 shadow-xs">
              <Target className="w-7 h-7" />
            </div>

            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-600)] flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" /> Career Navigation
                </span>
              </div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                Choose your career goal
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Tell us where you want to go and KnowledgePaat will show you the best next step.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={onOpenCareerModal}
            className="w-full md:w-auto shrink-0 shadow-sm"
          >
            <Target className="w-4 h-4 mr-2" />
            Choose Career
          </Button>
        </div>
      </div>
    );
  }

  // ── 3. ROADMAP UNAVAILABLE FOR SELECTED CAREER ──────────────────────────────
  if (error?.code === 'ROADMAP_UNAVAILABLE') {
    return (
      <div className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50/40 p-6 shadow-[var(--shadow-xs)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                  Career Goal: {targetCareer.name}
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                  Curriculum in preparation
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                We&apos;re preparing the roadmap for this career.
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Our curriculum team is actively structuring the milestones and skill prerequisites for this role.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCareerModal}
              className="w-full md:w-auto text-xs"
            >
              Change Career
            </Button>
            <Link href="/student/interview-preparation" className="w-full md:w-auto">
              <Button variant="primary" size="sm" className="w-full md:w-auto text-xs shadow-xs">
                Explore Questions
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. GENERAL API ERROR STATE ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50/50 p-6 shadow-[var(--shadow-xs)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900">
                We couldn&apos;t load your next step right now.
              </h3>
              <p className="text-xs text-red-700 mt-0.5">
                {error.message || 'Please verify your connection and try again.'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="text-xs shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ── 5. ROADMAP COMPLETED STATE (NO NEXT ACTION REMAINING) ────────────────────
  if (roadmapData && !roadmapData.nextAction) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-emerald-200 bg-gradient-to-r from-emerald-50/40 via-white to-emerald-50/20 p-6 shadow-[var(--shadow-xs)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                  Career Goal: {targetCareer.name}
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                  Roadmap Complete
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                You&apos;ve completed the currently available roadmap.
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                All prioritized skills and curriculum milestones for this path have been completed or satisfied.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCareerModal}
              className="w-full md:w-auto text-xs"
            >
              Change Goal
            </Button>
            <Link href="/student/mock-interview" className="w-full md:w-auto">
              <Button variant="primary" size="sm" className="w-full md:w-auto text-xs shadow-xs">
                Practice Mock Interview <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 6. ACTIVE PHASE C.3 NEXT ACTION ─────────────────────────────────────────
  const nextAction = roadmapData?.nextAction;
  if (!nextAction) return null;

  const stateInfo = formatProjectionState(nextAction.state);
  const StateIcon = stateInfo.icon;

  // Resolve upcoming actions preview (max 3) from projected roadmap
  const allNodesMap = new Map(
    (roadmapData.roadmap || []).flatMap((section) => section.nodes).map((n) => [n.nodeId, n])
  );
  const upcomingNodes = (roadmapData.upcoming || [])
    .map((id) => allNodesMap.get(id))
    .filter(Boolean)
    .slice(0, 3);

  // Safe navigation target:
  // If roadmap has public slug, link to `/roadmaps/${targetCareer.slug}`;
  // Otherwise link to `/student/career-intelligence` or `/student/interview-preparation`.
  const primaryDestination = targetCareer.slug
    ? `/roadmaps/${targetCareer.slug}`
    : '/student/career-intelligence';

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-brand-200)] bg-gradient-to-r from-white via-white to-[var(--color-brand-50)]/40 p-6 md:p-7 shadow-[var(--shadow-sm)] space-y-5 transition-all">
      {/* Top Banner: Goal & Next Step Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]/60">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-600)] flex items-center gap-1.5 bg-[var(--color-brand-50)] px-2.5 py-1 rounded-md border border-[var(--color-brand-200)]">
            <Target className="w-3.5 h-3.5" /> YOUR NEXT STEP
          </span>

          <span className="text-xs bg-slate-100 text-slate-800 px-3 py-1 rounded-full font-semibold border border-slate-200">
            Goal: <strong className="text-[var(--color-text-primary)]">{targetCareer.name}</strong>
          </span>

          <button
            onClick={onOpenCareerModal}
            className="text-xs font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] underline underline-offset-2 transition-colors ml-1"
          >
            Change
          </button>
        </div>

        {/* State Badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${stateInfo.badgeClass}`}
        >
          <StateIcon className="w-3.5 h-3.5" />
          <span>{stateInfo.label}</span>
        </div>
      </div>

      {/* Main Action Content */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
            {nextAction.title}
          </h3>

          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--color-text-tertiary)] tracking-wide">
              Why this is recommended:
            </span>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {nextAction.reason}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2">
          <Link href={primaryDestination} className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              className="w-full"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Start Learning
            </Button>
          </Link>

          <Link href="/student/career-intelligence" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
            >
              View Full Plan <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Upcoming Preview (Prompt Section 19) */}
      {upcomingNodes.length > 0 && (
        <div className="pt-4 border-t border-[var(--color-border)]/60">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Layers className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
            <span className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
              Coming Up Next:
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {upcomingNodes.map((node, index) => (
              <div
                key={node!.nodeId}
                className="flex items-center gap-2 p-2.5 rounded-[var(--radius-md)] bg-slate-50 border border-slate-200/80 text-xs text-[var(--color-text-primary)]"
              >
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-white border border-slate-300 font-bold text-[10px] text-slate-600 shrink-0">
                  {index + 1}
                </span>
                <span className="font-medium truncate">{node!.nodeTitle}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
