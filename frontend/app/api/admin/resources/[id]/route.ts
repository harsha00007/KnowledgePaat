import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { isAdminUser } from '@/lib/roadmap';
import {
  validateResourcePayload,
  normalizeResourceUrl,
  isResourceUrlAvailable,
  canSafelyDeleteResource,
  getAdminResourceById,
} from '@/lib/resource';
import type { ResourceUpdatePayload } from '@/types/resource';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/resources/[id]
 * Admin endpoint — get single resource.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Resource ID is required.' }, { status: 400 });
    }

    const resource = await getAdminResourceById(id);
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
    }

    return NextResponse.json({ resource });
  } catch (err) {
    logger.error('GET /api/admin/resources/[id]', err as Error);
    return NextResponse.json({ error: 'Failed to fetch resource.' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/resources/[id]
 * Admin endpoint — update resource.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Resource ID is required.' }, { status: 400 });
    }

    const body: ResourceUpdatePayload = await req.json();

    const errors = validateResourcePayload(body, false);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed.', details: errors }, { status: 422 });
    }

    const supabase = await createClient();

    // Check existing
    const { data: existing, error: fetchErr } = await supabase
      .from('career_resources')
      .select('id, url')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
    }

    const updates: Record<string, any> = {};

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.resource_type !== undefined) updates.resource_type = body.resource_type;
    if (body.provider !== undefined) updates.provider = body.provider.trim();

    if (body.url !== undefined) {
      const { url: normalizedUrl, error: urlError } = normalizeResourceUrl(body.url);
      if (urlError || !normalizedUrl) {
        return NextResponse.json({ error: urlError || 'Invalid URL.' }, { status: 422 });
      }
      if (normalizedUrl !== existing.url) {
        const isAvailable = await isResourceUrlAvailable(normalizedUrl, id);
        if (!isAvailable) {
          return NextResponse.json(
            { error: 'A resource with this URL already exists in the library.' },
            { status: 409 }
          );
        }
      }
      updates.url = normalizedUrl;
    }

    if (body.thumbnail_url !== undefined) updates.thumbnail_url = body.thumbnail_url?.trim() || null;
    if (body.duration_minutes !== undefined) updates.duration_minutes = body.duration_minutes;
    if (body.difficulty !== undefined) updates.difficulty = body.difficulty;
    if (body.category !== undefined) updates.category = body.category.trim();

    if (body.is_free !== undefined) {
      updates.is_free = body.is_free;
      if (body.is_free) {
        updates.price = null;
      }
    }

    if (body.price !== undefined && updates.is_free !== true) {
      updates.price = body.price;
    }
    if (body.currency !== undefined) updates.currency = body.currency?.trim() || 'INR';
    if (body.language !== undefined) updates.language = body.language.trim();
    if (body.instructor !== undefined) updates.instructor = body.instructor?.trim() || null;
    if (body.rating !== undefined) updates.rating = body.rating;
    if (body.is_recommended !== undefined) updates.is_recommended = body.is_recommended;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data: updated, error: updateErr } = await supabase
      .from('career_resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ resource: updated });
  } catch (err) {
    logger.error('PATCH /api/admin/resources/[id]', err as Error);
    return NextResponse.json({ error: 'Failed to update resource.' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/resources/[id]
 * Admin endpoint — safe deletion of a resource.
 * Rejects deletion if attached to roadmap nodes; advises deactivation.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Resource ID is required.' }, { status: 400 });
    }

    const { safe, attachedNodeCount } = await canSafelyDeleteResource(id);

    if (!safe) {
      return NextResponse.json(
        {
          error: `This resource is currently attached to ${attachedNodeCount} roadmap node(s). Please deactivate it instead of deleting, or detach it from all nodes first.`,
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error: deleteErr } = await supabase
      .from('career_resources')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ message: 'Resource deleted successfully.', id });
  } catch (err) {
    logger.error('DELETE /api/admin/resources/[id]', err as Error);
    return NextResponse.json({ error: 'Failed to delete resource.' }, { status: 500 });
  }
}
