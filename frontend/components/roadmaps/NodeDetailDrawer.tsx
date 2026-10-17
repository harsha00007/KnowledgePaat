"use client";

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import {
  Clock,
  Sparkles,
  GitBranch,
  BookOpen,
  X,
  Layers,
  ArrowRight,
  Milestone,
  Flag,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Bot,
  Code2,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import type {
  CareerRoadmapNode,
  CareerRoadmapNodeTopic,
  TopicProgressStatus,
  ValidTopicStatus,
} from '@/types/roadmap';
import type { CareerNodeResourceView } from '@/types/resource';
import { ResourceCard } from './ResourceCard';

interface NodeDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  node: (CareerRoadmapNode & {
    topics?: CareerRoadmapNodeTopic[];
    resources?: CareerNodeResourceView[];
  }) | null;
  prerequisites?: string[];
  nextNodes?: string[];
  onSelectNodeByTitle?: (title: string) => void;
  currentStatus?: TopicProgressStatus;
  onToggleStatus?: (nodeId: string, status: ValidTopicStatus) => void;
}

export function NodeDetailDrawer({
  isOpen,
  onClose,
  node,
  prerequisites = [],
  nextNodes = [],
  onSelectNodeByTitle,
  currentStatus = null,
  onToggleStatus,
}: NodeDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus lock / auto-scroll to top when node changes
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.scrollTop = 0;
    }
  }, [isOpen, node?.id]);

  if (!isOpen || !node) return null;

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'MILESTONE':
        return <Milestone className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'CHECKPOINT':
        return <Flag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'SKILL':
        return <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Intermediate':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Advanced':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <>
      {/* Subtle backdrop overlay: dismisses drawer on click without completely obscuring the roadmap */}
      <div
        className="fixed inset-0 bg-slate-950/20 dark:bg-slate-950/40 backdrop-blur-[1px] z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer Container */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="fixed z-50 bg-[var(--color-surface)] border-[var(--color-border)] shadow-2xl flex flex-col transition-all duration-300 ease-out
          inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl border-t
          md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:max-h-none md:w-[440px] md:max-w-[90vw] md:rounded-none md:border-t-0 md:border-l"
      >
        {/* Mobile Drag Indicator */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--color-border)] flex items-start justify-between gap-4 shrink-0 bg-[var(--color-bg-subtle)]">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-900 border border-[var(--color-border)] shadow-xs">
                {getNodeIcon(node.node_type)}
                <span className="font-mono uppercase text-[10px] tracking-wider text-[var(--color-text-secondary)]">
                  {node.node_type}
                </span>
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getDifficultyBadge(
                  node.difficulty
                )}`}
              >
                {node.difficulty}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-[var(--color-text-tertiary)] bg-white dark:bg-slate-900 border border-[var(--color-border)]">
                <Clock className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                {node.estimated_minutes >= 60
                  ? `${(node.estimated_minutes / 60).toFixed(0)}h`
                  : `${node.estimated_minutes}m`}
              </span>
            </div>

            <h2
              id="drawer-title"
              className="text-lg sm:text-xl font-bold tracking-tight text-[var(--color-text-primary)] leading-snug"
            >
              {node.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail panel"
            className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          ref={drawerRef}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm"
        >
          {/* About this Skill / Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              About this skill
            </h3>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              {node.description || 'Master core foundational patterns and practical implementation for this competency.'}
            </p>
          </div>

          {/* ── PHASE 3: LEARNER PROGRESS STATUS CONTROLS ──────────────────── */}
          <div className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Topic Progress Status
              </span>
              {currentStatus ? (
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                    currentStatus === 'done'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : currentStatus === 'learning'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {currentStatus === 'done'
                    ? '✓ Completed'
                    : currentStatus === 'learning'
                    ? '⚡ Learning'
                    : '↷ Skipped'}
                </span>
              ) : (
                <span className="text-[11px] text-[var(--color-text-tertiary)]">
                  Not started
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* Learning Button */}
              <button
                type="button"
                onClick={() => onToggleStatus?.(node.id, 'learning')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  currentStatus === 'learning'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-500 ring-2 ring-purple-400/40 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/30'
                }`}
              >
                <span>⚡ Learning</span>
              </button>

              {/* Done Button */}
              <button
                type="button"
                onClick={() => onToggleStatus?.(node.id, 'done')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  currentStatus === 'done'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-500 ring-2 ring-emerald-400/40 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30'
                }`}
              >
                <span>✓ Done</span>
              </button>

              {/* Skip Button */}
              <button
                type="button"
                onClick={() => onToggleStatus?.(node.id, 'skip')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  currentStatus === 'skip'
                    ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-500 ring-2 ring-slate-400/40 shadow-xs line-through'
                    : 'bg-white dark:bg-slate-900 text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>↷ Skip</span>
              </button>
            </div>

            <p className="text-[11px] text-[var(--color-text-tertiary)] leading-tight text-center pt-0.5">
              Click active status to clear. Marking Done or Skip counts towards roadmap completion.
            </p>
          </div>

          {/* Topics Covered */}
          {node.topics && node.topics.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Topics & Concepts Covered ({node.topics.length})
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                {node.topics.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>{t.topic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── HANDS-ON PRACTICE & INTERVIEW PREP ──────────────────────────── */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Hands-on Practice & Interview Prep
              </h3>
            </div>
            <p className="text-xs text-blue-850 dark:text-blue-300/90 leading-relaxed">
              Reinforce this competency by practicing targeted technical questions and reviewing real-world job interview patterns.
            </p>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <Link
                href="/interview-preparation"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors inline-flex items-center gap-1.5 shadow-2xs group"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Practice Questions</span>
                <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/jobs"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Relevant Jobs</span>
              </Link>
            </div>
          </div>

          {/* Prerequisites */}
          {prerequisites.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Prerequisites (Learn First)
              </h3>
              <div className="flex flex-wrap gap-2">
                {prerequisites.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectNodeByTitle?.(p)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition-colors inline-flex items-center gap-1.5 group"
                  >
                    <span>{p}</span>
                    <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps / Suggested Next */}
          {nextNodes.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Next Steps (Unlocks After)
              </h3>
              <div className="flex flex-wrap gap-2">
                {nextNodes.map((n, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectNodeByTitle?.(n)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors inline-flex items-center gap-1.5 group"
                  >
                    <span>{n}</span>
                    <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PHASE 2: CURATED LEARNING RESOURCES ───────────────────────── */}
          {node.resources && node.resources.length > 0 && (
            <div className="space-y-3.5 pt-3 border-t border-[var(--color-border)]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Curated Learning Resources ({node.resources.length})
                </h3>
              </div>

              {(() => {
                const recommended =
                  node.resources.find((r) => r.is_recommended) || node.resources[0];
                const additional = node.resources.filter(
                  (r) => r.node_resource_id !== recommended.node_resource_id
                );

                return (
                  <div className="space-y-3">
                    {/* Primary Recommended Resource */}
                    <div>
                      <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        ⭐ Recommended by KnowledgePaat
                      </p>
                      <ResourceCard resource={recommended} featured={true} />
                    </div>

                    {/* Additional Resources */}
                    {additional.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                          Additional Learning Resources ({additional.length})
                        </p>
                        <div className="space-y-2">
                          {additional.map((res) => (
                            <ResourceCard key={res.node_resource_id} resource={res} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Phase 1 Career Journey Preview Notice */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-semibold">Career Roadmap Guidance</p>
              <p className="mt-0.5 text-blue-700/90 dark:text-blue-300/80 leading-relaxed">
                Work through this node using the recommended resource above. You can click on any prerequisites or next steps to explore the connecting career path.
              </p>
            </div>
          </div>

          {/* ── ASK ABOUT THIS TOPIC (V1 STUB) ─────────────────────────────── */}
          <div className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Ask about this topic
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                Preview
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                disabled
                placeholder="Ask about this topic..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-slate-100/70 dark:bg-slate-900/60 text-xs text-[var(--color-text-tertiary)] cursor-not-allowed placeholder:text-[var(--color-text-tertiary)]"
              />
            </div>
            <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span>AI Tutor coming soon. Practice questions and conceptual Q&A will be enabled in future updates.</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">ESC</kbd> to close
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Panel
          </Button>
        </div>
      </aside>
    </>
  );
}
