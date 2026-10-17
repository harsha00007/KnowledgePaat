import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { isAdminUser, validateSectionPayload, toSafeSlug } from '@/lib/roadmap';
import type { CreateSectionPayload } from '@/types/roadmap';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/roadmaps/[id]/sections
 * Creates a new section within a roadmap.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id: roadmapId } = await params;
    if (!roadmapId) {
      return NextResponse.json({ error: 'Roadmap ID is required.' }, { status: 400 });
    }

    const body: CreateSectionPayload = await req.json();

    const errors = validateSectionPayload(body, true);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed.', details: errors }, { status: 422 });
    }

    const slug = toSafeSlug(body.slug);
    if (!slug) {
      return NextResponse.json({ error: 'Invalid section slug.' }, { status: 422 });
    }

    const supabase = await createClient();

    // Verify roadmap exists
    const { data: roadmap, error: rmErr } = await supabase
      .from('career_roadmaps')
      .select('id')
      .eq('id', roadmapId)
      .maybeSingle();

    if (rmErr || !roadmap) {
      return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 });
    }

    // Determine sequence if not provided
    let sequence = body.sequence;
    if (sequence === undefined || sequence === null) {
      const { data: maxSeqData } = await supabase
        .from('career_roadmap_sections')
        .select('sequence')
        .eq('roadmap_id', roadmapId)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle();

      sequence = (maxSeqData?.sequence ?? 0) + 1;
    }

    const { data: section, error: insertErr } = await supabase
      .from('career_roadmap_sections')
      .insert({
        roadmap_id: roadmapId,
        title: body.title.trim(),
        slug,
        description: body.description?.trim() || null,
        sequence,
        is_required: body.is_required ?? true,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: 'A section with this slug already exists in this roadmap.' },
          { status: 409 }
        );
      }
      throw insertErr;
    }

    return NextResponse.json({ section }, { status: 201 });
  } catch (err) {
    logger.error('POST /api/admin/roadmaps/[id]/sections', err as Error);
    return NextResponse.json({ error: 'Failed to create section.' }, { status: 500 });
  }
}
