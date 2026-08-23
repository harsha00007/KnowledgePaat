"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { 
  Bot, 
  Users, 
  Code2, 
  Briefcase, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  ArrowRight, 
  ShieldCheck, 
  Play, 
  RotateCcw, 
  Award, 
  Layers,
  Settings,
  BrainCircuit
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { calculateUserAccess, UserAccess } from '@/lib/subscription';
import { 
  MockInterviewSession, 
  InterviewType, 
  MockCreditStatus, 
  INTERVIEW_TYPE_DETAILS, 
  calculateMockCreditStatus, 
  getConsumedSessionsCount, 
  getStudentSessions 
} from '@/lib/mockInterview';
import { ExperienceLevel, InterviewDifficulty } from '@/lib/ai/mockInterviewTypes';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';

const TARGET_ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Python Developer',
  'Data Analyst',
  'QA / Automation Engineer',
  'Custom Role'
];

export default function MockInterviewDashboard() {
  const { isModuleEnabled } = useFeatureFlags();
  const isMockEnabled = isModuleEnabled('student_mock_interviews');

  const router = useRouter();
  const [userAccess, setUserAccess] = useState<UserAccess>(calculateUserAccess(null));
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
  const [sessions, setSessions] = useState<MockInterviewSession[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // AI Setup Modal State
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<InterviewType>('technical');
  const [selectedRole, setSelectedRole] = useState<string>('Software Engineer');
  const [customRole, setCustomRole] = useState<string>('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Fresher');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('Medium');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (isMockEnabled) {
      fetchDashboardData();
    } else {
      setIsFetching(false);
    }
  }, [isMockEnabled]);

  const fetchDashboardData = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const access = calculateUserAccess(subData);
      setUserAccess(access);

      // 2. Fetch Sessions stats and history
      const stats = await getConsumedSessionsCount(supabase, user.id, access.startDate);
      const creds = calculateMockCreditStatus(access, stats.usedCount, stats.completedCount, stats.averageScore);
      setCreditStatus(creds);

      const allSessions = await getStudentSessions(supabase, user.id);
      setSessions(allSessions);
    } catch (err) {
      console.error("Error loading mock interview dashboard:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleOpenSetup = (type: InterviewType) => {
    if (!creditStatus.isEligible) {
      router.push('/student/subscription');
      return;
    }
    setSelectedTrack(type);
    setStartError(null);
    setIsSetupModalOpen(true);
  };

  const handleStartAIInterview = async () => {
    setIsStarting(true);
    setStartError(null);

    const targetRoleName = selectedRole === 'Custom Role' ? (customRole.trim() || 'Software Engineer') : selectedRole;

    try {
      const response = await fetch('/api/mock-interview/start-ai-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewType: selectedTrack,
          targetRole: targetRoleName,
          experienceLevel,
          difficulty,
          totalQuestions: questionCount
        })
      });

      const data = await response.json();

      if (!response.ok || !data.sessionId) {
        setStartError(data.error || 'Failed to initialize AI interview session.');
        return;
      }

      setIsSetupModalOpen(false);
      router.push(`/student/mock-interview/session/${data.sessionId}`);
    } catch (err: any) {
      console.error('Error starting AI interview:', err);
      setStartError(err.message || 'Network error starting interview.');
    } finally {
      setIsStarting(false);
    }
  };

  if (!isMockEnabled) {
    return (
      <StudentLayout>
        <FeatureComingSoon
          title="AI Mock Interviews Coming Soon"
          description="Interactive conversational AI mock interviews with behavioral assessments, technical evaluations, and detailed scorecards are currently being prepared for rollout."
          icon={Bot}
          backHref="/student/dashboard"
        />
      </StudentLayout>
    );
  }

  const inProgressSessions = sessions.filter(s => s.status === 'in_progress');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border border-[var(--color-brand-200)] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <BrainCircuit className="w-3 h-3" /> AI-Powered
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">AI Mock Interviews</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Practice in a realistic conversational interview environment with intelligent follow-ups and feedback.
            </p>
          </div>
          <Link href="/student/subscription">
            <Button variant="outline" size="sm" className="text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Manage Subscription
            </Button>
          </Link>
        </div>

        {/* ── TOP 4 SUMMARY CARDS ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Available Interviews</span>
              <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)] mb-1">
              {creditStatus.remainingCredits} / {creditStatus.monthlyLimit}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium">
              {creditStatus.isEligible ? `${creditStatus.remainingCredits} Remaining this cycle` : '0 Credits remaining'}
            </p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Current Plan</span>
              <div className="h-8 w-8 rounded-[var(--radius-md)] bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)] mb-1">
              {creditStatus.planName} Plan
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium">
              {creditStatus.subscriptionEndDate ? `Renews on ${new Date(creditStatus.subscriptionEndDate).toLocaleDateString()}` : 'Standard monthly plan'}
            </p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Completed Sessions</span>
              <div className="h-8 w-8 rounded-[var(--radius-md)] bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)] mb-1">
              {creditStatus.completedCount}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium">
              Interviews completed
            </p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Average Score</span>
              <div className="h-8 w-8 rounded-[var(--radius-md)] bg-purple-50 text-purple-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)] mb-1">
              {creditStatus.averageScore > 0 ? `${creditStatus.averageScore}%` : '--'}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium">
              {creditStatus.averageScore > 0 ? 'Across AI evaluated tracks' : 'Complete interviews to see score'}
            </p>
          </div>

        </div>

        {/* ── SECTION: CONTINUE YOUR INTERVIEW (IF INCOMPLETE) ─────────── */}
        {inProgressSessions.length > 0 && (
          <div className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50/50 p-6 shadow-[var(--shadow-xs)] space-y-4">
            <div>
              <h2 className="text-base font-bold text-amber-950 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" /> Continue Your Interview
              </h2>
              <p className="text-xs text-amber-900 mt-0.5">
                You have active in-progress interviews. Resume your session anytime without consuming another credit.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inProgressSessions.map(session => {
                const details = INTERVIEW_TYPE_DETAILS[session.interview_type];

                return (
                  <div key={session.id} className="rounded-[var(--radius-lg)] bg-white border border-amber-200 p-4 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-xs capitalize text-[var(--color-text-primary)]">
                          {details.title} {session.target_role ? `• ${session.target_role}` : ''}
                        </span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          IN PROGRESS
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] mb-3">
                        Total {session.total_questions} questions • Last active {new Date(session.last_activity_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-[var(--color-border)]">
                      <Link href={`/student/mock-interview/session/${session.id}`}>
                        <Button variant="primary" size="sm" className="text-xs shadow-xs">
                          Continue Interview <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SECTION: CHOOSE YOUR INTERVIEW TRACK ─────────────────────── */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">Choose Interview Format</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Select an interview track to configure target role, experience level, and difficulty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(['hr', 'technical', 'managerial'] as InterviewType[]).map((type) => {
              const details = INTERVIEW_TYPE_DETAILS[type];
              const Icon = type === 'hr' ? Users : type === 'technical' ? Code2 : Briefcase;

              return (
                <div 
                  key={type}
                  className="rounded-[var(--radius-xl)] bg-white border border-[var(--color-border)] p-6 flex flex-col justify-between shadow-[var(--shadow-xs)] hover:border-[var(--color-brand-300)] hover:shadow-[var(--shadow-sm)] transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border border-[var(--color-brand-200)] flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${details.badgeColor} ${details.badgeTextColor} ${details.badgeBorder}`}>
                        {details.questionsCount}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1.5">
                      {details.title}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-4">
                      {details.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-tertiary)] font-medium mb-6">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {details.duration}
                      </span>
                      <span>•</span>
                      <span>AI Adaptive Follow-ups</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[var(--color-border)]">
                    {creditStatus.isEligible ? (
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleOpenSetup(type)}
                        className="w-full justify-center text-xs shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 mr-1 fill-current" /> Configure & Start AI Round
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-500 font-semibold text-center">
                          No mock interview credits remaining.
                        </p>
                        <Link href="/student/subscription" className="block w-full">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-center text-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1" /> Upgrade Plan
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION: INTERVIEW HISTORY ──────────────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] space-y-4">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">Interview History</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">Your evaluated AI practice interview sessions and feedback reports.</p>
          </div>

          {isFetching ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
            </div>
          ) : completedSessions.length === 0 ? (
            <EmptyState 
              title="No interview history yet"
              description="Complete your first AI mock interview above to receive detailed scoring, strengths, and areas to improve."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[11px] uppercase font-bold text-[var(--color-text-tertiary)]">
                    <th className="py-3 px-4">Interview Track</th>
                    <th className="py-3 px-4">Target Role</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {completedSessions.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--color-bg-subtle)]/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--color-text-primary)] capitalize">
                        {item.interview_type} Interview
                      </td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)] font-medium">
                        {item.target_role || 'General Software'}
                      </td>
                      <td className="py-3 px-4 text-[var(--color-text-tertiary)] font-medium">
                        {item.experience_level || 'Fresher'}
                      </td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                        {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-sm text-[var(--color-brand-600)]">
                          {item.overall_score || 0}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/student/mock-interview/result/${item.id}`}>
                          <Button variant="outline" size="sm" className="text-xs py-1 px-3">
                            View Report
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* AI INTERVIEW SETUP MODAL */}
      <Modal 
        isOpen={isSetupModalOpen} 
        onClose={() => !isStarting && setIsSetupModalOpen(false)} 
        title="Configure AI Mock Interview"
        className="max-w-lg"
      >
        <div className="space-y-4 text-xs text-[var(--color-text-secondary)]">
          
          {/* Track Header */}
          <div className="p-3 bg-[var(--color-brand-50)]/60 border border-[var(--color-brand-200)] rounded-[var(--radius-lg)] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--color-brand-700)]">Selected Track</span>
              <p className="text-sm font-bold text-[var(--color-text-primary)] capitalize">{selectedTrack} Interview</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-full border border-emerald-200">
              1 Credit = 1 Session
            </span>
          </div>

          {/* 1. Target Role */}
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Target Job Role *</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
            >
              {TARGET_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {selectedRole === 'Custom Role' && (
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Enter Custom Role *</label>
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="e.g. Cloud DevOps Engineer or iOS Developer"
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
              />
            </div>
          )}

          {/* 2. Experience Level & Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
              >
                <option value="Fresher">Fresher (Campus / Entry)</option>
                <option value="0–1 Years">0–1 Years</option>
                <option value="1–3 Years">1–3 Years</option>
                <option value="3+ Years">3+ Years (Experienced)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Interview Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as InterviewDifficulty)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
              >
                <option value="Easy">Easy (Fundamentals)</option>
                <option value="Medium">Medium (Standard)</option>
                <option value="Hard">Hard (Deep Dives)</option>
              </select>
            </div>
          </div>

          {/* 3. Question Count */}
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Session Question Count</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setQuestionCount(5)}
                className={`p-2.5 rounded-[var(--radius-md)] border text-left transition-all ${
                  questionCount === 5
                    ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-bold'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]'
                }`}
              >
                <div className="font-semibold text-xs">5 Questions</div>
                <div className="text-[10px] text-[var(--color-text-tertiary)]">Quick Practice (10–15 min)</div>
              </button>

              <button
                type="button"
                onClick={() => setQuestionCount(10)}
                className={`p-2.5 rounded-[var(--radius-md)] border text-left transition-all ${
                  questionCount === 10
                    ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-bold'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]'
                }`}
              >
                <div className="font-semibold text-xs">10 Questions</div>
                <div className="text-[10px] text-[var(--color-text-tertiary)]">Full Interview (20–25 min)</div>
              </button>
            </div>
          </div>

          {startError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-[var(--radius-md)] text-xs font-semibold">
              {startError}
            </div>
          )}

          <p className="text-[10px] text-[var(--color-text-tertiary)] pt-1 border-t border-[var(--color-border)]">
            * 1 mock interview credit will be consumed when you begin. The AI will generate adaptive follow-up inquiries based on your responses.
          </p>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsSetupModalOpen(false)} disabled={isStarting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleStartAIInterview} disabled={isStarting} className="shadow-xs">
              {isStarting ? 'Initializing AI Session...' : 'Start AI Interview'}
            </Button>
          </div>

        </div>
      </Modal>

    </StudentLayout>
  );
}
