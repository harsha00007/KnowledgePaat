import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { evaluateAndGenerateAdaptiveNextStep } from '@/lib/ai/mockInterviewAI';
import { 
  InterviewContext, 
  computeInterviewMomentum, 
  AdaptiveDifficulty, 
  TopicPerformance 
} from '@/lib/adaptiveInterview';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      sessionId, 
      answerText, 
      lastQuestionText, 
      currentQuestionNumber,
      lastTopic = 'Core Technical Concepts'
    } = body as {
      sessionId: string;
      answerText: string;
      lastQuestionText: string;
      currentQuestionNumber: number;
      lastTopic?: string;
    };

    if (!sessionId || !answerText?.trim()) {
      return NextResponse.json({ error: 'Missing sessionId or answerText.' }, { status: 400 });
    }

    // 1. Verify session exists, belongs to user, and is in progress
    const { data: sessionData, error: sessionError } = await supabase
      .from('mock_interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('student_id', user.id)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session not found or unauthorized.' }, { status: 404 });
    }

    if (sessionData.status === 'completed') {
      return NextResponse.json({ error: 'This interview session has already been completed.' }, { status: 400 });
    }

    // 2. Save student's answer to mock_interview_ai_messages
    await supabase
      .from('mock_interview_ai_messages')
      .insert({
        session_id: sessionId,
        role: 'student',
        message: answerText.trim(),
        message_type: 'answer',
        metadata: { 
          questionNumber: currentQuestionNumber,
          topic: lastTopic,
          difficulty: sessionData.current_difficulty || 'medium'
        }
      });

    // 3. Fetch past answers for momentum & score history
    const { data: answersData } = await supabase
      .from('mock_interview_answers')
      .select('overall_score, topic')
      .eq('session_id', sessionId);

    const pastScores = (answersData || []).map(a => Number(a.overall_score) || 75);
    const momentum = computeInterviewMomentum(pastScores);

    // 4. Construct Adaptive Interview Context
    const currentDifficulty = (sessionData.current_difficulty || sessionData.difficulty || 'medium').toLowerCase() as AdaptiveDifficulty;
    const highestDifficulty = (sessionData.highest_difficulty_reached || currentDifficulty) as AdaptiveDifficulty;
    const topicPerformance = (sessionData.topic_performance || []) as TopicPerformance[];

    const adaptiveContext: InterviewContext = {
      sessionId,
      role: sessionData.target_role || 'Software Engineer',
      interviewType: sessionData.interview_type,
      currentDifficulty,
      highestDifficultyReached: highestDifficulty,
      questionsAsked: currentQuestionNumber,
      questionsRemaining: Math.max(0, (sessionData.total_questions || 10) - currentQuestionNumber),
      strengths: sessionData.ai_strengths || [],
      weaknesses: sessionData.ai_improvements || [],
      topicPerformance,
      previousQuestions: [lastQuestionText],
      previousAnswers: [answerText.trim()],
      interviewMomentum: momentum
    };

    // 5. Generate next step via Adaptive Interview Engine
    const result = await evaluateAndGenerateAdaptiveNextStep(
      adaptiveContext,
      lastQuestionText,
      answerText.trim(),
      lastTopic
    );

    // 6. If next question/follow-up generated, save to mock_interview_ai_messages
    if (result.nextStep.action !== 'complete') {
      await supabase
        .from('mock_interview_ai_messages')
        .insert({
          session_id: sessionId,
          role: 'interviewer',
          message: result.nextStep.question,
          message_type: result.nextStep.action === 'follow_up' ? 'follow_up' : 'question',
          metadata: { 
            questionNumber: result.nextStep.question_number,
            helperTip: result.nextStep.helper_tip,
            topic: result.adaptiveDecision.recommendedTopic,
            difficulty: result.adaptiveDecision.nextDifficulty,
            strategy: result.adaptiveDecision.questionStrategy,
            remarks: result.nextStep.interviewer_remarks 
          }
        });
    }

    // 7. Update session adaptive fields, topic performance, and activity timestamp
    const newAnsweredCount = Math.min(
      sessionData.total_questions,
      (sessionData.answered_questions || 0) + (result.nextStep.action === 'follow_up' ? 0 : 1)
    );

    const difficultyRank = { easy: 1, medium: 2, hard: 3 };
    const newHighest = difficultyRank[result.adaptiveDecision.nextDifficulty] > difficultyRank[highestDifficulty]
      ? result.adaptiveDecision.nextDifficulty
      : highestDifficulty;

    await supabase
      .from('mock_interview_sessions')
      .update({
        answered_questions: newAnsweredCount,
        current_difficulty: result.adaptiveDecision.nextDifficulty,
        highest_difficulty_reached: newHighest,
        interview_momentum: momentum,
        topic_performance: result.updatedTopicPerformance,
        question_strategy: result.adaptiveDecision.questionStrategy,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      nextStep: result.nextStep,
      analysis: result.analysis,
      adaptiveDecision: result.adaptiveDecision,
      momentum
    });

  } catch (err: any) {
    console.error('Error submitting answer in adaptive interview:', err);
    return NextResponse.json({ error: err.message || 'Failed to process answer.' }, { status: 500 });
  }
}
