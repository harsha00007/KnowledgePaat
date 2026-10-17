import { NextRequest, NextResponse } from 'next/server';
import { getPublicRoadmapCards } from '@/lib/roadmap';

export const dynamic = 'force-dynamic';

/**
 * GET /api/roadmaps
 * Public endpoint — returns active roadmaps for the directory.
 * Supports: ?search=&category=&difficulty=
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.trim() || '';
    const category = url.searchParams.get('category')?.trim() || '';
    const difficulty = url.searchParams.get('difficulty')?.trim() || '';

    const cards = await getPublicRoadmapCards({
      search: search || undefined,
      category: category || undefined,
      difficulty: difficulty || undefined,
    });

    return NextResponse.json({ roadmaps: cards });
  } catch (err) {
    console.error('[GET /api/roadmaps]', err);
    return NextResponse.json(
      { error: 'Failed to load career roadmaps. Please try again.' },
      { status: 500 }
    );
  }
}
