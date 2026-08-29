import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateFinalAIReport } from '@/lib/ai/mockInterviewAI';
import { ExperienceLevel, InterviewDifficulty } from '@/lib/ai/mockInterviewTypes';
import { TopicPerformance } from '@/lib/adaptiveInterview';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Enforce Rate Limit for AI Complete Interview Report
    const rl = await checkRateLimit(`ai_mock_complete:${user.id}`, RATE_LIMIT_POLICIES.AI_MOCK_COMPLETE);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json();
    const { sessionId } = body as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 });
    }

    // 1. Verify session exists and belongs to user
    const { data: sessionData, error: sessionError } = await supabase
      .from('mock_interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('student_id', user.id)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session not found or unauthorized.' }, { status: 404 });
    }

    // 2. Fetch full conversation transcript
    const { data: messagesData, error: messagesError } = await supabase
      .from('mock_interview_ai_messages')
      .select('role, message, message_type')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;
    const history = messagesData || [];

    // 3. Generate comprehensive final AI evaluation report
    const sessionConfig = {
      interviewType: sessionData.interview_type,
      targetRole: sessionData.target_role || 'Software Engineer',
      experienceLevel: (sessionData.experience_level || 'Fresher') as ExperienceLevel,
      difficulty: (sessionData.difficulty || 'Medium') as InterviewDifficulty,
      totalQuestions: sessionData.total_questions || 10
    };

    const report = await generateFinalAIReport(sessionConfig, history);

    // 4. Synthesize adaptive recommendations based on weak topics
    const topicPerformance = (sessionData.topic_performance || []) as TopicPerformance[];
    const weakTopics = topicPerformance.filter(t => t.strength === 'weak' || t.strength === 'developing');

    const adaptiveRecommendations = [...report.recommendations];

    if (weakTopics.length > 0) {
      weakTopics.forEach(wt => {
        adaptiveRecommendations.unshift({
          type: 'notes',
          title: `${wt.topic} Practice & Revision Guide`,
          description: `Score in this area was ${wt.averageScore}%. Review core concepts and practice interview scenarios.`,
          link: '/student/notes'
        });
      });
    }

    // 5. Update session status to completed with all scores, adaptive metrics, and feedback
    const { error: updateError } = await supabase
      .from('mock_interview_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        overall_score: report.overall_score,
        communication_score: report.communication_score,
        technical_score: report.technical_score,
        confidence_score: report.confidence_score,
        ai_strengths: report.strengths,
        ai_improvements: report.improvements,
        ai_recommendations: adaptiveRecommendations.slice(0, 4),
        ai_overall_feedback: report.overall_feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('student_id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        recommendations: adaptiveRecommendations.slice(0, 4)
      }
    });

  } catch (err: any) {
    console.error('Error completing adaptive AI interview:', err);
    return NextResponse.json({ error: err.message || 'Failed to complete interview.' }, { status: 500 });
  }
}
