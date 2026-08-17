import { SupabaseClient } from '@supabase/supabase-js';
import { UserAccess } from '@/lib/subscription';
import { PLANS } from '@/config/plans';
import { MOCK_INTERVIEW_TRACKS } from '@/config/mockInterview';
import { evaluateMockInterview } from '@/lib/mockInterviewScoring';

export type InterviewType = 'hr' | 'technical' | 'managerial';
export type InterviewDifficulty = 'easy' | 'medium' | 'hard';
export type InterviewSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface MockInterviewSession {
  id: string;
  student_id: string;
  interview_type: InterviewType;
  interview_mode?: 'standard' | 'ai';
  target_role?: string | null;
  experience_level?: string | null;
  difficulty?: string | null;
  status: InterviewSessionStatus;
  subscription_plan: string;
  total_questions: number;
  answered_questions: number;
  started_at: string;
  completed_at: string | null;
  last_activity_at: string;
  overall_score: number | null;
  communication_score: number | null;
  technical_score: number | null;
  confidence_score: number | null;
  strengths?: string[];
  improvements?: string[];
  feedback?: string | null;
  ai_overall_feedback?: string | null;
  ai_strengths?: string[];
  ai_improvements?: string[];
  ai_recommendations?: any[];
  created_at: string;
  updated_at: string;
}

export interface SessionQuestion {
  id: string;
  session_id: string;
  question_id: string | null;
  question_text: string;
  question_category: string | null;
  question_order: number;
  helper_text: string | null;
}

export interface SessionAnswer {
  id?: string;
  session_id: string;
  session_question_id: string;
  student_id: string;
  answer_text: string;
  answer_length: number;
  question_score?: number | null;
  feedback?: string | null;
}

export interface MockCreditStatus {
  planName: string;
  monthlyLimit: number;
  usedThisMonth: number;
  remainingCredits: number;
  completedCount: number;
  averageScore: number;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  isEligible: boolean;
}

export const INTERVIEW_TYPE_DETAILS = {
  hr: {
    title: 'HR Interview',
    description: 'Test your communication, confidence, and behavioral responses.',
    duration: '20–25 mins',
    questionsCount: '10 Questions',
    difficulty: 'Medium',
    badgeColor: 'bg-emerald-50',
    badgeTextColor: 'text-emerald-700',
    badgeBorder: 'border-emerald-200'
  },
  technical: {
    title: 'Technical Interview',
    description: 'Test your programming, technical concepts, and problem-solving skills.',
    duration: '25–30 mins',
    questionsCount: '10 Questions',
    difficulty: 'Medium',
    badgeColor: 'bg-blue-50',
    badgeTextColor: 'text-blue-700',
    badgeBorder: 'border-blue-200'
  },
  managerial: {
    title: 'Managerial Interview',
    description: 'Test leadership, ownership, decision-making, and workplace scenarios.',
    duration: '20–25 mins',
    questionsCount: '10 Questions',
    difficulty: 'Hard',
    badgeColor: 'bg-purple-50',
    badgeTextColor: 'text-purple-700',
    badgeBorder: 'border-purple-200'
  }
};

/**
 * Calculates current period mock interview credit availability and analytics
 */
export function calculateMockCreditStatus(
  userAccess: UserAccess,
  usedCount: number = 0,
  completedCount: number = 0,
  averageScore: number = 0
): MockCreditStatus {
  const planConfig = PLANS[userAccess.effectivePlan];
  const monthlyLimit = userAccess.isSubscriptionActive ? planConfig.mockInterviewsPerMonth : 0;
  const remainingCredits = Math.max(0, monthlyLimit - usedCount);

  return {
    planName: planConfig.name,
    monthlyLimit,
    usedThisMonth: usedCount,
    remainingCredits,
    completedCount,
    averageScore,
    subscriptionStartDate: userAccess.startDate,
    subscriptionEndDate: userAccess.expiresAt,
    isEligible: remainingCredits > 0
  };
}

/**
 * Count consumed session credits for current subscription period
 */
export async function getConsumedSessionsCount(
  supabase: SupabaseClient,
  studentId: string,
  periodStartDate: string | null
): Promise<{ usedCount: number; completedCount: number; averageScore: number }> {
  try {
    let query = supabase
      .from('mock_interview_sessions')
      .select('id, status, overall_score, started_at')
      .eq('student_id', studentId);

    if (periodStartDate) {
      query = query.gte('started_at', periodStartDate);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching mock session stats:', error);
      return { usedCount: 0, completedCount: 0, averageScore: 0 };
    }

    const sessions = data || [];
    const usedCount = sessions.length; // Each started session consumes 1 credit
    const completed = sessions.filter(s => s.status === 'completed');
    const completedCount = completed.length;
    
    const scores = completed
      .map(s => Number(s.overall_score) || 0)
      .filter(score => score > 0);

    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    return { usedCount, completedCount, averageScore };
  } catch (err) {
    console.error('Failed to get consumed session count:', err);
    return { usedCount: 0, completedCount: 0, averageScore: 0 };
  }
}

/**
 * Fetch all sessions for student
 */
