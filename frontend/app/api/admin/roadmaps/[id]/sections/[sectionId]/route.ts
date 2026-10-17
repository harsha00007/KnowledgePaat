import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { isAdminUser, validateSectionPayload, toSafeSlug } from '@/lib/roadmap';
import type { UpdateSectionPayload } from '@/types/roadmap';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/roadmaps/[id]/sections/[sectionId]
 * Updates a section (including title, description, sequence, is_required, is_active).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id: roadmapId, sectionId } = await params;
    if (!roadmapId || !sectionId) {
      return NextResponse.json({ error: 'Roadmap ID and Section ID are required.' }, { status: 400 });
    }

    const body: UpdateSectionPayload = await req.json();

    const errors = validateSectionPayload(body, false);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed.', details: errors }, { status: 422 });
    }

    const supabase = await createClient();

    // Verify section exists and belongs to this roadmap
    const { data: existing, error: fetchErr } = await supabase
      .from('career_roadmap_sections')
      .select('id, roadmap_id, slug')
      .eq('id', sectionId)
      .eq('roadmap_id', roadmapId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Section not found in this roadmap.' }, { status: 404 });
    }

    const updates: Record<string, any> = {};

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.slug !== undefined) {
      const slug = toSafeSlug(body.slug);
      if (!slug) return NextResponse.json({ error: 'Invalid slug.' }, { status: 422 });
      updates.slug = slug;
    }
    if (body.description !== undefined) updates.description = body.description ? body.description.trim() : null;
    if (body.sequence !== undefined) updates.sequence = body.sequence;
    if (body.is_required !== undefined) updates.is_required = body.is_required;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data: updated, error: updateErr } = await supabase
      .from('career_roadmap_sections')
      .update(updates)
      .eq('id', sectionId)
      .select()
      .single();

    if (updateErr) {
      if (updateErr.code === '23505') {
        return NextResponse.json(
          { error: 'A section with this slug already exists in this roadmap.' },
          { status: 409 }
        );
      }
      throw updateErr;
    }

    return NextResponse.json({ section: updated });
  } catch (err) {
    logger.error('PATCH /api/admin/roadmaps/[id]/sections/[sectionId]', err as Error);
    return NextResponse.json({ error: 'Failed to update section.' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/roadmaps/[id]/sections/[sectionId]
 * Deletes a section.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id: roadmapId, sectionId } = await params;
    if (!roadmapId || !sectionId) {
      return NextResponse.json({ error: 'Roadmap ID and Section ID are required.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: existing, error: fetchErr } = await supabase
      .from('career_roadmap_sections')
      .select('id, title, is_active')
      .eq('id', sectionId)
      .eq('roadmap_id', roadmapId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Section not found.' }, { status: 404 });
    }

    // Check if section contains nodes
    const { count: nodeCount } = await supabase
      .from('career_roadmap_nodes')
      .select('id', { count: 'exact', head: true })
      .eq('section_id', sectionId);

    if ((nodeCount ?? 0) > 0 && existing.is_active) {
      return NextResponse.json(
        { error: 'This section contains active nodes. Please delete or move the nodes first, or deactivate the section.' },
        { status: 400 }
      );
    }

    const { error: deleteErr } = await supabase
      .from('career_roadmap_sections')
      .delete()
      .eq('id', sectionId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ message: 'Section deleted successfully.', id: sectionId });
  } catch (err) {
    logger.error('DELETE /api/admin/roadmaps/[id]/sections/[sectionId]', err as Error);
    return NextResponse.json({ error: 'Failed to delete section.' }, { status: 500 });
  }
}
