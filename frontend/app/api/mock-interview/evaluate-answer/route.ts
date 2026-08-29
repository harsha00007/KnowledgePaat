import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { evaluateInterviewAnswer } from '@/lib/ai/interviewEvaluation';
import { EvaluateAnswerInput } from '@/lib/ai/interviewTypes';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Enforce Rate Limit for AI Answer Evaluation
    const rl = await checkRateLimit(`ai_mock_eval:${user.id}`, RATE_LIMIT_POLICIES.AI_MOCK_EVALUATE);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json();
    const { 
      sessionId, 
      question, 
      studentAnswer, 
      interviewType = 'technical', 
      category, 
      difficulty = 'Medium', 
      expectedConcepts = [], 
      role = 'Software Engineer' 
    } = body as (EvaluateAnswerInput & { sessionId: string });

    if (!sessionId || !question) {
      return NextResponse.json({ error: 'Missing required parameters (sessionId, question).' }, { status: 400 });
    }

    // 1. Verify session exists and belongs to authenticated student
    const { data: sessionData, error: sessionError } = await supabase
      .from('mock_interview_sessions')
      .select('id, student_id, status')
      .eq('id', sessionId)
      .eq('student_id', user.id)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session not found or access denied.' }, { status: 404 });
    }

    // 2. Perform AI Answer Evaluation with slow request profiling
    const evaluation = await logger.measureDuration(
      'AI Answer Evaluation',
      async () => {
        return evaluateInterviewAnswer({
          question,
          studentAnswer: studentAnswer || '',
          interviewType,
          category,
          difficulty,
          expectedConcepts,
          role
        });
      },
      3000,
      { route: '/api/mock-interview/evaluate-answer', userId: user.id }
    );

    // 3. Persist evaluation in mock_interview_answers if matching session exists
    try {
      await supabase
        .from('mock_interview_answers')
        .insert({
          session_id: sessionId,
          student_id: user.id,
          answer_text: studentAnswer || '',
          answer_length: (studentAnswer || '').length,
          evaluation_status: 'completed',
          performance_level: evaluation.performance_level,
          overall_score: evaluation.overall_score,
          relevance_score: evaluation.scores.relevance,
          technical_accuracy_score: evaluation.scores.technical_accuracy,
          communication_score: evaluation.scores.communication,
          clarity_score: evaluation.scores.clarity,
          answer_structure_score: evaluation.scores.answer_structure,
          confidence_score: evaluation.scores.confidence,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          missing_concepts: evaluation.missing_concepts,
          better_answer: evaluation.better_answer,
          interview_tip: evaluation.interview_tip,
          ai_summary: evaluation.summary
        });
    } catch (insertErr) {
      logger.warn('Failed to persist mock answer record:', { error: insertErr, sessionId, userId: user.id });
    }

    return NextResponse.json({
      success: true,
      evaluation
    });

  } catch (err: any) {
    logger.error('Error evaluating interview answer', err, { route: '/api/mock-interview/evaluate-answer' });
    return NextResponse.json({ error: err.message || 'Failed to evaluate answer.' }, { status: 500 });
  }
}
