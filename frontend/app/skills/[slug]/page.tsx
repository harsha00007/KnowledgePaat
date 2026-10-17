import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import {
  Cpu,
  ChevronLeft,
  GitBranch,
  ArrowRight,
  Compass,
  CheckCircle2,
  BookOpen,
  ExternalLink,
  Layers,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { getPublicSkillBySlug } from '@/lib/skillCatalog';
import { getSkillRelationships } from '@/lib/skillGraph';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getPublicSkillBySlug(slug);

  if (!skill) {
    return {
      title: 'Skill Not Found | KnowledgePaat',
      description: 'The requested skill could not be found.',
    };
  }

  const title = `${skill.name} Prerequisites, Graph & Careers | KnowledgePaat`;
  const description =
    skill.short_description ||
    skill.description ||
    `Explore prerequisites, learning paths, and high-impact careers that require ${skill.name}.`;

  return {
    title,
    description,
    keywords: [
      skill.name,
      `${skill.name} prerequisites`,
      `${skill.name} tutorial`,
      `${skill.category} skills`,
      'KnowledgePaat',
    ],
    openGraph: {
      title,
      description,
      url: `https://knowledgepaat.com/skills/${skill.slug}`,
      siteName: 'KnowledgePaat',
    },
    alternates: {
      canonical: `https://knowledgepaat.com/skills/${skill.slug}`,
    },
  };
}

