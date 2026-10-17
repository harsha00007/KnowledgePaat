import { requireDatabaseResult, readCatalogRows, readCatalogRowsByIds } from './catalogIntegrity';
/**
 * KnowledgePaat — Career Roadmap Engine
 * Phase 1 — Server-side data layer
 *
 * Used exclusively in API routes and Server Components.
 * Never import this in client components.
 */

import { createClient } from '@/utils/supabase/server';
import type {
  CareerRoadmap,
  CareerRoadmapSection,
  CareerRoadmapNode,
  CareerRoadmapNodeRelationship,
  CareerRoadmapNodeTopic,
  RoadmapCard,
  RoadmapDetail,
  CreateRoadmapPayload,
  UpdateRoadmapPayload,
  CreateSectionPayload,
  UpdateSectionPayload,
  CreateNodePayload,
  UpdateNodePayload,
  CreateRelationshipPayload,
  RoadmapCategory,
  RoadmapDifficulty,
  CareerNodeResourceView,
} from '@/types/roadmap';
import { getNodesResourcesMap } from './resource';
import {
  getCatalogRoadmapCards,
  getCatalogRoadmapDetail,
} from './roadmapCatalogBridge';
import { classifyRoadmap } from './roadmapTaxonomy';

// ── Validation helpers ─────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set([
  'Development', 'Data', 'AI', 'QA & Testing',
  'DevOps & Cloud', 'Cybersecurity', 'Product', 'Design', 'Other',
]);
const VALID_DIFFICULTIES = new Set(['Beginner', 'Intermediate', 'Advanced']);
const VALID_NODE_TYPES = new Set(['SKILL', 'TOPIC', 'MILESTONE', 'CHECKPOINT']);
const VALID_RELATIONSHIP_TYPES = new Set([
  'PREREQUISITE', 'NEXT', 'RECOMMENDED', 'OPTIONAL', 'ALTERNATIVE',
]);

export function toSafeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateRoadmapPayload(
  payload: Partial<CreateRoadmapPayload>,
  isCreate = true
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (isCreate || payload.title !== undefined) {
    if (!payload.title?.trim()) errors.push({ field: 'title', message: 'Title is required.' });
  }
  if (isCreate || payload.slug !== undefined) {
    if (!payload.slug?.trim()) errors.push({ field: 'slug', message: 'Slug is required.' });
    else if (!/^[a-z0-9-]+$/.test(payload.slug)) errors.push({ field: 'slug', message: 'Slug must be lowercase letters, numbers, and hyphens only.' });
  }
  if (isCreate || payload.short_description !== undefined) {
    if (!payload.short_description?.trim()) errors.push({ field: 'short_description', message: 'Short description is required.' });
  }
  if (isCreate || payload.description !== undefined) {
    if (!payload.description?.trim()) errors.push({ field: 'description', message: 'Description is required.' });
  }
  if (isCreate || payload.category !== undefined) {
    if (!payload.category || !VALID_CATEGORIES.has(payload.category)) {
      errors.push({ field: 'category', message: 'Invalid category.' });
    }
  }
  if (isCreate || payload.difficulty !== undefined) {
    if (!payload.difficulty || !VALID_DIFFICULTIES.has(payload.difficulty)) {
      errors.push({ field: 'difficulty', message: 'Difficulty must be Beginner, Intermediate, or Advanced.' });
    }
  }
  if (isCreate || payload.estimated_duration !== undefined) {
    if (!payload.estimated_duration?.trim()) errors.push({ field: 'estimated_duration', message: 'Estimated duration is required.' });
  }
  return errors;
}

export function validateSectionPayload(
  payload: Partial<CreateSectionPayload>,
  isCreate = true
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (isCreate || payload.title !== undefined) {
    if (!payload.title?.trim()) errors.push({ field: 'title', message: 'Section title is required.' });
  }
  if (isCreate || payload.slug !== undefined) {
    if (!payload.slug?.trim()) errors.push({ field: 'slug', message: 'Section slug is required.' });
    else if (!/^[a-z0-9-]+$/.test(payload.slug)) errors.push({ field: 'slug', message: 'Slug must be lowercase letters, numbers, and hyphens only.' });
  }
  return errors;
}

