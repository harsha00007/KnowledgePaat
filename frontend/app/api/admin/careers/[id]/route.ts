import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/roadmap';
import { getAdminCareerById, updateCareer } from '@/lib/careerCatalog';
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
    const career = await getAdminCareerById(id);
    if (!career) {
      return NextResponse.json({ error: 'Career not found.' }, { status: 404 });
    }

    return NextResponse.json(career);
  } catch (err) {
    logger.error('GET /api/admin/careers/[id] error', err as Error);
    return NextResponse.json({ error: 'Failed to fetch career.' }, { status: 500 });
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
    const result = await updateCareer(id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.career);
  } catch (err) {
    logger.error('PATCH /api/admin/careers/[id] error', err as Error);
    return NextResponse.json({ error: 'Failed to update career.' }, { status: 500 });
  }
}
