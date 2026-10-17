/**
 * KnowledgePaat — Career Roadmap Resource Engine
 * Phase 2 — Server-side data layer & utilities
 */

import { createClient } from '@/utils/supabase/server';
import { readCatalogRowsByIds } from './catalogIntegrity';
import type {
  CareerResource,
  CareerNodeResourceView,
  ResourceCreatePayload,
  ResourceUpdatePayload,
  ResourceFilters,
  ResourceType,
  ResourceDifficulty,
} from '@/types/resource';
import { VALID_RESOURCE_TYPES, VALID_RESOURCE_DIFFICULTIES } from '@/types/resource';

export interface ValidationError {
  field: string;
  message: string;
}

// ── URL Normalization & Security ───────────────────────────────────────────

/**
 * Normalizes URLs to prevent duplicate entries and enforce security.
 * Rejects dangerous schemes like javascript:, data:, file:.
 */
export function normalizeResourceUrl(rawUrl: string): { url: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { url: '', error: 'URL is required.' };
  }

  const trimmed = rawUrl.trim();

  // Validate protocol
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { url: '', error: 'Invalid URL format.' };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { url: '', error: 'Only http and https protocols are permitted.' };
  }

  // Normalize host: strip leading www.
  let host = parsed.hostname.toLowerCase();
  if (host.startsWith('www.')) {
    host = host.slice(4);
  }

  // Remove common marketing/tracking query parameters
  const trackingParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
    'ref',
    'si',
  ];
  for (const param of trackingParams) {
    parsed.searchParams.delete(param);
  }

  // Canonicalize path: remove trailing slash if not root
  let pathname = parsed.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Build normalized URL string
  const search = parsed.searchParams.toString();
  const searchStr = search ? `?${search}` : '';
  const normalized = `${protocol}//${host}${pathname}${searchStr}`;

  return { url: normalized };
}

// ── Validation Helpers ─────────────────────────────────────────────────────

export function validateResourcePayload(
  payload: Partial<ResourceCreatePayload>,
  isCreate = true
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Title
  if (isCreate || payload.title !== undefined) {
    if (!payload.title?.trim()) {
      errors.push({ field: 'title', message: 'Resource title is required.' });
    }
  }

  // Resource Type
  if (isCreate || payload.resource_type !== undefined) {
    if (!payload.resource_type || !VALID_RESOURCE_TYPES.includes(payload.resource_type)) {
      errors.push({
        field: 'resource_type',
        message: `Resource type must be one of: ${VALID_RESOURCE_TYPES.join(', ')}`,
      });
    }
  }

  // Provider
  if (isCreate || payload.provider !== undefined) {
    if (!payload.provider?.trim()) {
      errors.push({ field: 'provider', message: 'Provider name is required (e.g. YouTube, Docs, Coursera).' });
    }
  }

  // URL
  if (isCreate || payload.url !== undefined) {
    if (!payload.url?.trim()) {
      errors.push({ field: 'url', message: 'URL is required.' });
    } else {
      const { error } = normalizeResourceUrl(payload.url);
      if (error) {
        errors.push({ field: 'url', message: error });
      }
    }
  }

  // Difficulty
  if (payload.difficulty !== undefined) {
    if (!VALID_RESOURCE_DIFFICULTIES.includes(payload.difficulty)) {
      errors.push({ field: 'difficulty', message: 'Difficulty must be Beginner, Intermediate, or Advanced.' });
    }
  }

  // Paid validation
  if (payload.is_free === false) {
    if (payload.price === undefined || payload.price === null || Number(payload.price) < 0) {
      errors.push({ field: 'price', message: 'Price is required for paid resources.' });
    }
    if (!payload.currency?.trim()) {
      errors.push({ field: 'currency', message: 'Currency is required for paid resources.' });
    }
  }

  // Duration
  if (payload.duration_minutes !== undefined && payload.duration_minutes !== null) {
    if (typeof payload.duration_minutes !== 'number' || payload.duration_minutes < 0) {
      errors.push({ field: 'duration_minutes', message: 'Duration must be a positive number of minutes.' });
    }
  }

  // Rating
  if (payload.rating !== undefined && payload.rating !== null) {
    if (typeof payload.rating !== 'number' || payload.rating < 1 || payload.rating > 5) {
      errors.push({ field: 'rating', message: 'Rating must be between 1.0 and 5.0.' });
    }
  }

  // Priority
  if (payload.priority !== undefined && payload.priority !== null) {
    if (typeof payload.priority !== 'number' || payload.priority < 1) {
      errors.push({ field: 'priority', message: 'Priority must be a positive integer (e.g. 1, 2, 3).' });
    }
  }

  return errors;
}

