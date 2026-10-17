import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/roadmap';
import { getAdminSkillById, updateSkill } from '@/lib/skillCatalog';
import { getSkillRelationships } from '@/lib/skillGraph';
import { getSkillCareers } from '@/lib/careerSkillMap';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    const skill = await getAdminSkillById(id);
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found.' }, { status: 404 });
    }

    const relationships = await getSkillRelationships(id, false, Number(req.nextUrl.searchParams.get('page') || 1));
    const careers = await getSkillCareers(id);

    return NextResponse.json({
      ...skill,
      relationships,
      careers,
    });
  } catch (err) {
    logger.error('GET /api/admin/skills/[id] error', err as Error);
    return NextResponse.json({ error: 'Failed to fetch skill.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = await updateSkill(id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.skill);
  } catch (err) {
    logger.error('PATCH /api/admin/skills/[id] error', err as Error);
    return NextResponse.json({ error: 'Failed to update skill.' }, { status: 500 });
  }
}