export async function getStudentSessions(
  supabase: SupabaseClient, 
  studentId: string
): Promise<MockInterviewSession[]> {
  try {
    const { data, error } = await supabase
      .from('mock_interview_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return (data || []) as MockInterviewSession[];
  } catch (err) {
    console.error('Error fetching student sessions:', err);
    return [];
  }
}

/**
 * Start a new mock interview session and snapshot questions
 */
export async function startMockInterviewSession(
  supabase: SupabaseClient,
  interviewType: InterviewType,
  userAccess: UserAccess,
  studentId: string
): Promise<{ sessionId: string | null; error: string | null }> {
  try {
    // 1. Enforce credit limit
    const { usedCount } = await getConsumedSessionsCount(supabase, studentId, userAccess.startDate);
    const planConfig = PLANS[userAccess.effectivePlan];
    const limit = userAccess.isSubscriptionActive ? planConfig.mockInterviewsPerMonth : 0;

    if (usedCount >= limit) {
      return { 
        sessionId: null, 
        error: 'No mock interview credits remaining for your current billing cycle. Please upgrade your plan.' 
      };
    }

    const trackConfig = MOCK_INTERVIEW_TRACKS[interviewType];
    const totalQuestions = trackConfig.questionCount || 10;

    // 2. Insert Session Record
    const { data: sessionData, error: sessionError } = await supabase
      .from('mock_interview_sessions')
      .insert({
        student_id: studentId,
        interview_type: interviewType,
        status: 'in_progress',
        subscription_plan: userAccess.effectivePlan,
        total_questions: totalQuestions,
        answered_questions: 0
      })
      .select()
      .single();

    if (sessionError) throw sessionError;
    const sessionId = sessionData.id;

    // 3. Populate Snapshot Questions
    const questionsPayload = trackConfig.sampleQuestions.slice(0, totalQuestions).map((q, idx) => ({
      session_id: sessionId,
      question_text: q.questionText,
      question_category: interviewType,
      question_order: idx + 1,
      helper_text: q.helperText
    }));

    const { data: createdQuestions, error: questionsError } = await supabase
      .from('mock_interview_session_questions')
      .insert(questionsPayload)
      .select();

    if (questionsError) throw questionsError;

    // 4. Initialize empty answer rows
    if (createdQuestions && createdQuestions.length > 0) {
      const answersPayload = createdQuestions.map(q => ({
        session_id: sessionId,
        session_question_id: q.id,
        student_id: studentId,
        answer_text: '',
        answer_length: 0
      }));

      await supabase
        .from('mock_interview_answers')
        .insert(answersPayload);
    }

    return { sessionId, error: null };
  } catch (err: any) {
    console.error('Failed to initialize mock interview session:', err);
    return { sessionId: null, error: err.message || 'Failed to start interview session.' };
  }
}

/**
 * Fetch full session details with questions and saved answers
 */
export async function getSessionDetails(
  supabase: SupabaseClient,
  sessionId: string
): Promise<{
  session: MockInterviewSession | null;
  questions: SessionQuestion[];
  answersMap: Record<string, string>;
  error: string | null;
}> {
  try {
    // 1. Fetch Session
    const { data: sessionData, error: sessionError } = await supabase
      .from('mock_interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    // 2. Fetch Questions
    const { data: questionsData, error: questionsError } = await supabase
      .from('mock_interview_session_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('question_order', { ascending: true });

    if (questionsError) throw questionsError;

    // 3. Fetch Answers
    const { data: answersData, error: answersError } = await supabase
      .from('mock_interview_answers')
      .select('*')
      .eq('session_id', sessionId);

    if (answersError) throw answersError;

    const answersMap: Record<string, string> = {};
    (answersData || []).forEach(a => {
      answersMap[a.session_question_id] = a.answer_text || '';
    });

    return {
      session: sessionData as MockInterviewSession,
      questions: (questionsData || []) as SessionQuestion[],
      answersMap,
      error: null
    };
  } catch (err: any) {
    console.error('Error fetching session details:', err);
    return { session: null, questions: [], answersMap: {}, error: err.message || 'Session not found.' };
  }
}

/**
 * Autosave a question answer
 */
export async function saveSessionAnswer(
  supabase: SupabaseClient,
  sessionId: string,
  sessionQuestionId: string,
  studentId: string,
  answerText: string
): Promise<boolean> {
  try {
    const text = answerText || '';
    const length = text.trim().length;

    const { error } = await supabase
      .from('mock_interview_answers')
      .upsert({
        session_id: sessionId,
        session_question_id: sessionQuestionId,
        student_id: studentId,
        answer_text: text,
        answer_length: length,
        updated_at: new Date().toISOString()
      }, { onConflict: 'session_question_id' });

    if (error) throw error;

    // Update last activity timestamp on session
    await supabase
      .from('mock_interview_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', sessionId);

    return true;
  } catch (err) {
    console.error('Autosave failed:', err);
    return false;
  }
}

/**
 * Submit mock interview session and compute score
 */
export async function submitMockInterview(
  supabase: SupabaseClient,
  sessionId: string,
  studentId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { session, questions, answersMap, error: fetchErr } = await getSessionDetails(supabase, sessionId);
    if (fetchErr || !session) throw new Error(fetchErr || 'Session not found');

    if (session.status === 'completed') {
      return { success: true, error: null };
    }

    // Build answer evaluation payload
    const evaluationInput = questions.map(q => ({
      questionText: q.question_text,
      answerText: answersMap[q.id] || ''
    }));

    // Run isolated rule-based scoring engine
    const evaluation = evaluateMockInterview(session.interview_type, evaluationInput);
    const answeredCount = questions.filter(q => (answersMap[q.id] || '').trim().length > 0).length;

    // Update session record to completed with final scores and feedback
    const { error: updateError } = await supabase
      .from('mock_interview_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        answered_questions: answeredCount,
        overall_score: evaluation.overallScore,
        communication_score: evaluation.communicationScore,
        technical_score: evaluation.technicalScore,
        confidence_score: evaluation.confidenceScore,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        feedback: evaluation.feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('student_id', studentId);

    if (updateError) throw updateError;

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Failed to submit mock interview:', err);
    return { success: false, error: err.message || 'Failed to submit interview.' };
  }
}
