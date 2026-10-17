import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { isAdminUser, duplicateRoadmap } from '@/lib/roadmap';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/roadmaps/[id]/duplicate
 * Clones a roadmap with all its sections, nodes, topics, relationships, and attached resources as draft.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json(
        { error: 'Forbidden. Administrator privileges required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Roadmap ID is required.' },
        { status: 400 }
      );
    }

    const result = await duplicateRoadmap(id);
    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to duplicate roadmap.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      roadmap: result.data,
      message: `Roadmap duplicated as draft "${result.data.title}".`,
    });
  } catch (err) {
    logger.error('POST /api/admin/roadmaps/[id]/duplicate', err as Error);
    return NextResponse.json(
      { error: 'Internal server error while duplicating roadmap.' },
      { status: 500 }
    );
  }
}
