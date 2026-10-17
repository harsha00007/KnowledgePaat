import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/roadmap';
import { getCareerSkills, attachSkillToCareer } from '@/lib/careerSkillMap';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    const skills = await getCareerSkills(id);
    return NextResponse.json(skills);
  } catch (err) {
    logger.error('GET /api/admin/careers/[id]/skills error', err as Error);
    return NextResponse.json({ error: 'Failed to fetch career skills.' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    if (!body.skill_id) {
      return NextResponse.json({ error: 'Skill ID is required.' }, { status: 400 });
    }

    const result = await attachSkillToCareer({
      career_id: id,
      skill_id: body.skill_id,
      importance: body.importance,
      proficiency_target: body.proficiency_target,
      display_order: body.display_order,
      is_core: body.is_core,
      notes: body.notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.mapping, { status: 201 });
  } catch (err) {
    logger.error('POST /api/admin/careers/[id]/skills error', err as Error);
    return NextResponse.json({ error: 'Failed to attach skill.' }, { status: 500 });
  }
}
