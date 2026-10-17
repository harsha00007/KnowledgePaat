import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/roadmap';
import { runCareerCatalogHealthCheck } from '@/lib/careerCatalog';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const health = await runCareerCatalogHealthCheck();
    return NextResponse.json(health);
  } catch (err) {
    logger.error('GET /api/admin/careers/health-check error', err as Error);
    return NextResponse.json({ error: 'Failed to run health check.' }, { status: 500 });
  }
}