export function validateNodePayload(
  payload: Partial<CreateNodePayload>,
  isCreate = true
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (isCreate || payload.title !== undefined) {
    if (!payload.title?.trim()) errors.push({ field: 'title', message: 'Node title is required.' });
  }
  if (isCreate || payload.slug !== undefined) {
    if (!payload.slug?.trim()) errors.push({ field: 'slug', message: 'Node slug is required.' });
    else if (!/^[a-z0-9-]+$/.test(payload.slug)) errors.push({ field: 'slug', message: 'Slug must be lowercase letters, numbers, and hyphens only.' });
  }
  if (isCreate || payload.node_type !== undefined) {
    if (!payload.node_type || !VALID_NODE_TYPES.has(payload.node_type)) {
      errors.push({ field: 'node_type', message: 'Invalid node type.' });
    }
  }
  if (payload.estimated_minutes !== undefined) {
    if (typeof payload.estimated_minutes !== 'number' || payload.estimated_minutes < 1) {
      errors.push({ field: 'estimated_minutes', message: 'Estimated minutes must be a positive number.' });
    }
  }
  return errors;
}

// ── Authorization helper ───────────────────────────────────────────────────

export async function isAdminUser(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    return profile?.role === 'admin';
  } catch {
    return false;
  }
}

// ── Public API helpers ─────────────────────────────────────────────────────

/**
 * Get lightweight roadmap cards for the public directory.
 * Returns only is_active = true roadmaps.
 */
export async function getPublicRoadmapCards(filters?: {
  search?: string;
  category?: string;
  difficulty?: string;
  type?: string;
}): Promise<RoadmapCard[]> {
  const catalogCards = getCatalogRoadmapCards(filters);
  const overrides = await getRoadmapOverrides(catalogCards.map(c => c.slug));
  let dbCards: RoadmapCard[] = [];
  try {
    const supabase = await createClient();

    let query = supabase
      .from('career_roadmaps')
      .select('id, title, slug, short_description, category, difficulty, estimated_duration, thumbnail_url, is_active, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters?.difficulty && filters.difficulty !== 'all') {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,short_description.ilike.%${filters.search}%`);
    }

    const { data: roadmaps, error } = await query;
    requireDatabaseResult(error, 'Roadmap list');
    if (!error && roadmaps && roadmaps.length > 0) {
      const ids = roadmaps.map(r => r.id);
      const sections = await readCatalogRows((from, to) => supabase.from('career_roadmap_sections').select('id,roadmap_id').in('roadmap_id', ids).eq('is_active', true).order('id').range(from, to));
      const nodes = sections.length ? await readCatalogRows((from, to) => supabase.from('career_roadmap_nodes').select('section_id').in('section_id', sections.map(s => s.id)).eq('is_active', true).order('id').range(from, to)) : [];
      const sectionParents = new Map(sections.map(s => [s.id, s.roadmap_id]));
      const nodeCounts = new Map<string, number>();
      for (const node of nodes) { const parent = sectionParents.get(node.section_id); if (parent) nodeCounts.set(parent, (nodeCounts.get(parent) || 0) + 1); }
      dbCards = roadmaps.map(rm => ({ ...rm, section_count: sections.filter(s => s.roadmap_id === rm.id).length, node_count: nodeCounts.get(rm.id) || 0, classification: classifyRoadmap(rm.slug, rm.category) } as RoadmapCard));
    }
  } catch (error) { throw error; }

  // Get catalog cards
  // Merge: DB cards take precedence by slug, catalog cards supplement any missing slugs
  const existingSlugs = new Set(dbCards.map((c) => c.slug));
  const merged: RoadmapCard[] = [...dbCards];

  for (const catCard of catalogCards) {
    if (!existingSlugs.has(catCard.slug) && !overrides.has(catCard.slug)) {
      merged.push(catCard);
      existingSlugs.add(catCard.slug);
    }
  }

  // Filter by classification/type if specified
  if (filters?.type && filters.type !== 'all') {
    const targetType = filters.type.toUpperCase();
    return merged.filter((c) => c.classification === targetType);
  }

  return merged;
}

