import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { calculateUserAccess } from '@/lib/subscription';
import { PLANS } from '@/config/plans';
import { getConsumedSessionsCount, InterviewType } from '@/lib/mockInterview';
import { startAIInterview } from '@/lib/ai/mockInterviewAI';
import { ExperienceLevel, InterviewDifficulty } from '@/lib/ai/mockInterviewTypes';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      interviewType = 'technical', 
      targetRole = 'Software Engineer', 
      experienceLevel = 'Fresher', 
      difficulty = 'Medium', 
      totalQuestions = 10 
    } = body as {
      interviewType: InterviewType;
      targetRole: string;
      experienceLevel: ExperienceLevel;
      difficulty: InterviewDifficulty;
      totalQuestions: number;
    };

    // 1. Verify subscription & credits
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const access = calculateUserAccess(subData);
    const planConfig = PLANS[access.effectivePlan];
    const limit = access.isSubscriptionActive ? planConfig.mockInterviewsPerMonth : 0;

    const { usedCount } = await getConsumedSessionsCount(supabase, user.id, access.startDate);

    if (usedCount >= limit) {
      return NextResponse.json({ 
        error: 'No mock interview credits remaining for your current billing cycle. Please upgrade your subscription.' 
      }, { status: 403 });
    }

    // 2. Generate opening question & intro with adaptive starting topic
    const aiResult = await startAIInterview({
      interviewType,
      targetRole,
      experienceLevel,
      difficulty,
      totalQuestions: Number(totalQuestions) || 10
    });

    const diffClean = difficulty.toLowerCase();

    // 3. Create session record with adaptive metadata
    const { data: sessionData, error: sessionError } = await supabase
      .from('mock_interview_sessions')
      .insert({
        student_id: user.id,
        interview_type: interviewType,
        interview_mode: 'ai',
        target_role: targetRole,
        experience_level: experienceLevel,
        difficulty: diffClean,
        current_difficulty: diffClean,
        highest_difficulty_reached: diffClean,
        interview_momentum: 'stable',
        topic_performance: [],
        question_strategy: 'Initial topic assessment',
        status: 'in_progress',
        subscription_plan: access.effectivePlan,
        total_questions: Number(totalQuestions) || 10,
        answered_questions: 0
      })
      .select()
      .single();

    if (sessionError || !sessionData) {
      throw new Error(sessionError?.message || 'Failed to create session record.');
    }

    const sessionId = sessionData.id;

    // 4. Record initial AI messages in mock_interview_ai_messages
    const messagesPayload = [
      {
        session_id: sessionId,
        role: 'interviewer',
        message: aiResult.introduction,
        message_type: 'introduction',
        metadata: { targetRole, experienceLevel, difficulty: diffClean }
      },
      {
        session_id: sessionId,
        role: 'interviewer',
        message: aiResult.firstQuestion,
        message_type: 'question',
        metadata: { 
          questionNumber: 1, 
          helperTip: aiResult.helperTip,
          topic: aiResult.initialTopic,
          difficulty: diffClean
        }
      }
    ];

    await supabase
      .from('mock_interview_ai_messages')
      .insert(messagesPayload);

    return NextResponse.json({
      success: true,
      sessionId,
      introduction: aiResult.introduction,
      firstQuestion: aiResult.firstQuestion,
      helperTip: aiResult.helperTip,
      initialTopic: aiResult.initialTopic,
      difficulty: diffClean,
      questionNumber: 1,
      totalQuestions: Number(totalQuestions) || 10
    });

  } catch (err: any) {
    console.error('Error starting adaptive AI interview:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
