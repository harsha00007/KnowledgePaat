import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import type { ResourceFilters } from '@/types/resource';

export const dynamic = 'force-dynamic';

/**
 * GET /api/resources
 * Public endpoint — returns active resources from the library.
 * Supports: ?search=&resource_type=&category=&difficulty=&is_free=
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.trim() || '';
    const resource_type = url.searchParams.get('resource_type')?.trim() || '';
    const category = url.searchParams.get('category')?.trim() || '';
    const difficulty = url.searchParams.get('difficulty')?.trim() || '';
    const is_free_param = url.searchParams.get('is_free');

    const supabase = await createClient();

    let query = supabase
      .from('career_resources')
      .select('*')
      .eq('is_active', true)
      .order('is_recommended', { ascending: false })
      .order('priority', { ascending: true })
      .order('title', { ascending: true });

    if (search) {
      query = query.or(`title.ilike.%${search}%,provider.ilike.%${search}%,category.ilike.%${search}%`);
    }
    if (resource_type) {
      query = query.eq('resource_type', resource_type);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    if (is_free_param !== null && is_free_param !== '') {
      query = query.eq('is_free', is_free_param === 'true');
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ resources: data || [] });
  } catch (err) {
    logger.error('GET /api/resources', err as Error);
    return NextResponse.json(
      { error: 'Failed to load resources. Please try again.' },
      { status: 500 }
    );
  }
}
