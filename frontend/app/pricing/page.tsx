import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Check, X } from 'lucide-react';

export default function PricingPage() {
  return (
    <PublicLayout>
      <section className="bg-gray-50 py-20 border-b border-gray-200">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Simple, Transparent Pricing</h1>
          <p className="mt-4 text-lg text-gray-600">
            Choose the plan that best fits your career goals. No hidden fees.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white flex-1">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* FREE PLAN */}
            <Card className="p-8 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">Free</h3>
              <p className="text-gray-500 mt-2">Essential features for freshers starting their journey.</p>
              <div className="my-6">
                <span className="text-5xl font-extrabold text-gray-900">₹0</span>
              </div>
              <Button variant="outline" className="w-full h-12 text-base">Get Started Free</Button>
              
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
            <Card className="p-8 border-blue-600 shadow-xl ring-2 ring-blue-600 relative">
              <div className="absolute top-0 right-8 -translate-y-1/2">
                <span className="bg-blue-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                  Recommended
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Premium</h3>
              <p className="text-gray-500 mt-2">The complete toolkit to land your dream job faster.</p>
              <div className="my-6">
                <span className="text-5xl font-extrabold text-gray-900">₹999</span>
                <span className="text-gray-500 text-lg">/year</span>
              </div>
              <Button variant="primary" className="w-full h-12 text-base">Upgrade to Premium</Button>
              
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
        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
      ) : (
        <X className="h-5 w-5 text-gray-300 flex-shrink-0" />
      )}
      <span className={included ? "text-gray-700" : "text-gray-400"}>{item}</span>
    </div>
  );
}
