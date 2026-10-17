import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { isAdminUser } from '@/lib/roadmap';
import {
  validateResourcePayload,
  normalizeResourceUrl,
  isResourceUrlAvailable,
} from '@/lib/resource';
import type { AttachResourcePayload } from '@/types/resource';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/roadmaps/[id]/nodes/[nodeId]/resources
 * Attaches an existing resource or creates a new resource and attaches it to the node.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    const { id: roadmapId, nodeId } = await params;
    if (!roadmapId || !nodeId) {
      return NextResponse.json({ error: 'Roadmap ID and Node ID are required.' }, { status: 400 });
    }

    const body: AttachResourcePayload = await req.json();
    const supabase = await createClient();

    // 1. Verify node exists and belongs to this roadmap
    const { data: node, error: nodeErr } = await supabase
      .from('career_roadmap_nodes')
      .select('id, section_id, career_roadmap_sections!inner(roadmap_id)')
      .eq('id', nodeId)
      .maybeSingle();

    if (nodeErr || !node) {
      return NextResponse.json({ error: 'Node not found.' }, { status: 404 });
    }

    const sec = node.career_roadmap_sections as any;
    if (!sec || sec.roadmap_id !== roadmapId) {
      return NextResponse.json({ error: 'Node does not belong to this roadmap.' }, { status: 400 });
    }

    let resourceId = body.resource_id;

    // 2. If new_resource is provided, create it first
    if (!resourceId && body.new_resource) {
      const newRes = body.new_resource;
      const errors = validateResourcePayload(newRes, true);
      if (errors.length > 0) {
        return NextResponse.json({ error: 'Validation failed.', details: errors }, { status: 422 });
      }

      const { url: normalizedUrl, error: urlError } = normalizeResourceUrl(newRes.url);
      if (urlError || !normalizedUrl) {
        return NextResponse.json({ error: urlError || 'Invalid URL.' }, { status: 422 });
      }

      // Check if already exists in library
      const { data: existingRes } = await supabase
        .from('career_resources')
        .select('id')
        .eq('url', normalizedUrl)
        .maybeSingle();

      if (existingRes) {
        // Reuse existing resource record
        resourceId = existingRes.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const isFree = newRes.is_free ?? true;

        const { data: createdRes, error: createErr } = await supabase
          .from('career_resources')
          .insert({
            title: newRes.title.trim(),
            description: newRes.description?.trim() || '',
            resource_type: newRes.resource_type,
            provider: newRes.provider.trim(),
            url: normalizedUrl,
            thumbnail_url: newRes.thumbnail_url?.trim() || null,
            duration_minutes: newRes.duration_minutes ?? null,
            difficulty: newRes.difficulty || 'Beginner',
            category: newRes.category?.trim() || 'Development',
            is_free: isFree,
            price: isFree ? null : (newRes.price ?? null),
            currency: isFree ? null : (newRes.currency?.trim() || 'INR'),
            language: newRes.language?.trim() || 'English',
            instructor: newRes.instructor?.trim() || null,
            rating: newRes.rating ?? null,
            is_recommended: newRes.is_recommended ?? false,
            priority: newRes.priority ?? 1,
            is_active: newRes.is_active ?? true,
            created_by: user?.id ?? null,
          })
          .select()
          .single();

        if (createErr) throw createErr;
        resourceId = createdRes.id;
      }
    }

    if (!resourceId) {
      return NextResponse.json({ error: 'Resource ID or valid new_resource is required.' }, { status: 400 });
    }

    // 3. Verify resource exists
    const { data: targetRes, error: resErr } = await supabase
      .from('career_resources')
      .select('id, title')
      .eq('id', resourceId)
      .maybeSingle();

    if (resErr || !targetRes) {
      return NextResponse.json({ error: 'Resource not found in library.' }, { status: 404 });
    }

    // 4. Check if already attached to this node
    const { data: existingAttachment } = await supabase
      .from('career_roadmap_node_resources')
      .select('id')
      .eq('node_id', nodeId)
      .eq('resource_id', resourceId)
      .maybeSingle();

    if (existingAttachment) {
      return NextResponse.json(
        { error: 'This resource is already attached to this node.' },
        { status: 409 }
      );
    }

    // Determine priority
    let priority = body.priority;
    if (priority === undefined || priority === null) {
      const { data: maxPriorityData } = await supabase
        .from('career_roadmap_node_resources')
        .select('priority')
        .eq('node_id', nodeId)
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();

      priority = (maxPriorityData?.priority ?? 0) + 1;
    }

    const isRecommended = body.is_recommended ?? false;

    // If marked recommended, ensure single recommended per node
    if (isRecommended) {
      await supabase
        .from('career_roadmap_node_resources')
        .update({ is_recommended: false })
        .eq('node_id', nodeId);
    }

    // 5. Insert attachment
    const { data: attachment, error: attachErr } = await supabase
      .from('career_roadmap_node_resources')
      .insert({
        node_id: nodeId,
        resource_id: resourceId,
        priority,
        is_recommended: isRecommended,
      })
      .select(`
        id,
        node_id,
        resource_id,
        priority,
        is_recommended,
        created_at,
        career_resources (*)
      `)
      .single();

    if (attachErr) throw attachErr;

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (err) {
    logger.error('POST /api/admin/roadmaps/[id]/nodes/[nodeId]/resources', err as Error);
    return NextResponse.json({ error: 'Failed to attach resource to node.' }, { status: 500 });
  }
}
