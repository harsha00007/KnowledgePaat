"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { PremiumBadge } from '@/components/PremiumBadge';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  ArrowRight,
  UserCheck,
  FileText,
  CreditCard,
  Users,
  Brain,
  Code2,
  Bot,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { calculateUserAccess, isContentAccessible, UserAccess } from '@/lib/subscription';
import { PLANS, normalizePlanId } from '@/config/plans';
import { calculateMockCreditStatus, getConsumedSessionsCount, MockCreditStatus } from '@/lib/mockInterview';
import { CompanyNameGate } from '@/components/CompanyNameGate';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';
import { NextActionWidget } from '@/components/NextActionWidget';
import { TargetCareerModal } from '@/components/TargetCareerModal';
import type { PersonalizedRoadmap } from '@/types/personalizedRoadmap';

interface TargetCareerInfo {
  id: string;
  name: string;
  slug: string;
}

interface StudentProfile {
  id?: string;
  full_name?: string | null;
  email?: string | null;
  target_career_id?: string | null;
  preferred_role?: string | null;
  resume_url?: string | null;
  resume_filename?: string | null;
  role?: string;
}

interface JobListing {
  id: string;
  title: string;
  company_name: string;
  location: string;
  employment_type: string;
  minimum_plan?: string;
  access_type?: string;
}

