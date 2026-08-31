"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { PremiumBadge } from '@/components/PremiumBadge';
import { UpgradeModal } from '@/components/UpgradeModal';
import { 
  Search, 
  CheckCircle, 
  Circle, 
  Clock, 
  BookOpen, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Target, 
  AlertTriangle,
  Users,
  Code,
  Brain,
  Building,
  Lock,
  Sparkles,
  HelpCircle,
  Play,
  Flame,
  Award,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Flag,
  ArrowRight,
  TrendingUp,
  Layers,
  Zap,
  Bot,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { calculateUserAccess, isContentAccessible, UserAccess } from '@/lib/subscription';
import { PLANS, normalizePlanId, PlanId } from '@/config/plans';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';
import { fetchWithSWR } from '@/lib/clientQueryCache';

type Category = {
  id: string;
  name: string;
  description: string | null;
  order_index?: number;
  status?: string;
  is_active?: boolean;
  minimum_plan?: string;
};

type Question = {
  id: string;
  category_id: string;
  title: string;
  question_type?: 'mcq' | 'descriptive';
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  correct_option?: 'A' | 'B' | 'C' | 'D' | string | null;
  explanation?: string | null;
  options?: string[];
  correct_option_index?: number;
  answer: string;
  tips: string | null;
  common_mistakes: string | null;
  difficulty: string;
  estimated_time: string;
  company_tags: string[];
  technology_tags: string[];
  minimum_plan?: string;
  access_type?: string;
  status?: string;
  category?: { name: string };
};

type TestConfig = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  mode: 'practice' | 'timed_test' | 'ai_adaptive';
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed' | 'Adaptive';
  question_count: number;
  time_per_question: number; // seconds
  minimum_plan: string;
  is_recommended: boolean;
  status: 'Active' | 'Inactive';
  category?: { name: string };
};

type PrepSettings = {
  practice_mode_enabled: boolean;
  timed_test_mode_enabled: boolean;
  ai_adaptive_mode_enabled: boolean;
  practice_minimum_plan: string;
  timed_test_minimum_plan: string;
  ai_adaptive_minimum_plan: string;
};

type ActiveTestSession = {
  testConfig: TestConfig;
  questions: Question[];
  currentQuestionIndex: number;
  selectedAnswers: Record<number, string>; // 'A' | 'B' | 'C' | 'D' or 'mastered' | 'review' | 'skipped'
  questionTimes?: Record<number, number>;
  flaggedQuestionIndices: Set<number>;
  startTime: number;
  timeRemaining: number;
  isSubmitted: boolean;
  isSubmitting?: boolean;
  scorecard?: {
    attemptId?: string;
    title?: string;
    mode?: string;
    difficulty?: string;
    scorePercentage: number;
    correctCount: number;
    incorrectCount: number;
    totalCount: number;
    timeSpentSeconds: number;
    isPassed: boolean;
    topicBreakdown: Array<{ categoryId: string; categoryName: string; total: number; correct: number; percentage: number }>;
    questionReviews: Array<{
      questionIndex: number;
      questionId: string;
      title: string;
      question_type: string;
      difficulty: string;
      categoryName: string;
      option_a?: string | null;
      option_b?: string | null;
      option_c?: string | null;
      option_d?: string | null;
      userSelectedOption: string;
      userSelectedText: string;
      correctOption: string;
      correctOptionText: string;
      isCorrect: boolean;
      explanation: string;
      tips?: string | null;
      common_mistakes?: string | null;
      timeSpentSeconds?: number;
    }>;
  };
  scorePercentage?: number;
  timeSpentSeconds?: number;
};

