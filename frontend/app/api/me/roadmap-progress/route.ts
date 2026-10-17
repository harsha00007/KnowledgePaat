import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserRoadmapProgress } from '@/lib/progress';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me/roadmap-progress
 * Returns the authenticated user's roadmap progress.
 * Query Params:
 *   ?roadmap=[slug] (optional: filters to nodes in that roadmap)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to view your progress.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const roadmapSlug = searchParams.get('roadmap') || undefined;

    const progress = await getUserRoadmapProgress(user.id, roadmapSlug);

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (err) {
    console.error('[GET /api/me/roadmap-progress]', err);
    return NextResponse.json(
      { error: 'Failed to retrieve roadmap progress.' },
      { status: 500 }
    );
  }
}
