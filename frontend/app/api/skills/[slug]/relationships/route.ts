import { NextRequest, NextResponse } from 'next/server';
import { getPublicSkillBySlug } from '@/lib/skillCatalog';
import { getSkillRelationships } from '@/lib/skillGraph';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/skills/[slug]/relationships
 * Public endpoint: Returns prerequisites, builds_on, related, etc.
 */
export async function GET(
  req: NextRequest,
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

    const relationships = await getSkillRelationships(skill.id, true, Number(req.nextUrl.searchParams.get('page') || 1));
    return NextResponse.json(relationships);
  } catch (err) {
    logger.error('GET /api/skills/[slug]/relationships error', err as Error);
    return NextResponse.json({ error: 'Failed to fetch skill relationships.' }, { status: 500 });
  }
}
