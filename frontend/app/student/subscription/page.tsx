"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { 
  Check, 
  Star, 
  ShieldCheck, 
  Zap, 
  Briefcase, 
  BookOpen,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Subscription = {
  id: string;
  plan: string;
  status: string;
  start_date: string;
  end_date: string | null;
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) setSubscription(data as Subscription);
    } catch (err) {
      console.error("Error fetching subscription:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const isPremium = subscription?.plan === 'Premium' && subscription?.status === 'Active';

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">My Subscription</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
            Manage your current membership plan and unlock premium career preparation features.
          </p>
        </div>

        {/* CURRENT PLAN CARD */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-4">Current Plan Status</h2>
          
          {isFetching ? (
            <div className="flex items-center gap-3 py-2">
              <div className="animate-spin h-5 w-5 border-2 border-[var(--color-brand-500)] border-t-transparent rounded-full"></div>
              <p className="text-xs text-[var(--color-text-tertiary)]">Checking subscription status...</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center border shrink-0 ${isPremium ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border-[var(--color-brand-200)]' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)] border-[var(--color-border)]'}`}>
                  {isPremium ? <Star className="w-6 h-6 fill-current" /> : <ShieldCheck className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      {subscription ? `${subscription.plan} Plan` : 'Free Tier'}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                      isPremium 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {subscription?.status || 'Active'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-tertiary)] font-medium mt-1">
                    {subscription?.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Started: {new Date(subscription.start_date).toLocaleDateString()}
                      </span>
                    )}
                    {subscription?.end_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Renews / Expires: {new Date(subscription.end_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!isPremium ? (
                <Button 
                  size="sm"
                  onClick={() => router.push('/student/payment')}
                  className="shrink-0"
                >
                  Upgrade to Premium
                </Button>
              ) : (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-center">
                  All Features Unlocked
                </span>
              )}
            </div>
          )}
        </div>

        {/* PLAN COMPARISON */}
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 text-center">Compare Available Plans</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* FREE PLAN */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-7 shadow-[var(--shadow-xs)] flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Free Plan</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">Essential tools for students starting their career search.</p>
                <div className="my-5">
                  <span className="text-3xl font-extrabold text-[var(--color-text-primary)]">₹0</span>
                  <span className="text-xs font-semibold text-[var(--color-text-tertiary)] ml-1">/ forever</span>
                </div>
                
                <ul className="space-y-3 pt-4 border-t border-[var(--color-border)] mb-8 text-xs font-medium text-[var(--color-text-secondary)]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Browse verified fresher jobs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Basic HR & Aptitude questions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Standard study notes & summaries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Single primary resume upload</span>
                  </li>
                </ul>
              </div>

              <Button 
                variant="outline" 
                size="sm"
                className="w-full justify-center text-xs"
                disabled={!isPremium}
              >
                {!isPremium ? 'Current Active Plan' : 'Free Tier'}
              </Button>
            </div>

            {/* PREMIUM PLAN */}
            <div className="rounded-[var(--radius-xl)] border-2 border-[var(--color-brand-500)] bg-white p-7 shadow-[var(--shadow-md)] flex flex-col justify-between relative">
              <div className="absolute -top-3 right-6 bg-[var(--color-brand-500)] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                Recommended
              </div>

              <div>
                <h3 className="text-lg font-bold text-[var(--color-brand-600)] flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-current" /> Premium Plan
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">Complete package to prepare for competitive technical interviews.</p>
                <div className="my-5">
                  <span className="text-3xl font-extrabold text-[var(--color-text-primary)]">₹999</span>
                  <span className="text-xs font-semibold text-[var(--color-text-tertiary)] ml-1">/ year</span>
                </div>
                
                <ul className="space-y-3 pt-4 border-t border-[var(--color-border)] mb-8 text-xs font-medium text-[var(--color-text-primary)]">
                  <li className="flex items-center gap-2 font-semibold text-[var(--color-brand-700)]">
                    <Check className="w-4 h-4 text-[var(--color-brand-600)] shrink-0" />
                    <span>Everything in Free Plan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[var(--color-brand-600)] shrink-0" />
                    <span>Company-wise interview question archive</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[var(--color-brand-600)] shrink-0" />
                    <span>Full technical notes and downloadable cheat sheets</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[var(--color-brand-600)] shrink-0" />
                    <span>Priority job listing alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[var(--color-brand-600)] shrink-0" />
                    <span>Direct student email support</span>
                  </li>
                </ul>
              </div>

              <Button 
                variant={isPremium ? "outline" : "primary"}
                size="sm"
                className="w-full justify-center text-xs"
                onClick={() => !isPremium && router.push('/student/payment')}
                disabled={isPremium}
              >
                {isPremium ? 'Current Active Plan' : 'Upgrade to Premium'}
              </Button>
            </div>

          </div>
        </div>

        {/* VALUE PILLARS */}
        <div className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] text-center">
              <div className="h-9 w-9 bg-[var(--color-brand-50)] text-[var(--color-brand-600)] rounded-full flex items-center justify-center mx-auto mb-2.5">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-[var(--color-text-primary)] mb-1">Priority Notifications</h4>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">Stay informed as soon as top companies open applications.</p>
            </div>
            
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] text-center">
              <div className="h-9 w-9 bg-[var(--color-brand-50)] text-[var(--color-brand-600)] rounded-full flex items-center justify-center mx-auto mb-2.5">
                <Briefcase className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-[var(--color-text-primary)] mb-1">Company-Specific Banks</h4>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">Practice questions asked by Amazon, TCS, Infosys, and more.</p>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] text-center">
              <div className="h-9 w-9 bg-[var(--color-brand-50)] text-[var(--color-brand-600)] rounded-full flex items-center justify-center mx-auto mb-2.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-[var(--color-text-primary)] mb-1">Complete Notes Archive</h4>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">Download revision PDFs and technical guides directly to your device.</p>
            </div>
          </div>
        </div>

      </div>
    </StudentLayout>
  );
}
