import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Check, X } from 'lucide-react';

export default function PricingPage() {
  return (
    <PublicLayout>
      <section className="bg-[var(--color-bg)] py-20 border-b border-slate-200/60">
        <div className="container mx-auto px-4 text-center max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Simple, Transparent Pricing</h1>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            Choose the plan that best fits your career goals. No hidden fees.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white flex-1">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            
            {/* FREE PLAN */}
            <Card className="p-8 border-slate-200 hover:border-slate-300 transition-colors">
              <h3 className="text-2xl font-bold text-slate-900">Free</h3>
              <p className="text-slate-500 mt-2">Essential features for freshers starting their journey.</p>
              <div className="my-6">
                <span className="text-5xl font-extrabold text-slate-900">₹0</span>
              </div>
              <Button variant="outline" className="w-full h-12 text-base font-semibold">Get Started Free</Button>
              
              <div className="mt-8 space-y-4">
                <Feature item="Browse verified jobs" included={true} />
                <Feature item="Basic interview questions" included={true} />
                <Feature item="Standard study notes" included={true} />
                <Feature item="Apply via direct links" included={true} />
                <Feature item="Company-specific questions" included={false} />
                <Feature item="Advanced technical notes" included={false} />
                <Feature item="Priority job alerts" included={false} />
              </div>
            </Card>

            {/* PREMIUM PLAN */}
            <Card className="p-8 border-[var(--color-brand-500)] shadow-[var(--shadow-hover)] ring-1 ring-[var(--color-brand-500)] relative hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-8 -translate-y-1/2">
                <span className="bg-gradient-to-r from-[var(--color-brand-600)] to-indigo-500 text-white text-xs font-bold uppercase tracking-wide py-1.5 px-4 rounded-full shadow-sm">
                  Recommended
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Premium</h3>
              <p className="text-slate-500 mt-2">The complete toolkit to land your dream job faster.</p>
              <div className="my-6">
                <span className="text-5xl font-extrabold text-slate-900">₹999</span>
                <span className="text-slate-500 text-lg font-medium">/year</span>
              </div>
              <Button variant="primary" className="w-full h-12 text-base font-semibold shadow-sm hover:shadow-md">Upgrade to Premium</Button>
              
              <div className="mt-8 space-y-4">
                <Feature item="Browse verified jobs" included={true} />
                <Feature item="Basic interview questions" included={true} />
                <Feature item="Standard study notes" included={true} />
                <Feature item="Apply via direct links" included={true} />
                <Feature item="Company-specific questions" included={true} />
                <Feature item="Advanced technical notes" included={true} />
                <Feature item="Priority job alerts" included={true} />
              </div>
            </Card>

          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function Feature({ item, included }: { item: string, included: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {included ? (
        <Check className="h-5 w-5 text-[var(--color-success)] shrink-0" />
      ) : (
        <X className="h-5 w-5 text-slate-300 shrink-0" />
      )}
      <span className={included ? "text-slate-700 font-medium" : "text-slate-400"}>{item}</span>
    </div>
  );
}
