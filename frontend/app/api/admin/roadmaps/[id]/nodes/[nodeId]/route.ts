import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { isAdminUser, validateNodePayload, toSafeSlug } from '@/lib/roadmap';
import type { UpdateNodePayload } from '@/types/roadmap';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/roadmaps/[id]/nodes/[nodeId]
 * Updates a node and optionally updates its topics.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id: roadmapId, nodeId } = await params;
    if (!roadmapId || !nodeId) {
      return NextResponse.json({ error: 'Roadmap ID and Node ID are required.' }, { status: 400 });
    }

    const body: UpdateNodePayload = await req.json();

    const errors = validateNodePayload(body, false);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed.', details: errors }, { status: 422 });
    }

    const supabase = await createClient();

    // Verify node exists and belongs to this roadmap
    const { data: existingNode, error: fetchErr } = await supabase
      .from('career_roadmap_nodes')
      .select('id, section_id, slug, career_roadmap_sections!inner(roadmap_id)')
      .eq('id', nodeId)
      .maybeSingle();

    if (fetchErr || !existingNode) {
      return NextResponse.json({ error: 'Node not found.' }, { status: 404 });
    }

    const sec = existingNode.career_roadmap_sections as any;
    if (!sec || sec.roadmap_id !== roadmapId) {
      return NextResponse.json({ error: 'Node does not belong to this roadmap.' }, { status: 400 });
    }

    const updates: Record<string, any> = {};

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.slug !== undefined) {
      const slug = toSafeSlug(body.slug);
      if (!slug) return NextResponse.json({ error: 'Invalid slug.' }, { status: 422 });
      updates.slug = slug;
    }
    if (body.description !== undefined) updates.description = body.description ? body.description.trim() : null;
    if (body.node_type !== undefined) updates.node_type = body.node_type;
    if (body.difficulty !== undefined) updates.difficulty = body.difficulty;
    if (body.estimated_minutes !== undefined) updates.estimated_minutes = body.estimated_minutes;
    if (body.sequence !== undefined) updates.sequence = body.sequence;
    if (body.is_required !== undefined) updates.is_required = body.is_required;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.section_id !== undefined) updates.section_id = body.section_id;

    const { data: updatedNode, error: updateErr } = await supabase
      .from('career_roadmap_nodes')
      .update(updates)
      .eq('id', nodeId)
      .select()
      .single();

    if (updateErr) {
      if (updateErr.code === '23505') {
        return NextResponse.json(
          { error: 'A node with this slug already exists in this section.' },
          { status: 409 }
        );
      }
      throw updateErr;
    }

    // Update topics if provided
    if (body.topics !== undefined && Array.isArray(body.topics)) {
      // Replace topics
      await supabase
        .from('career_roadmap_node_topics')
        .delete()
        .eq('node_id', nodeId);

      const topicInserts = body.topics
        .map((t, idx) => ({
          node_id: nodeId,
          topic: String(t).trim(),
          sequence: idx + 1,
        }))
        .filter((t) => t.topic.length > 0);

      if (topicInserts.length > 0) {
        await supabase
          .from('career_roadmap_node_topics')
          .insert(topicInserts);
      }
    }

    // Fetch updated topics
    const { data: currentTopics } = await supabase
      .from('career_roadmap_node_topics')
      .select('*')
      .eq('node_id', nodeId)
      .order('sequence', { ascending: true });

    return NextResponse.json({
      node: {
        ...updatedNode,
        topics: currentTopics ?? [],
      },
    });
  } catch (err) {
    logger.error('PATCH /api/admin/roadmaps/[id]/nodes/[nodeId]', err as Error);
    return NextResponse.json({ error: 'Failed to update node.' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/roadmaps/[id]/nodes/[nodeId]
 * Deletes a node.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id: roadmapId, nodeId } = await params;
    if (!roadmapId || !nodeId) {
      return NextResponse.json({ error: 'Roadmap ID and Node ID are required.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: existing, error: fetchErr } = await supabase
      .from('career_roadmap_nodes')
      .select('id, title, is_active, career_roadmap_sections!inner(roadmap_id)')
      .eq('id', nodeId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Node not found.' }, { status: 404 });
    }

    const sec = existing.career_roadmap_sections as any;
    if (!sec || sec.roadmap_id !== roadmapId) {
      return NextResponse.json({ error: 'Node does not belong to this roadmap.' }, { status: 400 });
    }

    // Check if node is referenced as a prerequisite by other nodes
    const { count: relCount } = await supabase
      .from('career_roadmap_node_relationships')
      .select('id', { count: 'exact', head: true })
      .eq('source_node_id', nodeId);

    if ((relCount ?? 0) > 0 && existing.is_active) {
      return NextResponse.json(
        {
          error:
            'This node is referenced as a prerequisite/source by other nodes. Please remove or update those relationships first, or deactivate the node.',
        },
        { status: 400 }
      );
    }

    const { error: deleteErr } = await supabase
      .from('career_roadmap_nodes')
      .delete()
      .eq('id', nodeId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ message: 'Node deleted successfully.', id: nodeId });
  } catch (err) {
    logger.error('DELETE /api/admin/roadmaps/[id]/nodes/[nodeId]', err as Error);
    return NextResponse.json({ error: 'Failed to delete node.' }, { status: 500 });
  }
}