/**
 * Get full roadmap detail by slug for public pages.
 * Returns null if not found or not active.
 */
export async function getPublicRoadmapBySlug(slug: string): Promise<RoadmapDetail | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  const overrides = await getRoadmapOverrides([normalizedSlug]);
  if (overrides.get(normalizedSlug) === false) return null;
  try {
    const supabase = await createClient();

    // 1. Fetch roadmap
    const { data: roadmap, error: rmErr } = await supabase
      .from('career_roadmaps')
      .select('*')
      .eq('slug', normalizedSlug)
      .maybeSingle();

    requireDatabaseResult(rmErr, 'Roadmap detail');
    if (!rmErr && roadmap) {
      // Strictly hide inactive/draft roadmaps
      if (!roadmap.is_active) {
        return null;
      }

      // 2. Fetch sections
      const { data: sections } = await supabase
        .from('career_roadmap_sections')
        .select('*')
        .eq('roadmap_id', roadmap.id)
        .eq('is_active', true)
        .order('sequence', { ascending: true });

      if (sections && sections.length > 0) {
        const sectionIds = sections.map((s) => s.id);

        // 3. Fetch nodes for all sections
        const nodes = await readCatalogRowsByIds(sectionIds, (batch, from, to) => supabase
          .from('career_roadmap_nodes')
          .select('*')
          .in('section_id', batch)
          .eq('is_active', true)
          .order('sequence', { ascending: true }).order('id').range(from, to));

        const allNodes = nodes ?? [];
        const nodeIds = allNodes.map((n) => n.id);

        // 4. Fetch topics, relationships, and attached resources for all nodes in parallel
        const [topics, rawRelationships, resourcesMap] = await Promise.all([
          readCatalogRowsByIds(nodeIds, (batch, from, to) => supabase.from('career_roadmap_node_topics').select('*').in('node_id', batch).order('sequence').order('id').range(from,to)),
          readCatalogRowsByIds(nodeIds, (batch, from, to) => supabase.from('career_roadmap_node_relationships').select('*').in('source_node_id', batch).order('id').range(from,to)),
          nodeIds.length > 0
            ? getNodesResourcesMap(nodeIds, true)
            : Promise.resolve({} as Record<string, CareerNodeResourceView[]>),
        ]);
        const nodeSet = new Set(nodeIds);
        const relationships = rawRelationships.filter(r => nodeSet.has(r.target_node_id));

        // 5. Build composite structure
        const topicsMap: Record<string, CareerRoadmapNodeTopic[]> = {};
        for (const topic of (topics ?? [])) {
          if (!topicsMap[topic.node_id]) topicsMap[topic.node_id] = [];
          topicsMap[topic.node_id].push(topic);
        }

        const nodesMap: Record<
          string,
          (CareerRoadmapNode & {
            topics: CareerRoadmapNodeTopic[];
            resources?: CareerNodeResourceView[];
          })[]
        > = {};
        for (const node of allNodes) {
          if (!nodesMap[node.section_id]) nodesMap[node.section_id] = [];
          nodesMap[node.section_id].push({
            ...node,
            topics: topicsMap[node.id] ?? [],
            resources: resourcesMap[node.id] ?? [],
          });
        }

        const sectionsWithNodes = sections.map((section) => ({
          ...section,
          nodes: nodesMap[section.id] ?? [],
        }));

        return {
          roadmap,
          sections: sectionsWithNodes,
          relationships: relationships ?? [],
          stats: {
            total_sections: sections.length,
            total_nodes: allNodes.length,
          },
        };
      }
    }
  } catch (error) { throw error; }

  // Fallback to structured catalog
  return overrides.has(normalizedSlug) ? null : getCatalogRoadmapDetail(normalizedSlug);
}

