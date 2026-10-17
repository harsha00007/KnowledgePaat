import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import {
  Compass,
  Search,
  Clock,
  Layers,
  ArrowRight,
  Filter,
  Briefcase,
  Cpu,
  Sparkles,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { getPublicCareers } from '@/lib/careerCatalog';
import type { CareerCatalogItem } from '@/types/careerSkillGraph';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Career Catalog & Skill Paths | KnowledgePaat',
  description:
    'Explore industry-aligned careers across Software Development, Data Science, AI/ML, DevOps, QA, and more. Master required and recommended skills.',
  keywords: [
    'career catalog',
    'software engineering careers',
    'data analyst skills',
    'ai engineer path',
    'developer career tracks',
    'KnowledgePaat careers',
  ],
  openGraph: {
    title: 'Career Catalog & Skill Paths | KnowledgePaat',
    description:
      'Discover high-impact tech careers and learn the exact core and recommended skills required for employment.',
    url: 'https://knowledgepaat.com/careers',
    siteName: 'KnowledgePaat',
  },
};

const CATEGORIES = [
  { label: 'All Careers', value: 'all' },
  { label: 'Software Development', value: 'software_development' },
  { label: 'Data & Analytics', value: 'data' },
  { label: 'AI & Machine Learning', value: 'ai_ml' },
  { label: 'QA & Testing', value: 'qa_testing' },
  { label: 'DevOps & Cloud', value: 'devops_cloud' },
  { label: 'Cybersecurity', value: 'cybersecurity' },
  { label: 'Design', value: 'design' },
  { label: 'Product & Management', value: 'product' },
];

export default async function PublicCareersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    category?: string;
    difficulty?: string;
    page?: string;
  }>;
}) {
  const { search, category, difficulty, page } = await searchParams;

  const currentCategory = category && category !== 'all' ? category : undefined;
  const currentSearch = search?.trim() || undefined;
  const currentDifficulty = difficulty && difficulty !== 'all' ? difficulty : undefined;
  const currentPage = parseInt(page || '1', 10) || 1;

  const { items: careers, total, totalPages } = await getPublicCareers({
    search: currentSearch,
    category: currentCategory,
    difficulty: currentDifficulty,
    page: currentPage,
    limit: 12,
  });

  return (
    <PublicLayout>
      {/* ── HERO BANNER ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white via-blue-50/30 to-transparent dark:from-slate-950 dark:via-blue-950/20 border-b border-[var(--color-border)] pt-12 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Compass className="w-4 h-4" />
            <span>KNOWLEDGEPAAT CAREER CATALOG</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            EXPLORE TECH CAREERS & SKILL GRAPHS
          </h1>

          <p className="text-base sm:text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Find the right career path, see exact industry-required skills, and understand how competencies connect across modern engineering roles.
          </p>

          {/* Search Form */}
          <div className="pt-4 max-w-2xl mx-auto">
            <form method="GET" action="/careers" className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-[var(--color-text-muted)] pointer-events-none" />
              <input
                type="text"
                name="search"
                defaultValue={currentSearch || ''}
                placeholder="Search careers (e.g., Python Developer, Data Analyst, QA, DevOps)..."
                className="w-full pl-12 pr-28 py-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
              />
              {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
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

      {/* ── FILTER CHIPS & STATS ────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = (currentCategory || 'all') === cat.value;
              const params = new URLSearchParams();
              if (cat.value !== 'all') params.set('category', cat.value);
              if (currentSearch) params.set('search', currentSearch);
              if (currentDifficulty) params.set('difficulty', currentDifficulty);

              return (
                <Link
                  key={cat.value}
                  href={`/careers${params.toString() ? `?${params.toString()}` : ''}`}
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
            Showing <span className="text-[var(--color-text-primary)] font-bold">{careers.length}</span> of {total} careers
          </div>
        </div>
      </section>

      {/* ── CAREER GRID ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {careers.length === 0 ? (
          <EmptyState
            title="No careers found"
            description="Try adjusting your search criteria or clearing filters to explore available career tracks."
            action={
              <Link href="/careers">
                <Button variant="outline">View All Careers</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {careers.map((career) => (
              <Card
                key={career.id}
                className="group relative flex flex-col justify-between p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl"
              >
                <div>
                  {/* Category & Difficulty Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 capitalize">
                      {career.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] capitalize">
                      {career.difficulty}
                    </span>
                  </div>

                  {/* Career Name */}
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)] group-hover:text-blue-600 transition-colors mb-2">
                    {career.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-4">
                    {career.short_description || career.description}
                  </p>
                </div>

                {/* Footer Metadata & CTA */}
                <div className="pt-4 border-t border-[var(--color-border)] mt-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>{career.estimated_months} months target</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-blue-500" />
                      <span>{career.skill_count ?? 0} mapped skills</span>
                    </div>
                  </div>

                  <Link href={`/careers/${career.slug}`} className="block w-full">
                    <Button
                      variant="outline"
                      className="w-full justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all font-semibold text-xs"
                    >
                      <span>Explore Career Path</span>
                      <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
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
              if (currentDifficulty) params.set('difficulty', currentDifficulty);
              params.set('page', String(p));

              return (
                <Link
                  key={p}
                  href={`/careers?${params.toString()}`}
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
