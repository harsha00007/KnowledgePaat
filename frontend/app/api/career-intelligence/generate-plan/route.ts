import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  calculateCareerReadiness, 
  analyzeSkillGaps, 
  generateCareerInsight, 
  generateImprovementTasks 
} from '@/lib/careerIntelligence';
import { TopicPerformance } from '@/lib/adaptiveInterview';
import { isServerModuleEnabled } from '@/lib/featureFlagsServer';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const isAllowed = await isServerModuleEnabled('student_career_intelligence');
    if (!isAllowed) {
      return NextResponse.json({ 
        error: 'AI Career Intelligence is currently disabled by administration.' 
      }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Enforce Rate Limit for AI Career Roadmap Generation
    const rl = await checkRateLimit(`ai_career_plan:${user.id}`, RATE_LIMIT_POLICIES.AI_CAREER_PLAN);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json().catch(() => ({}));
    const { planDuration = 7, targetRoleOverride } = body as {
      planDuration?: number;
      targetRoleOverride?: string;
    };

    // 1. Fetch Student Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const targetRole = targetRoleOverride || profile?.preferred_role || profile?.target_role || 'Software Engineer';
    const studentSkills: string[] = profile?.skills || [];

    // 2. Fetch Completed Mock Interviews & Topic History
    const { data: interviewSessions } = await supabase
      .from('mock_interview_sessions')
      .select('*')
      .eq('student_id', user.id)
      .order('started_at', { ascending: false });

    // Aggregate topic performance across all sessions
    const allTopicsMap = new Map<string, TopicPerformance>();
    (interviewSessions || []).forEach(s => {
      const tpList = (s.topic_performance || []) as TopicPerformance[];
      tpList.forEach(tp => {
        const key = tp.topic.toLowerCase();
        if (allTopicsMap.has(key)) {
          const existing = allTopicsMap.get(key)!;
          const newAttempts = existing.attempts + tp.attempts;
          const newAvg = Math.round(((existing.averageScore * existing.attempts) + (tp.averageScore * tp.attempts)) / newAttempts);
          allTopicsMap.set(key, {
            topic: existing.topic,
            attempts: newAttempts,
            averageScore: newAvg,
            strength: newAvg >= 90 ? 'expert' : newAvg >= 75 ? 'strong' : newAvg >= 55 ? 'developing' : 'weak'
          });
        } else {
          allTopicsMap.set(key, { ...tp });
        }
      });
    });

    const topicPerformanceList = Array.from(allTopicsMap.values());

    // 3. Compute Career Readiness Score & Missing Data
    const readiness = calculateCareerReadiness(
      profile,
      studentSkills,
      interviewSessions || [],
      (interviewSessions || []).length * 2
    );

    // 4. Perform Skill Gap Analysis
    const skillGaps = analyzeSkillGaps(targetRole, studentSkills, topicPerformanceList);

    // 5. Generate AI Career Insight
    const insight = generateCareerInsight(readiness, skillGaps, targetRole);

    // 6. Generate Multi-Day Tasks
    const durationDays = [7, 14, 30].includes(Number(planDuration)) ? Number(planDuration) : 7;
    const tasks = generateImprovementTasks(durationDays, targetRole, skillGaps, readiness);

    // 7. Archive Any Existing Active Plan
    await supabase
      .from('career_improvement_plans')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('student_id', user.id)
      .eq('status', 'active');

    // 8. Insert New Active Career Improvement Plan
    const { data: newPlan, error: insertPlanError } = await supabase
      .from('career_improvement_plans')
      .insert({
        student_id: user.id,
        plan_duration: durationDays,
        career_readiness_score: readiness.overallScore,
        profile_strength: readiness.profileStrength,
        technical_skills_score: readiness.technicalSkills,
        interview_performance_score: readiness.interviewPerformance,
        communication_score: readiness.communication,
        consistency_score: readiness.preparationConsistency,
        data_completeness: readiness.dataCompleteness,
        confidence_level: readiness.confidence,
        target_role: targetRole,
        strengths: skillGaps.filter(g => g.studentLevel === 'strong').map(g => g.skill),
        weaknesses: skillGaps.filter(g => g.studentLevel === 'beginner' || g.studentLevel === 'missing').map(g => g.skill),
        skill_gaps: skillGaps,
        ai_insight: insight,
        plan_data: { summary: insight.summary, generatedAt: new Date().toISOString() },
        status: 'active'
      })
      .select()
      .single();

    if (insertPlanError || !newPlan) {
      throw new Error(insertPlanError?.message || 'Failed to create career plan.');
    }

    // 9. Insert Tasks into career_plan_tasks
    const taskRows = tasks.map(t => ({
      plan_id: newPlan.id,
      student_id: user.id,
      day_number: t.dayNumber,
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      estimated_minutes: t.estimatedMinutes,
      related_skill: t.relatedSkill,
      reason: t.reason,
      resource_url: t.resourceUrl,
      resource_id: t.resourceTitle,
      status: 'pending'
    }));

    const { data: insertedTasks, error: insertTasksError } = await supabase
      .from('career_plan_tasks')
      .insert(taskRows)
      .select();

    if (insertTasksError) {
      console.warn('Warning: Error inserting task rows:', insertTasksError);
    }

    return NextResponse.json({
      success: true,
      plan: newPlan,
      tasks: insertedTasks || tasks,
      readiness,
      skillGaps,
      insight
    });

  } catch (err: any) {
    console.error('Error generating career intelligence plan:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate improvement plan.' }, { status: 500 });
  }
}
