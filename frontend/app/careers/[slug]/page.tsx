import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import {
  Compass,
  Clock,
  Cpu,
  Layers,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Star,
  BookOpen,
  GitBranch,
  Target,
} from 'lucide-react';
import { getPublicCareerBySlug } from '@/lib/careerCatalog';
import type { CareerSkillMapItem } from '@/types/careerSkillGraph';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const career = await getPublicCareerBySlug(slug);

  if (!career) {
    return {
      title: 'Career Not Found | KnowledgePaat',
      description: 'The requested career path could not be found.',
    };
  }

  const title = `${career.name} Career Track & Required Skills | KnowledgePaat`;
  const description =
    career.short_description ||
    career.description ||
    `Explore required skills, target proficiencies, and learning paths for ${career.name}.`;

  return {
    title,
    description,
    keywords: [
      career.name,
      `${career.name} skills`,
      `${career.name} roadmap`,
      `${career.category} careers`,
      'KnowledgePaat',
    ],
    openGraph: {
      title,
      description,
      url: `https://knowledgepaat.com/careers/${career.slug}`,
      siteName: 'KnowledgePaat',
    },
    alternates: {
      canonical: `https://knowledgepaat.com/careers/${career.slug}`,
    },
  };
}

export default async function PublicCareerDetailPage({ params }: Props) {
  const { slug } = await params;
  const career = await getPublicCareerBySlug(slug);

  if (!career) {
    notFound();
  }

  // Partition skills
  const requiredSkills = career.skills.filter((s) => s.importance === 'required');
  const recommendedSkills = career.skills.filter((s) => s.importance === 'recommended');
  const optionalSkills = career.skills.filter((s) => s.importance === 'optional');

  return (
    <PublicLayout>
      {/* ── TOP BREADCRUMB & HERO ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white via-blue-50/40 to-transparent dark:from-slate-950 dark:via-blue-950/20 border-b border-[var(--color-border)] pt-8 pb-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link
              href="/careers"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-blue-600 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Career Catalog</span>
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 capitalize">
                  {career.category.replace(/_/g, ' ')}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] capitalize">
                  Level: {career.difficulty}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <Clock className="w-4 h-4" />
                  Estimated: {career.estimated_months} Months
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                {career.name}
              </h1>

              <p className="text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed">
                {career.description || career.short_description}
              </p>
            </div>

            {/* Quick Action Box */}
            <div className="flex-shrink-0 w-full lg:w-80">
              <Card className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                  <Target className="w-4 h-4" />
                  <span>Roadmap Intelligence</span>
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
                  Ready to master this role?
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mb-5">
                  Follow a curated step-by-step path with practice projects and real-time competency benchmarks.
                </p>

                <Link href={`/roadmaps?search=${encodeURIComponent(career.name)}`} className="block">
                  <Button variant="primary" className="w-full justify-center font-semibold text-sm py-3">
                    <span>Build My Career Roadmap</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>

                <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span>Total Skills: {career.skills.length}</span>
                  <span>Core Required: {requiredSkills.length}</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ── SKILL BREAKDOWN & OUTCOMES ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {/* 1. Core Required Skills */}
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                Core Required Skills ({requiredSkills.length})
              </h2>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Non-negotiable skills and foundational competencies expected by hiring managers for this position.
            </p>

            {requiredSkills.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] italic">No required skills listed yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requiredSkills.map((item) => (
                  <SkillItemCard key={item.id} item={item} badgeColor="red" />
                ))}
              </div>
            )}
          </div>

          {/* 2. Recommended Skills */}
          {recommendedSkills.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                  Recommended Industry Skills ({recommendedSkills.length})
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                High-demand frameworks, platforms, and practices that distinguish competitive candidates.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedSkills.map((item) => (
                  <SkillItemCard key={item.id} item={item} badgeColor="blue" />
                ))}
              </div>
            </div>
          )}

          {/* 3. Optional & Advanced Skills */}
          {optionalSkills.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                  Optional & Specialization Skills ({optionalSkills.length})
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                Complementary tools and edge capabilities that expand your versatility and senior readiness.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {optionalSkills.map((item) => (
                  <SkillItemCard key={item.id} item={item} badgeColor="gray" />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

function SkillItemCard({ item, badgeColor }: { item: CareerSkillMapItem; badgeColor: 'red' | 'blue' | 'gray' }) {
  const skill = item.skill;
  if (!skill) return null;

  return (
    <Link href={`/skills/${skill.slug}`} className="block group">
      <Card className="h-full p-4 border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-blue-500/50 hover:shadow-md transition-all rounded-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
              {skill.skill_type}
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] capitalize">
              Target: {item.proficiency_target}
            </span>
          </div>

          <h3 className="text-base font-bold text-[var(--color-text-primary)] group-hover:text-blue-600 transition-colors mb-1">
            {skill.name}
          </h3>

          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
            {skill.short_description || skill.description || 'View prerequisite graph and competencies.'}
          </p>
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
          <span className="capitalize font-medium">Level: {skill.difficulty}</span>
          <span className="flex items-center gap-1 text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform">
            View Skill →
          </span>
        </div>
      </Card>
    </Link>
  );
}
