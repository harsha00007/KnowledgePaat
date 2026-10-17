import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { isAdminUser, getAdminRoadmapDetail } from '@/lib/roadmap';
import { evaluateRoadmapQuality } from '@/lib/roadmapTaxonomy';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/roadmaps/[id]/quality
 * Evaluates roadmap completeness, relationship validity, cycle prevention,
 * attached resources, and SEO metadata.
 */
export async function GET(
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

    const detail = await getAdminRoadmapDetail(id);
    if (!detail) {
      return NextResponse.json(
        { error: 'Roadmap not found.' },
        { status: 404 }
      );
    }

    const qualityReport = evaluateRoadmapQuality(detail as any);

    return NextResponse.json({
      success: true,
      quality: qualityReport,
    });
  } catch (err) {
    logger.error('GET /api/admin/roadmaps/[id]/quality', err as Error);
    return NextResponse.json(
      { error: 'Failed to evaluate roadmap quality.' },
      { status: 500 }
    );
  }
}
