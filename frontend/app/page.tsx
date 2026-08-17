import React from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/Button';
import {
  BriefcaseIcon,
  BookOpenIcon,
  FileTextIcon,
  CheckCircle2,
  ArrowRight,
  Users,
  Star,
  TrendingUp,
  Shield,
  GraduationCap,
  ChevronDown
} from 'lucide-react';

export default function Home() {
  return (
    <PublicLayout>

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="bg-white pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-4 py-1.5 text-sm font-medium text-[var(--color-brand-600)] mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)]" />
              Now open for student registrations
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl lg:text-6xl leading-[1.1]">
              Launch Your Career{' '}
              <span className="text-[var(--color-brand-500)]">With Confidence</span>
            </h1>

            {/* Sub-headline */}
            <p className="mt-6 text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-2xl mx-auto">
              GradZenX brings verified jobs, curated interview preparation, and expert study resources together — built specifically for students and fresh graduates.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/jobs">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Explore Jobs
                </Button>
              </Link>
            </div>

            {/* Social proof numbers */}
            <div className="mt-14 flex flex-wrap items-center justify-center gap-8 sm:gap-12 pt-10 border-t border-[var(--color-border)]">
              <StatPill number="500+" label="Verified Jobs" />
              <StatPill number="2,000+" label="Students Registered" />
              <StatPill number="1,200+" label="Interview Questions" />
              <StatPill number="4.8★" label="Student Rating" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. PLATFORM CAPABILITIES ────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] py-24 border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-brand-500)] mb-3">Platform</p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Everything you need to get hired
            </h2>
            <p className="mt-4 text-base text-[var(--color-text-secondary)]">
              All the tools and resources designed specifically for freshers — in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <CapabilityCard
              icon={<BriefcaseIcon className="h-5 w-5" />}
              title="Verified Jobs"
              description="Every listing is manually verified. Direct links to official company portals — no middlemen, no fake postings."
              color="brand"
            />
            <CapabilityCard
              icon={<BookOpenIcon className="h-5 w-5" />}
              title="Interview Preparation"
              description="Curated HR, technical, and aptitude questions with answers to help you walk into interviews prepared."
              color="brand"
            />
            <CapabilityCard
              icon={<FileTextIcon className="h-5 w-5" />}
              title="Study Notes"
              description="High-quality notes for CS fundamentals, quantitative aptitude, and programming — organized by topic."
              color="brand"
            />
            <CapabilityCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Career Progress"
              description="Track your applications, preparation progress, and subscription status from a clean personal dashboard."
              color="brand"
            />
            <CapabilityCard
              icon={<Shield className="h-5 w-5" />}
              title="Trusted Platform"
              description="No paid promotions. No fake jobs. GradZenX only lists opportunities that meet our quality standards."
              color="brand"
            />
            <CapabilityCard
              icon={<GraduationCap className="h-5 w-5" />}
              title="Built for Freshers"
              description="Whether you're a final-year student or a recent graduate, GradZenX is designed around your career needs."
              color="brand"
            />
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-brand-500)] mb-3">Process</p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              From registration to your first offer
            </h2>
            <p className="mt-4 text-base text-[var(--color-text-secondary)]">
              Start your career in four simple steps.
            </p>
          </div>

          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-4">
              {[
                { step: '01', title: 'Create Account', desc: 'Sign up free in under 60 seconds.' },
                { step: '02', title: 'Build Profile', desc: 'Add your education, skills, and upload your resume.' },
                { step: '03', title: 'Prepare', desc: 'Use curated interview prep and study notes.' },
                { step: '04', title: 'Apply & Get Hired', desc: 'Apply via verified direct company links.' },
              ].map((item, idx) => (
                <div key={item.step} className="relative flex flex-col items-center text-center p-6">
                  {/* connector line */}
                  {idx < 3 && (
                    <div className="absolute top-[2.75rem] left-1/2 w-full h-px bg-[var(--color-border)] hidden sm:block" />
                  )}
                  <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-white text-sm font-bold shadow-sm mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">{item.title}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/register">
              <Button size="lg">Start for Free <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. TESTIMONIALS / TRUST ─────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] py-24 border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-brand-500)] mb-3">Stories</p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Students are getting hired
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <TestimonialCard
              quote="GradZenX helped me land my first developer role within 3 months of graduation. The verified job listings saved me from so many scam sites."
              name="Riya Sharma"
              role="Frontend Developer, Bangalore"
              initial="R"
            />
            <TestimonialCard
              quote="The interview prep section is incredibly well-organized. I was able to prepare for my TCS interview in just 2 weeks using the aptitude and HR notes."
              name="Arjun Mehta"
              role="Systems Engineer, Chennai"
              initial="A"
            />
            <TestimonialCard
              quote="Finally a platform that understands what freshers actually need. No noise, no fake jobs. Just real opportunities with direct application links."
              name="Sneha Patel"
              role="Data Analyst, Mumbai"
              initial="S"
            />
          </div>
        </div>
      </section>

      {/* ── 5. PRICING PREVIEW ──────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-brand-500)] mb-3">Pricing</p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-base text-[var(--color-text-secondary)]">
              Start free. Upgrade when you need more.
            </p>
          </div>

          <div className="mx-auto max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Free */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">Free</p>
              <div className="text-4xl font-bold text-[var(--color-text-primary)] mb-1">₹0</div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">Perfect to get started.</p>
              <ul className="space-y-3 mb-8">
                {['Browse verified jobs', 'Basic interview questions', 'Standard study notes', 'Apply via direct links'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button variant="outline" className="w-full">Get Started</Button>
              </Link>
            </div>

            {/* Premium */}
            <div className="rounded-[var(--radius-xl)] border-2 border-[var(--color-brand-500)] bg-white p-8 shadow-[var(--shadow-md)] relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-block bg-[var(--color-brand-500)] text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Recommended
                </span>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand-500)] mb-3">Premium</p>
              <div className="text-4xl font-bold text-[var(--color-text-primary)] mb-1">₹999</div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">per year — everything to get hired.</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Free',
                  'Company-specific questions',
                  'Advanced technical notes',
                  'Priority job alerts',
                  'Resume tips & guidance'
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-brand-500)] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing">
                <Button className="w-full">View Pricing Details</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. FAQ ──────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] py-24 border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-brand-500)] mb-3">FAQ</p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Common questions
            </h2>
          </div>

          <div className="space-y-3">
            <FaqItem
              question="Are the jobs on GradZenX verified?"
              answer="Yes — every job posted on GradZenX is manually reviewed. We only list opportunities with direct links to official company application portals."
            />
            <FaqItem
              question="Is the interview preparation material free?"
              answer="A comprehensive selection is available on the Free plan. Company-specific questions and advanced technical content are available on the Premium plan."
            />
            <FaqItem
              question="Can I upgrade later after starting on the Free plan?"
              answer="Absolutely. You can start for free and upgrade to Premium at any time from your student dashboard — no commitment required."
            />
            <FaqItem
              question="What kind of jobs does GradZenX list?"
              answer="We focus exclusively on fresher and entry-level roles — internships, campus placements, graduate trainee programs, and junior positions across technology, finance, and design."
            />
          </div>
        </div>
      </section>

      {/* ── 7. FINAL CTA ────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-dark)] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to launch your career?
          </h2>
          <p className="mt-4 text-base text-white/60 max-w-xl mx-auto">
            Join thousands of students who use GradZenX to find jobs, prepare for interviews, and build their future.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-white text-[var(--color-brand-700)] hover:bg-[var(--color-brand-50)] w-full sm:w-auto shadow-none border-transparent"
              >
                Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/jobs">
              <Button
                variant="ghost"
                size="lg"
                className="text-white hover:bg-white/10 w-full sm:w-auto"
              >
                Browse Jobs
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}

/* ─── SUB-COMPONENTS ──────────────────────────────────────────────────── */

function StatPill({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-[var(--color-text-primary)]">{number}</div>
      <div className="text-sm text-[var(--color-text-tertiary)] mt-0.5">{label}</div>
    </div>
  );
}

function CapabilityCard({
  icon, title, description, color,
}: {
  icon: React.ReactNode; title: string; description: string; color: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] transition-shadow duration-200">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-500)] mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
    </div>
  );
}

function TestimonialCard({
  quote, name, role, initial,
}: {
  quote: string; name: string; role: string; initial: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
      <div className="flex gap-0.5 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-5">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-[var(--color-brand-500)] text-white flex items-center justify-center text-sm font-bold shrink-0">
          {initial}
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{name}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">{role}</p>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-inset rounded-[var(--radius-lg)]">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{question}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5">
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{answer}</p>
      </div>
    </details>
  );
}
