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
  Star,
  TrendingUp,
  Shield,
  GraduationCap,
  ChevronDown,
  Bot,
  Zap,
  X,
} from 'lucide-react';

export default function Home() {
  return (
    <PublicLayout>

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="bg-white pt-20 pb-24 sm:pt-28 sm:pb-32 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-brand-600)] mb-8 uppercase tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)]" />
              Now open for student registrations
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl lg:text-[3.5rem] leading-[1.1] letter-spacing-[-0.02em]">
              Launch Your Career{' '}
              <span className="text-[var(--color-brand-500)]">With Confidence</span>
            </h1>

            {/* Sub-headline */}
            <p className="mt-6 text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-2xl mx-auto">
              Verified jobs, expert interview preparation, and curated study resources — built exclusively for students and fresh graduates ready to get hired.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto px-8">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/jobs">
                <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
                  Explore Jobs
                </Button>
              </Link>
            </div>

            {/* Social proof stats */}
            <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10 border-t border-[var(--color-border)]">
              <StatPill number="500+" label="Verified Jobs" />
              <StatPill number="2,000+" label="Students Registered" />
              <StatPill number="1,200+" label="Interview Questions" />
              <StatPill number="4.8★" label="Student Rating" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. PLATFORM CAPABILITIES ────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] py-24 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <p className="text-overline text-[var(--color-brand-500)] mb-3">Platform</p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Everything you need to get hired
            </h2>
            <p className="mt-4 text-base text-[var(--color-text-secondary)]">
              All tools and resources designed specifically for freshers — in one focused platform.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CapabilityCard
              icon={<BriefcaseIcon className="h-5 w-5" />}
              title="Verified Jobs"
              description="Every listing is manually verified. Direct links to official company portals — no middlemen, no fake postings."
              highlighted
            />
            <CapabilityCard
              icon={<BookOpenIcon className="h-5 w-5" />}
              title="Interview Preparation"
              description="Curated HR, technical, and aptitude questions with model answers to help you walk in prepared."
            />
            <CapabilityCard
              icon={<FileTextIcon className="h-5 w-5" />}
              title="Study Notes"
              description="High-quality notes for CS fundamentals, aptitude, and programming — organized by topic."
            />
            <CapabilityCard
              icon={<Bot className="h-5 w-5" />}
              title="AI Mock Interviews"
              description="Practice with AI-powered mock interviews. Get instant scoring, feedback, and personalized improvement plans."
              highlighted
            />
            <CapabilityCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Career Progress"
              description="Track applications, preparation progress, and subscription status from your personal dashboard."
            />
            <CapabilityCard
              icon={<Shield className="h-5 w-5" />}
              title="Trusted Platform"
              description="No paid promotions. No fake listings. GradZenX only lists opportunities that meet our quality standards."
            />
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="bg-white py-24 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <p className="text-overline text-[var(--color-brand-500)] mb-3">Process</p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              From registration to your first offer
            </h2>
            <p className="mt-4 text-base text-[var(--color-text-secondary)]">
              Start your career journey in four simple steps.
            </p>
          </div>

          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-4 sm:gap-0">
              {[
                { step: '01', title: 'Create Account', desc: 'Sign up free in under 60 seconds.' },
                { step: '02', title: 'Build Profile', desc: 'Add education, skills, and upload your resume.' },
                { step: '03', title: 'Prepare', desc: 'Use interview prep, mock interviews, and study notes.' },
                { step: '04', title: 'Apply & Get Hired', desc: 'Apply via verified direct company links.' },
              ].map((item, idx) => (
                <div key={item.step} className="relative flex flex-col items-center text-center px-4">
                  {/* Connector line */}
                  {idx < 3 && (
                    <div className="absolute top-5 left-1/2 w-full h-px bg-[var(--color-border)] hidden sm:block" />
                  )}
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-white text-sm font-bold shadow-sm mb-4 border-2 border-white ring-1 ring-[var(--color-brand-200)]">
                    {item.step}
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1.5">{item.title}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/register">
              <Button size="lg">Start for Free <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. TESTIMONIALS ─────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] py-24 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <p className="text-overline text-[var(--color-brand-500)] mb-3">Stories</p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Students are getting hired
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <TestimonialCard
              quote="GradZenX helped me land my first developer role within 3 months of graduation. The verified job listings saved me from so many scam sites."
              name="Riya Sharma"
              role="Frontend Developer, Bangalore"
              initial="R"
            />
            <TestimonialCard
              quote="The interview prep section is incredibly well-organized. I prepared for my TCS interview in just 2 weeks using the aptitude and HR notes."
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

      {/* ── 5. PRICING — ALL 4 PLANS ────────────────────────────────────── */}
      <section className="bg-white py-24 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <p className="text-overline text-[var(--color-brand-500)] mb-3">Pricing</p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-base text-[var(--color-text-secondary)]">
              Start free. Upgrade when you need more access.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            <PricingCard
              plan="Free"
              price="₹0"
              period="forever"
              features={['Browse verified jobs', 'Basic interview questions', 'Standard study notes', 'Direct apply links']}
              cta="Get Started"
              ctaHref="/register"
              variant="default"
            />
            <PricingCard
              plan="Starter"
              price="₹49"
              period="per month"
              features={['Everything in Free', 'Company-specific questions', '1 AI mock interview/mo', 'Priority job alerts']}
              cta="Choose Starter"
              ctaHref="/pricing"
              variant="default"
            />
            <PricingCard
              plan="Pro"
              price="₹99"
              period="per month"
              features={['Everything in Starter', '3 AI mock interviews/mo', 'Advanced technical notes', 'Career progress tracker']}
              cta="Choose Pro"
              ctaHref="/pricing"
              variant="default"
            />
            <PricingCard
              plan="Premium"
              price="₹149"
              period="per month"
              features={['Everything in Pro', 'Unlimited mock interviews', 'AI career intelligence', 'Resume guidance', 'Premium store access']}
              cta="Choose Premium"
              ctaHref="/pricing"
              variant="featured"
            />
          </div>

          <p className="text-center text-sm text-[var(--color-text-tertiary)] mt-8">
            All plans include a free trial. No credit card required to start.{' '}
            <Link href="/pricing" className="font-medium text-[var(--color-brand-600)] hover:underline">
              View full plan details →
            </Link>
          </p>
        </div>
      </section>

      {/* ── 6. FAQ ──────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] py-24 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-overline text-[var(--color-brand-500)] mb-3">FAQ</p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Common questions
            </h2>
          </div>

          <div className="space-y-2">
            <FaqItem
              question="Are the jobs on GradZenX verified?"
              answer="Yes — every job posted on GradZenX is manually reviewed. We only list opportunities with direct links to official company application portals."
            />
            <FaqItem
              question="Is the interview preparation material free?"
              answer="A comprehensive selection is available on the Free plan. Company-specific questions and advanced technical content are available on Starter and above."
            />
            <FaqItem
              question="Can I upgrade later after starting on the Free plan?"
              answer="Absolutely. You can start for free and upgrade at any time from your student dashboard — no commitment required."
            />
            <FaqItem
              question="What kind of jobs does GradZenX list?"
              answer="We focus exclusively on fresher and entry-level roles — internships, campus placements, graduate trainee programs, and junior positions across technology, finance, and design."
            />
            <FaqItem
              question="How do AI mock interviews work?"
              answer="Our AI interviewer asks you real interview questions, listens to your responses, and provides instant feedback on communication, technical accuracy, and confidence — all from your browser."
            />
          </div>
        </div>
      </section>

      {/* ── 7. FINAL CTA ────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-dark)] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded px-3.5 py-1.5 text-xs font-semibold text-white/80 mb-6 uppercase tracking-wide">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            Free to start — no credit card needed
          </div>
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
                className="bg-white text-[var(--color-brand-700)] hover:bg-[var(--color-brand-50)] w-full sm:w-auto border-transparent px-8"
              >
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/jobs">
              <Button
                variant="ghost"
                size="lg"
                className="text-white hover:bg-white/10 w-full sm:w-auto px-8"
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
      <div className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">{number}</div>
      <div className="text-xs font-medium text-[var(--color-text-tertiary)] mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function CapabilityCard({
  icon, title, description, highlighted = false,
}: {
  icon: React.ReactNode; title: string; description: string; highlighted?: boolean;
}) {
  return (
    <div className={`rounded-[var(--radius-lg)] border p-6 transition-shadow duration-200 hover:shadow-[var(--shadow-md)] ${
      highlighted
        ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-50)]'
        : 'border-[var(--color-border)] bg-white'
    }`}>
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] mb-4 ${
        highlighted
          ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-600)]'
          : 'bg-[var(--color-bg-subtle)] text-[var(--color-brand-500)]'
      }`}>
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
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6">
      <div className="flex gap-0.5 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
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

function PricingCard({
  plan, price, period, features, cta, ctaHref, variant,
}: {
  plan: string; price: string; period: string; features: string[];
  cta: string; ctaHref: string; variant: 'default' | 'featured';
}) {
  const isFeatured = variant === 'featured';
  return (
    <div className={`relative rounded-[var(--radius-lg)] p-6 flex flex-col ${
      isFeatured
        ? 'border-2 border-[var(--color-brand-500)] bg-white shadow-[var(--shadow-md)]'
        : 'border border-[var(--color-border)] bg-white'
    }`}>
      {isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-block bg-[var(--color-brand-500)] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded">
            Recommended
          </span>
        </div>
      )}
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${
        isFeatured ? 'text-[var(--color-brand-500)]' : 'text-[var(--color-text-tertiary)]'
      }`}>
        {plan}
      </p>
      <div className="text-3xl font-bold text-[var(--color-text-primary)] mb-0.5">{price}</div>
      <p className="text-xs text-[var(--color-text-tertiary)] mb-5">{period}</p>
      <ul className="space-y-2.5 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
            <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${isFeatured ? 'text-[var(--color-brand-500)]' : 'text-[var(--color-success)]'}`} />
            {f}
          </li>
        ))}
      </ul>
      <Link href={ctaHref}>
        <Button
          variant={isFeatured ? 'primary' : 'outline'}
          className="w-full justify-center text-xs"
          size="sm"
        >
          {cta}
        </Button>
      </Link>
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
