import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/roadmap';
import { getAdminSkills, createSkill } from '@/lib/skillCatalog';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const skill_type = searchParams.get('type') || searchParams.get('skill_type') || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const result = await getAdminSkills({
      search,
      category,
      skill_type,
      difficulty,
      status,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    logger.error('GET /api/admin/skills error', err as Error);
    return NextResponse.json({ error: 'Failed to fetch skills.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const result = await createSkill(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.skill, { status: 201 });
  } catch (err) {
    logger.error('POST /api/admin/skills error', err as Error);
    return NextResponse.json({ error: 'Failed to create skill.' }, { status: 500 });
  }
}
