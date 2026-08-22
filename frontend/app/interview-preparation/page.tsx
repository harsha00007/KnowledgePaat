import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import {
  Users, Code, Brain, Building, ArrowRight,
  CheckCircle2, BookOpen
} from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  {
    title: 'HR Interview',
    description: 'Behavioral questions, self-introduction, strengths and weaknesses, cultural fit — with sample answers and tips.',
    icon: Users,
    count: '120+ questions',
    href: '/student/interview-preparation',
    color: 'blue',
  },
  {
    title: 'Technical Interview',
    description: 'Data structures, algorithms, OS, DBMS, networking, and programming fundamentals for software roles.',
    icon: Code,
    count: '400+ questions',
    href: '/student/interview-preparation',
    color: 'purple',
  },
  {
    title: 'Aptitude & Reasoning',
    description: 'Quantitative aptitude, logical reasoning, and verbal ability — the essential shortlisting round.',
    icon: Brain,
    count: '300+ questions',
    href: '/student/interview-preparation',
    color: 'emerald',
  },
  {
    title: 'Company-wise Questions',
    description: 'Previously asked interview questions from TCS, Infosys, Wipro, Accenture, Amazon, and more.',
    icon: Building,
    count: '50+ companies',
    href: '/student/interview-preparation',
    color: 'amber',
  },
];

const TIPS = [
  'Practice answers out loud — not just in your head.',
  'Research the company before every interview.',
  'Use the STAR method for behavioral questions.',
  'Prepare 3–5 thoughtful questions to ask the interviewer.',
];

export default function InterviewPreparationPage() {
  return (
    <PublicLayout>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[var(--color-border)] pt-12 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-600)] mb-5">
              <BookOpen className="h-3.5 w-3.5" />
              Interview Preparation
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Walk into every interview prepared
            </h1>
            <p className="mt-4 text-base text-[var(--color-text-secondary)] leading-relaxed">
              Curated questions and answers across HR, technical, and aptitude categories — organized for freshers and recent graduates.
            </p>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ──────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] py-14 flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-6">
            Choose a category
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {CATEGORIES.map((cat) => (
              <CategoryCard key={cat.title} {...cat} />
            ))}
          </div>

          {/* Quick Tips */}
          <div className="mt-12 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">
              Quick Tips for Interview Success
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="mt-10 text-center">
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Get access to company-specific questions and advanced content.
            </p>
            <Link href="/pricing">
              <Button>
                Upgrade to Premium <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}

function CategoryCard({
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
              Start Preparing <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