export default async function PublicSkillDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const skill = await getPublicSkillBySlug(slug);

  if (!skill) {
    notFound();
  }

  const page = Number((await searchParams)?.page || 1);
  const relationships = await getSkillRelationships(skill.id, true, page);

  // Fetch careers that map this skill
  const supabase = await createClient();
  const { data: mappings } = await supabase
    .from('career_skill_map')
    .select(`
      id,
      importance,
      proficiency_target,
      career:career_catalog!inner(*)
    `)
    .eq('skill_id', skill.id)
    .eq('career.status', 'published');

  const careersList = ((mappings as any[]) || []).filter((m) => m.career?.status === 'published');

  // Fetch related active learning resources (Phase 2 Resource Engine integration)
  const { data: resources } = await supabase
    .from('career_resources')
    .select('id, title, url, resource_type, difficulty, provider, is_free')
    .eq('is_active', true)
    .or(`title.ilike.%${skill.name}%,description.ilike.%${skill.name}%`)
    .limit(4);

  return (
    <PublicLayout>
      {/* ── TOP HERO BANNER ───────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white via-blue-50/40 to-transparent dark:from-slate-950 dark:via-blue-950/20 border-b border-[var(--color-border)] pt-8 pb-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/skills"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-blue-600 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Skill Catalog</span>
            </Link>
          </div>

          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 capitalize">
                {skill.category.replace(/_/g, ' ')}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] uppercase tracking-wider">
                Type: {skill.skill_type}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] capitalize">
                Difficulty: {skill.difficulty}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              {skill.name}
            </h1>

            <p className="text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed">
              {skill.description || skill.short_description}
            </p>
          </div>
        </div>
      </section>

      {/* ── DETAILS & GRAPH RELATIONSHIPS ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Dependencies & Prerequisites */}
          <div className="lg:col-span-2 space-y-8">
            {/* Prerequisites */}
            <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm uppercase tracking-wider mb-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Foundations & Prerequisites</span>
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                What you should know before {skill.name}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                Recommended prerequisite skills to build solid foundational understanding before diving into {skill.name}.
              </p>

              {relationships.prerequisites.length === 0 ? (
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 text-xs text-[var(--color-text-secondary)]">
                  No prerequisites appear on this page. Review all relationship pages before choosing a starting point.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {relationships.prerequisites.map((rel) => {
                    const other = rel.source_skill_id === skill.id ? rel.target_skill : rel.source_skill;
                    if (!other) return null;
                    return (
                      <Link key={rel.id} href={`/skills/${other.slug}`} className="block group">
                        <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] group-hover:border-blue-500 transition-all flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-blue-600 transition">
                              {other.name}
                            </div>
                            <div className="text-[11px] text-[var(--color-text-muted)] capitalize">
                              {other.skill_type} • {other.difficulty}
                            </div>
                          </div>
                          <ChevronLeft className="w-4 h-4 text-amber-500 transform rotate-180" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Related Skills / Cross-domain */}
            <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl">
              <div className="flex items-center gap-2 text-purple-500 font-bold text-sm uppercase tracking-wider mb-2">
                <GitBranch className="w-4 h-4" />
                <span>Ecosystem & Related Competencies</span>
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                Commonly Used With & Builds On
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                Complementary tools and frameworks frequently used alongside {skill.name} in production environments.
              </p>

              {((relationships.related.length || 0) + (relationships.builds_on.length || 0) + (relationships.commonly_used_with.length || 0)) === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] italic">
                  No secondary relationships mapped in the current catalog release.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ...relationships.builds_on.map((r) => ({ ...r, tag: 'Builds On' })),
                    ...relationships.related.map((r) => ({ ...r, tag: 'Related' })),
                    ...relationships.commonly_used_with.map((r) => ({ ...r, tag: 'Used With' })),
                  ].map((rel) => {
                    const other = rel.source_skill_id === skill.id ? rel.target_skill : rel.source_skill;
                    if (!other) return null;
                    return (
                      <Link key={rel.id} href={`/skills/${other.slug}`} className="block group">
                        <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] group-hover:border-purple-500 transition-all flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-purple-600 transition">
                              {other.name}
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 font-semibold">
                              {rel.tag}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-purple-500" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Curated Resources (Phase 2 Resource Engine Integration) */}
            {resources && resources.length > 0 && (
              <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider mb-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Curated Learning Resources</span>
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                  Recommended Courses & Documentation
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                  High-quality verified resources from the KnowledgePaat Resource Engine to help you master {skill.name}.
                </p>

                <div className="space-y-3">
                  {resources.map((res: any) => (
                    <a
                      key={res.id}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] group-hover:border-blue-500 transition flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-blue-600 transition flex items-center gap-2">
                            <span>{res.title}</span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                          </div>
                          <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-2 mt-1">
                            <span className="capitalize">{res.resource_type}</span>
                            {res.provider && <span>• {res.provider}</span>}
                            {res.is_free && <span className="text-emerald-500 font-semibold">• Free</span>}
                          </div>
                        </div>
                        <span className="text-xs text-blue-600 font-semibold">Open ↗</span>
                      </div>
                    </a>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Careers requiring this skill */}
          <div>
            <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl sticky top-6">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                <Compass className="w-4 h-4" />
                <span>Career Impact</span>
              </div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
                Careers requiring {skill.name} ({careersList.length})
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mb-5">
                Mastering {skill.name} directly moves you towards proficiency in these tech roles:
              </p>

              {careersList.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] italic">
                  Not currently listed as a core requirement for any published careers.
                </p>
              ) : (
                <div className="space-y-3">
                  {careersList.map((item: any) => (
                    <Link key={item.id} href={`/careers/${item.career.slug}`} className="block group">
                      <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] group-hover:border-blue-500 transition flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-blue-600 transition">
                            {item.career.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize ${
                              item.importance === 'required'
                                ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {item.importance}
                            </span>
                            <span className="text-[11px] text-[var(--color-text-muted)]">
                              Target: {item.proficiency_target}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-600 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 pb-8 flex gap-4">
        {page > 1 && <Link href={`/skills/${skill.slug}?page=${page - 1}`}>Previous relationships</Link>}
        <span>Relationship page {page} of {Math.max(1, relationships.totalPages)}</span>
        {page < relationships.totalPages && <Link href={`/skills/${skill.slug}?page=${page + 1}`}>Next relationships</Link>}
      </div>
    </PublicLayout>
  );
}