export default function StudentInterviewPrepPage() {
  const { isModuleEnabled } = useFeatureFlags();
  const isPrepEnabled = isModuleEnabled('student_interview_prep');

  const [activeView, setActiveView] = useState<'tests' | 'practice' | 'history'>('tests');
  const [testsSubTab, setTestsSubTab] = useState<'available' | 'completed'>('available');
  
  // Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [normalQuestions, setNormalQuestions] = useState<Question[]>([]);
  const [mcqQuestions, setMcqQuestions] = useState<Question[]>([]);
  const [testConfigs, setTestConfigs] = useState<TestConfig[]>([]);
  const [prepSettings, setPrepSettings] = useState<PrepSettings>({
    practice_mode_enabled: true,
    timed_test_mode_enabled: true,
    ai_adaptive_mode_enabled: true,
    practice_minimum_plan: 'free',
    timed_test_minimum_plan: 'free',
    ai_adaptive_minimum_plan: 'premium'
  });
  const [completedQuestionIds, setCompletedQuestionIds] = useState<Set<string>>(new Set());
  const [userAccess, setUserAccess] = useState<UserAccess>(calculateUserAccess(null));
  const [isFetching, setIsFetching] = useState(true);
  const [testHistory, setTestHistory] = useState<any[]>([]);

  // Practice Browser Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  // Practice Pagination State
  const [practicePage, setPracticePage] = useState(1);
  const [totalNormalCount, setTotalNormalCount] = useState(0);
  const practiceItemsPerPage = 20;

  // Practice Question Modal
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [confidenceRatings, setConfidenceRatings] = useState<Record<string, 'well' | 'needs_work' | 'unfamiliar'>>({});

  // Upgrade Modal
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [modalRequiredPlan, setModalRequiredPlan] = useState<string>('starter');
  const [upgradeFeatureTitle, setUpgradeFeatureTitle] = useState<string>('this test assessment');

  // Interactive Active Test Session
  const [activeSession, setActiveSession] = useState<ActiveTestSession | null>(null);

  // Notice & Friendly Suggestion Modal
  const [noticeModal, setNoticeModal] = useState<{
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error';
    primaryActionText?: string;
    primaryActionFn?: () => void;
    secondaryActionText?: string;
    secondaryActionFn?: () => void;
  } | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (isPrepEnabled) {
      fetchPrepData();
    }
  }, [isPrepEnabled]);

  useEffect(() => {
    if (isPrepEnabled) {
      fetchNormalQuestions();
    }
  }, [isPrepEnabled, practicePage, searchQuery, categoryFilter, difficultyFilter, planFilter]);

  const fetchNormalQuestions = async () => {
    try {
      let query = supabase
        .from('interview_questions')
        .select(`
          *,
          interview_categories(name)
        `, { count: 'exact' })
        .eq('status', 'Active')
        .eq('question_type', 'normal');

      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }
      if (difficultyFilter) {
        query = query.eq('difficulty', difficultyFilter);
      }
      if (planFilter) {
        query = query.or(`minimum_plan.eq.${planFilter},access_type.eq.${planFilter}`);
      }
      if (searchQuery.trim()) {
        const q = `%${searchQuery.trim()}%`;
        query = query.or(`title.ilike.${q},answer.ilike.${q}`);
      }

      const from = (practicePage - 1) * practiceItemsPerPage;
      const to = from + practiceItemsPerPage - 1;

      const { data: normalData, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (normalData) {
        setNormalQuestions(normalData.map((q: any) => ({ ...q, category: q.interview_categories })) as Question[]);
      }
      if (typeof count === 'number') {
        setTotalNormalCount(count);
      }
    } catch (err) {
      console.error("Error fetching practice questions:", err);
    }
  };

  // Timer Effect for Active Timed Test
  useEffect(() => {
    if (!activeSession || activeSession.isSubmitted || activeSession.testConfig.mode !== 'timed_test') return;

    const timer = setInterval(() => {
      setActiveSession(prev => {
        if (!prev || prev.isSubmitted) return prev;
        if (prev.timeRemaining <= 1) {
          clearInterval(timer);
          handleSubmitTest(prev);
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession?.testConfig?.id, activeSession?.isSubmitted]);

  const fetchPrepData = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const userQueries = user ? [
        supabase.from('subscriptions').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('student_question_progress').select('question_id').eq('student_id', user.id).eq('completed', true),
        supabase.from('student_test_attempts').select('*').eq('student_id', user.id).order('created_at', { ascending: false })
      ] : [
        Promise.resolve({ data: null }),
        Promise.resolve({ data: null }),
        Promise.resolve({ data: null })
      ];

      const userPromise = Promise.all(userQueries);

      const sharedPromise = fetchWithSWR(
        'interview_prep_shared_config',
        async () => {
          const [
            { data: settingsData },
            { data: catData },
            { data: mcqData },
            { data: testData }
          ] = await Promise.all([
            supabase.from('interview_prep_settings').select('*').eq('id', 'global').maybeSingle(),
            supabase.from('interview_categories').select('*').order('order_index', { ascending: true }),
            supabase.from('interview_questions').select('*, interview_categories(name)').eq('status', 'Active').eq('question_type', 'mcq').order('created_at', { ascending: false }),
            supabase.from('interview_test_configs').select('*, interview_categories(name)').eq('status', 'Active').order('created_at', { ascending: false })
          ]);

          return { settingsData, catData, mcqData, testData };
        },
        {
          staleTimeMs: 300000,
          onRevalidate: (fresh) => {
            if (fresh.settingsData) setPrepSettings(fresh.settingsData as PrepSettings);
            if (fresh.catData) setCategories((fresh.catData as Category[]).filter(c => (c.status || 'Active') === 'Active'));
            if (fresh.mcqData) setMcqQuestions((fresh.mcqData as any[]).map((q: any) => ({ ...q, category: q.interview_categories })) as Question[]);
            if (fresh.testData) setTestConfigs((fresh.testData as any[]).map((t: any) => ({ ...t, category: t.interview_categories })) as TestConfig[]);
          }
        }
      );

      const [
        [{ data: subData }, { data: progressData }, { data: historyData }],
        { data: sharedData }
      ] = await Promise.all([userPromise, sharedPromise]);

      if (user) {
        setUserAccess(calculateUserAccess(subData));
        if (progressData) {
          setCompletedQuestionIds(new Set((progressData as any[]).map(p => p.question_id)));
        }
        if (historyData) {
          setTestHistory(historyData);
        }
      }

      if (sharedData) {
        if (sharedData.settingsData) setPrepSettings(sharedData.settingsData as PrepSettings);
        if (sharedData.catData) setCategories((sharedData.catData as Category[]).filter(c => (c.status || 'Active') === 'Active'));
        if (sharedData.mcqData) setMcqQuestions((sharedData.mcqData as any[]).map((q: any) => ({ ...q, category: q.interview_categories })) as Question[]);
        if (sharedData.testData) setTestConfigs((sharedData.testData as any[]).map((t: any) => ({ ...t, category: t.interview_categories })) as TestConfig[]);
      }

      setFetchError(null);
    } catch (err) {
      console.error("Error loading interview prep data:", err);
      setFetchError("Something went wrong while loading the questions. Please try again.");
    } finally {
      setIsFetching(false);
    }
  };

  // ---------------- TEST LAUNCH & SUBMISSION ---------------- //
  const startTestExecution = (test: TestConfig) => {
    // 2. Select MCQs from Active MCQ Pool
    let pool = mcqQuestions.filter(q => q.status === 'Active');
    if (test.category_id) {
      pool = pool.filter(q => q.category_id === test.category_id);
    }
    if (test.difficulty !== 'Mixed' && test.difficulty !== 'Adaptive') {
      pool = pool.filter(q => q.difficulty.toLowerCase() === test.difficulty.toLowerCase());
    }

    // Shuffle pool for randomized questions
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(test.question_count, shuffled.length));

    if (selected.length === 0) {
      setNoticeModal({
        title: "Questions Not Available",
        message: "No active assessment questions are currently available for this test configuration. Please select another test or try again later.",
        type: 'warning',
        primaryActionText: "OK",
        primaryActionFn: () => setNoticeModal(null)
      });
      return;
    }

    const totalSeconds = (test.time_per_question || 60) * selected.length;

    setActiveSession({
      testConfig: test,
      questions: selected,
      currentQuestionIndex: 0,
      selectedAnswers: {},
      questionTimes: {},
      flaggedQuestionIndices: new Set(),
      startTime: Date.now(),
      timeRemaining: totalSeconds,
      isSubmitted: false,
      isSubmitting: false
    });
  };

  const handleStartTest = (test: TestConfig) => {
    // 1. Subscription Gating (AI Adaptive Mode strictly requires Premium)
    const reqPlan = test.mode === 'ai_adaptive' ? 'premium' : (test.minimum_plan || 'free');
    if (!userAccess.hasAccess(reqPlan)) {
      setModalRequiredPlan(reqPlan);
      setUpgradeFeatureTitle(test.mode === 'ai_adaptive' ? 'AI Adaptive Mode' : `the ${test.title}`);
      setIsUpgradeModalOpen(true);
      return;
    }

    // Check if student has already completed this test
    const pastAttempt = testHistory.find((h: any) => h.test_config_id === test.id);
    if (pastAttempt) {
      const dateStr = pastAttempt.created_at ? new Date(pastAttempt.created_at).toLocaleDateString() : '';
      setNoticeModal({
        title: "Test Already Completed",
        message: `You have already attempted "${test.title}"${dateStr ? ` on ${dateStr}` : ''} with a score of ${pastAttempt.score ?? 0}%. You can view your detailed scorecard in Completed Tests, or retake this test to improve your score.`,
        type: 'info',
        primaryActionText: "Retake Test",
        primaryActionFn: () => {
          setNoticeModal(null);
          startTestExecution(test);
        },
        secondaryActionText: "View Completed Tests",
        secondaryActionFn: () => {
          setNoticeModal(null);
          setActiveView('tests');
          setTestsSubTab('completed');
        }
      });
      return;
    }

    startTestExecution(test);
  };

  const handleSelectAnswerState = (state: string) => {
    if (!activeSession || activeSession.isSubmitted) return;
    const currIdx = activeSession.currentQuestionIndex;

    setActiveSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        selectedAnswers: { ...prev.selectedAnswers, [currIdx]: state }
      };
    });
  };

  const handleSelectMcqOption = (opt: 'A' | 'B' | 'C' | 'D') => {
    if (!activeSession || activeSession.isSubmitted) return;
    const currIdx = activeSession.currentQuestionIndex;

    setActiveSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        selectedAnswers: { ...prev.selectedAnswers, [currIdx]: opt }
      };
    });
  };

  const handleClearCurrentAnswer = () => {
    if (!activeSession || activeSession.isSubmitted) return;
    const currIdx = activeSession.currentQuestionIndex;

    setActiveSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev.selectedAnswers };
      delete updated[currIdx];
      return {
        ...prev,
        selectedAnswers: updated
      };
    });
  };

  const handleToggleFlag = () => {
    if (!activeSession || activeSession.isSubmitted) return;
    const currIdx = activeSession.currentQuestionIndex;

    setActiveSession(prev => {
      if (!prev) return prev;
      const flags = new Set(prev.flaggedQuestionIndices);
      if (flags.has(currIdx)) flags.delete(currIdx);
      else flags.add(currIdx);
      return { ...prev, flaggedQuestionIndices: flags };
    });
  };

  const handleSubmitTest = async (sessionToSubmit?: ActiveTestSession) => {
    const session = sessionToSubmit || activeSession;
    if (!session || session.isSubmitted || session.isSubmitting) return;

    const totalQ = session.questions.length;
    const answeredCount = Object.keys(session.selectedAnswers).length;

    if (!sessionToSubmit && answeredCount < totalQ) {
      const confirmSubmit = confirm(`You have answered ${answeredCount} of ${totalQ} questions. Are you sure you want to submit the assessment?`);
      if (!confirmSubmit) return;
    }

    setActiveSession(prev => prev ? { ...prev, isSubmitting: true } : null);

    const timeSpent = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));
    const answersPayload = session.questions.map((q, idx) => ({
      questionId: q.id,
      selectedOption: session.selectedAnswers[idx] || 'skipped',
      timeSpentSeconds: Math.round(timeSpent / totalQ)
    }));

    try {
      const res = await fetch('/api/student/interview-prep/submit-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testConfigId: session.testConfig.id,
          title: session.testConfig.title,
          mode: session.testConfig.mode,
          difficulty: session.testConfig.difficulty,
          categoryId: session.testConfig.category_id,
          timeSpentSeconds: timeSpent,
          answers: answersPayload
        })
      });

      const data = await res.json();
      if (data.success) {
        // Immediate local state update so completed test moves directly to Completed tab
        const completedAttempt = {
          id: data.attemptId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `att-${Date.now()}`),
          student_id: null,
          test_config_id: session.testConfig.id,
          category_id: session.testConfig.category_id,
          title: session.testConfig.title,
          mode: session.testConfig.mode,
          difficulty: session.testConfig.difficulty,
          total_questions: data.totalCount || totalQ,
          correct_answers: data.correctCount || 0,
          score_percentage: data.scorePercentage || 0,
          time_spent_seconds: data.timeSpentSeconds || timeSpent,
          status: 'completed',
          created_at: new Date().toISOString(),
          answers_payload: data
        };

        setTestHistory(prev => [completedAttempt, ...prev.filter(p => p.id !== completedAttempt.id && p.test_config_id !== session.testConfig.id)]);

        setActiveSession(prev => prev ? {
          ...prev,
          isSubmitted: true,
          isSubmitting: false,
          scorePercentage: data.scorePercentage,
          timeSpentSeconds: data.timeSpentSeconds,
          scorecard: data
        } : null);

        // Update local completedQuestionIds
        if (data.questionReviews) {
          const correctIds = data.questionReviews.filter((r: any) => r.isCorrect).map((r: any) => r.questionId);
          setCompletedQuestionIds(prev => {
            const next = new Set(prev);
            correctIds.forEach((id: string) => next.add(id));
            return next;
          });
        }
      } else {
        throw new Error(data.error || 'Server evaluation error');
      }
    } catch (err: any) {
      console.error("Server test evaluation fallback:", err);

      // Local fallback evaluation
      let localCorrect = 0;
      const reviews = session.questions.map((q, idx) => {
        const userChoice = (session.selectedAnswers[idx] || '').toUpperCase();
        const correctChoice = (q.correct_option || '').toUpperCase();
        const isMcq = q.question_type === 'mcq' || !!(q.option_a && q.option_b);
        let isCorrect = false;

        if (isMcq) {
          isCorrect = !!(userChoice && correctChoice && userChoice === correctChoice);
        } else {
          isCorrect = session.selectedAnswers[idx] === 'mastered';
        }

        if (isCorrect) localCorrect++;

        let userOptionText = '';
        if (userChoice === 'A') userOptionText = q.option_a || 'Option A';
        else if (userChoice === 'B') userOptionText = q.option_b || 'Option B';
        else if (userChoice === 'C') userOptionText = q.option_c || 'Option C';
        else if (userChoice === 'D') userOptionText = q.option_d || 'Option D';
        else userOptionText = session.selectedAnswers[idx] || 'Skipped';

        let correctOptionText = '';
        if (correctChoice === 'A') correctOptionText = q.option_a || 'Option A';
        else if (correctChoice === 'B') correctOptionText = q.option_b || 'Option B';
        else if (correctChoice === 'C') correctOptionText = q.option_c || 'Option C';
        else if (correctChoice === 'D') correctOptionText = q.option_d || 'Option D';
        else correctOptionText = q.answer || 'Correct Answer';

        return {
          questionIndex: idx + 1,
          questionId: q.id,
          title: q.title,
          question_type: isMcq ? 'mcq' : 'descriptive',
          difficulty: q.difficulty,
          categoryName: q.category?.name || 'General',
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          userSelectedOption: userChoice || 'Skipped',
          userSelectedText: userOptionText,
          correctOption: correctChoice,
          correctOptionText: correctOptionText,
          isCorrect,
          explanation: q.explanation || q.answer || 'Review the core technical concepts to strengthen mastery.',
          tips: q.tips,
          common_mistakes: q.common_mistakes
        };
      });

      const scorePct = totalQ > 0 ? Math.round((localCorrect / totalQ) * 100) : 0;
      setActiveSession(prev => prev ? {
        ...prev,
        isSubmitted: true,
        isSubmitting: false,
        scorePercentage: scorePct,
        timeSpentSeconds: timeSpent,
        scorecard: {
          title: session.testConfig.title,
          mode: session.testConfig.mode,
          difficulty: session.testConfig.difficulty,
          scorePercentage: scorePct,
          correctCount: localCorrect,
          incorrectCount: totalQ - localCorrect,
          totalCount: totalQ,
          timeSpentSeconds: timeSpent,
          isPassed: scorePct >= 70,
          topicBreakdown: [],
          questionReviews: reviews
        }
      } : null);
    }
  };

  // ---------------- PRACTICE BROWSER ACTIONS ---------------- //
  const handleToggleComplete = async (questionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isCompleted = completedQuestionIds.has(questionId);
      
      setCompletedQuestionIds(prev => {
        const next = new Set(prev);
        if (isCompleted) next.delete(questionId);
        else next.add(questionId);
        return next;
      });

      if (isCompleted) {
        await supabase
          .from('student_question_progress')
          .delete()
          .eq('student_id', user.id)
          .eq('question_id', questionId);
      } else {
        await supabase
          .from('student_question_progress')
          .insert({ student_id: user.id, question_id: questionId, completed: true });
      }
    } catch (err) {
      console.error("Error toggling completion:", err);
    }
  };

  const handleOpenPracticeQuestion = (index: number) => {
    const question = filteredQuestions[index];
    const reqPlan = question?.minimum_plan || question?.access_type || 'free';
    
    if (!userAccess.hasAccess(reqPlan)) {
      setModalRequiredPlan(reqPlan);
      setUpgradeFeatureTitle(`exclusive ${PLANS[normalizePlanId(reqPlan)].name} interview questions`);
      setIsUpgradeModalOpen(true);
      return;
    }

    setSelectedQuestionIndex(index);
    setIsQuestionModalOpen(true);
  };

  const filteredQuestions = normalQuestions.filter(q => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = query === '' || 
      q.title.toLowerCase().includes(query) || 
      (q.technology_tags && q.technology_tags.some(t => t.toLowerCase().includes(query))) ||
      (q.company_tags && q.company_tags.some(c => c.toLowerCase().includes(query)));

    const matchesCat = categoryFilter === '' || q.category_id === categoryFilter;
    const matchesDiff = difficultyFilter === '' || q.difficulty === difficultyFilter;
    const matchesComp = companyFilter === '' || (q.company_tags && q.company_tags.includes(companyFilter));
    
    const itemPlan = normalizePlanId(q.minimum_plan || q.access_type);
    const matchesPlan = planFilter === '' || itemPlan === planFilter;

    return matchesSearch && matchesCat && matchesDiff && matchesComp && matchesPlan;
  });

  const selectedQuestion = selectedQuestionIndex !== null ? filteredQuestions[selectedQuestionIndex] : null;
  const userPlanConfig = PLANS[userAccess.effectivePlan];
  const recommendedTests = testConfigs.filter(t => t.is_recommended);

  if (!isPrepEnabled) {
    return (
      <StudentLayout>
        <FeatureComingSoon
          title="Interview Preparation Coming Soon"
          description="Topic tests, curated question archives, model answers, and timed assessments are currently being prepared for rollout."
          icon={BookOpen}
          backHref="/student/dashboard"
        />
      </StudentLayout>
    );
  }

  // ---------------- RENDER ACTIVE TEST SESSION ---------------- //
  if (activeSession) {
    const currQ = activeSession.questions[activeSession.currentQuestionIndex];
    const isLast = activeSession.currentQuestionIndex === activeSession.questions.length - 1;
    const currAns = activeSession.selectedAnswers[activeSession.currentQuestionIndex];
    const isFlagged = activeSession.flaggedQuestionIndices.has(activeSession.currentQuestionIndex);
    const isMcqMode = activeSession.testConfig.mode === 'timed_test' || activeSession.testConfig.mode === 'ai_adaptive' || currQ?.question_type === 'mcq' || !!(currQ?.option_a && currQ?.option_b);

    // ─────────────────────────────────────────────────────────────
    // 1. RENDER EVALUATED SCORECARD IF TEST IS SUBMITTED
    // ─────────────────────────────────────────────────────────────
    if (activeSession.isSubmitted) {
      const card = activeSession.scorecard;
      const scorePct = card?.scorePercentage ?? activeSession.scorePercentage ?? 0;
      const isPassed = scorePct >= 70;
      const correctCount = card?.correctCount ?? 0;
      const totalCount = card?.totalCount ?? activeSession.questions.length;
      const timeSpentSecs = card?.timeSpentSeconds ?? activeSession.timeSpentSeconds ?? 0;
      const reviews = card?.questionReviews || [];

      return (
        <StudentLayout>
          <div className="max-w-4xl mx-auto space-y-6 pb-16">
            
            {/* SCORECARD HERO */}
            <div className={`p-8 rounded-[var(--radius-xl)] border text-center shadow-[var(--shadow-xs)] space-y-5 ${
              isPassed ? 'bg-gradient-to-b from-white via-white to-emerald-50/50 border-emerald-300' : 'bg-gradient-to-b from-white via-white to-amber-50/50 border-amber-300'
            }`}>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white border shadow-xs mb-1">
                {isPassed ? <Award className="w-8 h-8 text-emerald-600" /> : <TrendingUp className="w-8 h-8 text-amber-600" />}
              </div>

              <div className="space-y-1.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${
                  isPassed ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {isPassed ? 'Assessment Passed (70%+ Benchmark)' : 'Assessment Complete — Review Below'}
                </span>
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {activeSession.testConfig.title}
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Mode: <span className="font-semibold uppercase">{activeSession.testConfig.mode.replace('_', ' ')}</span> • Difficulty: <span className="font-semibold">{activeSession.testConfig.difficulty}</span>
                </p>
              </div>

              {/* Score Metric Badges */}
              <div className="flex items-center justify-center gap-6 sm:gap-10 py-3 bg-slate-50/80 rounded-[var(--radius-lg)] border border-[var(--color-border)] max-w-lg mx-auto">
                <div className="text-center">
                  <span className={`text-3xl sm:text-4xl font-extrabold block ${isPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {scorePct}%
                  </span>
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-tertiary)]">Score</span>
                </div>
                <div className="h-10 w-px bg-[var(--color-border)]" />
                <div className="text-center">
                  <span className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] block">
                    {correctCount} / {totalCount}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-tertiary)]">Correct Answers</span>
                </div>
                <div className="h-10 w-px bg-[var(--color-border)]" />
                <div className="text-center">
                  <span className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] block">
                    {Math.floor(timeSpentSecs / 60)}m {timeSpentSecs % 60}s
                  </span>
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-tertiary)]">Time Taken</span>
                </div>
              </div>

              {/* Topic Breakdown Bars if available */}
              {card?.topicBreakdown && card.topicBreakdown.length > 0 && (
                <div className="p-4 bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] max-w-lg mx-auto text-left space-y-2.5">
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                    Topic Performance Breakdown
                  </h4>
                  <div className="space-y-2">
                    {card.topicBreakdown.map((t) => (
                      <div key={t.categoryId} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>{t.categoryName}</span>
                          <span className="font-bold">{t.correct}/{t.total} ({t.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              t.percentage >= 70 ? 'bg-emerald-500' : t.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${t.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-[var(--color-text-secondary)] max-w-md mx-auto">
                {isPassed 
                  ? 'Congratulations! Your score has been verified and registered on your Career Readiness scorecard.' 
                  : 'Review the detailed answers below to master the concepts before re-attempting.'}
              </p>

              <div className="pt-2 flex justify-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleStartTest(activeSession.testConfig)}
                  className="text-xs shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Re-attempt Test
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => setActiveSession(null)}
                  className="text-xs shadow-xs"
                >
                  Back to Interview Center <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </div>

            {/* QUESTION BY QUESTION DETAILED REVIEW */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Question-by-Question Solution Review ({reviews.length > 0 ? reviews.length : activeSession.questions.length})
                </h3>
                <span className="text-[11px] text-[var(--color-text-tertiary)]">
                  {correctCount} Correct • {totalCount - correctCount} Incorrect
                </span>
              </div>
              
              {(reviews.length > 0 ? reviews : activeSession.questions.map((q, idx) => ({
                questionIndex: idx + 1,
                questionId: q.id,
                title: q.title,
                question_type: q.question_type || 'mcq',
                difficulty: q.difficulty,
                categoryName: q.category?.name || 'General',
                option_a: q.option_a,
                option_b: q.option_b,
                option_c: q.option_c,
                option_d: q.option_d,
                userSelectedOption: activeSession.selectedAnswers[idx] || 'Skipped',
                userSelectedText: activeSession.selectedAnswers[idx] === 'A' ? q.option_a : activeSession.selectedAnswers[idx] === 'B' ? q.option_b : activeSession.selectedAnswers[idx] === 'C' ? q.option_c : activeSession.selectedAnswers[idx] === 'D' ? q.option_d : 'Skipped',
                correctOption: q.correct_option || 'A',
                correctOptionText: q.correct_option === 'A' ? q.option_a : q.correct_option === 'B' ? q.option_b : q.correct_option === 'C' ? q.option_c : q.correct_option === 'D' ? q.option_d : q.answer,
                isCorrect: (activeSession.selectedAnswers[idx] || '').toUpperCase() === (q.correct_option || '').toUpperCase(),
                explanation: q.explanation || q.answer || 'Review the core concept.',
                tips: q.tips,
                common_mistakes: q.common_mistakes
              }))).map((rev: any, idx: number) => {
                const isCorrect = rev.isCorrect;
                const isSkipped = rev.userSelectedOption === 'Skipped' || !rev.userSelectedOption;

                return (
                  <div 
                    key={rev.questionId || idx} 
                    className={`p-5 rounded-[var(--radius-xl)] border bg-white shadow-[var(--shadow-xs)] space-y-4 ${
                      isCorrect ? 'border-emerald-200' : isSkipped ? 'border-slate-200' : 'border-red-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase">
                            Question {rev.questionIndex}
                          </span>
                          <span className={`px-2 py-0.2 rounded-full font-bold text-[10px] border ${
                            rev.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            rev.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {rev.difficulty}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-tertiary)]">
                            {rev.categoryName}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[var(--color-text-primary)] leading-snug">
                          {rev.title}
                        </h4>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 shrink-0 ${
                        isCorrect 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                          : isSkipped 
                          ? 'bg-slate-100 text-slate-700 border border-slate-300' 
                          : 'bg-red-50 text-red-800 border border-red-300'
                      }`}>
                        {isCorrect ? (
                          <><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Correct</>
                        ) : isSkipped ? (
                          <><Circle className="w-3.5 h-3.5 text-slate-500" /> Skipped</>
                        ) : (
                          <><XCircle className="w-3.5 h-3.5 text-red-600" /> Incorrect</>
                        )}
                      </span>
                    </div>

                    {/* MCQ Options Review */}
                    {(rev.option_a && rev.option_b) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {[
                          { key: 'A', text: rev.option_a },
                          { key: 'B', text: rev.option_b },
                          { key: 'C', text: rev.option_c },
                          { key: 'D', text: rev.option_d }
                        ].filter(o => !!o.text).map((opt) => {
                          const isThisCorrect = (rev.correctOption || '').toUpperCase() === opt.key;
                          const isThisUserSelected = (rev.userSelectedOption || '').toUpperCase() === opt.key;

                          return (
                            <div 
                              key={opt.key}
                              className={`p-2.5 rounded-[var(--radius-md)] border text-xs flex items-start gap-2.5 transition-all ${
                                isThisCorrect 
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500 font-semibold' 
                                  : isThisUserSelected 
                                  ? 'bg-red-50 border-red-400 text-red-950 ring-1 ring-red-400' 
                                  : 'bg-slate-50/60 border-[var(--color-border)] text-[var(--color-text-secondary)]'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5 ${
                                isThisCorrect 
                                  ? 'bg-emerald-600 text-white' 
                                  : isThisUserSelected 
                                  ? 'bg-red-600 text-white' 
                                  : 'bg-slate-200 text-slate-700'
                              }`}>
                                {opt.key}
                              </span>
                              <div className="flex-1">
                                <p>{opt.text}</p>
                                {isThisCorrect && (
                                  <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">
                                    ✓ Correct Answer
                                  </span>
                                )}
                                {isThisUserSelected && !isThisCorrect && (
                                  <span className="text-[10px] font-bold text-red-700 block mt-0.5">
                                    ✕ Your Choice
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Solution Explanation */}
                    {rev.explanation && (
                      <div className="bg-[var(--color-bg-subtle)] p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] space-y-1">
                        <strong className="text-[var(--color-brand-700)] block text-[11px] uppercase tracking-wide">
                          Solution & Explanation:
                        </strong>
                        <p className="whitespace-pre-wrap leading-relaxed">{rev.explanation}</p>
                      </div>
                    )}

                    {rev.tips && (
                      <p className="text-[11px] text-emerald-900 bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-[var(--radius-md)]">
                        💡 <strong>Interview Pro Tip:</strong> {rev.tips}
                      </p>
                    )}

                    {rev.common_mistakes && (
                      <p className="text-[11px] text-amber-900 bg-amber-50/70 border border-amber-200 p-2.5 rounded-[var(--radius-md)]">
                        ⚠️ <strong>Common Pitfall:</strong> {rev.common_mistakes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </StudentLayout>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ACTIVE MCQ & PRACTICE TEST RUNNER SCREEN
    // ─────────────────────────────────────────────────────────────
    const mins = Math.floor(activeSession.timeRemaining / 60);
    const secs = activeSession.timeRemaining % 60;
    const progressPct = Math.round(((activeSession.currentQuestionIndex + 1) / activeSession.questions.length) * 100);

    return (
      <StudentLayout>
        <div className="max-w-4xl mx-auto space-y-6 pb-16">
          
          {/* Top Bar with Timer, Progress & Exit */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-xs)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[var(--color-brand-600)] uppercase tracking-wider bg-[var(--color-brand-50)] px-2 py-0.5 rounded border border-[var(--color-brand-200)]">
                  {activeSession.testConfig.mode.replace('_', ' ')} • {activeSession.testConfig.difficulty}
                </span>
                <span className="text-[10px] font-bold text-[var(--color-text-tertiary)]">
                  {activeSession.testConfig.category?.name || 'General Topic'}
                </span>
              </div>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">{activeSession.testConfig.title}</h2>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              {activeSession.testConfig.mode === 'timed_test' && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-bold ${
                  activeSession.timeRemaining < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (confirm("Are you sure you want to exit? Your progress for this test will be lost.")) {
                    setActiveSession(null);
                  }
                }}
                className="text-xs"
              >
                Exit Test
              </Button>
            </div>
          </div>

          {/* Question Box & MCQ Option Cards */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-6">
            
            {/* Question Header & Flag Toggle */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[var(--color-brand-700)] uppercase">
                    Question {activeSession.currentQuestionIndex + 1} of {activeSession.questions.length}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">({progressPct}% completed)</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] leading-snug">
                  {currQ.title}
                </h3>
              </div>

              <button
                onClick={handleToggleFlag}
                className={`p-2 rounded-full border transition-colors shrink-0 ${
                  isFlagged ? 'bg-amber-50 text-amber-600 border-amber-200 ring-1 ring-amber-300' : 'text-slate-400 border-transparent hover:bg-slate-50'
                }`}
                title={isFlagged ? "Remove Review Flag" : "Flag for Review"}
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>

            {/* ── MCQ MODE: 4 INTERACTIVE OPTION CARDS ────────────────────── */}
            {isMcqMode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--color-text-primary)]">
                    Select the single best answer:
                  </label>
                  {currAns && (
                    <button
                      type="button"
                      onClick={handleClearCurrentAnswer}
                      className="text-[11px] text-[var(--color-text-tertiary)] hover:text-red-600 font-medium underline"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: 'A', text: currQ.option_a || 'Option A' },
                    { key: 'B', text: currQ.option_b || 'Option B' },
                    { key: 'C', text: currQ.option_c || 'Option C' },
                    { key: 'D', text: currQ.option_d || 'Option D' }
                  ].map((opt) => {
                    const isSelected = currAns === opt.key;

                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectMcqOption(opt.key as any)}
                        className={`w-full p-4 rounded-[var(--radius-lg)] border text-left flex items-start gap-3.5 transition-all ${
                          isSelected
                            ? 'bg-indigo-50/80 border-[var(--color-brand-500)] ring-2 ring-[var(--color-brand-200)] shadow-xs'
                            : 'bg-white border-[var(--color-border)] hover:bg-slate-50/80 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'bg-[var(--color-brand-600)] text-white'
                            : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                        }`}>
                          {opt.key}
                        </span>

                        <div className="flex-1">
                          <p className={`text-xs sm:text-sm leading-relaxed ${
                            isSelected ? 'font-semibold text-[var(--color-brand-950)]' : 'text-[var(--color-text-primary)]'
                          }`}>
                            {opt.text}
                          </p>
                        </div>

                        <div className="shrink-0 mt-0.5">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)]' : 'border-slate-300'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ── PRACTICE MODE: DESCRIPTIVE TALKING POINTS & SELF-EVAL ── */
              <div className="space-y-6">
                <div className="bg-[var(--color-bg-subtle)] p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-3">
                  <h4 className="font-bold text-[var(--color-brand-700)] text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Ideal Solution & Key Talking Points
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
                    {currQ.answer}
                  </p>
                </div>

                {currQ.tips && (
                  <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-[var(--radius-lg)] text-xs text-emerald-950">
                    <span className="font-bold block mb-0.5">💡 Interview Tip:</span>
                    <p>{currQ.tips}</p>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-[var(--color-text-primary)] block">
                    Evaluate your readiness for this question:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectAnswerState('mastered')}
                      className={`p-3 rounded-[var(--radius-lg)] border text-left flex items-center gap-3 transition-all ${
                        currAns === 'mastered' 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs' 
                          : 'bg-white border-[var(--color-border)] hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className={`w-5 h-5 ${currAns === 'mastered' ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <div>
                        <span className="text-xs font-bold block">I Know This Well</span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">Confident in technical round</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectAnswerState('review')}
                      className={`p-3 rounded-[var(--radius-lg)] border text-left flex items-center gap-3 transition-all ${
                        currAns === 'review' 
                          ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs' 
                          : 'bg-white border-[var(--color-border)] hover:bg-slate-50'
                      }`}
                    >
                      <AlertTriangle className={`w-5 h-5 ${currAns === 'review' ? 'text-amber-600' : 'text-slate-300'}`} />
                      <div>
                        <span className="text-xs font-bold block">Needs Improvement</span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">Need to revise key details</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectAnswerState('skipped')}
                      className={`p-3 rounded-[var(--radius-lg)] border text-left flex items-center gap-3 transition-all ${
                        currAns === 'skipped' 
                          ? 'bg-slate-100 border-slate-400 text-slate-800 shadow-xs' 
                          : 'bg-white border-[var(--color-border)] hover:bg-slate-50'
                      }`}
                    >
                      <XCircle className={`w-5 h-5 ${currAns === 'skipped' ? 'text-slate-600' : 'text-slate-300'}`} />
                      <div>
                        <span className="text-xs font-bold block">Unfamiliar Concept</span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">Haven't prepared this topic yet</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Navigation */}
            <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={activeSession.currentQuestionIndex === 0}
                onClick={() => setActiveSession(prev => prev ? { ...prev, currentQuestionIndex: prev.currentQuestionIndex - 1 } : null)}
                className="text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>

              <div className="flex items-center gap-2">
                {!isLast ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveSession(prev => prev ? { ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 } : null)}
                    className="text-xs shadow-xs"
                  >
                    Next Question <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSubmitTest()}
                    disabled={activeSession.isSubmitting}
                    className="text-xs shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {activeSession.isSubmitting ? 'Evaluating...' : 'Submit Assessment'} <CheckCircle className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                )}
              </div>
            </div>

          </div>

          {/* Question Jump Grid */}
          <div className="p-4 bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-xs)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-[var(--color-text-tertiary)] tracking-wider">
                Question Navigation Grid
              </span>
              <span className="text-[10px] text-[var(--color-text-tertiary)]">
                {Object.keys(activeSession.selectedAnswers).length} of {activeSession.questions.length} Answered
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeSession.questions.map((_, i) => {
                const ans = activeSession.selectedAnswers[i];
                const isSelected = activeSession.currentQuestionIndex === i;
                const isFlag = activeSession.flaggedQuestionIndices.has(i);
                const isAnswered = !!ans;

                return (
                  <button
                    key={i}
                    onClick={() => setActiveSession(prev => prev ? { ...prev, currentQuestionIndex: i } : null)}
                    className={`h-9 w-9 rounded-[var(--radius-md)] font-bold text-xs border flex items-center justify-center transition-all relative ${
                      isSelected 
                        ? 'ring-2 ring-[var(--color-brand-500)] border-[var(--color-brand-600)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-extrabold' 
                        : isAnswered
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-[var(--color-border)] hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                    {isFlag && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-1 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </StudentLayout>
    );
  }

  // ---------------- MAIN STUDENT INTERVIEW CENTER ---------------- //
  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        
        {/* ── TOP HEADER & USER PLAN INDICATOR ────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[var(--color-brand-200)] flex items-center gap-1">
                <Target className="w-3 h-3" /> Interview Preparation Center
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Practice & Master Interview Questions
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Admin-verified topic tests, curated question archives, model answers, and pro interview tips.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Progress Counter */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-xs shadow-xs font-semibold text-[var(--color-text-secondary)]">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Mastered: <strong className="text-[var(--color-text-primary)]">{completedQuestionIds.size} / {normalQuestions.length}</strong></span>
            </div>

            {/* Plan Badge */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-xs shadow-xs">
              <span className="text-[var(--color-text-tertiary)]">Plan:</span>
              <span className={`font-bold ${userPlanConfig.badgeTextColor}`}>
                {userPlanConfig.name} Member
              </span>
            </div>
          </div>
        </div>

        {/* ERROR STATE FEEDBACK */}
        {fetchError && (
          <div className="p-4 rounded-[var(--radius-lg)] bg-red-50 border border-red-200 text-red-800 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm font-medium">{fetchError}</p>
            </div>
            <Button size="sm" variant="outline" onClick={fetchPrepData} className="text-xs bg-white">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* ── RECOMMENDED TESTS BANNER (IF CONFIGURED BY ADMIN) ───────── */}
        {recommendedTests.length > 0 && (
          <div className="p-6 rounded-[var(--radius-xl)] border-2 border-[var(--color-brand-300)] bg-gradient-to-r from-white via-white to-[var(--color-brand-50)]/50 shadow-[var(--shadow-xs)] space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <Flame className="w-3 h-3 fill-current text-amber-600" /> Recommended For You
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)] font-medium">
                Admin Curated Assessment Sprints
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {recommendedTests.map((test) => {
                const reqPlan = test.minimum_plan || 'free';
                const isUnlocked = isContentAccessible(reqPlan, userAccess);

                return (
                  <div key={test.id} className="p-4 bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                          {test.mode.replace('_', ' ')}
                        </span>
                        <PremiumBadge minimumPlan={reqPlan} />
                      </div>
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)]">{test.title}</h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-1 mt-0.5">
                        {test.description || 'Verified topic test sprint.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                      <span className="text-[10px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {test.question_count} Qs ({Math.round(test.time_per_question * test.question_count / 60)} mins)
                      </span>
                      
                      <Button 
                        variant={isUnlocked ? "primary" : "outline"} 
                        size="sm" 
                        onClick={() => handleStartTest(test)}
                        className="text-[11px] py-1 px-3 shadow-xs"
                      >
                        {isUnlocked ? <><Play className="w-3 h-3 mr-1" /> Start Test</> : <><Lock className="w-3 h-3 mr-1" /> Unlock</>}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── THREE MAIN PREPARATION MODES ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Mode 1: Timed Tests */}
          {prepSettings.timed_test_mode_enabled && (
            <div 
              onClick={() => setActiveView('tests')}
              className={`p-6 rounded-[var(--radius-xl)] border cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                activeView === 'tests' 
                  ? 'bg-white border-[var(--color-brand-500)] ring-2 ring-[var(--color-brand-100)] shadow-xs' 
                  : 'bg-white border-[var(--color-border)] hover:border-slate-300'
              }`}
            >
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-[var(--radius-md)] bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Timed Assessment Tests</h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Real-time countdown assessments matching hiring sprint conditions.
                </p>
              </div>
              <span className="text-xs font-bold text-[var(--color-brand-600)] flex items-center gap-1">
                Explore Tests ({testConfigs.length}) <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          )}

          {/* Mode 2: Question Bank (Practice) */}
          {prepSettings.practice_mode_enabled && (
            <div 
              onClick={() => setActiveView('practice')}
              className={`p-6 rounded-[var(--radius-xl)] border cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                activeView === 'practice' 
                  ? 'bg-white border-[var(--color-brand-500)] ring-2 ring-[var(--color-brand-100)] shadow-xs' 
                  : 'bg-white border-[var(--color-border)] hover:border-slate-300'
              }`}
            >
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-[var(--radius-md)] bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Practice Question Bank</h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Self-paced browsing of curated normal interview questions, model answers, and pro tips.
                </p>
              </div>
              <span className="text-xs font-bold text-[var(--color-brand-600)] flex items-center gap-1">
                Browse Questions ({normalQuestions.length}) <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          )}

          {/* Mode 3: AI Adaptive Mode (Premium Only) */}
          {prepSettings.ai_adaptive_mode_enabled && (() => {
            const isPremium = userAccess.hasAccess('premium');
            const adaptiveTest = testConfigs.find(t => t.mode === 'ai_adaptive') || {
              id: 'adaptive-default',
              title: 'AI Adaptive Assessment',
              description: 'Dynamic difficulty scaling algorithm based on your live responses.',
              category_id: null,
              mode: 'ai_adaptive',
              difficulty: 'Adaptive',
              question_count: 10,
              time_per_question: 60,
              minimum_plan: 'premium',
              is_recommended: false,
              status: 'Active'
            };

            if (isPremium) {
              return (
                <div 
                  onClick={() => handleStartTest(adaptiveTest as TestConfig)}
                  className="p-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-gradient-to-br from-white to-[var(--color-brand-50)]/30 hover:border-[var(--color-brand-300)] cursor-pointer transition-all flex flex-col justify-between space-y-4 shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-[var(--radius-md)] bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <PremiumBadge minimumPlan="premium" />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)]">AI Adaptive Mode</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      Dynamically scales question difficulty based on your verified performance.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                    Launch Adaptive Test <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              );
            } else {
              return (
                <div 
                  onClick={() => {
                    setModalRequiredPlan('premium');
                    setUpgradeFeatureTitle('AI Adaptive Mode');
                    setIsUpgradeModalOpen(true);
                  }}
                  className="p-6 rounded-[var(--radius-xl)] border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50 hover:border-amber-400 cursor-pointer transition-all flex flex-col justify-between space-y-4 relative overflow-hidden shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-[var(--radius-md)] bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        <Lock className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        Premium Only
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                      AI Adaptive Mode
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      Dynamic difficulty scaling algorithm tailored to your live answers. Upgrade to Premium to unlock.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Unlock with Premium <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              );
            }
          })()}

        </div>

        {/* ================================================================ */}
        {/* VIEW 1: TIMED & PRACTICE TESTS GRID */}
        {/* ================================================================ */}
        {activeView === 'tests' && (() => {
          const completedConfigIds = new Set(
            testHistory
              .filter(h => h.status === 'completed' || typeof h.score_percentage === 'number')
              .map(h => h.test_config_id)
              .filter(Boolean)
          );

          const availableTests = testConfigs.filter(t => !completedConfigIds.has(t.id));
          const completedTests = testHistory.filter(h => h.status === 'completed' || typeof h.score_percentage === 'number');

          return (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">Timed Assessment Tests</h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">Countdown sprint assessments and test history.</p>
                </div>

                {/* Sub-tabs: Available vs Completed */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-[var(--radius-lg)] border border-slate-200/80 text-xs self-start sm:self-auto font-semibold">
                  <button
                    type="button"
                    onClick={() => setTestsSubTab('available')}
                    className={`px-3.5 py-1.5 rounded-[var(--radius-md)] transition-all cursor-pointer flex items-center gap-1.5 ${
                      testsSubTab === 'available'
                        ? 'bg-white text-[var(--color-brand-600)] shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Available Tests</span>
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/80 text-slate-700">
                      {availableTests.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestsSubTab('completed')}
                    className={`px-3.5 py-1.5 rounded-[var(--radius-md)] transition-all cursor-pointer flex items-center gap-1.5 ${
                      testsSubTab === 'completed'
                        ? 'bg-white text-[var(--color-brand-600)] shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Completed</span>
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                      {completedTests.length}
                    </span>
                  </button>
                </div>
              </div>

              {testsSubTab === 'available' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableTests.map((test) => {
                    const reqPlan = test.minimum_plan || 'free';
                    const isUnlocked = isContentAccessible(reqPlan, userAccess);
                    const planMeta = PLANS[normalizePlanId(reqPlan)];

                    return (
                      <div 
                        key={test.id} 
                        className="p-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)] hover:border-[var(--color-brand-300)] transition-all flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)]">
                                {test.mode.replace('_', ' ')}
                              </span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                test.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                test.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {test.difficulty}
                              </span>
                            </div>
                            <PremiumBadge minimumPlan={reqPlan} />
                          </div>

                          <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">{test.title}</h3>
                          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                            {test.description || 'Topic test sprint configured by platform administrator.'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                          <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {test.question_count} Qs ({Math.round(test.time_per_question * test.question_count / 60)} mins)
                          </span>

                          <Button
                            variant={isUnlocked ? "primary" : "outline"}
                            size="sm"
                            onClick={() => handleStartTest(test)}
                            className="text-xs shadow-xs"
                          >
                            {isUnlocked ? (
                              <><Play className="w-3 h-3 mr-1" /> Start Test</>
                            ) : (
                              <><Lock className="w-3 h-3 mr-1 text-[var(--color-brand-600)]" /> {planMeta.name} Required</>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {availableTests.length === 0 && (
                    <div className="col-span-full py-12 text-center text-xs text-[var(--color-text-tertiary)] bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] space-y-3">
                      <div className="flex justify-center">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                      </div>
                      <p className="font-semibold text-sm text-[var(--color-text-primary)]">
                        {testConfigs.length > 0 ? "You have completed all available tests!" : "No active assessment tests configured."}
                      </p>
                      {completedTests.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setTestsSubTab('completed')}>
                          View Completed Tests ({completedTests.length})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* COMPLETED TESTS TAB */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedTests.map((attempt) => {
                    const isPassed = (attempt.score_percentage || 0) >= 70;
                    const originalConfig = testConfigs.find(t => t.id === attempt.test_config_id);

                    return (
                      <div
                        key={attempt.id}
                        className="p-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)] hover:border-[var(--color-brand-300)] transition-all flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {attempt.mode?.replace('_', ' ') || 'Timed Test'}
                              </span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                attempt.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                attempt.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {attempt.difficulty || 'Medium'}
                              </span>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isPassed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {attempt.score_percentage ?? 0}% Score
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">
                            {attempt.title || 'Assessment Test'}
                          </h3>

                          <div className="text-xs text-[var(--color-text-secondary)] space-y-1 mt-2">
                            <div className="flex items-center justify-between">
                              <span>Status:</span>
                              <span className={`font-bold ${isPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {isPassed ? 'Passed' : 'Completed (Needs Practice)'}
                              </span>
                            </div>
                            {attempt.correct_answers !== undefined && attempt.total_questions && (
                              <div className="flex items-center justify-between">
                                <span>Accuracy:</span>
                                <span className="font-semibold text-[var(--color-text-primary)]">
                                  {attempt.correct_answers} / {attempt.total_questions} Correct
                                </span>
                              </div>
                            )}
                            {attempt.created_at && (
                              <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] pt-1">
                                <span>Completed:</span>
                                <span>{new Date(attempt.created_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Completed
                          </span>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (originalConfig) {
                                handleStartTest(originalConfig);
                              } else {
                                const fallbackTest: TestConfig = {
                                  id: attempt.test_config_id || attempt.id,
                                  title: attempt.title,
                                  description: 'Retake assessment test.',
                                  category_id: attempt.category_id || null,
                                  mode: attempt.mode || 'timed_test',
                                  difficulty: attempt.difficulty || 'Medium',
                                  question_count: attempt.total_questions || 10,
                                  time_per_question: 60,
                                  minimum_plan: 'free',
                                  is_recommended: false,
                                  status: 'Active'
                                };
                                handleStartTest(fallbackTest);
                              }
                            }}
                            className="text-xs shadow-xs gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Retake Test
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {completedTests.length === 0 && (
                    <div className="col-span-full py-12 text-center text-xs text-[var(--color-text-tertiary)] bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] space-y-3">
                      <p className="font-semibold text-sm text-[var(--color-text-primary)]">
                        No completed tests yet.
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Complete any timed assessment test to track your scores and progress here.
                      </p>
                      <Button variant="primary" size="sm" onClick={() => setTestsSubTab('available')}>
                        Explore Available Tests
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ================================================================ */}
        {/* VIEW 2: PRACTICE QUESTION BROWSER */}
        {/* ================================================================ */}
        {activeView === 'practice' && (
          <div className="space-y-6">
            
            {/* Category Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button 
                onClick={() => setCategoryFilter('')} 
                className={`p-3.5 rounded-[var(--radius-xl)] border text-left transition-all ${
                  categoryFilter === '' 
                    ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-500)] shadow-xs' 
                    : 'bg-white border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">All Questions</span>
                  <BookOpen className={`w-4 h-4 ${categoryFilter === '' ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-tertiary)]'}`} />
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">{normalQuestions.length} Questions</p>
              </button>

              {categories.map((cat) => {
                const count = normalQuestions.filter(q => q.category_id === cat.id).length;
                const isSelected = categoryFilter === cat.id;

                return (
                  <button 
                    key={cat.id} 
                    onClick={() => setCategoryFilter(cat.id)} 
                    className={`p-3.5 rounded-[var(--radius-xl)] border text-left transition-all ${
                      isSelected 
                        ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-500)] shadow-xs' 
                        : 'bg-white border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">{cat.name}</span>
                      <Target className={`w-4 h-4 ${isSelected ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-tertiary)]'}`} />
                    </div>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">{count} Questions</p>
                  </button>
                );
              })}
            </div>

            {/* Search & Filters */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search normal practice questions by title or tags..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <select 
                  value={difficultyFilter} 
                  onChange={e => setDifficultyFilter(e.target.value)}
                  className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium bg-white text-[var(--color-text-primary)] shadow-xs"
                >
                  <option value="">All Difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>

                <select 
                  value={planFilter} 
                  onChange={e => setPlanFilter(e.target.value)}
                  className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium bg-white text-[var(--color-text-primary)] shadow-xs"
                >
                  <option value="">All Plan Tiers</option>
                  <option value="free">Free Questions</option>
                  <option value="starter">Starter Questions</option>
                  <option value="pro">Pro Questions</option>
                  <option value="premium">Premium Questions</option>
                </select>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setSearchQuery(''); setCategoryFilter(''); setDifficultyFilter(''); setPlanFilter(''); }}
                  className="col-span-2 sm:col-span-2 text-xs justify-center"
                >
                  <Filter className="w-3.5 h-3.5 mr-1" /> Reset Filters
                </Button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => {
                const isCompleted = completedQuestionIds.has(q.id);
                const reqPlan = q.minimum_plan || q.access_type || 'free';
                const isUnlocked = isContentAccessible(reqPlan, userAccess);
                const planMeta = PLANS[normalizePlanId(reqPlan)];

                return (
                  <div 
                    key={q.id}
                    onClick={() => handleOpenPracticeQuestion(idx)}
                    className={`rounded-[var(--radius-xl)] border p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                      !isUnlocked 
                        ? 'bg-slate-50/70 border-[var(--color-border)] hover:border-[var(--color-brand-300)]' 
                        : 'bg-white border-[var(--color-border)] hover:border-[var(--color-brand-400)] hover:shadow-[var(--shadow-xs)]'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleComplete(q.id); }}
                        className="mt-0.5 text-[var(--color-text-tertiary)] hover:text-emerald-600 transition-colors shrink-0"
                        title={isCompleted ? "Mark Incomplete" : "Mark Mastered"}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className={`text-sm font-bold group-hover:text-[var(--color-brand-600)] transition-colors leading-snug ${isCompleted ? 'text-[var(--color-text-secondary)] line-through' : 'text-[var(--color-text-primary)]'}`}>
                            {q.title}
                          </h3>
                          <PremiumBadge minimumPlan={reqPlan} />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-secondary)]">
                          <span className={`px-2 py-0.2 rounded-full font-bold text-[10px] border ${
                            q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {q.difficulty}
                          </span>

                          <span className="flex items-center gap-1 text-[var(--color-text-tertiary)]">
                            <Clock className="w-3 h-3" /> {q.estimated_time || '5 mins'}
                          </span>

                          {q.technology_tags && q.technology_tags.slice(0, 2).map(tech => (
                            <span key={tech} className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] px-1.5 py-0.2 rounded text-[10px] font-semibold border border-[var(--color-brand-200)]">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-center">
                      {!isUnlocked ? (
                        <Button variant="outline" size="sm" className="text-xs h-7.5 px-3 text-[var(--color-brand-600)] border-[var(--color-brand-200)] hover:bg-[var(--color-brand-50)]">
                          <Lock className="w-3 h-3 mr-1 text-[var(--color-brand-600)]" /> {planMeta.name} Required
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="text-xs h-7.5 px-3">
                          View Answer
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {normalQuestions.length === 0 ? (
                <EmptyState 
                  title="No practice questions are currently available"
                  description="Check back soon or explore our Timed Assessment Tests."
                  action={
                    <Button variant="primary" size="sm" onClick={() => setActiveView('tests')}>
                      <Play className="w-3.5 h-3.5 mr-1" /> Explore Assessment Tests
                    </Button>
                  }
                />
              ) : filteredQuestions.length === 0 ? (
                <EmptyState 
                  title="No matching practice questions found"
                  description="Try selecting a different category or clearing your search filters."
                  action={<Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setCategoryFilter(''); setDifficultyFilter(''); setPlanFilter(''); }}>Reset Filters</Button>}
                />
              ) : null}
            </div>

            {/* Practice Pagination Bar */}
            {totalNormalCount > practiceItemsPerPage && (
              <div className="mt-6 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] flex items-center justify-between bg-white text-xs">
                <span className="font-medium text-[var(--color-text-secondary)]">
                  Showing {(practicePage - 1) * practiceItemsPerPage + 1} to {Math.min(practicePage * practiceItemsPerPage, totalNormalCount)} of {totalNormalCount} practice questions
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="p-1.5 h-8 px-3 text-xs flex items-center gap-1"
                    disabled={practicePage === 1}
                    onClick={() => setPracticePage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Button>
                  <span className="px-2 text-xs font-semibold text-[var(--color-text-primary)]">
                    Page {practicePage} of {Math.ceil(totalNormalCount / practiceItemsPerPage) || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="p-1.5 h-8 px-3 text-xs flex items-center gap-1"
                    disabled={practicePage >= Math.ceil(totalNormalCount / practiceItemsPerPage)}
                    onClick={() => setPracticePage(p => p + 1)}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* ── PRACTICE QUESTION MODAL ──────────────────────────────────── */}
      <Modal 
        isOpen={isQuestionModalOpen} 
        onClose={() => setIsQuestionModalOpen(false)} 
        title="Practice Interview Question & Solution" 
        className="max-w-2xl"
      >
        {selectedQuestion && (
          <div className="space-y-4 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)] gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.2 rounded-full font-bold text-[10px] border ${
                    selectedQuestion.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    selectedQuestion.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {selectedQuestion.difficulty}
                  </span>
                  <PremiumBadge minimumPlan={selectedQuestion.minimum_plan || selectedQuestion.access_type} />
                </div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)] leading-snug">{selectedQuestion.title}</h2>
              </div>

              <button 
                onClick={() => handleToggleComplete(selectedQuestion.id)}
                className="p-2 rounded-full hover:bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)] hover:text-emerald-600 transition-colors shrink-0"
                title={completedQuestionIds.has(selectedQuestion.id) ? "Mark Incomplete" : "Mark Mastered"}
              >
                {completedQuestionIds.has(selectedQuestion.id) ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 fill-emerald-50" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Guard against unexpected MCQ in Practice modal */}
            {(selectedQuestion.question_type === 'mcq' || selectedQuestion.option_a) ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] text-amber-900 space-y-2">
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Assessment Question
                </h4>
                <p className="text-xs">
                  This is a multiple-choice assessment question. Please open and practice it through our Assessment Tests.
                </p>
                <Button variant="primary" size="sm" onClick={() => { setIsQuestionModalOpen(false); setActiveView('tests'); }} className="mt-2 text-xs">
                  <Play className="w-3.5 h-3.5 mr-1" /> Open Assessment Tests
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Answer Structure */}
                <div className="bg-[var(--color-bg-subtle)] p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                  <h4 className="font-bold text-[var(--color-brand-700)] mb-1.5 uppercase text-[11px] flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Ideal Model Answer Structure
                  </h4>
                  <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{selectedQuestion.answer}</p>
                </div>

                {/* Key Talking Points / Pro Tips */}
                {selectedQuestion.tips && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-[var(--radius-lg)]">
                    <h4 className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5 text-xs">
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-700" /> Key Talking Points & Interview Tips
                    </h4>
                    <p className="text-emerald-900 leading-relaxed">{selectedQuestion.tips}</p>
                  </div>
                )}

                {/* Common Pitfalls */}
                {selectedQuestion.common_mistakes && (
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-[var(--radius-lg)]">
                    <h4 className="font-bold text-amber-950 mb-1 flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Common Pitfalls to Avoid
                    </h4>
                    <p className="text-amber-900 leading-relaxed">{selectedQuestion.common_mistakes}</p>
                  </div>
                )}

                {/* Self-Evaluation Confidence Feedback */}
                <div className="p-3.5 bg-slate-50 border border-[var(--color-border)] rounded-[var(--radius-lg)] space-y-2">
                  <span className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-wider block">
                    Self-Evaluation & Confidence
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfidenceRatings(prev => ({ ...prev, [selectedQuestion.id]: 'well' }))}
                      className={`py-1.5 px-2 rounded-[var(--radius-md)] border text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        confidenceRatings[selectedQuestion.id] === 'well'
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-900 ring-1 ring-emerald-400 shadow-xs'
                          : 'bg-white border-[var(--color-border)] text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle className="w-3 h-3 text-emerald-600" /> I Know This Well
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfidenceRatings(prev => ({ ...prev, [selectedQuestion.id]: 'needs_work' }))}
                      className={`py-1.5 px-2 rounded-[var(--radius-md)] border text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        confidenceRatings[selectedQuestion.id] === 'needs_work'
                          ? 'bg-amber-100 border-amber-400 text-amber-900 ring-1 ring-amber-400 shadow-xs'
                          : 'bg-white border-[var(--color-border)] text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <HelpCircle className="w-3 h-3 text-amber-600" /> Needs Improvement
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfidenceRatings(prev => ({ ...prev, [selectedQuestion.id]: 'unfamiliar' }))}
                      className={`py-1.5 px-2 rounded-[var(--radius-md)] border text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        confidenceRatings[selectedQuestion.id] === 'unfamiliar'
                          ? 'bg-rose-100 border-rose-400 text-rose-900 ring-1 ring-rose-400 shadow-xs'
                          : 'bg-white border-[var(--color-border)] text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-600" /> Unfamiliar Concept
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tips & Pitfalls */}
            {selectedQuestion.tips && (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-[var(--radius-lg)]">
                <h4 className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5 text-xs">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-700" /> Interview Pro Tips
                </h4>
                <p className="text-emerald-900 leading-relaxed">{selectedQuestion.tips}</p>
              </div>
            )}

            {selectedQuestion.common_mistakes && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-[var(--radius-lg)]">
                <h4 className="font-bold text-amber-950 mb-1 flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Common Pitfalls to Avoid
                </h4>
                <p className="text-amber-900 leading-relaxed">{selectedQuestion.common_mistakes}</p>
              </div>
            )}

            {/* Modal Navigation Controls */}
            <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedQuestionIndex(i => (i !== null && i > 0 ? i - 1 : i))}
                  disabled={selectedQuestionIndex === 0}
                  className="text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedQuestionIndex(i => (i !== null && i < filteredQuestions.length - 1 ? i + 1 : i))}
                  disabled={selectedQuestionIndex === filteredQuestions.length - 1}
                  className="text-xs"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>

              <Button variant="outline" size="sm" onClick={() => setIsQuestionModalOpen(false)}>
                Close
              </Button>
            </div>

          </div>
        )}
      </Modal>

      {/* ── UPGRADE PROMPT MODAL ─────────────────────────────────────── */}
      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        requiredPlan={modalRequiredPlan}
        featureTitle={upgradeFeatureTitle}
      />

      {/* ── INFORMATIONAL / NOTICE MODAL ─────────────────────────────────── */}
      {noticeModal && (
        <Modal 
          isOpen={true} 
          onClose={() => setNoticeModal(null)} 
          title={noticeModal.title}
          className="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {noticeModal.message}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
              {noticeModal.secondaryActionText && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={noticeModal.secondaryActionFn || (() => setNoticeModal(null))}
                  className="w-full sm:w-auto text-xs"
                >
                  {noticeModal.secondaryActionText}
                </Button>
              )}
              <Button 
                variant="primary" 
                size="sm" 
                onClick={noticeModal.primaryActionFn || (() => setNoticeModal(null))}
                className="w-full sm:w-auto text-xs font-bold"
              >
                {noticeModal.primaryActionText || 'Understood'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </StudentLayout>
  );
}
