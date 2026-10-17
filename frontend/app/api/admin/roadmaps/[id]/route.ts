import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import {
  isAdminUser,
  isSlugAvailable,
  validateRoadmapPayload,
  toSafeSlug,
  getAdminRoadmapDetail,
} from '@/lib/roadmap';
import type { UpdateRoadmapPayload } from '@/types/roadmap';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/roadmaps/[id]
 * Returns full roadmap detail for admin builder.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Roadmap ID is required.' }, { status: 400 });
    }

    const detail = await getAdminRoadmapDetail(id);
    if (!detail) {
      return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (err) {
    logger.error('GET /api/admin/roadmaps/[id]', err as Error);
    return NextResponse.json({ error: 'Failed to fetch roadmap.' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/roadmaps/[id]
 * Updates roadmap fields.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Roadmap ID is required.' }, { status: 400 });
    }

    const body: UpdateRoadmapPayload = await req.json();

    const errors = validateRoadmapPayload(body, false);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed.', details: errors }, { status: 422 });
    }

    const supabase = await createClient();

    // Check if roadmap exists
    const { data: existing, error: fetchErr } = await supabase
      .from('career_roadmaps')
      .select('id, slug')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 });
    }

    const updates: Record<string, any> = {};

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.slug !== undefined) {
      const slug = toSafeSlug(body.slug);
      if (!slug) {
        return NextResponse.json({ error: 'Invalid slug.' }, { status: 422 });
      }
      if (slug !== existing.slug) {
        const available = await isSlugAvailable(slug, id);
        if (!available) {
          return NextResponse.json(
            { error: 'A roadmap with this slug already exists. Choose a different slug.' },
            { status: 409 }
          );
        }
      }
      updates.slug = slug;
    }
    if (body.short_description !== undefined) updates.short_description = body.short_description.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.category !== undefined) updates.category = body.category;
    if (body.difficulty !== undefined) updates.difficulty = body.difficulty;
    if (body.estimated_duration !== undefined) updates.estimated_duration = body.estimated_duration.trim();
    if (body.thumbnail_url !== undefined) updates.thumbnail_url = body.thumbnail_url ? body.thumbnail_url.trim() : null;
    if (body.seo_title !== undefined) updates.seo_title = body.seo_title ? body.seo_title.trim() : null;
    if (body.seo_description !== undefined) updates.seo_description = body.seo_description ? body.seo_description.trim() : null;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data: updated, error: updateErr } = await supabase
      .from('career_roadmaps')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ roadmap: updated });
  } catch (err) {
    logger.error('PATCH /api/admin/roadmaps/[id]', err as Error);
    return NextResponse.json({ error: 'Failed to update roadmap.' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/roadmaps/[id]
 * Safely deletes a roadmap or deactivates if active.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Roadmap ID is required.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: roadmap, error: fetchErr } = await supabase
      .from('career_roadmaps')
      .select('id, is_active, title')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !roadmap) {
      return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 });
    }

    // If active, prefer soft deactivation or require deactivation first
    if (roadmap.is_active) {
      return NextResponse.json(
        { error: 'Cannot delete an active roadmap. Please deactivate it first.' },
        { status: 400 }
      );
    }

    const { error: deleteErr } = await supabase
      .from('career_roadmaps')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ message: 'Roadmap deleted successfully.', id });
  } catch (err) {
    logger.error('DELETE /api/admin/roadmaps/[id]', err as Error);
    return NextResponse.json({ error: 'Failed to delete roadmap.' }, { status: 500 });
  }
}
