import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCareerProgressData } from '@/lib/careerProgress';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Enforce Rate Limit for Career Progress
    const rl = await checkRateLimit(`career_progress:${user.id}`, RATE_LIMIT_POLICIES.CAREER_PROGRESS);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const progressData = await getCareerProgressData(supabase, user.id);

    // Perform controlled daily snapshot upsert (at most 1 entry per day)
    const today = new Date().toISOString().split('T')[0];

    try {
      await supabase
        .from('career_progress_snapshots')
        .upsert({
          student_id: user.id,
          snapshot_date: today,
          career_readiness_score: progressData.readinessScore,
          profile_score: progressData.breakdown.profileScore,
          resume_score: progressData.breakdown.resumeScore,
          interview_score: progressData.breakdown.interviewScore,
          practice_score: progressData.breakdown.practiceScore,
          skill_score: progressData.breakdown.skillScore,
          engagement_score: progressData.breakdown.engagementScore
        }, {
          onConflict: 'student_id,snapshot_date'
        });
    } catch (snapshotErr) {
      // Non-critical: log and proceed
      console.warn('Snapshot upsert warning:', snapshotErr);
    }

    return NextResponse.json({
      success: true,
      progressData
    });

  } catch (err: any) {
    console.error('Error fetching career progress:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch career progress.' }, { status: 500 });
  }
}
