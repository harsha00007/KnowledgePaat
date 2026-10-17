import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { setUserNodeProgress, isValidTopicStatus } from '@/lib/progress';
import type { TopicProgressStatus } from '@/types/roadmap';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/me/roadmap-progress/[nodeId]
 * Updates or clears the authenticated user's progress for a specific node.
 * Body:
 *   { "status": "learning" | "done" | "skip" | null }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to update progress.' },
        { status: 401 }
      );
    }

    const { nodeId } = await params;
    if (!nodeId || typeof nodeId !== 'string' || nodeId.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid or missing nodeId.' },
        { status: 400 }
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

    const status: TopicProgressStatus = body?.status ?? null;

    if (status !== null && !isValidTopicStatus(status)) {
      return NextResponse.json(
        {
          error:
            'Invalid status value. Allowed values are: "learning", "done", "skip", or null.',
        },
        { status: 422 }
      );
    }

    const result = await setUserNodeProgress(user.id, nodeId.trim(), status);

    if (!result.success) {
      const isNotFound = result.error?.includes('not found') || result.error?.includes('inactive');
      return NextResponse.json(
        { error: result.error || 'Failed to update progress.' },
        { status: isNotFound ? 404 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      nodeId: nodeId.trim(),
      status: result.status,
    });
  } catch (err) {
    console.error('[PUT /api/me/roadmap-progress/[nodeId]]', err);
    return NextResponse.json(
      { error: 'Internal server error while saving progress.' },
      { status: 500 }
    );
  }
}
