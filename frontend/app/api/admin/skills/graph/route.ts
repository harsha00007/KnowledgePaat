import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/roadmap';
import { getSkillGraphData } from '@/lib/skillGraph';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;

    const graph = await getSkillGraphData(category, Number(searchParams.get('page') || 1));
    return NextResponse.json(graph);
  } catch (err) {
    logger.error('GET /api/admin/skills/graph error', err as Error);
    return NextResponse.json({ error: 'Failed to fetch skill graph data.' }, { status: 500 });
  }
}
