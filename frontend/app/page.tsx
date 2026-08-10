import React from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { 
  BriefcaseIcon, 
  BookOpenIcon, 
  FileTextIcon, 
  LayoutDashboardIcon,
  CheckCircle2,
  ChevronDown,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  return (
    <PublicLayout>
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-[var(--color-bg)] pt-24 pb-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] text-sm font-semibold mb-8 border border-[var(--color-brand-100)] animate-in slide-in-from-bottom-2 fade-in duration-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-brand-400)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-brand-500)]"></span>
            </span>
            Now open for student registrations
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl animate-in slide-in-from-bottom-4 fade-in duration-700">
            Get Your First Job <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-brand-600)] to-indigo-500">Faster</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl animate-in slide-in-from-bottom-6 fade-in duration-1000">
            Find verified fresher jobs, prepare for interviews, access study notes, and apply through official company links.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-150">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto flex gap-2 items-center text-lg shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-hover)]">
                Get Started <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/jobs">
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white text-lg">
                Explore Jobs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. FEATURES SECTION */}
      <section className="bg-slate-50 py-24 border-y border-slate-200/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything you need to succeed</h2>
            <p className="mt-4 text-lg text-slate-600">All the tools and resources designed specifically for freshers.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard 
              icon={<BriefcaseIcon className="h-6 w-6 text-[var(--color-brand-600)]" />}
              title="Verified Jobs"
              description="Apply only to verified fresher openings with direct company links."
            />
            <FeatureCard 
              icon={<BookOpenIcon className="h-6 w-6 text-[var(--color-brand-600)]" />}
              title="Interview Prep"
              description="Curated HR, technical, and company-specific interview questions."
            />
            <FeatureCard 
              icon={<FileTextIcon className="h-6 w-6 text-[var(--color-brand-600)]" />}
              title="Study Notes"
              description="Access high-quality study notes for aptitude and programming."
            />
            <FeatureCard 
              icon={<LayoutDashboardIcon className="h-6 w-6 text-[var(--color-brand-600)]" />}
              title="Simple Dashboard"
              description="Track your applications and preparation progress easily."
            />
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">How It Works</h2>
            <p className="mt-4 text-lg text-slate-600">Your journey from registration to your first job.</p>
          </div>
          
          <div className="max-w-4xl mx-auto relative">
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-[var(--color-brand-100)] -translate-x-1/2 hidden md:block"></div>
            
            <Step number="1" title="Register" desc="Create your free account in seconds." isLeft={true} />
            <Step number="2" title="Complete Profile" desc="Add your education and skills details." isLeft={false} />
            <Step number="3" title="Upload Resume" desc="Upload your latest professional resume." isLeft={true} />
            <Step number="4" title="Browse Jobs" desc="Find verified jobs matching your profile." isLeft={false} />
            <Step number="5" title="Apply via Official Link" desc="Direct apply on the company's official portal." isLeft={true} isLast={true} />
          </div>
        </div>
      </section>

      {/* 4. PRICING PREVIEW */}
      <section className="bg-slate-50 py-24 border-y border-slate-200/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-slate-600">Start for free, upgrade when you need more power.</p>
          </div>
          
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="relative p-8 hover:border-slate-300 transition-colors">
              <h3 className="text-2xl font-bold text-slate-900">Free Plan</h3>
              <div className="mt-4 text-4xl font-extrabold text-slate-900">₹0</div>
              <p className="mt-2 text-slate-500">Perfect for getting started.</p>
              <ul className="mt-8 space-y-4">
                <PricingFeature text="Browse Jobs" />
                <PricingFeature text="Basic Interview Prep" />
                <PricingFeature text="Limited Study Notes" />
              </ul>
              <div className="mt-8">
                <Link href="/register">
                  <Button variant="outline" className="w-full text-base">Get Started</Button>
                </Link>
              </div>
            </Card>
            
            <Card className="relative p-8 border-[var(--color-brand-500)] shadow-[var(--shadow-hover)] ring-1 ring-[var(--color-brand-500)] hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-gradient-to-r from-[var(--color-brand-600)] to-indigo-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm uppercase tracking-wide">Recommended</div>
              <h3 className="text-2xl font-bold text-slate-900">Premium Plan</h3>
              <div className="mt-4 text-4xl font-extrabold text-slate-900">₹999<span className="text-lg font-medium text-slate-500">/year</span></div>
              <p className="mt-2 text-slate-500">Everything you need to get hired.</p>
              <ul className="mt-8 space-y-4">
                <PricingFeature text="Everything in Free" />
                <PricingFeature text="Advanced Interview Prep" />
                <PricingFeature text="All Premium Study Notes" />
                <PricingFeature text="Priority Job Alerts" />
              </ul>
              <div className="mt-8">
                <Link href="/pricing">
                  <Button variant="primary" className="w-full text-base shadow-sm hover:shadow-md">View Details</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 5. FAQ PREVIEW */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            <FaqItem 
              question="Are the jobs listed verified?" 
              answer="Yes, every job posted on CareerLaunch is manually verified and links directly to the official company application page." 
            />
            <FaqItem 
              question="Is the interview preparation material free?" 
              answer="We offer a comprehensive selection of free interview prep materials. For deeper insights and company-specific questions, we recommend the Premium plan." 
            />
            <FaqItem 
              question="Can I upgrade my plan later?" 
              answer="Absolutely! You can start with the Free plan and upgrade to Premium anytime from your dashboard." 
            />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="border border-slate-100 shadow-sm bg-white p-6 transition-all hover:shadow-[var(--shadow-hover)] hover:-translate-y-1">
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-brand-50)] border border-[var(--color-brand-100)]">
        {icon}
      </div>
      <h3 className="mb-2 font-bold text-slate-900 text-xl">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </Card>
  );
}

