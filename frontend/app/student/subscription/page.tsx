"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { 
  Check, 
  Star, 
  ShieldCheck, 
  Zap, 
  Briefcase, 
  BookOpen 
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
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
          <p className="text-base text-gray-500 mt-2">Choose the plan that best supports your job search.</p>
        </div>

        {/* CURRENT PLAN CARD */}
        <Card className="p-6 border-blue-100 bg-blue-50/30">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Current Plan Overview</h2>
          
          {isFetching ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : subscription ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-full flex items-center justify-center ${isPremium ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                  {isPremium ? <Star className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{subscription.plan} Plan</h3>
                  <div className="flex items-center gap-3 text-sm mt-1">
                    <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${
                      subscription.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {subscription.status}
                    </span>
                    <span className="text-gray-500">
                      Started: {new Date(subscription.start_date).toLocaleDateString()}
                    </span>
                    {subscription.end_date && (
                      <span className="text-gray-500">
                        Expires: {new Date(subscription.end_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isPremium && (
                <Button onClick={() => router.push('/student/payment')}>
                  Renew Premium
                </Button>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No active subscription found.</p>
          )}
        </Card>

        {/* PLAN COMPARISON */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Compare Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* FREE PLAN */}
            <Card className="p-8 border-gray-200 flex flex-col h-full bg-white relative overflow-hidden">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Free</h3>
                <p className="text-gray-500 mt-2 text-sm">Essential tools to start your career journey.</p>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">₹0</span>
                  <span className="text-gray-500 text-sm">/ forever</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-gray-700 text-sm">
                  <Check className="w-5 h-5 text-green-500 shrink-0" /> Limited job access
                </li>
                <li className="flex items-start gap-3 text-gray-700 text-sm">
                  <Check className="w-5 h-5 text-green-500 shrink-0" /> Basic interview questions
                </li>
                <li className="flex items-start gap-3 text-gray-700 text-sm">
                  <Check className="w-5 h-5 text-green-500 shrink-0" /> Basic study notes
                </li>
                <li className="flex items-start gap-3 text-gray-700 text-sm">
                  <Check className="w-5 h-5 text-green-500 shrink-0" /> Resume upload
                </li>
              </ul>
              
              <Button 
                variant={!isPremium ? "outline" : "outline"} 
                className={`w-full ${!isPremium ? 'border-gray-400 text-gray-600 bg-gray-50 cursor-default' : ''}`}
                disabled={!isPremium}
              >
                {!isPremium ? 'Current Plan' : 'Downgrade'}
              </Button>
            </Card>

            {/* PREMIUM PLAN */}
            <Card className="p-8 border-blue-500 flex flex-col h-full bg-white relative shadow-md">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                RECOMMENDED
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-blue-600">Premium</h3>
                <p className="text-gray-500 mt-2 text-sm">Everything you need to land your dream job faster.</p>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">₹999</span>
                  <span className="text-gray-500 text-sm">/ year</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-gray-700 text-sm font-medium">
                  <Check className="w-5 h-5 text-blue-500 shrink-0" /> Unlimited job access
                </li>
                <li className="flex items-start gap-3 text-gray-700 text-sm font-medium">
                  <Check className="w-5 h-5 text-blue-500 shrink-0" /> Company-wise interview questions
                </li>
                <li className="flex items-start gap-3 text-gray-700 text-sm font-medium">
                  <Check className="w-5 h-5 text-blue-500 shrink-0" /> Complete study notes
                </li>
                <li className="flex items-start gap-3 text-gray-700 text-sm font-medium">
                  <Check className="w-5 h-5 text-blue-500 shrink-0" /> Priority job updates
                </li>
                <li className="flex items-start gap-3 text-gray-700 text-sm font-medium">
                  <Check className="w-5 h-5 text-blue-500 shrink-0" /> Premium resources
                </li>
              </ul>
              
              <Button 
                variant={isPremium ? "outline" : "primary"} 
                className={`w-full ${isPremium ? 'border-gray-400 text-gray-600 bg-gray-50 cursor-default' : 'bg-blue-600 hover:bg-blue-700'}`}
                onClick={() => !isPremium && router.push('/student/payment')}
              >
                {isPremium ? 'Current Plan' : 'Upgrade to Premium'}
              </Button>
            </Card>

          </div>
        </div>

        {/* PREMIUM BENEFITS */}
        <div className="pt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Why Upgrade to Premium?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border-gray-100 bg-gray-50/50 text-center flex flex-col items-center">
              <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Priority Updates</h4>
              <p className="text-sm text-gray-500">Get notified about top-tier jobs before free users, giving you a crucial head start.</p>
            </Card>
            
            <Card className="p-6 border-gray-100 bg-gray-50/50 text-center flex flex-col items-center">
              <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Company Specifics</h4>
              <p className="text-sm text-gray-500">Unlock exact interview questions frequently asked by companies like Amazon and Google.</p>
            </Card>

            <Card className="p-6 border-gray-100 bg-gray-50/50 text-center flex flex-col items-center">
              <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Complete Library</h4>
              <p className="text-sm text-gray-500">Gain full access to our entire catalog of premium study notes and cheat sheets.</p>
            </Card>
          </div>
        </div>

      </div>
    </StudentLayout>
  );
}
