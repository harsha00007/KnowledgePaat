import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/roadmap';
import { evaluateCareerPublishReadiness } from '@/lib/careerCatalog';
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
    const report = await evaluateCareerPublishReadiness(id);
    return NextResponse.json(report);
  } catch (err) {
    logger.error('GET /api/admin/careers/[id]/quality error', err as Error);
    return NextResponse.json({ error: 'Failed to evaluate career quality.' }, { status: 500 });
  }
}
