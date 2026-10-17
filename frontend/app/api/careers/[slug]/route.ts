import { NextRequest, NextResponse } from 'next/server';
import { getPublicCareerBySlug } from '@/lib/careerCatalog';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/careers/[slug]
 * Public endpoint: Returns published career by slug with skills.
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

    const career = await getPublicCareerBySlug(slug);
    if (!career) {
      return NextResponse.json({ error: 'Career not found.' }, { status: 404 });
    }

    return NextResponse.json(career);
  } catch (err) {
    logger.error('GET /api/careers/[slug] error', err as Error);
    return NextResponse.json({ error: 'Failed to fetch career.' }, { status: 500 });
  }
}