// ── Admin API helpers ──────────────────────────────────────────────────────

/** Get all roadmaps for admin (including inactive) */
export async function getAdminRoadmaps() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('career_roadmaps')
    .select('*')
    .order('updated_at', { ascending: false });
  return { data: data ?? [], error };
}

/** Get single roadmap by id for admin */
export async function getAdminRoadmapById(id: string) {
  const supabase = await createClient();
  return supabase
    .from('career_roadmaps')
    .select('*')
    .eq('id', id)
    .maybeSingle();
}

/** Get full roadmap with sections, nodes, and attached resources for admin builder */
export async function getAdminRoadmapDetail(id: string) {
  const supabase = await createClient();

  const [
    { data: roadmap, error: rmErr },
    { data: sections },
  ] = await Promise.all([
    supabase.from('career_roadmaps').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('career_roadmap_sections')
      .select('*')
      .eq('roadmap_id', id)
      .order('sequence', { ascending: true }),
  ]);

  if (rmErr || !roadmap) return null;

  const sectionIds = (sections ?? []).map((s) => s.id);

  const nodes = await readCatalogRowsByIds(sectionIds, (batch, from, to) => supabase
        .from('career_roadmap_nodes')
        .select('*')
        .in('section_id', batch)
        .order('sequence', { ascending: true }).order('id').range(from,to));

  const allNodes = nodes ?? [];
  const nodeIds = allNodes.map((n) => n.id);

  const [topics, rawRelationships, adminResourcesMap] = await Promise.all([
    readCatalogRowsByIds(nodeIds, (batch, from, to) => supabase.from('career_roadmap_node_topics').select('*').in('node_id', batch).order('sequence').order('id').range(from,to)),
    readCatalogRowsByIds(nodeIds, (batch, from, to) => supabase.from('career_roadmap_node_relationships').select('*').in('source_node_id', batch).order('id').range(from,to)),
    nodeIds.length > 0
      ? getNodesResourcesMap(nodeIds, false)
      : Promise.resolve({} as Record<string, CareerNodeResourceView[]>),
  ]);
  const nodeSet = new Set(nodeIds);
  const rels = rawRelationships.filter(r => nodeSet.has(r.target_node_id));

  const topicsMap: Record<string, CareerRoadmapNodeTopic[]> = {};
  for (const t of (topics ?? [])) {
    if (!topicsMap[t.node_id]) topicsMap[t.node_id] = [];
    topicsMap[t.node_id].push(t);
  }

  const nodesMap: Record<string, any[]> = {};
  for (const n of allNodes) {
    if (!nodesMap[n.section_id]) nodesMap[n.section_id] = [];
    nodesMap[n.section_id].push({
      ...n,
      topics: topicsMap[n.id] ?? [],
      resources: adminResourcesMap[n.id] ?? [],
    });
  }

  return {
    roadmap,
    sections: (sections ?? []).map((s) => ({
      ...s,
      nodes: nodesMap[s.id] ?? [],
    })),
    relationships: rels ?? [],
    allNodes,
    stats: {
      total_sections: (sections ?? []).length,
      total_nodes: allNodes.length,
    },
  };
}

/** Check if slug is available (for create/update) */
export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase
    .from('career_roadmaps')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug);
  if (excludeId) query = query.neq('id', excludeId);
  const { count } = await query;
  return (count ?? 0) === 0;
}

