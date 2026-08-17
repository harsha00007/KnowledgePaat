import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/Button';
import { Target, Lightbulb, Shield, GraduationCap, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[var(--color-border)] pt-16 pb-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-3.5 py-1 text-xs font-semibold text-[var(--color-brand-600)] mb-4">
            About GradZenX
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
            Bridging the gap between students and their first career breakthrough
          </h1>
          <p className="mt-6 text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-2xl mx-auto">
            We are building a trustworthy, student-first platform designed to eliminate fake job noise, provide focused interview preparation, and empower graduates with real opportunities.
          </p>
        </div>
      </section>

      {/* ── THE PROBLEM & SOLUTION ─────────────────────────────────────── */}
      <section className="py-16 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand-500)] mb-2">The Challenge</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight mb-4">
                The early-career job hunt is broken
              </h2>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed mb-4">
                Every year, millions of ambitious students graduate into an overwhelming job market filled with misleading job postings, unverified consultancies, and fragmented preparation advice.
              </p>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
                Freshers waste valuable time filtering through irrelevant senior roles or questionable third-party portals instead of focusing on what matters: building skills and applying directly.
              </p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)] space-y-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">Our Core Commitments</h3>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-600)] shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">100% Direct Company Links</h4>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">No middlemen or hidden fees to apply.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-600)] shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Verified Fresher Opportunities</h4>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Carefully reviewed roles tailored to 0-2 years experience.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-600)] shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Structured Preparation</h4>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Curated aptitude, HR, and technical learning materials.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION & VISION ───────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-8 shadow-[var(--shadow-xs)]">
              <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center mb-6">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">Our Mission</h3>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
                To simplify the transition from campus to corporate life by providing students with trusted, high-value career tools and transparent employment pathways.
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-8 shadow-[var(--shadow-xs)]">
              <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center mb-6">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">Our Vision</h3>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
                To become the most dependable and student-centric career acceleration platform globally, ensuring every graduate has an equal opportunity to thrive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-dark)] py-16 text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Start preparing for your next role today
          </h2>
          <p className="mt-4 text-sm sm:text-base text-white/70 max-w-xl mx-auto">
            Join GradZenX to access verified job openings, industry-standard interview preparation, and high-impact study materials.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-white text-[var(--color-brand-700)] hover:bg-[var(--color-brand-50)] border-transparent shadow-sm">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
