import { NextRequest, NextResponse } from 'next/server';
import { getPublicSkillBySlug } from '@/lib/skillCatalog';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/skills/[slug]
 * Public endpoint: Returns published skill by slug.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Skill slug is required.' }, { status: 400 });
    }

    const skill = await getPublicSkillBySlug(slug);
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found.' }, { status: 404 });
    }

    return NextResponse.json(skill);
  } catch (err) {
    logger.error('GET /api/skills/[slug] error', err as Error);
    return NextResponse.json({ error: 'Failed to fetch skill.' }, { status: 500 });
  }
}
