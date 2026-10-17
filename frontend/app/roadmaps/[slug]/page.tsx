import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/Button';
import { InteractiveRoadmapViewer } from '@/components/roadmaps/InteractiveRoadmapViewer';
import { getPublicRoadmapBySlug } from '@/lib/roadmap';
import {
  ChevronLeft,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  Route,
  HelpCircle,
  GraduationCap,
  Compass,
} from 'lucide-react';
import {
  classifyRoadmap,
  getClassificationLabel,
} from '@/lib/roadmapTaxonomy';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getPublicRoadmapBySlug(slug.trim().toLowerCase());

  if (!detail) {
    return {
      title: 'Roadmap Not Found | KnowledgePaat',
    };
  }

  const { roadmap } = detail;
  const title = roadmap.seo_title || `${roadmap.title} Career Roadmap | KnowledgePaat`;
  const description =
    roadmap.seo_description ||
    roadmap.short_description ||
    `Step-by-step career roadmap to become a ${roadmap.title}. Master skills, practice topics, and get job ready.`;

  return {
    title,
    description,
    keywords: [
      roadmap.title,
      `${roadmap.title} roadmap`,
      `${roadmap.category} career`,
      'developer roadmap',
      'KnowledgePaat',
    ],
    openGraph: {
      title,
      description,
      url: `https://knowledgepaat.com/roadmaps/${roadmap.slug}`,
      siteName: 'KnowledgePaat',
      type: 'article',
    },
    alternates: {
      canonical: `https://knowledgepaat.com/roadmaps/${roadmap.slug}`,
    },
  };
}

export default async function PublicRoadmapDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ topic?: string }>;
}) {
  const { slug } = await params;
  const { topic } = (await searchParams) || {};
  const detail = await getPublicRoadmapBySlug(slug.trim().toLowerCase());

  if (!detail) {
    notFound();
  }

  const { roadmap, stats } = detail;
  const classification = classifyRoadmap(roadmap.slug, roadmap.category);
  const classificationLabel = getClassificationLabel(classification);

  const faqs = [
    {
      q: `How should I navigate the ${roadmap.title} roadmap?`,
      a: 'Start from Stage 01 Foundation and progress sequentially downwards. When multiple skills branch horizontally, explore them in parallel or based on your project requirements. Click on any skill node to reveal curated tutorials, topics, prerequisites, and official guides.',
    },
    {
      q: 'Are the recommended learning resources free?',
      a: 'The majority of KnowledgePaat-curated recommended resources are 100% free high-quality documentation, official tutorials, and full video courses. When paid courses are listed, they are clearly marked with pricing.',
    },
    {
      q: 'How long does this career roadmap take to complete?',
      a: `This roadmap is estimated at ${roadmap.estimated_duration || '16 Weeks'} based on 10–15 hours of focused learning and hands-on building per week. You can progress at your own pace.`,
    },
    {
      q: 'What should I do after completing all stages?',
      a: 'Once you reach the final milestone, build real-world portfolio projects incorporating the tools learned, practice technical interview questions, and align your resume with job requirements in this domain.',
    },
  ];

  return (
    <PublicLayout>
      {/* ── COMPACT CAREER HEADER ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white via-slate-50/60 to-transparent dark:from-slate-950 dark:via-slate-900/30 border-b border-[var(--color-border)] pt-6 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <Link
              href="/roadmaps"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              All Roadmaps
            </Link>
            <span>/</span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              {roadmap.title}
            </span>
          </div>

          {/* Header Title + Stats & CTA Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    classification === 'ROLE'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                      : classification === 'SKILL'
                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300'
                      : classification === 'BEGINNER'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  }`}
                >
                  {classificationLabel}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]">
                  {roadmap.category}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]">
                  {roadmap.difficulty}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]">
                  <Clock className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                  {roadmap.estimated_duration}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  Visual Career Map
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                {roadmap.title}
              </h1>

              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
                {roadmap.description || roadmap.short_description || 'Follow a structured pathway from fundamentals to job-ready development.'}
              </p>
            </div>

            {/* Quick Metrics & Start CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center lg:flex-col lg:items-end gap-3.5 shrink-0">
              <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)]">
                <span className="flex items-center gap-1.5 font-semibold text-[var(--color-text-secondary)]">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {stats.total_sections} Stages
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-semibold text-[var(--color-text-secondary)]">
                  <Route className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  {stats.total_nodes} Connected Skills
                </span>
              </div>

              <Link href={`/login?redirect=/roadmaps/${roadmap.slug}`}>
                <Button variant="primary" size="md" className="shadow-md font-semibold">
                  Start My Roadmap
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── VISUAL ROADMAP MAP WORKSPACE ──────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 space-y-4">
          <div className="flex items-center justify-between gap-4 px-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Interactive Career Map
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Click any skill node to inspect learning topics, prerequisites, and curated resources.
              </p>
            </div>
          </div>

          {/* Interactive Roadmap Map Workspace & Sticky Progress */}
          <InteractiveRoadmapViewer detail={detail} initialTopicId={topic} />
        </div>
      </section>

      {/* ── FAQ / SUPPORTING CONTENT ──────────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
              Everything you need to know about navigating and mastering this roadmap.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] space-y-2"
              >
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          {/* ── CAREER LAUNCH CTA ─────────────────────────────────────────── */}
          <div className="mt-12 p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/10 text-center space-y-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-2 max-w-xl mx-auto">
              <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Ready to become a job-ready {roadmap.title}?
              </h3>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                Follow this structured roadmap, learn from curated resources, and build real-world competency step by step.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href={`/login?redirect=/roadmaps/${roadmap.slug}`}>
                <Button variant="secondary" size="md" className="bg-white text-blue-700 hover:bg-slate-100 border-none font-bold">
                  Start My Journey
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link href="/roadmaps">
                <Button variant="ghost" size="md" className="text-white hover:bg-white/10">
                  Explore Other Roadmaps
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
