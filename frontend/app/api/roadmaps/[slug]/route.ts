import { NextRequest, NextResponse } from 'next/server';
import { getPublicRoadmapBySlug } from '@/lib/roadmap';

export const dynamic = 'force-dynamic';

/**
 * GET /api/roadmaps/[slug]
 * Public endpoint — returns full roadmap detail for a given slug.
 * Only returns active roadmaps.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      return NextResponse.json({ error: 'Invalid roadmap slug.' }, { status: 400 });
    }

    const detail = await getPublicRoadmapBySlug(slug.trim().toLowerCase());

    if (!detail) {
      return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (err) {
    console.error('[GET /api/roadmaps/[slug]]', err);
    return NextResponse.json(
      { error: 'Failed to load roadmap. Please try again.' },
      { status: 500 }
    );
  }
}
