import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/roadmap';
import { detachSkillFromCareer, updateCareerSkillMapping } from '@/lib/careerSkillMap';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { isCatalogId, requireDatabaseResult } from '@/lib/catalogIntegrity';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; skillId: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id, skillId } = await params;
    if (!isCatalogId(id) || !isCatalogId(skillId)) return NextResponse.json({ error: 'Invalid catalog ID.' }, { status: 400 });
    const body = await req.json();

    // Look up mapping ID
    const supabase = await createClient();
    const { data: mapping, error } = await supabase
      .from('career_skill_map')
      .select('id')
      .eq('career_id', id)
      .eq('skill_id', skillId)
      .maybeSingle();
    requireDatabaseResult(error, 'Mapping lookup');

    if (!mapping) {
      return NextResponse.json({ error: 'Mapping not found.' }, { status: 404 });
    }

    const result = await updateCareerSkillMapping(mapping.id, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.mapping);
  } catch (err) {
    logger.error('PATCH /api/admin/careers/[id]/skills/[skillId] error', err as Error);
    return NextResponse.json({ error: 'Failed to update mapping.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; skillId: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id, skillId } = await params;
    if (!isCatalogId(id) || !isCatalogId(skillId)) return NextResponse.json({ error: 'Invalid catalog ID.' }, { status: 400 });
    const result = await detachSkillFromCareer(id, skillId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('DELETE /api/admin/careers/[id]/skills/[skillId] error', err as Error);
    return NextResponse.json({ error: 'Failed to detach skill.' }, { status: 500 });
  }
}
