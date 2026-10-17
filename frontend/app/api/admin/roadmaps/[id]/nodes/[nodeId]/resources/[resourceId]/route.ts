import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { isAdminUser } from '@/lib/roadmap';
import type { UpdateNodeResourcePayload } from '@/types/resource';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/roadmaps/[id]/nodes/[nodeId]/resources/[resourceId]
 * Updates attachment priority and/or recommendation state for a node.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string; resourceId: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id: roadmapId, nodeId, resourceId } = await params;
    if (!roadmapId || !nodeId || !resourceId) {
      return NextResponse.json(
        { error: 'Roadmap ID, Node ID, and Resource ID are required.' },
        { status: 400 }
      );
    }

    const body: UpdateNodeResourcePayload = await req.json();
    const supabase = await createClient();

    // Verify node attachment exists
    const { data: existing, error: fetchErr } = await supabase
      .from('career_roadmap_node_resources')
      .select('id, node_id, resource_id')
      .eq('node_id', nodeId)
      .eq('resource_id', resourceId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Resource attachment not found on this node.' }, { status: 404 });
    }

    // If making recommended, unset any other recommended resources on this node
    if (body.is_recommended === true) {
      await supabase
        .from('career_roadmap_node_resources')
        .update({ is_recommended: false })
        .eq('node_id', nodeId);
    }

    const updates: Record<string, any> = {};
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.is_recommended !== undefined) updates.is_recommended = body.is_recommended;

    const { data: updated, error: updateErr } = await supabase
      .from('career_roadmap_node_resources')
      .update(updates)
      .eq('node_id', nodeId)
      .eq('resource_id', resourceId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ attachment: updated });
  } catch (err) {
    logger.error('PATCH /api/admin/roadmaps/.../resources/[resourceId]', err as Error);
    return NextResponse.json({ error: 'Failed to update node resource.' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/roadmaps/[id]/nodes/[nodeId]/resources/[resourceId]
 * Detaches a resource from a node.
 * CRITICAL: This removes the attachment link only. The resource remains in the library.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string; resourceId: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id: roadmapId, nodeId, resourceId } = await params;
    if (!roadmapId || !nodeId || !resourceId) {
      return NextResponse.json(
        { error: 'Roadmap ID, Node ID, and Resource ID are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error: deleteErr } = await supabase
      .from('career_roadmap_node_resources')
      .delete()
      .eq('node_id', nodeId)
      .eq('resource_id', resourceId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({
      message: 'Resource detached from node successfully. The resource remains safely in the library.',
      node_id: nodeId,
      resource_id: resourceId,
    });
  } catch (err) {
    logger.error('DELETE /api/admin/roadmaps/.../resources/[resourceId]', err as Error);
    return NextResponse.json({ error: 'Failed to detach resource from node.' }, { status: 500 });
  }
}
