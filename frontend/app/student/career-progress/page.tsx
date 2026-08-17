"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  Target, 
  Zap, 
  ShieldCheck, 
  Layers, 
  Calendar, 
  Bot, 
  Check, 
  Lock, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
  FileText,
  Activity,
  Code2,
  Brain,
  Clock,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { calculateUserAccess, UserAccess } from '@/lib/subscription';
import { PLANS } from '@/config/plans';
import { 
  CareerProgressData, 
  ProgressTimelinePoint 
} from '@/lib/careerProgress';

export default function CareerProgressPage() {
  const [progressData, setProgressData] = useState<CareerProgressData | null>(null);
  const [access, setAccess] = useState<UserAccess>(calculateUserAccess(null));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const supabase = createClient();

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage('Please sign in to view your career progress.');
        setIsLoading(false);
        return;
      }

      // 1. Fetch Subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setAccess(calculateUserAccess(subData));

      // 2. Fetch Aggregated Career Progress via API Route
      const response = await fetch('/api/career-progress');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load progress.');
      }

      setProgressData(data.progressData);

    } catch (err: any) {
      console.error('Error loading career progress:', err);
      setErrorMessage(err.message || 'Failed to load career progress.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-9 w-9 border-2 border-[var(--color-brand-600)] border-t-transparent mx-auto" />
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Compiling your career progress & growth dashboard...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (errorMessage || !progressData) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] p-8 text-center space-y-4 shadow-xs">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">Unable to Load Progress</h2>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{errorMessage}</p>
          <Button variant="primary" size="sm" onClick={loadProgressData} className="w-full justify-center text-xs">
            Retry Loading
          </Button>
        </div>
      </StudentLayout>
    );
  }

  const {
    readinessScore,
    monthlyDelta,
    stage,
    breakdown,
    skills,
    interviewPerformance,
    timeline,
    priorities,
    nextBestAction,
    monthlyActivity,
    achievements,
    hasInterviewData
  } = progressData;

  const isProOrPremium = access.planLevel >= 2; // Pro (2) or Premium (3)

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[var(--color-brand-50)] text-[var(--color-brand-600)] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[var(--color-brand-200)] flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Growth Analytics
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${stage.badgeColor}`}>
                Stage: {stage.title}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Career Progress</h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Track your growth, understand your strengths, and see exactly what to improve next.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/student/career-intelligence">
              <Button variant="outline" size="sm" className="text-xs shadow-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> View Improvement Plan
              </Button>
            </Link>
          </div>
        </div>

        {/* ── 1. PROMINENT CAREER READINESS & STAGE OVERVIEW ──────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-[var(--color-border)]">
            
            {/* Score & Stage */}
            <div className="flex items-center gap-5">
              <div className="h-24 w-24 rounded-full bg-[var(--color-brand-50)] border-4 border-[var(--color-brand-500)] text-[var(--color-brand-600)] flex flex-col items-center justify-center shadow-xs shrink-0">
                <span className="text-3xl font-extrabold leading-none">{readinessScore}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mt-1">/ 100</span>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                    Career Readiness: <span className="text-[var(--color-brand-600)]">{stage.title}</span>
                  </h2>
                  {monthlyDelta > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> +{monthlyDelta} pts this month
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] max-w-xl leading-relaxed">
                  {stage.description}
                </p>
              </div>
            </div>

            {/* Target Next Stage */}
            {stage.pointsNeeded > 0 ? (
              <div className="p-4 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] text-xs space-y-1.5 shrink-0 max-w-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] block">
                  Next Milestone
                </span>
                <p className="font-bold text-[var(--color-text-primary)]">{stage.nextStage}</p>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Need <strong>{stage.pointsNeeded} more points</strong> to reach the next readiness benchmark.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 rounded-[var(--radius-lg)] border border-emerald-200 text-xs text-emerald-900 shrink-0 max-w-xs font-semibold">
                🎉 Peak Career Readiness Benchmark Achieved! Keep maintaining interview sharpness.
              </div>
            )}

          </div>

          {/* 6 Category Breakdown (100 Points Model) */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3 block">
              100-Point Scoring Breakdown
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              
              <div className="p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">Profile</span>
                  <span className="font-extrabold text-[var(--color-text-primary)]">{breakdown.profileScore}/15</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(breakdown.profileScore / 15) * 100}%` }} />
                </div>
              </div>

              <div className="p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">Resume</span>
                  <span className="font-extrabold text-[var(--color-text-primary)]">{breakdown.resumeScore}/15</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(breakdown.resumeScore / 15) * 100}%` }} />
                </div>
              </div>

              <div className="p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">Interview</span>
                  <span className="font-extrabold text-[var(--color-text-primary)]">{breakdown.interviewScore}/25</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(breakdown.interviewScore / 25) * 100}%` }} />
                </div>
              </div>

              <div className="p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">Practice</span>
                  <span className="font-extrabold text-[var(--color-text-primary)]">{breakdown.practiceScore}/15</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(breakdown.practiceScore / 15) * 100}%` }} />
                </div>
              </div>

              <div className="p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">Skills</span>
                  <span className="font-extrabold text-[var(--color-text-primary)]">{breakdown.skillScore}/15</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(breakdown.skillScore / 15) * 100}%` }} />
                </div>
              </div>

              <div className="p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">Engagement</span>
                  <span className="font-extrabold text-[var(--color-text-primary)]">{breakdown.engagementScore}/10</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(breakdown.engagementScore / 10) * 100}%` }} />
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ── 2. NEXT BEST ACTION HIGHLIGHT CARD ───────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border-2 border-[var(--color-brand-300)] bg-gradient-to-r from-white via-white to-[var(--color-brand-50)]/50 p-6 sm:p-7 shadow-[var(--shadow-xs)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-brand-600)] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" /> Your Highest-Leverage Next Step
            </span>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
              {nextBestAction.title}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {nextBestAction.why} • <strong>Expected Impact: {nextBestAction.expectedImpact}</strong>
            </p>
          </div>

          <Link href={nextBestAction.actionUrl} className="shrink-0 w-full md:w-auto">
            <Button variant="primary" size="md" className="w-full md:w-auto text-xs shadow-xs">
              {nextBestAction.buttonText} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>

        {/* ── 3. SKILLS ANALYSIS & PERFORMANCE OVER TIME ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Skill Strength Analysis */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">Skill Strength Analysis</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">Calculated from mock evaluations & verified practice.</p>
              </div>
            </div>

            <div className="space-y-4">
              {skills.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--color-text-primary)]">{item.skill}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        item.trend === 'improving' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.trend === 'improving' ? '↑ Improving' : 'Needs Focus'}
                      </span>
                      <span className="font-extrabold text-sm text-[var(--color-text-primary)]">{item.score}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.score >= 75 ? 'bg-emerald-500' : item.score >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {!hasInterviewData && (
              <p className="text-[11px] text-[var(--color-text-tertiary)] italic pt-2 border-t border-[var(--color-border)]">
                Complete more mock interviews to generate detailed live performance trends.
              </p>
            )}
          </div>

          {/* Performance Over Time / Growth Timeline */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">Performance Over Time</h3>
                <div className="flex items-center gap-1 bg-[var(--color-bg-subtle)] p-0.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[10px] font-bold">
                  {(['7d', '30d', '90d', 'all'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setTimelineFilter(f)}
                      className={`px-2 py-0.5 rounded transition-all uppercase ${
                        timelineFilter === f ? 'bg-white text-[var(--color-brand-600)] shadow-xs font-bold' : 'text-[var(--color-text-tertiary)]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">Career readiness trajectory across practice milestones.</p>
            </div>

            {/* SVG Visual Timeline / Chart */}
            <div className="p-4 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] flex flex-col justify-center min-h-[170px]">
              {timeline.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-2 h-28 pt-4">
                    {timeline.slice(-7).map((pt, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                        <span className="text-[10px] font-bold text-[var(--color-brand-600)]">{pt.score}</span>
                        <div 
                          className="w-full max-w-[28px] bg-[var(--color-brand-500)] rounded-t transition-all group-hover:bg-[var(--color-brand-600)] shadow-xs"
                          style={{ height: `${Math.max(15, (pt.score / 100) * 80)}px` }}
                        />
                        <span className="text-[9px] text-[var(--color-text-tertiary)] font-medium truncate w-full text-center">{pt.date}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-[var(--color-text-tertiary)] text-center block">
                    Daily snapshot tracking active. Updates automatically on practice.
                  </span>
                </div>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <Activity className="w-6 h-6 text-[var(--color-text-tertiary)] mx-auto" />
                  <p className="text-xs text-[var(--color-text-secondary)] font-medium">
                    Your progress timeline will appear after you complete more activities.
                  </p>
                </div>
              )}
            </div>

            {!isProOrPremium && (
              <div className="p-3 bg-blue-50/50 rounded-[var(--radius-lg)] border border-blue-200 text-[11px] text-blue-900 flex items-center justify-between">
                <span>Unlock 90-day multi-dimensional skill trend charts with <strong>Pro Plan</strong>.</span>
                <Link href="/student/subscription" className="font-bold underline text-blue-700 shrink-0 ml-2">
                  Upgrade
                </Link>
              </div>
            )}
          </div>

        </div>

        {/* ── 4. MOCK INTERVIEW PERFORMANCE DETAILED STATS ────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)]">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Mock Interview Performance Analytics
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Evaluation results across all completed live AI mock interview sessions.
              </p>
            </div>

            <Link href="/student/mock-interview">
              <Button variant="outline" size="sm" className="text-xs">
                <Bot className="w-3.5 h-3.5 mr-1" /> All Mock Sessions
              </Button>
            </Link>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="p-4 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Completed</span>
              <p className="text-2xl font-extrabold text-[var(--color-text-primary)]">{interviewPerformance.totalCompleted}</p>
              <span className="text-[11px] text-[var(--color-text-secondary)]">Total Sessions</span>
            </div>

            <div className="p-4 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Average Score</span>
              <p className="text-2xl font-extrabold text-[var(--color-brand-600)]">{interviewPerformance.averageScore}%</p>
              <span className="text-[11px] text-[var(--color-text-secondary)]">Across all tracks</span>
            </div>

            <div className="p-4 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Best Score</span>
              <p className="text-2xl font-extrabold text-emerald-600">{interviewPerformance.bestScore}%</p>
              <span className="text-[11px] text-[var(--color-text-secondary)]">Personal Best</span>
            </div>

            <div className="p-4 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Latest Score</span>
              <p className="text-2xl font-extrabold text-purple-600">{interviewPerformance.latestScore}%</p>
              <span className="text-[11px] text-[var(--color-text-secondary)]">Most Recent Session</span>
            </div>

          </div>

          {/* Track Breakdown (HR vs Technical vs Managerial) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            
            <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-text-primary)]">Technical Track</span>
                <span className="text-sm font-extrabold text-[var(--color-text-primary)]">
                  {interviewPerformance.technicalAverage !== null ? `${interviewPerformance.technicalAverage}%` : '--'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {interviewPerformance.technicalAverage !== null ? 'Algorithms, APIs & System architecture' : 'No technical sessions completed yet.'}
              </p>
            </div>

            <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-text-primary)]">HR & Behavioral</span>
                <span className="text-sm font-extrabold text-[var(--color-text-primary)]">
                  {interviewPerformance.hrAverage !== null ? `${interviewPerformance.hrAverage}%` : '--'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {interviewPerformance.hrAverage !== null ? 'Cultural fit, communication & composure' : 'No HR sessions completed yet.'}
              </p>
            </div>

            <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-text-primary)]">Managerial Track</span>
                <span className="text-sm font-extrabold text-[var(--color-text-primary)]">
                  {interviewPerformance.managerialAverage !== null ? `${interviewPerformance.managerialAverage}%` : '--'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {interviewPerformance.managerialAverage !== null ? 'Leadership, ownership & delivery trade-offs' : 'No managerial sessions completed yet.'}
              </p>
            </div>

          </div>

          {/* Strongest vs Needs Improvement Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-[var(--radius-lg)] text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Strongest Area:</strong> {interviewPerformance.strongestArea}
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-[var(--radius-lg)] text-xs text-amber-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Opportunity Area:</strong> {interviewPerformance.needsImprovementArea}
              </div>
            </div>
          </div>

        </div>

        {/* ── 5. TOP 3 AI IMPROVEMENT PRIORITIES ──────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-5">
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              Your Top 3 Improvement Priorities
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Actionable priorities ranked by expected Career Readiness score gain.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {priorities.map((item, idx) => (
              <div 
                key={item.id || idx}
                className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-600)]">
                      Priority #{idx + 1}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      +{item.estimatedImpactPoints} Pts
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[var(--color-text-primary)]">{item.title}</h4>
                  <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                    {item.recommendedAction}
                  </p>
                </div>

                <Link href={item.actionUrl} className="pt-2 border-t border-[var(--color-border)] block">
                  <Button variant="outline" size="sm" className="w-full justify-center text-xs shadow-xs">
                    {item.buttonText} <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* ── 6. MONTHLY ACTIVITY SUMMARY & ACHIEVEMENTS ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Monthly Activity (1 col) */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] space-y-4">
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">Monthly Activity</h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <span className="font-medium text-[var(--color-text-secondary)]">Mock Interviews</span>
                <span className="font-extrabold text-[var(--color-text-primary)]">{monthlyActivity.mockInterviewsCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <span className="font-medium text-[var(--color-text-secondary)]">Questions Practiced</span>
                <span className="font-extrabold text-[var(--color-text-primary)]">{monthlyActivity.questionsCompletedCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <span className="font-medium text-[var(--color-text-secondary)]">Roadmap Tasks Done</span>
                <span className="font-extrabold text-[var(--color-text-primary)]">{monthlyActivity.tasksCompletedCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <span className="font-medium text-[var(--color-text-secondary)]">Notes & Guides Viewed</span>
                <span className="font-extrabold text-[var(--color-text-primary)]">{monthlyActivity.notesAccessedCount}</span>
              </div>
            </div>
          </div>

          {/* Gamified Achievements (2 cols) */}
          <div className="lg:col-span-2 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">Achievements & Milestones</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">Earn badges as you practice and advance your career readiness.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievements.map((ach) => (
                <div 
                  key={ach.id}
                  className={`p-3.5 rounded-[var(--radius-lg)] border flex items-start gap-3 transition-all ${
                    ach.isUnlocked 
                      ? 'bg-emerald-50/30 border-emerald-200' 
                      : 'bg-[var(--color-bg-subtle)] border-[var(--color-border)] opacity-80'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                    ach.isUnlocked ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {ach.isUnlocked ? <CheckCircle2 className="w-5 h-5" /> : <Award className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)] truncate">{ach.title}</h4>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                        ach.isUnlocked ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}>
                        {ach.isUnlocked ? 'Unlocked' : `${ach.progressPercent}%`}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-1">{ach.description}</p>
                    
                    {!ach.isUnlocked && (
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-[var(--color-brand-500)] rounded-full" style={{ width: `${ach.progressPercent}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </StudentLayout>
  );
}
