import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { isAdminUser } from '@/lib/roadmap';
import {
  validateResourcePayload,
  normalizeResourceUrl,
  isResourceUrlAvailable,
  getAdminResources,
} from '@/lib/resource';
import type { ResourceCreatePayload } from '@/types/resource';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/resources
 * Admin endpoint — list resources with search and filters (including inactive).
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.trim() || '';
    const resource_type = url.searchParams.get('resource_type')?.trim() || '';
    const category = url.searchParams.get('category')?.trim() || '';
    const difficulty = url.searchParams.get('difficulty')?.trim() || '';
    const is_free_param = url.searchParams.get('is_free');
    const is_recommended_param = url.searchParams.get('is_recommended');
    const is_active_param = url.searchParams.get('is_active');

    const filters: any = {};
    if (search) filters.search = search;
    if (resource_type) filters.resource_type = resource_type;
    if (category) filters.category = category;
    if (difficulty) filters.difficulty = difficulty;
    if (is_free_param !== null && is_free_param !== '') {
      filters.is_free = is_free_param === 'true';
    }
    if (is_recommended_param !== null && is_recommended_param !== '') {
      filters.is_recommended = is_recommended_param === 'true';
    }
    if (is_active_param !== null && is_active_param !== '') {
      filters.is_active = is_active_param === 'true';
    }

    const { data, error } = await getAdminResources(filters);
    if (error) throw error;

    return NextResponse.json({ resources: data });
  } catch (err) {
    logger.error('GET /api/admin/resources', err as Error);
    return NextResponse.json({ error: 'Failed to load resources.' }, { status: 500 });
  }
}

/**
 * POST /api/admin/resources
 * Admin endpoint — create a new resource in the centralized library.
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const body: ResourceCreatePayload = await req.json();

    // 1. Validate payload
    const errors = validateResourcePayload(body, true);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed.', details: errors }, { status: 422 });
    }

    // 2. Normalize URL and check uniqueness
    const { url: normalizedUrl, error: urlError } = normalizeResourceUrl(body.url);
    if (urlError || !normalizedUrl) {
      return NextResponse.json({ error: urlError || 'Invalid URL.' }, { status: 422 });
    }

    const isAvailable = await isResourceUrlAvailable(normalizedUrl);
    if (!isAvailable) {
      return NextResponse.json(
        { error: 'A resource with this URL already exists in the library. Reuse the existing resource instead.' },
        { status: 409 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isFree = body.is_free ?? true;

    const { data: resource, error: insertErr } = await supabase
      .from('career_resources')
      .insert({
        title: body.title.trim(),
        description: body.description?.trim() || '',
        resource_type: body.resource_type,
        provider: body.provider.trim(),
        url: normalizedUrl,
        thumbnail_url: body.thumbnail_url?.trim() || null,
        duration_minutes: body.duration_minutes ?? null,
        difficulty: body.difficulty || 'Beginner',
        category: body.category?.trim() || 'Development',
        is_free: isFree,
        price: isFree ? null : (body.price ?? null),
        currency: isFree ? null : (body.currency?.trim() || 'INR'),
        language: body.language?.trim() || 'English',
        instructor: body.instructor?.trim() || null,
        rating: body.rating ?? null,
        is_recommended: body.is_recommended ?? false,
        priority: body.priority ?? 1,
        is_active: body.is_active ?? true,
        created_by: user?.id ?? null,
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: 'A resource with this URL already exists in the library.' },
          { status: 409 }
        );
      }
      throw insertErr;
    }

    return NextResponse.json({ resource }, { status: 201 });
  } catch (err) {
    logger.error('POST /api/admin/resources', err as Error);
    return NextResponse.json({ error: 'Failed to create resource.' }, { status: 500 });
  }
}
