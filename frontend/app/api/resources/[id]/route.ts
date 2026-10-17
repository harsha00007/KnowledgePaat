import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/resources/[id]
 * Public endpoint — get a single active resource.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Resource ID is required.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: resource, error } = await supabase
      .from('career_resources')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !resource) {
      return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
    }

    return NextResponse.json({ resource });
  } catch (err) {
    logger.error('GET /api/resources/[id]', err as Error);
    return NextResponse.json(
      { error: 'Failed to load resource.' },
      { status: 500 }
    );
  }
}
