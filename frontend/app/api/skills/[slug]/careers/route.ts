import { NextRequest, NextResponse } from 'next/server';
import { getPublicSkillBySlug } from '@/lib/skillCatalog';
import { getSkillCareers } from '@/lib/careerSkillMap';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/skills/[slug]/careers
 * Public endpoint: Returns published careers that utilize this skill.
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

    const allCareers = await getSkillCareers(skill.id);
    // Filter to only published careers for public endpoint
    const published = allCareers.filter((c) => c.career?.status === 'published');

    return NextResponse.json(published);
  } catch (err) {
    logger.error('GET /api/skills/[slug]/careers error', err as Error);
    return NextResponse.json({ error: 'Failed to fetch skill careers.' }, { status: 500 });
  }
}
