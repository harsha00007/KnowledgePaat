import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import {
  Route,
  Search,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Briefcase,
  Code2,
  Rocket,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { getRoadmapsWithUserProgress } from '@/lib/progress';
import { createClient } from '@/utils/supabase/server';
import type { RoadmapCategory, RoadmapDifficulty } from '@/types/roadmap';
import { getClassificationLabel } from '@/lib/roadmapTaxonomy';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Career Roadmaps | KnowledgePaat',
  description:
    'Explore step-by-step career roadmaps for software development, data science, AI, DevOps, QA, and more. Find your path and master required skills.',
  keywords: [
    'career roadmap',
    'developer roadmap',
    'python roadmap',
    'software engineering path',
    'learning paths',
    'KnowledgePaat roadmaps',
  ],
  openGraph: {
    title: 'Career Roadmaps | KnowledgePaat',
    description:
      'Step-by-step career roadmaps for students and freshers to learn skills, build projects, and get job ready.',
    url: 'https://knowledgepaat.com/roadmaps',
    siteName: 'KnowledgePaat',
  },
};

const TRACK_TABS = [
  { label: 'All Roadmaps', value: 'all', icon: Route },
  { label: 'Career Paths', value: 'role', icon: Briefcase },
  { label: 'Core Skills', value: 'skill', icon: Code2 },
  { label: 'Beginner Tracks', value: 'beginner', icon: Rocket },
  { label: 'Best Practices', value: 'best_practice', icon: ShieldCheck },
];

const CATEGORIES: Array<{ label: string; value: RoadmapCategory | 'all' }> = [
  { label: 'All Domains', value: 'all' },
  { label: 'Development', value: 'Development' },
  { label: 'Data', value: 'Data' },
  { label: 'AI', value: 'AI' },
  { label: 'QA & Testing', value: 'QA & Testing' },
  { label: 'DevOps & Cloud', value: 'DevOps & Cloud' },
  { label: 'Cybersecurity', value: 'Cybersecurity' },
  { label: 'Product', value: 'Product' },
  { label: 'Design', value: 'Design' },
  { label: 'Other', value: 'Other' },
];

