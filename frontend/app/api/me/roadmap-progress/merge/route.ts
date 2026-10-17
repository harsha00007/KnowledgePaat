import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { mergeLocalRoadmapProgress } from '@/lib/progress';
import type { RoadmapProgressMergeItem } from '@/types/roadmap';

export const dynamic = 'force-dynamic';

/**
 * POST /api/me/roadmap-progress/merge
 * Merges anonymous local progress items from localStorage into the authenticated user's account.
 *
 * Conflict Resolution:
 *   If local item updatedAt > server updated_at: local replaces server.
 *   Otherwise: server record wins.
 *   Idempotent.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to merge progress.' },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    const items: RoadmapProgressMergeItem[] = body?.items;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Payload must include an "items" array.' },
        { status: 422 }
      );
    }

    const result = await mergeLocalRoadmapProgress(user.id, items);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to merge progress.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      progress: result.progress,
      mergedCount: result.mergedCount,
    });
  } catch (err) {
    console.error('[POST /api/me/roadmap-progress/merge]', err);
    return NextResponse.json(
      { error: 'Internal server error while merging progress.' },
      { status: 500 }
    );
  }
}
