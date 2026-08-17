"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  ArrowLeft, 
  RotateCcw, 
  MessageSquare, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  BrainCircuit, 
  BookOpen, 
  Layers, 
  ArrowRight, 
  Bot, 
  Zap, 
  Activity, 
  Tag, 
  Lock, 
  ShoppingCart
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { INTERVIEW_TYPE_DETAILS } from '@/lib/mockInterview';
import { getPerformanceLevel, PerformanceLevel } from '@/lib/ai/interviewTypes';
import { TopicPerformance } from '@/lib/adaptiveInterview';

export default function MockInterviewReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;
  const router = useRouter();

  const [session, setSession] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadReportData() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Authentication required');
          return;
        }

        // 1. Fetch Session
        const { data: sessionData, error: sessionErr } = await supabase
          .from('mock_interview_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionErr || !sessionData) {
          setError('Failed to load interview report.');
          return;
        }

        // Security check
        if (sessionData.student_id !== user.id) {
          setError('You do not have permission to view this report.');
          return;
        }

        setSession(sessionData);

        // 2. Fetch AI Messages
        const { data: messagesData } = await supabase
          .from('mock_interview_ai_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        setMessages(messagesData || []);

      } catch (err: any) {
        setError(err.message || 'Error loading report.');
      } finally {
        setIsLoading(false);
      }
    }

    if (sessionId) {
      loadReportData();
    }
  }, [sessionId, supabase]);

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-600)] border-t-transparent mx-auto"></div>
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Generating your adaptive evaluation report...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (error || !session) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] p-8 text-center space-y-4 shadow-xs">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">Report Not Available</h2>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{error}</p>
          <Link href="/student/mock-interview">
            <Button variant="primary" size="sm" className="w-full justify-center text-xs">
              Back to Mock Interviews
            </Button>
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const trackMeta = INTERVIEW_TYPE_DETAILS[session.interview_type as 'hr' | 'technical' | 'managerial'] || INTERVIEW_TYPE_DETAILS.technical;
  const overallScore = Math.round(Number(session.overall_score) || 0);
  const performanceLevel: PerformanceLevel = session.performance_level || getPerformanceLevel(overallScore);

  const initialDifficulty = session.difficulty || 'medium';
  const highestDifficulty = session.highest_difficulty_reached || session.current_difficulty || initialDifficulty;
  const momentum = session.interview_momentum || 'stable';
  const topicPerformance = (session.topic_performance || []) as TopicPerformance[];

  // 6 Category Scores
  const commScore = Math.round(Number(session.communication_score) || overallScore);
  const techScore = Math.round(Number(session.technical_score) || overallScore);
  const confScore = Math.round(Number(session.confidence_score) || overallScore);
  const relScore = Math.min(10, Math.max(5, Math.round((techScore + commScore) / 20)));
  const clarScore = Math.min(10, Math.max(5, Math.round(commScore / 10)));
  const structScore = Math.min(10, Math.max(5, Math.round(confScore / 10)));

  const categories = [
    { label: 'Relevance', score: relScore, max: 10 },
    { label: 'Technical Accuracy', score: Math.round(techScore / 10), max: 10 },
    { label: 'Communication', score: Math.round(commScore / 10), max: 10 },
    { label: 'Clarity', score: clarScore, max: 10 },
    { label: 'Answer Structure', score: structScore, max: 10 },
    { label: 'Confidence', score: Math.round(confScore / 10), max: 10 }
  ];

  const strengthsList = (session.ai_strengths as string[]) || (session.strengths as string[]) || [];
  const improvementsList = (session.ai_improvements as string[]) || (session.improvements as string[]) || [];
  const recommendationsList = (session.ai_recommendations as any[]) || [];
  const feedbackText = session.ai_overall_feedback || session.feedback || '';

  // Extract Q&A pairs for transcript review
  const qaPairs: { question: string; answer: string; isFollowUp: boolean; topic?: string }[] = [];
  let lastQ = '';
  let lastTopic = '';
  let isFollowUpFlag = false;

  messages.forEach(m => {
    if (m.role === 'interviewer' && (m.message_type === 'question' || m.message_type === 'follow_up')) {
      lastQ = m.message;
      lastTopic = m.metadata?.topic || '';
      isFollowUpFlag = m.message_type === 'follow_up';
    } else if (m.role === 'student' && m.message_type === 'answer' && lastQ) {
      qaPairs.push({
        question: lastQ,
        answer: m.message,
        isFollowUp: isFollowUpFlag,
        topic: lastTopic
      });
      lastQ = '';
    }
  });

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'Excellent':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Very Good':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Good':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Needs Improvement':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStrengthBadge = (s: string) => {
    switch (s) {
      case 'expert':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'strong':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'developing':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getLevelBadgeColor(performanceLevel)}`}>
                {performanceLevel.toUpperCase()}
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)] font-medium">
                Completed on {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : 'Today'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Adaptive Interview Evaluation Report
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 font-medium">
              {trackMeta.title} • {session.target_role || 'Software Engineer'} • {session.experience_level || 'Fresher'}
            </p>
          </div>

          <div className="flex gap-2.5">
            <Link href="/student/mock-interview">
              <Button variant="outline" size="sm" className="text-xs">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> All Interviews
              </Button>
            </Link>
            <Link href="/student/mock-interview">
              <Button variant="primary" size="sm" className="text-xs shadow-xs">
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Practice Again
              </Button>
            </Link>
          </div>
        </div>

        {/* ── OVERALL SCORE & SUMMARY CARD ─────────────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-xs)] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Overall Performance Score
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)]">
              {overallScore} / 100 — <span className="text-[var(--color-brand-600)]">{performanceLevel}</span>
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] max-w-lg leading-relaxed">
              Calculated across relevance, technical depth, communication clarity, answer structure, and confidence.
            </p>
          </div>

          {/* Score Badge */}
          <div className="h-28 w-28 rounded-full bg-[var(--color-brand-50)] border-4 border-[var(--color-brand-500)] text-[var(--color-brand-600)] flex flex-col items-center justify-center shadow-xs shrink-0">
            <span className="text-3xl font-extrabold leading-none">{overallScore}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mt-1">/ 100</span>
          </div>
        </div>

        {/* ── ADAPTIVE INTELLIGENCE METRICS ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] p-5 shadow-[var(--shadow-xs)] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Started Difficulty
            </span>
            <h3 className="text-lg font-extrabold text-[var(--color-text-primary)] capitalize">{initialDifficulty}</h3>
            <p className="text-[11px] text-[var(--color-text-secondary)]">Initial baseline set by candidate</p>
          </div>

          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] p-5 shadow-[var(--shadow-xs)] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Peak Difficulty Reached
            </span>
            <h3 className="text-lg font-extrabold text-[var(--color-brand-600)] capitalize">{highestDifficulty}</h3>
            <p className="text-[11px] text-[var(--color-text-secondary)]">Highest adaptive level achieved</p>
          </div>

          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] p-5 shadow-[var(--shadow-xs)] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-blue-500" /> Final Interview Momentum
            </span>
            <h3 className="text-lg font-extrabold text-[var(--color-text-primary)] capitalize">{momentum.replace('_', ' ')}</h3>
            <p className="text-[11px] text-[var(--color-text-secondary)]">Trajectory across answers</p>
          </div>

        </div>

        {/* ── TOPIC PERFORMANCE MATRIX ─────────────────────────────────── */}
        {topicPerformance.length > 0 && (
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 shadow-[var(--shadow-xs)] space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Curriculum Topic Performance Breakdown</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Performance across specific engineering domains evaluated during your interview.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {topicPerformance.map((tp, idx) => (
                <div key={idx} className="p-4 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[var(--color-text-primary)] block">{tp.topic}</span>
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">{tp.attempts} question attempt{tp.attempts > 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-base font-extrabold text-[var(--color-text-primary)] block">{tp.averageScore}%</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStrengthBadge(tp.strength)}`}>
                      {tp.strength}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 6-CATEGORY SCORES BREAKDOWN ─────────────────────────────── */}
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 shadow-[var(--shadow-xs)] space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Category Score Breakdown (Out of 10)</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">Standardized evaluation across 6 key hiring criteria.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {categories.map((cat, idx) => (
              <div key={idx} className="p-3.5 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">{cat.label}</span>
                  <span className="font-extrabold text-sm text-[var(--color-text-primary)]">{cat.score} / 10</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      cat.score >= 8 ? 'bg-emerald-500' : cat.score >= 6 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${cat.score * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── STRENGTHS & IMPROVEMENTS ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          
          {/* Strengths */}
          <div className="rounded-[var(--radius-xl)] border border-emerald-200 bg-emerald-50/40 p-6 space-y-3">
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Key Strengths
            </h3>
            <ul className="space-y-2 text-xs text-emerald-900 leading-relaxed">
              {strengthsList.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50/40 p-6 space-y-3">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-600" /> Areas for Improvement
            </h3>
            <ul className="space-y-2 text-xs text-amber-900 leading-relaxed">
              {improvementsList.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* ── PERSONALIZED PRACTICE & STORE RECOMMENDATIONS ───────────── */}
        {recommendationsList.length > 0 && (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--color-brand-600)]" /> Personalized Practice & Resource Recommendations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recommendationsList.map((rec, i) => (
                <div key={i} className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] block">
                      {rec.type === 'interview' ? 'Question Pack' : rec.type === 'notes' ? 'Revision Guide' : 'Skill Module'}
                    </span>
                    <h4 className="text-xs font-bold text-[var(--color-text-primary)] mt-1">{rec.title}</h4>
                    <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 leading-snug">{rec.description}</p>
                  </div>
                  {rec.link && (
                    <Link href={rec.link} className="pt-2 text-[11px] font-bold text-[var(--color-brand-600)] flex items-center gap-1 hover:underline">
                      Access Resource <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── QUALITATIVE FEEDBACK SUMMARY ─────────────────────────────── */}
        {feedbackText && (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] space-y-2">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--color-brand-600)]" /> AI Coach Feedback & Next Steps
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {feedbackText}
            </p>
          </div>
        )}

        {/* ── CONVERSATION TRANSCRIPT & EVALUATIONS ────────────────────── */}
        {qaPairs.length > 0 && (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] space-y-4">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Question-by-Question Review ({qaPairs.length} Exchanges)
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Review your answers and questions from this session.
              </p>
            </div>

            <div className="divide-y divide-[var(--color-border)]">
              {qaPairs.map((pair, idx) => {
                const isExpanded = expandedIndex === idx || idx === 0;

                return (
                  <div key={idx} className="py-4 space-y-2">
                    <button 
                      onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                      className="w-full text-left flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="h-5 w-5 rounded-full bg-[var(--color-bg-subtle)] text-[10px] font-bold text-[var(--color-text-tertiary)] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-600)] transition-colors">
                              {pair.question}
                            </p>
                            {pair.topic && (
                              <span className="text-[9px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                                {pair.topic}
                              </span>
                            )}
                            {pair.isFollowUp && (
                              <span className="text-[9px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-200">
                                Adaptive Follow-up
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0 mt-0.5" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0 mt-0.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="pl-7 pt-2 space-y-2">
                        <div className="p-3.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-lg)] text-xs text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                          {pair.answer}
                        </div>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] block">
                          Length: {pair.answer.length} characters ({pair.answer.trim().split(/\s+/).length} words)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BOTTOM ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <Link href="/student/dashboard">
            <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
              Back to Dashboard
            </Button>
          </Link>

          <Link href="/student/mock-interview">
            <Button variant="primary" size="md" className="text-xs w-full sm:w-auto shadow-xs">
              <RotateCcw className="w-4 h-4 mr-1.5" /> Practice Another Adaptive Track
            </Button>
          </Link>
        </div>

      </div>
    </StudentLayout>
  );
}