export function validateRelationshipPayload(
  payload: Partial<CreateRelationshipPayload>
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!payload.source_node_id?.trim()) {
    errors.push({ field: 'source_node_id', message: 'Source node is required.' });
  }
  if (!payload.target_node_id?.trim()) {
    errors.push({ field: 'target_node_id', message: 'Target node is required.' });
  }
  if (payload.source_node_id && payload.target_node_id && payload.source_node_id === payload.target_node_id) {
    errors.push({ field: 'target_node_id', message: 'A node cannot have a relationship with itself.' });
  }
  if (!payload.relationship_type || !VALID_RELATIONSHIP_TYPES.has(payload.relationship_type)) {
    errors.push({ field: 'relationship_type', message: 'Invalid relationship type.' });
  }

  return errors;
}

/**
 * Checks if adding edge sourceId -> targetId would cause a directed cycle.
 * Does a BFS starting from targetId to see if sourceId is reachable.
 */
export function checkRelationshipCausesCycle(
  sourceId: string,
  targetId: string,
  existingEdges: Array<{ source_node_id: string; target_node_id: string }>
): boolean {
  if (sourceId === targetId) return true;

  // Build adjacency list for existing directed edges
  const adj = new Map<string, string[]>();
  for (const edge of existingEdges) {
    if (!adj.has(edge.source_node_id)) adj.set(edge.source_node_id, []);
    adj.get(edge.source_node_id)!.push(edge.target_node_id);
  }

  // If we can reach sourceId starting from targetId, then adding sourceId -> targetId creates a cycle
  const visited = new Set<string>();
  const queue: string[] = [targetId];
  visited.add(targetId);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === sourceId) return true;

    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return false;
}

/**
 * Verifies that two nodes both belong to the given roadmap.
 */
export async function verifyNodesBelongToRoadmap(
  roadmapId: string,
  nodeIds: string[]
): Promise<boolean> {
  if (nodeIds.length === 0) return true;
  const supabase = await createClient();

  // Query nodes joining sections to check roadmap_id
  const { data: nodes, error } = await supabase
    .from('career_roadmap_nodes')
    .select('id, career_roadmap_sections!inner(roadmap_id)')
    .in('id', nodeIds);

  if (error || !nodes || nodes.length !== nodeIds.length) {
    return false;
  }

  for (const node of nodes) {
    const sec = node.career_roadmap_sections as any;
    if (!sec || sec.roadmap_id !== roadmapId) {
      return false;
    }
  }

  return true;
}

/**
 * Duplicates a roadmap, its sections, nodes, topics, relationships, and attached resources.
 * Sets the duplicated roadmap as a draft (is_active = false) with a unique slug and title.
 * Does NOT duplicate central shared resources (Phase 2 compliance).
 */