export default async function RoadmapsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    category?: string;
    difficulty?: string;
    type?: string;
  }>;
}) {
  const { search, category, difficulty, type } = await searchParams;

  const currentCategory = category && category !== 'all' ? category : undefined;
  const currentSearch = search?.trim() || undefined;
  const currentDifficulty = difficulty?.trim() || undefined;
  const currentType = type && type !== 'all' ? type.toLowerCase() : undefined;

  // Derive logged-in user to calculate real roadmap progress
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const roadmaps = await getRoadmapsWithUserProgress(user?.id || null, {
    search: currentSearch,
    category: currentCategory,
    difficulty: currentDifficulty,
    type: currentType,
  });

  return (
    <PublicLayout>
      {/* ── HERO BANNER ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white via-blue-50/30 to-transparent dark:from-slate-950 dark:via-blue-950/20 border-b border-[var(--color-border)] pt-12 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Route className="w-4 h-4" />
            <span>KNOWLEDGEPAAT CAREER PLATFORM</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            CAREER & SKILL ROADMAPS
          </h1>

          <p className="text-base sm:text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Your structured path from career goal to job-ready. Choose a role, master skills, build verified portfolio projects, and prepare for interviews.
          </p>

          {/* Search Form */}
          <div className="pt-4 max-w-2xl mx-auto">
            <form method="GET" action="/roadmaps" className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                <input
                  type="text"
                  name="search"
                  defaultValue={search || ''}
                  placeholder="Search careers, skills, tools or technologies..."
                  className="w-full pl-10 pr-4 h-12 rounded-xl border border-[var(--color-border)] bg-white dark:bg-slate-900 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>

              {category && category !== 'all' && (
                <input type="hidden" name="category" value={category} />
              )}
              {difficulty && (
                <input type="hidden" name="difficulty" value={difficulty} />
              )}
              {type && type !== 'all' && (
                <input type="hidden" name="type" value={type} />
              )}

              <Button type="submit" variant="primary" size="lg" className="h-12 px-6 shrink-0">
                Search
              </Button>
            </form>
          </div>

          {/* ── TRACK TABS (ROLE / SKILL / BEGINNER / BEST PRACTICE) ────────── */}
          <div className="pt-6 flex items-center justify-center gap-2 flex-wrap">
            {TRACK_TABS.map((tab) => {
              const isTabActive =
                (!currentType && tab.value === 'all') ||
                currentType === tab.value;

              const Icon = tab.icon;

              const queryParams = new URLSearchParams();
              if (tab.value !== 'all') queryParams.set('type', tab.value);
              if (currentCategory) queryParams.set('category', currentCategory);
              if (currentSearch) queryParams.set('search', currentSearch);
              const queryString = queryParams.toString();
              const href = queryString ? `/roadmaps?${queryString}` : '/roadmaps';

              return (
                <Link
                  key={tab.value}
                  href={href}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isTabActive
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                      : 'bg-white dark:bg-slate-900 text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DOMAIN CATEGORY PILLS ─────────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)] bg-white dark:bg-slate-950 py-3 sticky top-16 z-30 shadow-2xs backdrop-blur-md bg-white/90 dark:bg-slate-950/90">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-max">
            {CATEGORIES.map((cat) => {
              const isActive =
                (!currentCategory && cat.value === 'all') ||
                currentCategory === cat.value;

              const queryParams = new URLSearchParams();
              if (currentType) queryParams.set('type', currentType);
              if (cat.value !== 'all') queryParams.set('category', cat.value);
              if (currentSearch) queryParams.set('search', currentSearch);
              const queryString = queryParams.toString();
              const href = queryString ? `/roadmaps?${queryString}` : '/roadmaps';

              return (
                <Link
                  key={cat.value}
                  href={href}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ROADMAPS DIRECTORY GRID ───────────────────────────────────────── */}
      <section className="py-10 bg-[var(--color-bg-subtle)] min-h-[50vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span className="font-medium">
              Showing {roadmaps.length} {roadmaps.length === 1 ? 'roadmap' : 'roadmaps'}
            </span>
            {(currentCategory || currentSearch || currentType) && (
              <Link
                href="/roadmaps"
                className="text-blue-600 hover:underline font-semibold"
              >
                Clear all filters
              </Link>
            )}
          </div>

          {roadmaps.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="No roadmaps found"
                description={
                  currentSearch || currentCategory || currentType
                    ? 'No roadmaps match your search or filter criteria. Try adjusting your query or switching track categories.'
                    : 'Roadmaps are currently being prepared. Check back shortly!'
                }
                action={
                  (currentSearch || currentCategory || currentType) && (
                    <Link href="/roadmaps">
                      <Button variant="outline" size="md">
                        View All Roadmaps
                      </Button>
                    </Link>
                  )
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roadmaps.map((rm) => {
                const classification = rm.classification || 'ROLE';
                const classificationLabel = getClassificationLabel(classification);

                return (
                  <Link
                    key={rm.id}
                    href={`/roadmaps/${rm.slug}`}
                    className="group flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[var(--color-border)] hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-200"
                  >
                    <div>
                      {/* Header: Classification + Category & Difficulty */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            classification === 'ROLE'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : classification === 'SKILL'
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                              : classification === 'BEGINNER'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {classificationLabel}
                        </span>

                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                          <span>{rm.category}</span>
                          <span>·</span>
                          <span className="font-medium">{rm.difficulty}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h2 className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-blue-600 transition-colors">
                        {rm.title}
                      </h2>

                      {/* Short Description */}
                      <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-2 line-clamp-3 leading-relaxed">
                        {rm.short_description}
                      </p>

                      {/* Skill Tags (if present) */}
                      {rm.skills && rm.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-3">
                          {rm.skills.slice(0, 4).map((s: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[var(--color-text-tertiary)]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* ── PHASE 3: LOGGED-IN REAL PROGRESS BAR ──────────────── */}
                      {rm.user_progress && rm.user_progress.totalTopics > 0 && (
                        <div className="pt-4 mt-4 border-t border-[var(--color-border)] space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[var(--color-text-secondary)]">Progress</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                              {rm.user_progress.progressPercent}% complete
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${rm.user_progress.progressPercent}%` }}
                              role="progressbar"
                              aria-valuenow={rm.user_progress.progressPercent}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${rm.title} progress`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)]">
                            <span>
                              {rm.user_progress.completedCount} of {rm.user_progress.totalTopics} topics
                            </span>
                            {rm.user_progress.learningCount > 0 && (
                              <span className="text-purple-600 dark:text-purple-400 font-medium">
                                {rm.user_progress.learningCount} learning
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Meta */}
                    <div className="pt-5 mt-5 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {rm.estimated_duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          {rm.section_count} Stages
                        </span>
                      </div>

                      <span className="font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        {rm.user_progress
                          ? rm.user_progress.completedCount > 0 || rm.user_progress.learningCount > 0
                            ? 'Continue Roadmap'
                            : 'Start Roadmap'
                          : 'Explore Roadmap'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
