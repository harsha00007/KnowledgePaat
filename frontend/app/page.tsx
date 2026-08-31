"use client";

import React, { useState } from 'react';
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
  Bot,
  Zap,
  ChevronDown,
  GraduationCap,
  Sparkles,
  Lock
} from 'lucide-react';
import { useFeatureFlags } from '@/context/FeatureFlagContext';

interface CategoryItem {
  id: string;
  label: string;
  targetId: string;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'all',          label: 'All Resources',       targetId: 'comprehensive-platform' },
  { id: 'jobs',         label: 'Verified Jobs',       targetId: 'card-jobs' },
  { id: 'interview',    label: 'Interview Prep',      targetId: 'card-interview' },
  { id: 'notes',        label: 'Study Notes',         targetId: 'card-notes' },
  { id: 'ai',           label: 'AI Mock Interviews',  targetId: 'card-ai' },
  { id: 'intelligence', label: 'Career Tracking',     targetId: 'card-intelligence' },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const { isFeatureEnabled } = useFeatureFlags();
  const isPricingBlurred = isFeatureEnabled('blur_homepage_pricing');


  const handleCategorySelect = (categoryId: string, targetId: string) => {
    setActiveCategory(categoryId);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <PublicLayout>

      {/* ── 1. HERO SECTION (Clean White Background) ────────────────────── */}
      <section className="relative overflow-hidden bg-white pt-8 pb-12 sm:pt-16 sm:pb-20 lg:pt-18 lg:pb-22 border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-center">
            
            {/* Left Column: Headline, Copy & CTAs */}
            <div className="lg:col-span-7 text-center lg:text-left">
              {/* Trust Pill */}
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200/90 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-[#2563EB] mb-4 sm:mb-6 shadow-2xs font-display max-w-full text-center">
                <span className="flex h-2 w-2 rounded-full bg-[#22D3A2] shrink-0" />
                <span className="truncate">From Knowledge to Opportunity • India's Career Platform</span>
              </div>

              {/* Main Headline */}
              <h1 className="font-display text-3xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#0B1D3A] leading-[1.15]">
                Turn Knowledge Into <br className="hidden sm:inline" />
                <span className="brand-gradient-text">Real Career Opportunity.</span>
              </h1>

              {/* Supporting Copy */}
              <p className="mt-3.5 sm:mt-5 text-sm sm:text-lg text-[#475569] leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
                Learn the skills employers need, practice with real interview questions, discover verified opportunities, and build your career journey.
              </p>

              {/* Dual Action CTAs */}
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-3.5 w-full">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto shadow-brand gap-2 font-bold px-6 sm:px-7 text-sm sm:text-base justify-center">
                    Start Your Career Journey <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/jobs" className="w-full sm:w-auto">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto font-semibold px-6 sm:px-7 border-slate-300 text-sm sm:text-base justify-center">
                    Explore Verified Jobs
                  </Button>
                </Link>
              </div>

              {/* Subtle Career Pathway Bar */}
              <div className="mt-6 sm:mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-slate-500">
                <span className="font-bold text-[#0B1D3A] mr-0.5">Your Pathway:</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[#00C2CB] font-bold text-[10px] sm:text-xs whitespace-nowrap">01 Knowledge</span>
                <span className="text-slate-300 select-none">→</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[#2563EB] font-bold text-[10px] sm:text-xs whitespace-nowrap">02 Skills</span>
                <span className="text-slate-300 select-none">→</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[#7C3AED] font-bold text-[10px] sm:text-xs whitespace-nowrap">03 Practice</span>
                <span className="text-slate-300 select-none">→</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[#22D3A2] font-bold text-[10px] sm:text-xs whitespace-nowrap">04 Opportunity</span>
              </div>
            </div>

            {/* Right Column: Clean White Dashboard Preview Card */}
            <div className="lg:col-span-5 w-full">
              <div className="relative rounded-2xl bg-white border border-slate-200/90 p-4.5 sm:p-6 lg:p-7 shadow-sm max-w-full overflow-hidden">
                {/* Header inside card */}
                <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold shrink-0">
                      <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-xs sm:text-sm font-bold text-[#0B1D3A] truncate">Career Readiness Score</h3>
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate">Live Placement Indicator</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-50 text-[#22D3A2] border border-emerald-200 shrink-0 whitespace-nowrap">
                    88% Job-Ready
                  </span>
                </div>

                {/* Progress metrics */}
                <div className="mt-4 sm:mt-5 space-y-3 sm:space-y-3.5">
                  <div>
                    <div className="flex justify-between text-[11px] sm:text-xs font-semibold mb-1 gap-2">
                      <span className="text-slate-700 truncate">Technical Assessment (Python & SQL)</span>
                      <span className="text-[#2563EB] font-bold shrink-0">92%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-[#2563EB] rounded-full w-[92%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] sm:text-xs font-semibold mb-1 gap-2">
                      <span className="text-slate-700 truncate">Study Notes Revision</span>
                      <span className="text-[#00C2CB] font-bold shrink-0">85%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-[#00C2CB] rounded-full w-[85%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] sm:text-xs font-semibold mb-1 gap-2">
                      <span className="text-slate-700 truncate">AI Mock Interview Simulator</span>
                      <span className="text-[#7C3AED] font-bold shrink-0">87%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-[#7C3AED] rounded-full w-[87%]" />
                    </div>
                  </div>
                </div>

                {/* Quick Action Navigation */}
                <div className="mt-4 sm:mt-6 pt-3.5 sm:pt-5 border-t border-slate-100 grid grid-cols-2 gap-2 sm:gap-2.5">
                  <Link href="/interview-preparation" className="p-2 sm:p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/70 transition-all">
                    <span className="text-[9px] sm:text-[11px] font-bold text-[#00C2CB] block uppercase tracking-wider font-display truncate">Practice Hub</span>
                    <span className="text-[10px] sm:text-xs font-bold text-[#0B1D3A] mt-0.5 block truncate">1,500+ Questions →</span>
                  </Link>
                  <Link href="/jobs" className="p-2 sm:p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/70 transition-all">
                    <span className="text-[9px] sm:text-[11px] font-bold text-[#22D3A2] block uppercase tracking-wider font-display truncate">Direct Openings</span>
                    <span className="text-[10px] sm:text-xs font-bold text-[#0B1D3A] mt-0.5 block truncate">500+ Verified Jobs →</span>
                  </Link>
                </div>
              </div>
            </div>

          </div>

          {/* ── REAL TRUST METRICS BAR ───────────────────────────────────── */}
          <div className="mt-8 sm:mt-14 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 p-4 sm:p-8 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <StatPill number="10,000+" label="Students Prepared" />
            <StatPill number="500+" label="Verified Jobs" />
            <StatPill number="1,500+" label="Interview Questions" />
            <StatPill number="4.9 / 5" label="Platform Rating" />
          </div>
        </div>
      </section>

      {/* ── 2. REFINED CATEGORY NAVIGATION (Interactive & Smooth-Scrolling) ── */}
      <section className="bg-white py-3 sm:py-4 border-b border-slate-200/80 relative z-20">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 touch-pan-x">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id, cat.targetId)}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 font-display cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isSelected
                      ? 'bg-[#2563EB] text-white shadow-brand font-bold'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-[#2563EB] border border-slate-200/80'
                  }`}
                  aria-pressed={isSelected}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. FEATURE ECOSYSTEM (Clean White Cards) ────────────────────── */}
      <section
        id="comprehensive-platform"
        className="bg-[#F8FAFC] pt-8 pb-12 sm:pt-12 sm:pb-18 lg:pt-14 lg:pb-20 border-b border-slate-200/80 scroll-mt-20 sm:scroll-mt-28"
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-6 sm:mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#2563EB] mb-1.5 sm:mb-2 font-display">
              Comprehensive Platform
            </p>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0B1D3A]">
              Everything You Need From Prep To Hired
            </h2>
            <p className="mt-2 sm:mt-2.5 text-xs sm:text-base text-[#475569]">
              Six essential pillars engineered to take students from foundational knowledge to verified hiring.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            <CapabilityCard
              id="card-jobs"
              icon={<BriefcaseIcon className="h-5 w-5 text-[#2563EB]" />}
              iconBg="bg-blue-50"
              title="Verified Job Opportunities"
              description="Direct application links to official company portals. Zero consultancy charges and zero fake postings."
              badge="100% Direct"
              badgeColor="text-[#2563EB] bg-blue-50 border-blue-200"
              ctaText="Browse Openings"
              ctaHref="/jobs"
              isHighlighted={activeCategory === 'jobs'}
            />
            <CapabilityCard
              id="card-interview"
              icon={<BookOpenIcon className="h-5 w-5 text-[#00C2CB]" />}
              iconBg="bg-teal-50"
              title="Interview Preparation Hub"
              description="Extensive HR, Technical, and Aptitude question banks with verified model answers, tips, and common pitfalls."
              badge="Curated"
              badgeColor="text-[#00C2CB] bg-teal-50 border-teal-200"
              ctaText="Start Practicing"
              ctaHref="/interview-preparation"
              isHighlighted={activeCategory === 'interview'}
            />
            <CapabilityCard
              id="card-notes"
              icon={<FileTextIcon className="h-5 w-5 text-indigo-600" />}
              iconBg="bg-indigo-50"
              title="Curated Study Notes & Bundles"
              description="High-yield formula sheets, CS core fundamentals (OS, DBMS, Networks), and language cheatsheets for revision."
              badge="Study Vault"
              badgeColor="text-indigo-600 bg-indigo-50 border-indigo-200"
              ctaText="View Notes Library"
              ctaHref="/notes"
              isHighlighted={activeCategory === 'notes'}
            />
            <CapabilityCard
              id="card-ai"
              icon={<Bot className="h-5 w-5 text-[#7C3AED]" />}
              iconBg="bg-purple-50"
              title="AI Mock Interview Simulator"
              description="Practice live voice & text interviews. Get instant evaluation on communication, technical depth, and confidence."
              badge="AI-Powered"
              badgeColor="text-[#7C3AED] bg-purple-50 border-purple-200"
              ctaText="Simulate Interview"
              ctaHref="/student/mock-interview"
              isHighlighted={activeCategory === 'ai'}
            />
            <CapabilityCard
              id="card-intelligence"
              icon={<TrendingUp className="h-5 w-5 text-[#22D3A2]" />}
              iconBg="bg-emerald-50"
              title="Career Intelligence & Tracking"
              description="Track application outcomes, skill strengths, and follow tailored daily recommendations."
              badge="Intelligence"
              badgeColor="text-[#22D3A2] bg-emerald-50 border-emerald-200"
              ctaText="Track Progress"
              ctaHref="/student/career-progress"
              isHighlighted={activeCategory === 'intelligence'}
            />
            <CapabilityCard
              id="card-quality"
              icon={<Shield className="h-5 w-5 text-slate-700" />}
              iconBg="bg-slate-100"
              title="Verified Quality Standard"
              description="Strict verification guidelines ensure every company link and preparation question meets tier-1 hiring standards."
              badge="Certified"
              badgeColor="text-slate-700 bg-slate-100 border-slate-200"
              ctaText="Learn More"
              ctaHref="/about"
              isHighlighted={false}
            />
          </div>
        </div>
      </section>

      {/* ── 4. SIGNATURE CAREER JOURNEY (Clean Connected Path) ──────────── */}
      <section id="journey" className="bg-white py-8 sm:py-16 lg:py-20 border-b border-slate-200/80 scroll-mt-20 sm:scroll-mt-28">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#00C2CB] mb-1.5 sm:mb-2 font-display">
              Signature Pathway
            </p>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0B1D3A]">
              Your Journey From Learning To Career Success
            </h2>
            <p className="mt-2 sm:mt-2.5 text-xs sm:text-base text-[#475569]">
              A structured roadmap connecting every stage of preparation directly to corporate placement.
            </p>
          </div>

          <div className="mx-auto max-w-5xl relative">
            {/* Subtle Connected Horizontal Flow Line */}
            <div className="hidden sm:block absolute top-10 left-16 right-16 h-0.5 bg-gradient-to-r from-[#00C2CB] via-[#2563EB] via-[#7C3AED] to-[#22D3A2] opacity-40 z-0" />

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-4 sm:gap-4 relative z-10">
              {[
                { step: '01', title: 'Learn', subtitle: 'Study Notes & Core CS', color: 'bg-[#00C2CB]', textColor: 'text-[#00C2CB]', desc: 'Review curated notes and high-yield cheatsheets.' },
                { step: '02', title: 'Practice', subtitle: 'Questions & Assessments', color: 'bg-[#2563EB]', textColor: 'text-[#2563EB]', desc: 'Solve topic-wise questions with model answers.' },
                { step: '03', title: 'Prepare', subtitle: 'AI Mock Interviews', color: 'bg-[#7C3AED]', textColor: 'text-[#7C3AED]', desc: 'Test real speech & technical reasoning under pressure.' },
                { step: '04', title: 'Get Hired', subtitle: 'Verified Job Offers', color: 'bg-[#22D3A2]', textColor: 'text-[#22D3A2]', desc: 'Apply directly to verified entry-level openings.' },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center p-4.5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all">
                  <div className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl ${item.color} text-white font-display text-xs sm:text-sm font-bold shadow-xs mb-3 sm:mb-3.5`}>
                    {item.step}
                  </div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#0B1D3A]">{item.title}</h3>
                  <p className={`text-[11px] sm:text-xs font-semibold ${item.textColor} mt-0.5 mb-1.5 sm:mb-2 font-display`}>{item.subtitle}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. STUDENT TESTIMONIALS (Clean White Cards) ─────────────────── */}
      <section className="bg-[#F8FAFC] py-8 sm:py-16 lg:py-20 border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#2563EB] mb-1.5 sm:mb-2 font-display">
              Student Success
            </p>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0B1D3A]">
              Trusted by ambitious job seekers nationwide
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-6">
            <TestimonialCard
              quote="KnowledgePaat transformed my campus placement preparation. The AI mock interview feedback helped me crack my final technical round."
              name="Riya Sharma"
              role="Software Engineer • Placed via Verified Openings"
              initial="R"
            />
            <TestimonialCard
              quote="No spam consultancies or misleading ads. Every job link took me directly to the official careers portal of top product companies."
              name="Arjun Mehta"
              role="Associate Developer • Hyderabad"
              initial="A"
            />
            <TestimonialCard
              quote="The combination of formula sheets, aptitude practice, and timed MCQ assessments gave me everything I needed in one single login."
              name="Sneha Patel"
              role="Data Analyst • Pune"
              initial="S"
            />
          </div>
        </div>
      </section>

      {/* ── 6. PRICING (4-Tier Grid with Clear Hierarchy) ──────────────── */}
      <section id="pricing" className="bg-white py-8 sm:py-16 lg:py-20 border-b border-slate-200/80 scroll-mt-20 sm:scroll-mt-28">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#2563EB] mb-1.5 sm:mb-2 font-display">
              Clear & Transparent Plans
            </p>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0B1D3A]">
              Choose the plan built for your career goals
            </h2>
            <p className="mt-2 sm:mt-2.5 text-xs sm:text-base text-[#475569]">
              Start completely free. Upgrade anytime for advanced interview questions and AI simulations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
            <PricingCard
              plan="Free"
              price="₹0"
              period="forever free"
              features={['Browse 500+ verified jobs', 'Direct company apply links', 'Foundational interview questions', 'Standard study notes access']}
              cta="Start Free"
              ctaHref="/register"
              variant="default"
              isBlurred={isPricingBlurred}
            />
            <PricingCard
              plan="Starter"
              price="₹49"
              period="per month"
              features={['Everything in Free', 'Company-specific interview prep', '1 AI Mock Interview per month', 'Priority job alerts']}
              cta="Choose Starter"
              ctaHref="/pricing"
              variant="default"
              isBlurred={isPricingBlurred}
            />
            <PricingCard
              plan="Pro"
              price="₹99"
              period="per month"
              features={['Everything in Starter', '2 AI Mock Interviews per month', 'Advanced technical notes vault', 'Career progress analytics']}
              cta="Choose Pro"
              ctaHref="/pricing"
              variant="popular"
              isBlurred={isPricingBlurred}
            />
            <PricingCard
              plan="Premium"
              price="₹149"
              period="per month"
              features={['Everything in Pro', 'Unlimited mock interviews', 'Full AI career intelligence', 'Dedicated resume guidance', 'Premium store access']}
              cta="Choose Premium"
              ctaHref="/pricing"
              variant="premium"
              isBlurred={isPricingBlurred}
            />
          </div>
        </div>
      </section>

      {/* ── 7. FAQ ACCORDION (Clean White Accordions) ──────────────────── */}
      <section id="faq" className="bg-[#F8FAFC] py-8 sm:py-16 lg:py-20 border-b border-slate-200/80 scroll-mt-20 sm:scroll-mt-28">
        <div className="mx-auto max-w-3xl px-3 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#2563EB] mb-1.5 sm:mb-2 font-display">
              Support & Clarity
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1D3A]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3 sm:space-y-3.5">
            <FaqItem
              question="Are all jobs on KnowledgePaat verified?"
              answer="Yes. Every job listing is manually verified to ensure it links directly to official company career portals. We strictly prohibit paid consultancies and unverified third-party brokers."
            />
            <FaqItem
              question="What is the difference between Practice Questions and MCQ Tests?"
              answer="Practice Questions offer comprehensive model answers, interviewer tips, and common pitfalls for self-paced revision. MCQ Tests provide timed assessments with instant automated scoring."
            />
            <FaqItem
              question="How does the AI Mock Interview Simulator work?"
              answer="Our AI evaluates your speech and text responses in real time, assessing technical accuracy, communication clarity, and problem-solving structure according to real corporate hiring benchmarks."
            />
            <FaqItem
              question="Can I upgrade or adjust my subscription at any time?"
              answer="Yes. You can upgrade from the Free tier to Starter, Pro, or Premium anytime directly through your student dashboard."
            />
          </div>
        </div>
      </section>

      {/* ── 8. FINAL CTA (Clean White Section with Subtle Brand Accent) ─── */}
      <section className="bg-white py-8 sm:py-16 lg:py-20 border-b border-slate-200/80 text-center">
        <div className="mx-auto max-w-4xl px-3 sm:px-6 lg:px-8">
          <div className="p-5 sm:p-12 rounded-2xl sm:rounded-3xl bg-[#F8FAFC] border border-slate-200/90 shadow-xs relative overflow-hidden">
            {/* Subtle Brand Gradient Glow Accent */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-gradient-to-br from-[#00C2CB]/15 via-[#2563EB]/15 to-[#7C3AED]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-gradient-to-tr from-[#22D3A2]/15 via-[#2563EB]/15 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3.5 py-1 sm:px-4 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-[#2563EB] mb-4 sm:mb-5 font-display shadow-2xs">
                <Zap className="h-3.5 w-3.5 text-[#22D3A2]" />
                Free to start • Join 10,000+ Students Today
              </div>
              <h2 className="font-display text-2xl xs:text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B1D3A]">
                Ready To Turn Knowledge Into Opportunity?
              </h2>
              <p className="mt-2.5 sm:mt-3.5 text-xs sm:text-lg text-[#475569] max-w-xl mx-auto">
                Create your free account today to browse verified jobs, practice with curated questions, and simulate real AI interviews.
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5 w-full">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto shadow-brand font-bold px-6 sm:px-8 text-sm sm:text-base justify-center">
                    Get Started Free <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
                <Link href="/jobs" className="w-full sm:w-auto">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto font-semibold px-6 sm:px-8 border-slate-300 text-sm sm:text-base justify-center">
                    Browse Verified Jobs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}

/* ─── REUSABLE SUB-COMPONENTS ─────────────────────────────────────────── */

function StatPill({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center p-2">
      <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1D3A] tracking-tight">{number}</div>
      <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider font-display">{label}</div>
    </div>
  );
}

function CapabilityCard({
  id, icon, iconBg, title, description, badge, badgeColor, ctaText, ctaHref, isHighlighted = false,
}: {
  id?: string;
  icon: React.ReactNode; iconBg: string; title: string; description: string;
  badge?: string; badgeColor?: string; ctaText: string; ctaHref: string;
  isHighlighted?: boolean;
}) {
  return (
    <div
      id={id}
      className={`rounded-2xl bg-white p-5 sm:p-7 flex flex-col justify-between transition-all scroll-mt-24 sm:scroll-mt-32 ${
        isHighlighted
          ? 'border-2 border-[#2563EB] shadow-md ring-4 ring-blue-500/10'
          : 'border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-3.5 sm:mb-4">
          <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl ${iconBg} flex items-center justify-center shadow-2xs`}>
            {icon}
          </div>
          {badge && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeColor} font-display`}>
              {badge}
            </span>
          )}
        </div>
        <h3 className="font-display text-sm sm:text-base font-bold text-[#0B1D3A] mb-1.5 sm:mb-2">{title}</h3>
        <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">{description}</p>
      </div>

      <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-slate-100">
        <Link href={ctaHref} className="inline-flex items-center text-xs font-bold text-[#2563EB] hover:underline font-display py-0.5">
          {ctaText} <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Link>
      </div>
    </div>
  );
}

function TestimonialCard({
  quote, name, role, initial,
}: {
  quote: string; name: string; role: string; initial: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-2xs">
      <div className="flex gap-1 mb-3 sm:mb-3.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-xs sm:text-sm text-[#475569] leading-relaxed mb-4 sm:mb-5 italic">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center text-xs font-bold shrink-0">
          {initial}
        </div>
        <div>
          <p className="font-display text-xs sm:text-sm font-bold text-[#0B1D3A]">{name}</p>
          <p className="text-[11px] sm:text-xs text-slate-500">{role}</p>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  plan, price, period, features, cta, ctaHref, variant = 'default', isBlurred = false,
}: {
  plan: string; price: string; period: string; features: string[];
  cta: string; ctaHref: string; variant?: 'default' | 'popular' | 'premium'; isBlurred?: boolean;
}) {
  const isPopular = variant === 'popular';
  const isPremium = variant === 'premium';

  return (
    <div className={`relative rounded-2xl p-5 sm:p-7 flex flex-col justify-between transition-all ${isPopular
        ? 'border-2 border-[#2563EB] bg-white shadow-md ring-4 ring-blue-500/10'
        : isPremium
          ? 'border-2 border-[#7C3AED] bg-white shadow-md ring-4 ring-purple-500/10'
          : 'border border-slate-200/90 bg-white shadow-2xs hover:shadow-sm'
      }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-block bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-2xs font-display">
            Most Popular
          </span>
        </div>
      )}
      {isPremium && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-block bg-[#7C3AED] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-2xs font-display">
            Career Accelerator
          </span>
        </div>
      )}

      <div>
        <p className={`text-xs font-bold uppercase tracking-widest mb-1.5 sm:mb-2 font-display ${isPopular ? 'text-[#2563EB]' : isPremium ? 'text-[#7C3AED]' : 'text-slate-500'
          }`}>
          {plan}
        </p>
        
        {/* Price container with blur capability */}
        <div className="relative min-h-[40px] sm:min-h-[44px] flex items-center mb-0.5">
          <div className={`font-display text-2xl sm:text-4xl font-extrabold text-[#0B1D3A] transition-all duration-300 ${
            isBlurred ? 'filter blur-[8px] select-none opacity-30 pointer-events-none scale-105' : ''
          }`}>
            {price}
          </div>
          {isBlurred && (
            <div className="absolute inset-0 flex items-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-[11px] font-bold tracking-wide shadow-sm font-display backdrop-blur-xs">
                <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Hidden</span>
              </span>
            </div>
          )}
        </div>

        <p className="text-[11px] sm:text-xs text-slate-500 mb-4 sm:mb-6">{period}</p>

        <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-[#475569]">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-[#22D3A2]" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link href={ctaHref} className="w-full">
        {isPopular ? (
          <Button
            variant="primary"
            className="w-full justify-center text-xs sm:text-sm font-bold shadow-brand"
            size="md"
          >
            {cta}
          </Button>
        ) : isPremium ? (
          <Button
            variant="primary"
            className="w-full justify-center text-xs sm:text-sm font-bold bg-[#7C3AED] hover:bg-[#6d28d9] text-white border-transparent shadow-xs"
            size="md"
          >
            {cta}
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full justify-center text-xs sm:text-sm font-bold border-slate-300 text-[#0B1D3A] hover:bg-slate-50"
            size="md"
          >
            {cta}
          </Button>
        )}
      </Link>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-2xs transition-all open:shadow-xs">
      <summary className="flex cursor-pointer items-center justify-between font-display text-xs sm:text-base font-bold text-[#0B1D3A] list-none">
        <span>{question}</span>
        <span className="ml-3 sm:ml-4 flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 group-open:rotate-180">
          <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </span>
      </summary>
      <p className="mt-3 text-xs sm:text-sm text-[#475569] leading-relaxed border-t border-slate-100 pt-3">
        {answer}
      </p>
    </details>
  );
}
