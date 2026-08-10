import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Target, Lightbulb, Rocket } from 'lucide-react';

export default function AboutPage() {
  return (
    <PublicLayout>
      <section className="bg-[var(--color-bg)] py-20 border-b border-slate-200/60">
        <div className="container mx-auto px-4 text-center max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">About CareerLaunch</h1>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            Bridging the gap between talented freshers and the companies that need them.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white flex-1">
        <div className="container mx-auto px-4 max-w-4xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            <div className="bg-[var(--color-brand-50)] p-8 rounded-[var(--radius-xl)] border border-[var(--color-brand-100)] transition-transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-white text-[var(--color-brand-600)] shadow-sm rounded-[var(--radius-lg)] flex items-center justify-center mb-6 border border-[var(--color-brand-100)]">
                <Target className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
              <p className="text-slate-600 leading-relaxed text-lg">
                To simplify the job search process for freshers by providing a single, trusted platform with verified opportunities, eliminating the noise of fake job postings and scams.
              </p>
            </div>
            
            <div className="bg-[var(--color-brand-50)] p-8 rounded-[var(--radius-xl)] border border-[var(--color-brand-100)] transition-transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-white text-[var(--color-brand-600)] shadow-sm rounded-[var(--radius-lg)] flex items-center justify-center mb-6 border border-[var(--color-brand-100)]">
                <Lightbulb className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Vision</h2>
              <p className="text-slate-600 leading-relaxed text-lg">
                We envision a world where every student has equal access to quality career resources, transparent application processes, and the guidance needed to kickstart their professional journey.
              </p>
            </div>
          </div>

          <div className="prose prose-blue max-w-none animate-in fade-in duration-1000 delay-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-[var(--color-brand-50)] rounded-[var(--radius-lg)]">
                <Rocket className="w-8 h-8 text-[var(--color-brand-600)]" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 m-0">Why We Built It</h2>
            </div>
            <div className="text-slate-600 space-y-6 leading-relaxed text-lg bg-white p-8 rounded-[var(--radius-xl)] border border-slate-100 shadow-[var(--shadow-soft)]">
              <p>
                Every year, millions of students graduate with dreams of landing their first job. However, the reality of the job hunt is often frustrating. Freshers are bombarded with fake job postings, consultancies demanding money, and confusing application portals.
              </p>
              <p>
                We built CareerLaunch to solve this exact problem. We realized that students don't just need a list of jobs—they need <strong className="text-slate-900 font-semibold">verified</strong> jobs with direct links to official company portals. They need high-quality preparation materials that are organized and easy to digest.
              </p>
              <p>
                CareerLaunch is more than just a job board. It is a comprehensive launchpad designed specifically for students and recent graduates, combining trusted opportunities with the educational resources needed to succeed in interviews.
              </p>
            </div>
          </div>

        </div>
      </section>
    </PublicLayout>
  );
}
