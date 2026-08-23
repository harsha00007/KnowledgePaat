"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { 
  Sparkles, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  BookOpen, 
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
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { 
  CareerReadiness, 
  CareerTask, 
  SkillGap, 
  CareerInsight 
} from '@/lib/careerIntelligence';

export default function CareerIntelligencePage() {
  const [studentName, setStudentName] = useState('Student');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [readiness, setReadiness] = useState<CareerReadiness | null>(null);
  const [insight, setInsight] = useState<CareerInsight | null>(null);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [tasks, setTasks] = useState<CareerTask[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planDuration, setPlanDuration] = useState<number>(7);
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(7);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all');

  const supabase = createClient();

  useEffect(() => {
    loadCareerIntelligenceData();
  }, []);

  const loadCareerIntelligenceData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage('Please sign in to access your Career Intelligence.');
        setIsLoading(false);
        return;
      }

      setStudentName(user.user_metadata?.full_name || 'Student');

      // 1. Fetch Active Career Plan
      const { data: activePlan, error: planError } = await supabase
        .from('career_improvement_plans')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activePlan) {
        setPlanId(activePlan.id);
        setPlanDuration(activePlan.plan_duration || 7);
        setSelectedDuration(activePlan.plan_duration || 7);
        setTargetRole(activePlan.target_role || 'Software Engineer');
        setSkillGaps((activePlan.skill_gaps as SkillGap[]) || []);
        setInsight(activePlan.ai_insight as CareerInsight || null);

        setReadiness({
          overallScore: Number(activePlan.career_readiness_score) || 0,
          profileStrength: Number(activePlan.profile_strength) || 0,
          technicalSkills: Number(activePlan.technical_skills_score) || 0,
          interviewPerformance: Number(activePlan.interview_performance_score) || 0,
          communication: Number(activePlan.communication_score) || 0,
          preparationConsistency: Number(activePlan.consistency_score) || 0,
          confidence: activePlan.confidence_level || 'low',
          dataCompleteness: Number(activePlan.data_completeness) || 0,
          missingDataItems: []
        });

        // Fetch Tasks for this plan
        const { data: taskRows } = await supabase
          .from('career_plan_tasks')
          .select('*')
          .eq('plan_id', activePlan.id)
          .order('day_number', { ascending: true });

        if (taskRows && taskRows.length > 0) {
          setTasks(taskRows.map(t => ({
            id: t.id,
            dayNumber: t.day_number,
            title: t.title,
            description: t.description,
            category: t.category,
            priority: t.priority,
            estimatedMinutes: t.estimated_minutes,
            relatedSkill: t.related_skill,
            reason: t.reason,
            resourceUrl: t.resource_url,
            resourceTitle: t.resource_id,
            status: t.status
          })));
        }
      } else {
        // Automatically generate initial plan if none exists
        await handleGeneratePlan(7);
      }

    } catch (err: any) {
      console.error('Error loading career intelligence:', err);
      setErrorMessage(err.message || 'Failed to load career plan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePlan = async (durationDays: number) => {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/career-intelligence/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planDuration: durationDays })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate plan.');
      }

      setPlanId(data.plan.id);
      setPlanDuration(data.plan.plan_duration);
      setSelectedDuration(data.plan.plan_duration);
      setTargetRole(data.plan.target_role);
      setReadiness(data.readiness);
      setInsight(data.insight);
      setSkillGaps(data.skillGaps);
      setTasks(data.tasks);
      setIsRegenerateModalOpen(false);

    } catch (err: any) {
      console.error('Error generating improvement plan:', err);
      setErrorMessage(err.message || 'Failed to generate plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleTaskStatus = async (task: CareerTask) => {
    if (!task.id) return;
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));

    try {
      const response = await fetch('/api/career-intelligence/update-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, status: nextStatus })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        // Rollback on failure
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
      }
    } catch (err) {
      console.error('Error toggling task:', err);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-9 w-9 border-2 border-[var(--color-brand-600)] border-t-transparent mx-auto" />
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Analyzing your career profile & readiness...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  // Filter tasks by day
  const displayedTasks = selectedDayFilter === 'all' 
    ? tasks 
    : tasks.filter(t => t.dayNumber === selectedDayFilter);

  // Unique days list
  const daysList = Array.from(new Set(tasks.map(t => t.dayNumber))).sort((a, b) => a - b);

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        
        {/* ── TOP HEADER ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[var(--color-brand-50)] text-[var(--color-brand-600)] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[var(--color-brand-200)] flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Career Intelligence
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)] font-medium">
                Target Role: <strong className="text-[var(--color-text-primary)]">{targetRole}</strong>
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Hello, {studentName}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Your personalized preparation strategy is based on your profile, target role, mock interview performance, and learning progress.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRegenerateModalOpen(true)}
            className="text-xs self-start sm:self-auto shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Regenerate Plan
          </Button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-[var(--radius-lg)] text-xs font-semibold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="underline ml-2">Dismiss</button>
          </div>
        )}

        {/* ── 1. CAREER READINESS SCORE SECTION ──────────────────────── */}
        {readiness && (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-6">
            
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-[var(--color-border)]">
              
              {/* Left Score Gauge */}
              <div className="flex items-center gap-5">
                <div className="h-24 w-24 rounded-full bg-[var(--color-brand-50)] border-4 border-[var(--color-brand-500)] text-[var(--color-brand-600)] flex flex-col items-center justify-center shadow-xs shrink-0">
                  <span className="text-3xl font-extrabold leading-none">{readiness.overallScore}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mt-1">/ 100</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                      Overall Career Readiness Score
                    </h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                      readiness.confidence === 'high' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : readiness.confidence === 'moderate' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {readiness.confidence} Confidence
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] max-w-md leading-relaxed">
                    Data Completeness: <strong>{readiness.dataCompleteness}%</strong>. Weighted across profile completeness, technical skills, mock interview results, and study consistency.
                  </p>
                </div>
              </div>

              {/* Data Completeness Prompt if low */}
              {readiness.dataCompleteness < 75 && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-[var(--radius-lg)] text-xs text-amber-900 max-w-sm space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Improve Score Accuracy:</span>
                  </div>
                  <ul className="text-[11px] list-disc list-inside space-y-0.5 text-amber-800">
                    {readiness.dataCompleteness < 50 && <li key="add-skills">Add more skills to your profile</li>}
                    {readiness.interviewPerformance <= 40 && <li key="mock-interview">Complete 1 more AI Mock Interview</li>}
                  </ul>
                </div>
              )}

            </div>

            {/* 5 Categories Bar Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              
              <div className="p-3.5 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">Profile Strength</span>
                  <span className="font-extrabold text-[var(--color-text-primary)]">{readiness.profileStrength}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${readiness.profileStrength}%` }} />
                </div>
                <span className="text-[10px] text-[var(--color-text-tertiary)] block">Weight: 20%</span>
              </div>

              <div className="p-3.5 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">Technical Skills</span>
                  <span className="font-extrabold text-[var(--color-text-primary)]">{readiness.technicalSkills}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${readiness.technicalSkills}%` }} />
                </div>
                <span className="text-[10px] text-[var(--color-text-tertiary)] block">Weight: 25%</span>
              </div>

              <div className="p-3.5 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">Interview Rating</span>
                  <span className="font-extrabold text-[var(--color-text-primary)]">{readiness.interviewPerformance}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${readiness.interviewPerformance}%` }} />
                </div>
                <span className="text-[10px] text-[var(--color-text-tertiary)] block">Weight: 25%</span>
              </div>

              <div className="p-3.5 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">Communication</span>
                  <span className="font-extrabold text-[var(--color-text-primary)]">{readiness.communication}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${readiness.communication}%` }} />
                </div>
                <span className="text-[10px] text-[var(--color-text-tertiary)] block">Weight: 15%</span>
              </div>

              <div className="p-3.5 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">Consistency</span>
                  <span className="font-extrabold text-[var(--color-text-primary)]">{readiness.preparationConsistency}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${readiness.preparationConsistency}%` }} />
                </div>
                <span className="text-[10px] text-[var(--color-text-tertiary)] block">Weight: 15%</span>
              </div>

            </div>

          </div>
        )}

        {/* ── 2. NEXT BEST ACTION & AI CAREER INSIGHT ──────────────────── */}
        {insight && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Next Best Action Card (2 cols) */}
            <div className="lg:col-span-2 rounded-[var(--radius-xl)] border-2 border-[var(--color-brand-300)] bg-gradient-to-br from-white to-[var(--color-brand-50)]/40 p-6 sm:p-7 shadow-[var(--shadow-xs)] flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-brand-600)] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" /> Next Best Action
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  {insight.nextBestAction.title}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {insight.nextBestAction.reason}
                </p>
              </div>

              <div className="pt-2">
                <Link href={insight.nextBestAction.actionUrl}>
                  <Button variant="primary" size="md" className="text-xs shadow-xs">
                    {insight.nextBestAction.buttonText} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* AI Insights Card (1 col) */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand-600)]" /> AI Career Insight
                </span>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Your Key Strength</span>
                    <p className="font-bold text-[var(--color-text-primary)]">{insight.topStrength}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase block">Biggest Opportunity</span>
                    <p className="font-bold text-[var(--color-text-primary)]">{insight.biggestOpportunity}</p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[var(--color-text-tertiary)] leading-snug pt-2 border-t border-[var(--color-border)]">
                {insight.summary}
              </p>
            </div>

          </div>
        )}

        {/* ── 3. TARGET ROLE SKILL GAP ANALYSIS ───────────────────────── */}
        {skillGaps.length > 0 && (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-5">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Target Role Skill Gap Analysis ({targetRole})
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Comparison of required competencies for {targetRole} against your verified profile and interview performance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {skillGaps.map((gap, i) => (
                <div 
                  key={`gap-${gap.skill}-${i}`} 
                  className={`p-4 rounded-[var(--radius-lg)] border flex flex-col justify-between space-y-3 ${
                    gap.studentLevel === 'strong' 
                      ? 'bg-emerald-50/30 border-emerald-200' 
                      : gap.studentLevel === 'developing' 
                      ? 'bg-blue-50/30 border-blue-200' 
                      : 'bg-amber-50/30 border-amber-200'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                        gap.importance === 'critical' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {gap.importance}
                      </span>
                      <span className="text-[10px] font-bold capitalize text-[var(--color-text-secondary)]">
                        Level: {gap.studentLevel}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[var(--color-text-primary)]">{gap.skill}</h4>
                    <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                      {gap.recommendation}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)]">
                      Gap Score: {gap.gapScore}/100
                    </span>
                    <Link href={gap.resourceUrl || '/student/interview-preparation'} className="font-bold text-[var(--color-brand-600)] hover:underline flex items-center gap-0.5">
                      Practice <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 4. PERSONALIZED IMPROVEMENT ROADMAP ──────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-6">
          
          {/* Header with Progress & Duration Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Personalized {planDuration}-Day Improvement Roadmap
                </h3>
                <span className="text-xs font-bold text-[var(--color-brand-600)] bg-[var(--color-brand-50)] px-2.5 py-0.5 rounded-full border border-[var(--color-brand-200)]">
                  {completedTasksCount} / {tasks.length} Completed ({progressPercent}%)
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Complete daily actionable tasks to systematically close skill gaps and improve your readiness score.
              </p>
            </div>

            {/* Day Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedDayFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-[var(--radius-md)] transition-all ${
                  selectedDayFilter === 'all'
                    ? 'bg-[var(--color-brand-600)] text-white shadow-xs'
                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
                }`}
              >
                All Days
              </button>
              {daysList.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDayFilter(d)}
                  className={`px-3 py-1 text-xs font-bold rounded-[var(--radius-md)] transition-all ${
                    selectedDayFilter === d
                      ? 'bg-[var(--color-brand-600)] text-white shadow-xs'
                      : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
                  }`}
                >
                  Day {d}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-[var(--color-border)]">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {displayedTasks.map((task, idx) => {
              const isCompleted = task.status === 'completed';

              return (
                <div 
                  key={`task-${task.id || 't'}-${task.dayNumber}-${idx}`}
                  className={`p-4 rounded-[var(--radius-lg)] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCompleted 
                      ? 'bg-slate-50 border-slate-200 opacity-75' 
                      : 'bg-white border-[var(--color-border)] hover:border-[var(--color-brand-300)] shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleTaskStatus(task)}
                      className={`h-5 w-5 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                        isCompleted 
                          ? 'bg-emerald-600 border-emerald-600 text-white' 
                          : 'border-[var(--color-border)] hover:border-[var(--color-brand-500)] bg-white'
                      }`}
                      aria-label={isCompleted ? 'Mark task pending' : 'Mark task completed'}
                    >
                      {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded bg-slate-100 text-slate-700">
                          Day {task.dayNumber}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                          task.priority === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                          task.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {task.estimatedMinutes} mins
                        </span>
                      </div>

                      <h4 className={`text-xs font-bold text-[var(--color-text-primary)] ${isCompleted ? 'line-through text-[var(--color-text-tertiary)]' : ''}`}>
                        {task.title}
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                        {task.description}
                      </p>
                    </div>
                  </div>

                  {/* Resource Action */}
                  <div className="flex items-center gap-2 shrink-0 pl-8 sm:pl-0">
                    {task.resourceUrl && (
                      <Link href={task.resourceUrl}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-[11px] py-1 px-3 shadow-xs hover:text-[var(--color-brand-600)]"
                        >
                          {task.resourceTitle || 'Open Resource'} <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* REGENERATE PLAN MODAL */}
      <Modal
        isOpen={isRegenerateModalOpen}
        onClose={() => !isGenerating && setIsRegenerateModalOpen(false)}
        title="Regenerate Personalized Career Plan"
        className="max-w-md"
      >
        <div className="space-y-4 text-xs text-[var(--color-text-secondary)]">
          <p className="leading-relaxed">
            Regenerating will analyze your latest mock interview results, newly acquired skills, and update your daily roadmap. Completed tasks from previous plans will be safely preserved.
          </p>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-[var(--color-text-primary)] block">
              Select Roadmap Duration:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[7, 14, 30].map(dur => (
                <button
                  key={dur}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setSelectedDuration(dur)}
                  className={`p-3 rounded-[var(--radius-lg)] border text-center transition-all ${
                    selectedDuration === dur
                      ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-500)] text-[var(--color-brand-700)] font-bold shadow-xs'
                      : 'bg-white border-[var(--color-border)] hover:border-[var(--color-brand-300)]'
                  }`}
                >
                  <span className="text-sm font-bold block">{dur} Days</span>
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">
                    {dur === 7 ? 'Sprint' : dur === 14 ? 'Standard' : 'Mastery'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isGenerating}
              onClick={() => setIsRegenerateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isGenerating}
              onClick={() => handleGeneratePlan(selectedDuration)}
              className="shadow-xs"
            >
              {isGenerating ? 'Generating Plan...' : 'Generate New Plan'}
            </Button>
          </div>
        </div>
      </Modal>

    </StudentLayout>
  );
}
