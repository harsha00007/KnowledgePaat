import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/Button';
import {
  Calculator, Users, Terminal, Code2,
  ArrowRight, FileText, Download
} from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  {
    title: 'Aptitude Notes',
    description: 'Formulas, shortcuts, and practice sets for quantitative aptitude and logical reasoning.',
    icon: Calculator,
    count: '80+ topics',
    href: '/student/notes',
  },
  {
    title: 'HR & Soft Skills',
    description: 'Answer templates for common HR questions, resume writing guides, and email drafts.',
    icon: Users,
    count: '40+ guides',
    href: '/student/notes',
  },
  {
    title: 'Technical Concepts',
    description: 'Core CS fundamentals — OS, DBMS, Computer Networks, and Data Structures.',
    icon: Terminal,
    count: '120+ topics',
    href: '/student/notes',
  },
  {
    title: 'Programming',
    description: 'Cheatsheets and reference guides for Java, Python, C++, SQL, and Web Development.',
    icon: Code2,
    count: '60+ cheatsheets',
    href: '/student/notes',
  },
];

export default function NotesPage() {
  return (
    <PublicLayout>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[var(--color-border)] pt-12 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-600)] mb-5">
              <FileText className="h-3.5 w-3.5" />
              Study Resources
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Study notes for every stage
            </h1>
            <p className="mt-4 text-base text-[var(--color-text-secondary)] leading-relaxed">
              High-quality, concise study materials organized by topic — built to help you revise faster and perform better.
            </p>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ──────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] py-14 flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-6">
            Browse by category
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {CATEGORIES.map((cat) => (
              <NotesCategoryCard key={cat.title} {...cat} />
            ))}
          </div>

          {/* How it works */}
          <div className="mt-12 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white dark:bg-[#131c2e] p-6 shadow-[var(--shadow-xs)]">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-4 font-display">
              How to use KnowledgePaat Notes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { step: '01', title: 'Choose a category', desc: 'Pick the topic area relevant to your upcoming test or interview.' },
                { step: '02', title: 'Read or download', desc: 'View notes directly in the app or download the PDF for offline study.' },
                { step: '03', title: 'Revise and practice', desc: 'Use the notes alongside interview questions for complete preparation.' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-white text-xs font-bold shrink-0">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 text-center">
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Premium members get access to advanced technical notes and programming cheatsheets.
            </p>
            <Link href="/pricing">
              <Button>
                Upgrade for Full Access <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}

function NotesCategoryCard({
  title, description, icon: Icon, count, href,
}: {
  title: string; description: string; icon: React.ElementType;
  count: string; href: string;
}) {
  return (
    <Link href={href} className="group outline-none focus-ring rounded-[var(--radius-lg)]">
      <div className="h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-brand-300)] transition-all duration-200">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-500)] shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-500)] transition-colors">
                {title}
              </h3>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-brand-500)] bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-2 py-0.5 rounded-full">
                {count}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
            <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-[var(--color-brand-500)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
              View Notes <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
