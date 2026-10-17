import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import {
  Cpu,
  Search,
  ChevronRight,
  GitBranch,
  Layers,
  Compass,
} from 'lucide-react';
import { getPublicSkills } from '@/lib/skillCatalog';
import type { SkillCatalogItem } from '@/types/careerSkillGraph';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Skill Catalog & Technology Graph | KnowledgePaat',
  description:
    'Explore the KnowledgePaat skill catalog. Discover languages, frameworks, databases, and tools with prerequisite maps and career connections.',
  keywords: [
    'skill catalog',
    'developer skills',
    'python skills',
    'programming languages',
    'cloud tools',
    'KnowledgePaat skills',
  ],
  openGraph: {
    title: 'Skill Catalog & Technology Graph | KnowledgePaat',
    description:
      'Explore reusable skills, prerequisite dependencies, and modern competencies across technology careers.',
    url: 'https://knowledgepaat.com/skills',
    siteName: 'KnowledgePaat',
  },
};

const CATEGORIES = [
  { label: 'All Categories', value: 'all' },
  { label: 'Software Development', value: 'software_development' },
  { label: 'Data & Analytics', value: 'data' },
  { label: 'AI & Machine Learning', value: 'ai_ml' },
  { label: 'QA & Testing', value: 'qa_testing' },
  { label: 'DevOps & Cloud', value: 'devops_cloud' },
  { label: 'Cybersecurity', value: 'cybersecurity' },
  { label: 'Design', value: 'design' },
  { label: 'Product & Management', value: 'product' },
];

const SKILL_TYPES = [
  { label: 'All Types', value: 'all' },
  { label: 'Languages', value: 'language' },
  { label: 'Frameworks', value: 'framework' },
  { label: 'Databases', value: 'database' },
  { label: 'Tools', value: 'tool' },
  { label: 'Platforms', value: 'platform' },
  { label: 'Concepts', value: 'concept' },
  { label: 'Practices', value: 'practice' },
];

export default async function PublicSkillsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    category?: string;
    type?: string;
    difficulty?: string;
    page?: string;
  }>;
}) {
  const { search, category, type, difficulty, page } = await searchParams;

  const currentCategory = category && category !== 'all' ? category : undefined;
  const currentType = type && type !== 'all' ? type : undefined;
  const currentSearch = search?.trim() || undefined;
  const currentDifficulty = difficulty && difficulty !== 'all' ? difficulty : undefined;
  const currentPage = parseInt(page || '1', 10) || 1;

  const { items: skills, total, totalPages } = await getPublicSkills({
    search: currentSearch,
    category: currentCategory,
    skill_type: currentType,
    difficulty: currentDifficulty,
    page: currentPage,
    limit: 18,
  });

  return (
    <PublicLayout>
      {/* ── HERO BANNER ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white via-blue-50/30 to-transparent dark:from-slate-950 dark:via-blue-950/20 border-b border-[var(--color-border)] pt-12 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Cpu className="w-4 h-4" />
            <span>KNOWLEDGEPAAT SKILL GRAPH</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            SKILL CATALOG & DEPENDENCIES
          </h1>

          <p className="text-base sm:text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Discover core languages, frameworks, libraries, and tools. Understand prerequisites and see which tech careers require each skill.
          </p>

          {/* Search Form */}
          <div className="pt-4 max-w-2xl mx-auto">
            <form method="GET" action="/skills" className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-[var(--color-text-muted)] pointer-events-none" />
              <input
                type="text"
                name="search"
                defaultValue={currentSearch || ''}
                placeholder="Search skills (e.g., Python, SQL, Docker, React, Testing)..."
                className="w-full pl-12 pr-28 py-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
              />
              {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
              {currentType && <input type="hidden" name="type" value={currentType} />}
              {currentDifficulty && <input type="hidden" name="difficulty" value={currentDifficulty} />}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="absolute right-2 text-xs font-medium"
              >
                Search
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* ── FILTER BAR ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = (currentCategory || 'all') === cat.value;
              const params = new URLSearchParams();
              if (cat.value !== 'all') params.set('category', cat.value);
              if (currentType) params.set('type', currentType);
              if (currentSearch) params.set('search', currentSearch);
              if (currentDifficulty) params.set('difficulty', currentDifficulty);

              return (
                <Link
                  key={cat.value}
                  href={`/skills${params.toString() ? `?${params.toString()}` : ''}`}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]'
                  }`}
                >
                  {cat.label}
                </Link>
              );
            })}
          </div>

          <div className="text-xs text-[var(--color-text-muted)] font-medium">
            Showing <span className="text-[var(--color-text-primary)] font-bold">{skills.length}</span> of {total} skills
          </div>
        </div>
      </section>

      {/* ── SKILLS GRID ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {skills.length === 0 ? (
          <EmptyState
            title="No skills found"
            description="Try searching with a different term or clearing category filters."
            action={
              <Link href="/skills">
                <Button variant="outline">View All Skills</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {skills.map((skill) => (
              <Card
                key={skill.id}
                className="group relative flex flex-col justify-between p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                      {skill.skill_type}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)] capitalize">
                      {skill.difficulty}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-blue-600 transition-colors mb-1.5">
                    {skill.name}
                  </h3>

                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-4">
                    {skill.short_description || skill.description || 'Explore prerequisites, related concepts, and career tracks.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] mt-auto">
                  <Link href={`/skills/${skill.slug}`} className="block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between group-hover:border-blue-500 group-hover:text-blue-600 transition-all text-xs font-semibold"
                    >
                      <span>View Skill Graph</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── PAGINATION ──────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const params = new URLSearchParams();
              if (currentSearch) params.set('search', currentSearch);
              if (currentCategory) params.set('category', currentCategory);
              if (currentType) params.set('type', currentType);
              if (currentDifficulty) params.set('difficulty', currentDifficulty);
              params.set('page', String(p));

              return (
                <Link
                  key={p}
                  href={`/skills?${params.toString()}`}
                  className={`w-9 h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition ${
                    currentPage === p
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]'
                  }`}
                >
                  {p}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
