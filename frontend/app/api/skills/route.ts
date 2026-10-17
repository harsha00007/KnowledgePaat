import { NextRequest, NextResponse } from 'next/server';
import { getPublicSkills } from '@/lib/skillCatalog';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/skills
 * Public endpoint: Returns published skills with search, filters & pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const skill_type = searchParams.get('type') || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;
    const is_featured = searchParams.get('featured') === 'true' ? true : undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const result = await getPublicSkills({
      search,
      category,
      skill_type,
      difficulty,
      is_featured,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    logger.error('GET /api/skills error', err as Error);
    return NextResponse.json({ error: 'Failed to fetch skills.' }, { status: 500 });
  }
}
