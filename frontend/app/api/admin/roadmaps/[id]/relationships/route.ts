import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import {
  isAdminUser,
  validateRelationshipPayload,
  verifyNodesBelongToRoadmap,
  checkRelationshipCausesCycle,
} from '@/lib/roadmap';
import type { CreateRelationshipPayload } from '@/types/roadmap';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/roadmaps/[id]/relationships
 * Creates a relationship between two nodes in the same roadmap.
 * Validates:
 * - Admin authorization
 * - Payload structure
 * - No self-reference (source != target)
 * - Both nodes belong to this roadmap
 * - Duplicate prevention
 * - Cycle detection
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

    const body: CreateRelationshipPayload = await req.json();

    const errors = validateRelationshipPayload(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed.', details: errors }, { status: 422 });
    }

    // 1. Verify both nodes belong to this roadmap (prevent cross-roadmap relationships)
    const belongs = await verifyNodesBelongToRoadmap(roadmapId, [
      body.source_node_id,
      body.target_node_id,
    ]);
    if (!belongs) {
      return NextResponse.json(
        { error: 'Both nodes must exist and belong to this roadmap.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 2. Fetch existing relationships within this roadmap to check duplicates and cycle
    const { data: sectionNodes } = await supabase
      .from('career_roadmap_nodes')
      .select('id, career_roadmap_sections!inner(roadmap_id)')
      .eq('career_roadmap_sections.roadmap_id', roadmapId);

    const roadmapNodeIds = (sectionNodes ?? []).map((n) => n.id);

    const { data: existingRels } = await supabase
      .from('career_roadmap_node_relationships')
      .select('id, source_node_id, target_node_id, relationship_type')
      .in('source_node_id', roadmapNodeIds);

    const allRels = existingRels ?? [];

    // Check duplicate
    const isDuplicate = allRels.some(
      (r) =>
        r.source_node_id === body.source_node_id &&
        r.target_node_id === body.target_node_id &&
        r.relationship_type === body.relationship_type
    );
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'This relationship already exists between these two nodes.' },
        { status: 409 }
      );
    }

    // 3. Cycle detection for PREREQUISITE and NEXT relationships
    if (body.relationship_type === 'PREREQUISITE' || body.relationship_type === 'NEXT') {
      const causesCycle = checkRelationshipCausesCycle(
        body.source_node_id,
        body.target_node_id,
        allRels.filter((r) => r.relationship_type === 'PREREQUISITE' || r.relationship_type === 'NEXT')
      );

      if (causesCycle) {
        return NextResponse.json(
          {
            error:
              'Cannot create relationship: This connection would create a circular dependency cycle.',
          },
          { status: 422 }
        );
      }
    }

    // 4. Insert relationship
    const { data: relationship, error: insertErr } = await supabase
      .from('career_roadmap_node_relationships')
      .insert({
        source_node_id: body.source_node_id,
        target_node_id: body.target_node_id,
        relationship_type: body.relationship_type,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ relationship }, { status: 201 });
  } catch (err) {
    logger.error('POST /api/admin/roadmaps/[id]/relationships', err as Error);
    return NextResponse.json({ error: 'Failed to create relationship.' }, { status: 500 });
  }
}