function Step({ number, title, desc, isLeft, isLast = false }: { number: string, title: string, desc: string, isLeft: boolean, isLast?: boolean }) {
  return (
    <div className={`relative flex flex-col md:flex-row items-center justify-between mb-12 ${isLast ? '' : 'md:mb-24'}`}>
      {/* Mobile Number Indicator */}
      <div className="md:hidden flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white font-bold text-xl mb-4 z-10 shadow-sm">
        {number}
      </div>
      
      <div className={`w-full md:w-[45%] ${isLeft ? 'md:text-right' : 'md:order-3 md:text-left'} text-center`}>
        <div className={`bg-white p-8 rounded-[var(--radius-xl)] border border-slate-100 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-1 ${isLeft ? 'md:mr-8' : 'md:ml-8'}`}>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <p className="mt-3 text-slate-600 leading-relaxed">{desc}</p>
        </div>
      </div>
      
      {/* Desktop Number Indicator */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[var(--color-brand-600)] text-white font-bold text-2xl z-10 shadow-md">
        {number}
      </div>
      
      <div className="w-full md:w-[45%] hidden md:block"></div>
    </div>
  );
}

function PricingFeature({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-slate-600">
      <CheckCircle2 className="h-6 w-6 text-[var(--color-brand-500)] shrink-0" />
      <span className="mt-0.5 font-medium">{text}</span>
    </li>
  );
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  return (
    <details className="group rounded-[var(--radius-lg)] border border-slate-200 bg-white p-6 [&_summary::-webkit-details-marker]:hidden transition-all hover:border-slate-300">
      <summary className="flex cursor-pointer items-center justify-between gap-4 text-slate-900 focus-ring rounded-sm">
        <h2 className="font-bold text-lg">{question}</h2>
        <ChevronDown className="h-6 w-6 shrink-0 transition-transform duration-300 group-open:-rotate-180 text-slate-400 group-hover:text-slate-600" />
      </summary>
      <p className="mt-4 leading-relaxed text-slate-600 text-base">{answer}</p>
    </details>
  );
}
