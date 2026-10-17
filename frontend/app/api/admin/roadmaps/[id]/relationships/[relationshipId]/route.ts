import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { isAdminUser } from '@/lib/roadmap';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/roadmaps/[id]/relationships/[relationshipId]
 * Deletes a relationship.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; relationshipId: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id: roadmapId, relationshipId } = await params;
    if (!roadmapId || !relationshipId) {
      return NextResponse.json(
        { error: 'Roadmap ID and Relationship ID are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error: deleteErr } = await supabase
      .from('career_roadmap_node_relationships')
      .delete()
      .eq('id', relationshipId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({
      message: 'Relationship deleted successfully.',
      id: relationshipId,
    });
  } catch (err) {
    logger.error('DELETE /api/admin/roadmaps/[id]/relationships/[relationshipId]', err as Error);
    return NextResponse.json({ error: 'Failed to delete relationship.' }, { status: 500 });
  }
}
