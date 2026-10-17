'use client';

import React from 'react';
import type { CareerOutcome } from '@/types/roadmap';
import {
  Briefcase,
  Layers,
  Sparkles,
  FolderGit2,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Award,
} from 'lucide-react';
import Link from 'next/link';

interface CareerOutcomePanelProps {
  roadmapTitle: string;
  outcome: CareerOutcome;
}

export function CareerOutcomePanel({
  roadmapTitle,
  outcome,
}: CareerOutcomePanelProps) {
  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-white via-blue-50/20 to-slate-50 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-950 border border-[var(--color-border)] p-6 sm:p-8 space-y-8 shadow-xs">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
          <Award className="w-3.5 h-3.5" />
          <span>Career Destination & Outcomes</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
          Where this {roadmapTitle} roadmap takes you
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-3xl">
          Unlike traditional syllabi, KnowledgePaat connects your daily study directly to real jobs, portfolio evidence, interview readiness, and verified employment competency.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Target Job Roles */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900/80 border border-[var(--color-border)] space-y-3.5">
          <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
            <Briefcase className="w-4 h-4" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
              Target Job Roles
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {outcome.targetRoles.map((role, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
              >
                {role}
              </span>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] pt-1">
            Qualifies you for both entry-level and intermediate positions in this track.
          </p>
        </div>

        {/* Core Competencies Mastered */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900/80 border border-[var(--color-border)] space-y-3.5">
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
            <Layers className="w-4 h-4" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
              Skills Acquired
            </h3>
          </div>
          <ul className="space-y-1.5 text-xs text-[var(--color-text-secondary)]">
            {outcome.skillsAcquired.slice(0, 5).map((skill, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{skill}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Interview Preparation Connect */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900/80 border border-[var(--color-border)] space-y-3.5">
          <div className="flex items-center gap-2.5 text-purple-600 dark:text-purple-400">
            <GraduationCap className="w-4 h-4" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
              Interview Readiness
            </h3>
          </div>
          <ul className="space-y-1.5 text-xs text-[var(--color-text-secondary)]">
            {outcome.interviewTopics.slice(0, 4).map((topic, i) => (
              <li key={i} className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="truncate">{topic}</span>
              </li>
            ))}
          </ul>
          <div className="pt-1">
            <Link
              href="/interview-preparation"
              className="text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline inline-flex items-center gap-1 group"
            >
              <span>Practice Interview Questions</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Portfolio Projects Section */}
      {outcome.portfolioProjects && outcome.portfolioProjects.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                Portfolio Projects You Will Build
              </h3>
            </div>
            <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">
              {outcome.portfolioProjects.length} Verified Projects
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {outcome.portfolioProjects.map((proj, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[var(--color-border)] hover:border-blue-400 dark:hover:border-blue-700 transition-all space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]">
                      Project #{i + 1}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                      ~{proj.estimatedHours} hrs
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)] leading-snug">
                    {proj.title}
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {proj.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                  <div className="flex flex-wrap gap-1">
                    {proj.skillsUsed.map((s, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--color-text-tertiary)]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>{proj.portfolioValue}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestone Footer */}
      <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-blue-900 dark:text-blue-200 font-semibold">
            {outcome.careerReadinessMilestone}
          </span>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 font-bold text-blue-700 dark:text-blue-400 hover:underline shrink-0"
        >
          <span>Explore Matching Job Roles</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
