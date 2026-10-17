import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/roadmap';
import { deleteSkillRelationship } from '@/lib/skillGraph';
import { logger } from '@/lib/logger';
import { isCatalogId } from '@/lib/catalogIntegrity';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; relId: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id, relId } = await params;
    if (!isCatalogId(id) || !isCatalogId(relId)) return NextResponse.json({ error: 'Invalid relationship context.' }, { status: 400 });
    const result = await deleteSkillRelationship(relId, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('DELETE /api/admin/skills/[id]/relationships/[relId] error', err as Error);
    return NextResponse.json({ error: 'Failed to delete relationship.' }, { status: 500 });
  }
}
