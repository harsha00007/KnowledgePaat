import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import {
  isAdminUser,
  isSlugAvailable,
  validateRoadmapPayload,
  toSafeSlug,
  getAdminRoadmaps,
} from '@/lib/roadmap';
import type { CreateRoadmapPayload } from '@/types/roadmap';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/roadmaps
 * Admin: list all roadmaps (including inactive)
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { data, error } = await getAdminRoadmaps();
    if (error) throw error;

    return NextResponse.json({ roadmaps: data });
  } catch (err) {
    logger.error('GET /api/admin/roadmaps', err as Error);
    return NextResponse.json({ error: 'Failed to load roadmaps.' }, { status: 500 });
  }
}

/**
 * POST /api/admin/roadmaps
 * Admin: create a new roadmap
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const body: CreateRoadmapPayload = await req.json();

    // Validate
    const errors = validateRoadmapPayload(body, true);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed.', details: errors }, { status: 422 });
    }

    // Normalize slug
    const slug = toSafeSlug(body.slug);
    if (!slug) {
      return NextResponse.json({ error: 'Slug is invalid after normalization.' }, { status: 422 });
    }

    // Check slug uniqueness
    const available = await isSlugAvailable(slug);
    if (!available) {
      return NextResponse.json(
        { error: 'A roadmap with this slug already exists. Choose a different slug.' },
        { status: 409 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('career_roadmaps')
      .insert({
        title: body.title.trim(),
        slug,
        short_description: body.short_description.trim(),
        description: body.description.trim(),
        category: body.category,
        difficulty: body.difficulty,
        estimated_duration: body.estimated_duration.trim(),
        thumbnail_url: body.thumbnail_url?.trim() || null,
        seo_title: body.seo_title?.trim() || null,
        seo_description: body.seo_description?.trim() || null,
        is_active: body.is_active ?? false,
        created_by: user?.id ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ roadmap: data }, { status: 201 });
  } catch (err) {
    logger.error('POST /api/admin/roadmaps', err as Error);
    return NextResponse.json({ error: 'Failed to create roadmap.' }, { status: 500 });
  }
}
