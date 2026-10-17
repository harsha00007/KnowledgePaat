import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { isAdminUser, validateNodePayload, toSafeSlug } from '@/lib/roadmap';
import type { CreateNodePayload } from '@/types/roadmap';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/roadmaps/[id]/nodes
 * Creates a new node within a roadmap section, and creates topics if provided.
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

    const body: CreateNodePayload = await req.json();

    const errors = validateNodePayload(body, true);
    if (!body.section_id) {
      errors.push({ field: 'section_id', message: 'Section ID is required.' });
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed.', details: errors }, { status: 422 });
    }

    const slug = toSafeSlug(body.slug);
    if (!slug) {
      return NextResponse.json({ error: 'Invalid node slug.' }, { status: 422 });
    }

    const supabase = await createClient();

    // Verify section belongs to this roadmap
    const { data: section, error: secErr } = await supabase
      .from('career_roadmap_sections')
      .select('id, roadmap_id')
      .eq('id', body.section_id)
      .eq('roadmap_id', roadmapId)
      .maybeSingle();

    if (secErr || !section) {
      return NextResponse.json({ error: 'Section not found in this roadmap.' }, { status: 404 });
    }

    // Determine sequence if not provided
    let sequence = body.sequence;
    if (sequence === undefined || sequence === null) {
      const { data: maxSeqData } = await supabase
        .from('career_roadmap_nodes')
        .select('sequence')
        .eq('section_id', body.section_id)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle();

      sequence = (maxSeqData?.sequence ?? 0) + 1;
    }

    // Insert node
    const { data: node, error: insertErr } = await supabase
      .from('career_roadmap_nodes')
      .insert({
        section_id: body.section_id,
        title: body.title.trim(),
        slug,
        description: body.description?.trim() || null,
        node_type: body.node_type || 'TOPIC',
        difficulty: body.difficulty || 'Beginner',
        estimated_minutes: body.estimated_minutes ?? 60,
        sequence,
        is_required: body.is_required ?? true,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: 'A node with this slug already exists in this section.' },
          { status: 409 }
        );
      }
      throw insertErr;
    }

    // Insert topics if provided
    let topics: any[] = [];
    if (body.topics && Array.isArray(body.topics) && body.topics.length > 0) {
      const topicInserts = body.topics
        .map((t, idx) => ({
          node_id: node.id,
          topic: String(t).trim(),
          sequence: idx + 1,
        }))
        .filter((t) => t.topic.length > 0);

      if (topicInserts.length > 0) {
        const { data: insertedTopics } = await supabase
          .from('career_roadmap_node_topics')
          .insert(topicInserts)
          .select();
        topics = insertedTopics ?? [];
      }
    }

    return NextResponse.json({ node: { ...node, topics } }, { status: 201 });
  } catch (err) {
    logger.error('POST /api/admin/roadmaps/[id]/nodes', err as Error);
    return NextResponse.json({ error: 'Failed to create node.' }, { status: 500 });
  }
}
