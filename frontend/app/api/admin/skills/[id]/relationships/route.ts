import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/roadmap';
import { getSkillRelationships, createSkillRelationship } from '@/lib/skillGraph';
import { logger } from '@/lib/logger';
import { isCatalogId } from '@/lib/catalogIntegrity';

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
    if (!isCatalogId(id)) return NextResponse.json({ error: 'Invalid skill ID.' }, { status: 400 });
    const relationships = await getSkillRelationships(id, false, Number(req.nextUrl.searchParams.get('page') || 1));
    return NextResponse.json(relationships);
  } catch (err) {
    logger.error('GET /api/admin/skills/[id]/relationships error', err as Error);
    return NextResponse.json({ error: 'Failed to fetch relationships.' }, { status: 500 });
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

    if (!isCatalogId(id) || !isCatalogId(body.target_skill_id) || (body.source_skill_id && !isCatalogId(body.source_skill_id))) {
      return NextResponse.json({ error: 'Invalid skill ID.' }, { status: 400 });
    }

    if (body.source_skill_id && body.source_skill_id !== id && body.target_skill_id !== id) {
      return NextResponse.json({ error: 'Relationship must involve the URL skill.' }, { status: 400 });
    }
    const result = await createSkillRelationship({
      source_skill_id: body.source_skill_id || id,
      target_skill_id: body.target_skill_id,
      relationship_type: body.relationship_type,
      strength: body.strength,
      notes: body.notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.relationship, { status: 201 });
  } catch (err) {
    logger.error('POST /api/admin/skills/[id]/relationships error', err as Error);
    return NextResponse.json({ error: 'Failed to create relationship.' }, { status: 500 });
  }
}