export async function duplicateRoadmap(
  sourceId: string
): Promise<{ data: CareerRoadmap | null; error: string | null }> {
  const supabase = await createClient();

  // 1. Fetch full source roadmap detail
  const detail = await getAdminRoadmapDetail(sourceId);
  if (!detail || !detail.roadmap) {
    return { data: null, error: 'Source roadmap not found.' };
  }

  const { roadmap: src, sections: srcSections, relationships: srcRels } = detail;

  // 2. Generate new unique slug and title
  const baseSlug = `${src.slug}-copy`;
  let newSlug = baseSlug;
  let counter = 1;
  while (!(await isSlugAvailable(newSlug))) {
    counter++;
    newSlug = `${baseSlug}-${counter}`;
  }

  const newTitle = counter > 1 ? `${src.title} (Copy ${counter})` : `${src.title} (Copy)`;

  // 3. Insert new roadmap as draft
  const { data: newRoadmap, error: rmErr } = await supabase
    .from('career_roadmaps')
    .insert({
      title: newTitle,
      slug: newSlug,
      short_description: src.short_description,
      description: src.description,
      category: src.category,
      difficulty: src.difficulty,
      estimated_duration: src.estimated_duration,
      thumbnail_url: src.thumbnail_url,
      seo_title: src.seo_title ? `${src.seo_title} (Copy)` : null,
      seo_description: src.seo_description,
      is_active: false,
    })
    .select('*')
    .single();

  if (rmErr || !newRoadmap) {
    return { data: null, error: rmErr?.message || 'Failed to create duplicate roadmap.' };
  }

  const nodeMap = new Map<string, string>(); // oldNodeId -> newNodeId

  // 4. Duplicate sections and nodes
  for (const sec of srcSections) {
    const { data: newSec, error: secErr } = await supabase
      .from('career_roadmap_sections')
      .insert({
        roadmap_id: newRoadmap.id,
        title: sec.title,
        slug: sec.slug,
        description: sec.description,
        sequence: sec.sequence,
        is_required: sec.is_required,
        is_active: sec.is_active,
      })
      .select('*')
      .single();

    if (secErr || !newSec) continue;

    for (const node of sec.nodes) {
      const { data: newNode, error: nodeErr } = await supabase
        .from('career_roadmap_nodes')
        .insert({
          section_id: newSec.id,
          title: node.title,
          slug: node.slug,
          description: node.description,
          node_type: node.node_type,
          difficulty: node.difficulty,
          estimated_minutes: node.estimated_minutes,
          sequence: node.sequence,
          is_required: node.is_required,
          is_active: node.is_active,
        })
        .select('*')
        .single();

      if (nodeErr || !newNode) continue;
      nodeMap.set(node.id, newNode.id);

      // Duplicate topics
      if (node.topics && node.topics.length > 0) {
        const topicsPayload = node.topics.map((t: any) => ({
          node_id: newNode.id,
          topic: t.topic,
          sequence: t.sequence,
        }));
        await supabase.from('career_roadmap_node_topics').insert(topicsPayload);
      }

      // Duplicate attached resources (reuse existing central resources, DO NOT duplicate resources!)
      if (node.resources && node.resources.length > 0) {
        const nrPayload = node.resources.map((r: any) => ({
          node_id: newNode.id,
          resource_id: r.resource_id,
          priority: r.priority,
          is_recommended: r.is_recommended,
        }));
        await supabase.from('career_roadmap_node_resources').insert(nrPayload);
      }
    }
  }

  // 5. Duplicate relationships using mapped IDs
  if (srcRels && srcRels.length > 0) {
    const relsPayload = [];
    for (const rel of srcRels) {
      const newSourceId = nodeMap.get(rel.source_node_id);
      const newTargetId = nodeMap.get(rel.target_node_id);
      if (newSourceId && newTargetId && newSourceId !== newTargetId) {
        relsPayload.push({
          source_node_id: newSourceId,
          target_node_id: newTargetId,
          relationship_type: rel.relationship_type,
        });
      }
    }
    if (relsPayload.length > 0) {
      await supabase.from('career_roadmap_node_relationships').insert(relsPayload);
    }
  }

  return { data: newRoadmap, error: null };
}


/** Public tombstones contain no draft metadata or internal IDs. */
export async function getRoadmapOverrides(slugs: string[]): Promise<Map<string, boolean>> {
  if (!slugs.length) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('phase_a_roadmap_overrides', { slugs });
  if (error && (error as { code?: string }).code === 'PGRST202') {
    const { data: tableData, error: tableError } = await supabase
      .from('career_roadmaps')
      .select('slug, is_active')
      .in('slug', slugs);
    requireDatabaseResult(tableError, 'Roadmap catalog precedence');
    if (!Array.isArray(tableData)) throw new Error('Invalid roadmap precedence response.');
    return new Map(tableData.map((row: { slug: string; is_active: boolean }) => [row.slug, row.is_active]));
  }
  requireDatabaseResult(error, 'Roadmap catalog precedence');
  if (!Array.isArray(data)) throw new Error('Invalid roadmap precedence response.');
  return new Map(data.map((row: { slug: string; is_active: boolean }) => [row.slug, row.is_active]));
}
