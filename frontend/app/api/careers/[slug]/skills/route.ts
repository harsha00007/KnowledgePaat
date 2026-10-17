import { NextRequest, NextResponse } from 'next/server';
import { getPublicCareerSkillsBySlug } from '@/lib/careerSkillMap';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/careers/[slug]/skills
 * Public endpoint: Returns mapped skills partitioned by required, recommended, optional.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Career slug is required.' }, { status: 400 });
    }

    const skills = await getPublicCareerSkillsBySlug(slug);
    return NextResponse.json(skills);
  } catch (err) {
    logger.error('GET /api/careers/[slug]/skills error', err as Error);
    return NextResponse.json({ error: 'Failed to fetch career skills.' }, { status: 500 });
  }
}