export default function StudentDashboard() {
  const { isModuleEnabled } = useFeatureFlags();
  const isDashboardEnabled = isModuleEnabled('student_dashboard');
  const isJobsEnabled = isModuleEnabled('student_jobs');
  const isMockEnabled = isModuleEnabled('student_mock_interviews');
  const isIntelEnabled = isModuleEnabled('student_career_intelligence');

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [access, setAccess] = useState<UserAccess>(calculateUserAccess(null));
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [modalRequiredPlan, setModalRequiredPlan] = useState<string>('pro');
  const [creditStatus, setCreditStatus] = useState<MockCreditStatus>({
    planName: 'Free',
    monthlyLimit: 0,
    usedThisMonth: 0,
    remainingCredits: 0,
    completedCount: 0,
    averageScore: 0,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    isEligible: false
  });
  const [recentJobs, setRecentJobs] = useState<JobListing[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // ── PHASE C.3 STATE ────────────────────────────────────────────────────────
  const [targetCareer, setTargetCareer] = useState<TargetCareerInfo | null>(null);
  const [roadmapData, setRoadmapData] = useState<PersonalizedRoadmap | null>(null);
  const [isLoadingRoadmap, setIsLoadingRoadmap] = useState(false);
  const [roadmapError, setRoadmapError] = useState<{ code: string; message: string } | null>(null);
  const [isTargetCareerModalOpen, setIsTargetCareerModalOpen] = useState(false);

  const supabase = createClient();

  const fetchPersonalizedRoadmap = useCallback(async () => {
    setIsLoadingRoadmap(true);
    setRoadmapError(null);
    try {
      const res = await fetch('/api/student/personalized-roadmap', {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { code?: string; error?: string; message?: string };
        const code = errorData.code || (res.status === 404 ? 'ROADMAP_UNAVAILABLE' : 'API_ERROR');
        setRoadmapError({
          code,
          message: errorData.error || errorData.message || 'Unable to load personalized roadmap.'
        });
        setRoadmapData(null);
        return;
      }

      const data: PersonalizedRoadmap = await res.json();
      setRoadmapData(data);
      if (data.career) {
        setTargetCareer(data.career);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error while loading roadmap.';
      setRoadmapError({
        code: 'NETWORK_ERROR',
        message: msg
      });
      setRoadmapData(null);
    } finally {
      setIsLoadingRoadmap(false);
    }
  }, []);

  useEffect(() => {
    if (!isDashboardEnabled) return;
    let isMounted = true;

    async function loadDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
          // Parallel fetch: Profile, Subscription, Recent Jobs
          const [
            { data: profileData },
            { data: subData },
            { data: jobsData }
          ] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('subscriptions').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
            isJobsEnabled
              ? supabase.from('jobs').select('*').eq('status', 'Active').order('posted_at', { ascending: false }).limit(4)
              : Promise.resolve({ data: null })
          ]);

          if (profileData && isMounted) {
            setProfile(profileData as StudentProfile);

            // ── EVALUATE TARGET CAREER GATE ──────────────────────────────
            if (profileData.target_career_id && isIntelEnabled) {
              // Fetch career title/slug from catalog
              const { data: careerData } = await supabase
                .from('career_catalog')
                .select('id, name, slug')
                .eq('id', profileData.target_career_id)
                .maybeSingle();

              if (careerData && isMounted) {
                setTargetCareer(careerData as TargetCareerInfo);
              }

              // Request Phase C.3 personalized roadmap
              await fetchPersonalizedRoadmap();
            } else if (isIntelEnabled) {
              setTargetCareer(null);
              setRoadmapData(null);
              setRoadmapError({
                code: 'TARGET_CAREER_REQUIRED',
                message: 'Select a target career first.'
              });
              setIsLoadingRoadmap(false);
            }
          }

          if (jobsData && jobsData.length > 0 && isMounted) {
            setRecentJobs(jobsData as JobListing[]);
          }

          if (isMounted) {
            const userAccessCalc = calculateUserAccess(subData);
            setAccess(userAccessCalc);

            // Fetch consumed credits count & stats (only if mock interviews enabled)
            if (isMockEnabled) {
              const stats = await getConsumedSessionsCount(supabase, user.id, userAccessCalc.startDate);
              const creds = calculateMockCreditStatus(userAccessCalc, stats.usedCount, stats.completedCount, stats.averageScore);
              setCreditStatus(creds);
            }
          }
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [supabase, isDashboardEnabled, isJobsEnabled, isMockEnabled, isIntelEnabled, fetchPersonalizedRoadmap]);

  const hasResume = Boolean(profile?.resume_url);

  if (!isDashboardEnabled) {
    return (
      <StudentLayout>
        <FeatureComingSoon
          title="Student Dashboard Coming Soon"
          description="Your student activity overview, placement roadmap, and career metrics are currently being prepared for rollout."
          icon={Brain}
          backHref="/"
          backLabel="Return to Homepage"
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* WELCOME BANNER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Student Dashboard</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Track your profile progress, explore verified jobs, and prepare for upcoming interviews.
            </p>
          </div>
        </div>

        {/* ── PHASE C.3 NEXT ACTION / TARGET CAREER HERO CARD ──────────── */}
        {isIntelEnabled && (
          <NextActionWidget
            targetCareer={targetCareer}
            roadmapData={roadmapData}
            isLoading={isLoadingRoadmap || isFetching}
            error={roadmapError}
            onOpenCareerModal={() => setIsTargetCareerModalOpen(true)}
            onRetry={() => void fetchPersonalizedRoadmap()}
          />
        )}

        {/* ── ROW 1: QUICK STATUS TILES ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Profile Status */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)] flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-wide text-[var(--color-text-tertiary)]">Profile Status</span>
                <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
                {profile?.full_name ? 'Profile Active' : 'Incomplete'}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                {profile?.full_name ? 'Education & skills updated.' : 'Add your education & skills.'}
              </p>
            </div>
            <Link href="/student/profile" className="block w-full">
              <Button variant="outline" size="sm" className="w-full">
                {profile?.full_name ? 'Edit Profile' : 'Complete Profile'}
              </Button>
            </Link>
          </div>

          {/* 2. Resume Status */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)] flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-wide text-[var(--color-text-tertiary)]">Resume Status</span>
                <div className={`h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center ${hasResume ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
                {hasResume ? 'Resume Ready' : 'No Resume'}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4 truncate" title={profile?.resume_filename || ''}>
                {hasResume ? (profile?.resume_filename || 'PDF Document') : 'Upload resume to apply directly.'}
              </p>
            </div>
            <Link href="/student/resume" className="block w-full">
              <Button variant={hasResume ? "outline" : "primary"} size="sm" className="w-full">
                {hasResume ? 'View Resume' : 'Upload Resume'}
              </Button>
            </Link>
          </div>

          {/* 3. Membership Status */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)] flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-wide text-[var(--color-text-tertiary)]">Membership</span>
                <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-[var(--color-text-primary)] capitalize">
                  {access.effectivePlan} Plan
                </h2>
                <PremiumBadge minimumPlan={access.effectivePlan} />
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                {access.isSubscriptionActive 
                  ? `Active through ${access.expiresAt ? new Date(access.expiresAt).toLocaleDateString() : 'auto-renew'}` 
                  : 'Upgrade to access mock interviews & premium prep.'}
              </p>
            </div>
            <Link href="/student/subscription" className="block w-full">
              <Button variant="outline" size="sm" className="w-full">
                {access.isSubscriptionActive ? 'Manage Subscription' : 'Upgrade Plan'}
              </Button>
            </Link>
          </div>

          {/* 4. Mock Interview Status */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)] flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-wide text-[var(--color-text-tertiary)]">Mock Interviews</span>
                <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
                {creditStatus.remainingCredits} / {creditStatus.monthlyLimit} Credits
              </h2>

              <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                {creditStatus.isEligible 
                  ? `${creditStatus.remainingCredits} interview${creditStatus.remainingCredits > 1 ? 's' : ''} available this cycle.` 
                  : 'Upgrade plan to unlock mock credits.'}
              </p>
            </div>
            <Link href="/student/mock-interview" className="block w-full">
              <Button 
                variant={creditStatus.isEligible ? "primary" : "outline"} 
                size="sm" 
                className="w-full"
              >
                {creditStatus.isEligible ? 'Start Mock Interview' : 'View Credits'}
              </Button>
            </Link>
          </div>

        </div>

        {/* ── ROW 2: RECOMMENDED JOBS & PREPARATION ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recommended Jobs (2 cols on lg) */}
          <div className="lg:col-span-2 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">Recommended Jobs</h2>
                <p className="text-xs text-[var(--color-text-secondary)] font-medium">Verified fresher opportunities</p>
              </div>
              <Link 
                href="/student/jobs" 
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition-colors shrink-0"
              >
                View All <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentJobs.map((job) => {
                const reqPlan = job.minimum_plan || job.access_type || 'free';
                const isUnlocked = isContentAccessible(reqPlan, access);
                const planMeta = PLANS[normalizePlanId(reqPlan)];

                return (
                  <div 
                    key={job.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-brand-300)] hover:bg-[var(--color-bg-subtle)] transition-all gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-[var(--color-text-tertiary)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <h3 className="text-sm font-semibold leading-snug text-[var(--color-text-primary)] line-clamp-2">{job.title}</h3>
                          <PremiumBadge minimumPlan={reqPlan} />
                        </div>
                        <div className="mt-0.5">
                          <CompanyNameGate
                            companyName={job.company_name}
                            minimumPlan={reqPlan}
                            userAccess={access}
                            onUpgradeClick={(req) => {
                              setModalRequiredPlan(req);
                              setIsUpgradeModalOpen(true);
                            }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-[var(--color-text-tertiary)]" aria-hidden="true" /> {job.location}</span>
                          <span className="flex items-center gap-1"><Briefcase className="w-3 h-3 text-[var(--color-text-tertiary)]" aria-hidden="true" /> {job.employment_type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full sm:w-36 shrink-0 flex items-center sm:justify-end">
                      {!isUnlocked ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setModalRequiredPlan(reqPlan);
                            setIsUpgradeModalOpen(true);
                          }}
                          className="w-full text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-[#2563EB] hover:border-[#2563EB]"
                        >
                          <Lock className="w-3 h-3 mr-1 text-slate-400 shrink-0" aria-hidden="true" />
                          <span className="truncate">Upgrade to {planMeta.name}</span>
                        </Button>
                      ) : (
                        <Link href={`/student/jobs`} className="w-full">
                          <Button variant="outline" size="sm" className="w-full">
                            View Job
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}

              {recentJobs.length === 0 && !isFetching && (
                <div className="text-center py-8 text-xs text-[var(--color-text-tertiary)]">
                  No new job listings available right now. Check back soon!
                </div>
              )}
            </div>
          </div>

          {/* Interview Preparation Quick Access (1 col on lg) */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">Interview Tracks</h2>
                  <p className="text-xs text-[var(--color-text-secondary)] font-medium">Practice curated questions</p>
                </div>
              </div>

              <div className="space-y-3">
                
                {/* HR Interview Card */}
                <Link 
                  href="/student/interview-preparation?category=hr"
                  className="block p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-brand-300)] hover:bg-[var(--color-bg-subtle)] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-[var(--radius-md)] bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[var(--color-text-primary)]">HR Interview</h3>
                        <p className="text-xs text-[var(--color-text-secondary)]">Behavioral & Cultural fit</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      FREE
                    </span>
                  </div>
                </Link>

                {/* Technical Card */}
                <Link 
                  href="/student/interview-preparation?category=technical"
                  className="block p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-brand-300)] hover:bg-[var(--color-bg-subtle)] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-[var(--radius-md)] bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Code2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Technical Core</h3>
                        <p className="text-xs text-[var(--color-text-secondary)]">DSA, APIs, Database & System</p>
                      </div>
                    </div>
                    <PremiumBadge minimumPlan="starter" />
                  </div>
                </Link>

                {/* Managerial Card */}
                <Link 
                  href="/student/interview-preparation?category=managerial"
                  className="block p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-brand-300)] hover:bg-[var(--color-bg-subtle)] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-[var(--radius-md)] bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Managerial Track</h3>
                        <p className="text-xs text-[var(--color-text-secondary)]">Ownership, Conflict & STAR</p>
                      </div>
                    </div>
                    <PremiumBadge minimumPlan="pro" />
                  </div>
                </Link>

              </div>
            </div>

            <div className="pt-5 mt-4 border-t border-[var(--color-border)]">
              <Link href="/student/interview-preparation" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-center text-xs">
                  Browse All Categories <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

          </div>

        </div>

      </div>

      {/* TARGET CAREER SELECTION MODAL */}
      <TargetCareerModal
        isOpen={isTargetCareerModalOpen}
        onClose={() => setIsTargetCareerModalOpen(false)}
        currentCareerId={targetCareer?.id}
        onCareerSelected={async (selected) => {
          setTargetCareer(selected);
          setProfile((prev) => (prev ? { ...prev, target_career_id: selected.id } : null));
          await fetchPersonalizedRoadmap();
        }}
      />

      {/* UPGRADE PROMPT MODAL */}
      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        requiredPlan={modalRequiredPlan}
        featureTitle="this verified job opening"
      />

    </StudentLayout>
  );
}