// ── Resource Uniqueness ────────────────────────────────────────────────────

export async function isResourceUrlAvailable(
  normalizedUrl: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase
    .from('career_resources')
    .select('id', { count: 'exact', head: true })
    .eq('url', normalizedUrl);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count } = await query;
  return (count ?? 0) === 0;
}

// ── Admin Resource Queries ─────────────────────────────────────────────────

export async function getAdminResources(filters?: ResourceFilters) {
  const supabase = await createClient();

  let query = supabase
    .from('career_resources')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.search) {
    const q = filters.search.trim();
    query = query.or(`title.ilike.%${q}%,provider.ilike.%${q}%,category.ilike.%${q}%`);
  }

  if (filters?.resource_type) {
    query = query.eq('resource_type', filters.resource_type);
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }

  if (filters?.is_free !== undefined) {
    query = query.eq('is_free', filters.is_free);
  }

  if (filters?.is_recommended !== undefined) {
    query = query.eq('is_recommended', filters.is_recommended);
  }

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  const { data, error } = await query;
  return { data: (data ?? []) as CareerResource[], error };
}

export async function getAdminResourceById(id: string): Promise<CareerResource | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('career_resources')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data as CareerResource;
}

export async function canSafelyDeleteResource(
  resourceId: string
): Promise<{ safe: boolean; attachedNodeCount: number }> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('career_roadmap_node_resources')
    .select('id', { count: 'exact', head: true })
    .eq('resource_id', resourceId);

  const attachedNodeCount = count ?? 0;
  return {
    safe: attachedNodeCount === 0,
    attachedNodeCount,
  };
}

// ── Node Resources Attachment & Batch Query ────────────────────────────────

/**
 * High-performance batch query retrieving active resources for multiple nodes.
 * Avoids N+1 queries when rendering full roadmap detail (/roadmaps/[slug]).
 */
export async function getNodesResourcesMap(
  nodeIds: string[],
  activeOnly = true
): Promise<Record<string, CareerNodeResourceView[]>> {
  if (nodeIds.length === 0) return {};

  const supabase = await createClient();

  // Query many-to-many join
  const data = await readCatalogRowsByIds(nodeIds, (batch, from, to) => {
  let query = supabase
    .from('career_roadmap_node_resources')
    .select(`
      id,
      node_id,
      resource_id,
      priority,
      is_recommended,
      career_resources!inner(*)
    `)
    .in('node_id', batch)
    .order('priority', { ascending: true }).order('id').range(from, to);

  if (activeOnly) {
    query = query.eq('career_resources.is_active', true);
  }

  return query;
  });

  const map: Record<string, CareerNodeResourceView[]> = {};

  for (const item of data) {
    const rawRes = item.career_resources as any;
    if (!rawRes) continue;

    const resourceView: CareerNodeResourceView = {
      ...rawRes,
      node_resource_id: item.id,
      node_id: item.node_id,
      resource_id: item.resource_id,
      priority: item.priority,
      // Node-level is_recommended overrides global
      is_recommended: item.is_recommended ?? rawRes.is_recommended ?? false,
      resource: rawRes,
    };

    if (!map[item.node_id]) {
      map[item.node_id] = [];
    }
    map[item.node_id].push(resourceView);
  }

  // Sort resources in each node: is_recommended first, then priority ASC, then title ASC
  for (const nId of Object.keys(map)) {
    map[nId].sort((a, b) => {
      if (a.is_recommended && !b.is_recommended) return -1;
      if (!a.is_recommended && b.is_recommended) return 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.title.localeCompare(b.title);
    });
  }

  return map;
}

/**
 * Get resources attached to a single node.
 */
export async function getNodeResources(
  nodeId: string,
  activeOnly = true
): Promise<CareerNodeResourceView[]> {
  const map = await getNodesResourcesMap([nodeId], activeOnly);
  return map[nodeId] || [];
}
