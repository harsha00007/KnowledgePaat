/**
 * KnowledgePaat — Career Roadmap Platform
 * Phase 4 — Catalog Bridge
 *
 * Converts static structured roadmap definitions into full RoadmapDetail and
 * RoadmapCard objects seamlessly, ensuring the entire catalog is available
 * both in server components and offline tests without requiring manual DB insertions.
 */

import type {
  RoadmapDetail,
  RoadmapCard,
  CareerRoadmapNodeRelationship,
} from '@/types/roadmap';
import type { RoadmapContentDefinition } from '@/content/roadmaps/types';
import { ROADMAP_CATALOG, getCatalogRoadmapBySlug } from '@/content/roadmaps/catalog';
import { classifyRoadmap } from './roadmapTaxonomy';

/**
 * Transforms a RoadmapContentDefinition into a full RoadmapDetail
 */
export function catalogDefinitionToRoadmapDetail(
  def: RoadmapContentDefinition
): RoadmapDetail {
  const roadmapId = `rm-${def.slug}`;

  const sections = def.sections.map((sec) => {
    const sectionId = `sec-${def.slug}-${sec.slug}`;
    const nodes = sec.nodes.map((node) => {
      const nodeId = `node-${def.slug}-${node.slug}`;
      const topics = node.topics.map((top, tIdx) => ({
        id: `top-${nodeId}-${tIdx + 1}`,
        node_id: nodeId,
        topic: top,
        sequence: tIdx + 1,
      }));

      const resources = (node.resources || []).map((res, rIdx) => ({
        id: `res-${nodeId}-${rIdx + 1}`,
        title: res.title,
        description: res.description,
        resource_type: res.resource_type,
        provider: res.provider,
        url: res.url,
        thumbnail_url: null,
        duration_minutes: null,
        difficulty: res.difficulty,
        category: def.category,
        is_free: res.is_free,
        price: null,
        currency: 'INR',
        language: 'English',
        instructor: null,
        rating: null,
        is_recommended: res.is_recommended,
        priority: res.priority,
        is_active: true,
        created_by: null,
        created_at: '2026-10-06T00:00:00Z',
        updated_at: '2026-10-06T00:00:00Z',
        node_resource_id: `nr-${nodeId}-${rIdx + 1}`,
        node_id: nodeId,
        resource_id: `res-${nodeId}-${rIdx + 1}`,
      }));

      return {
        id: nodeId,
        section_id: sectionId,
        title: node.title,
        slug: node.slug,
        description: node.description,
        node_type: node.node_type,
        difficulty: node.difficulty,
        estimated_minutes: node.estimated_minutes,
        sequence: node.sequence,
        is_required: node.is_required,
        is_active: true,
        created_at: '2026-10-06T00:00:00Z',
        updated_at: '2026-10-06T00:00:00Z',
        topics,
        resources,
      };
    });

    return {
      id: sectionId,
      roadmap_id: roadmapId,
      title: sec.title,
      slug: sec.slug,
      description: sec.description,
      sequence: sec.sequence,
      is_required: sec.is_required,
      is_active: true,
      created_at: '2026-10-06T00:00:00Z',
      updated_at: '2026-10-06T00:00:00Z',
      nodes,
    };
  });

  // Build relationships
  const relationships: CareerRoadmapNodeRelationship[] = [];
  const nodeSlugToId = new Map<string, string>();
  for (const sec of sections) {
    for (const node of sec.nodes) {
      nodeSlugToId.set(node.slug, node.id);
    }
  }

  for (const sec of def.sections) {
    for (const node of sec.nodes) {
      const targetId = nodeSlugToId.get(node.slug);
      if (!targetId) continue;
      if (node.prerequisites) {
        for (const prereqSlug of node.prerequisites) {
          const sourceId = nodeSlugToId.get(prereqSlug);
          if (sourceId && sourceId !== targetId) {
            relationships.push({
              id: `rel-${sourceId}-${targetId}-prereq`,
              source_node_id: sourceId,
              target_node_id: targetId,
              relationship_type: 'PREREQUISITE',
              created_at: '2026-10-06T00:00:00Z',
            });
          }
        }
      }
    }
  }

  const totalNodes = sections.reduce((acc, s) => acc + s.nodes.length, 0);

  return {
    roadmap: {
      id: roadmapId,
      title: def.title,
      slug: def.slug,
      short_description: def.short_description,
      description: def.description,
      category: def.category,
      difficulty: def.difficulty,
      estimated_duration: def.estimated_duration,
      thumbnail_url: null,
      seo_title: def.seo_title || `${def.title} Career Roadmap | KnowledgePaat`,
      seo_description: def.seo_description || def.short_description,
      is_active: def.is_active,
      created_by: null,
      created_at: '2026-10-06T00:00:00Z',
      updated_at: '2026-10-06T00:00:00Z',
    },
    sections,
    relationships,
    stats: {
      total_sections: sections.length,
      total_nodes: totalNodes,
    },
  };
}

/**
 * Transforms a RoadmapContentDefinition into a lightweight RoadmapCard
 */
export function catalogDefinitionToRoadmapCard(
  def: RoadmapContentDefinition
): RoadmapCard {
  const sectionCount = def.sections.length;
  const nodeCount = def.sections.reduce((acc, s) => acc + s.nodes.length, 0);

  // Extract skills from node titles & topics
  const skillsSet = new Set<string>();
  def.sections.forEach((s) => {
    s.nodes.forEach((n) => {
      skillsSet.add(n.title);
      n.topics?.slice(0, 2).forEach((t) => skillsSet.add(t));
    });
  });

  return {
    id: `rm-${def.slug}`,
    title: def.title,
    slug: def.slug,
    short_description: def.short_description,
    category: def.category,
    difficulty: def.difficulty,
    estimated_duration: def.estimated_duration,
    thumbnail_url: null,
    is_active: def.is_active,
    section_count: sectionCount,
    node_count: nodeCount,
    updated_at: '2026-10-06T00:00:00Z',
    classification: classifyRoadmap(def.slug, def.category),
    skills: Array.from(skillsSet).slice(0, 5),
  };
}

/**
 * Gets all catalog cards, optionally filtered
 */
export function getCatalogRoadmapCards(filters?: {
  search?: string;
  category?: string;
  difficulty?: string;
  type?: string;
}): RoadmapCard[] {
  let list = ROADMAP_CATALOG.filter((rm) => rm.is_active);

  if (filters?.type && filters.type !== 'all') {
    const targetType = filters.type.toUpperCase();
    list = list.filter((rm) => rm.type === targetType);
  }

  if (filters?.category && filters.category !== 'all') {
    const targetCat = filters.category.toLowerCase();
    list = list.filter((rm) => rm.category.toLowerCase() === targetCat);
  }

  if (filters?.difficulty && filters.difficulty !== 'all') {
    list = list.filter((rm) => rm.difficulty === filters.difficulty);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (rm) =>
        rm.title.toLowerCase().includes(q) ||
        rm.short_description.toLowerCase().includes(q) ||
        rm.sections.some(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.nodes.some(
              (n) =>
                n.title.toLowerCase().includes(q) ||
                n.topics?.some((t) => t.toLowerCase().includes(q))
            )
        )
    );
  }

  return list.map(catalogDefinitionToRoadmapCard);
}

/**
 * Gets a RoadmapDetail from the catalog by slug
 */
export function getCatalogRoadmapDetail(slug: string): RoadmapDetail | null {
  const def = getCatalogRoadmapBySlug(slug);
  if (!def || !def.is_active) return null;
  return catalogDefinitionToRoadmapDetail(def);
}
