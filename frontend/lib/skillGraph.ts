import { requireDatabaseResult, catalogPage, readCatalogRows } from './catalogIntegrity';
/**
 * KnowledgePaat — Skill Graph Service
 * Phase A — Dependency Graph & Cycle Detection
 */

import { createClient } from '@/utils/supabase/server';
import type { ComposerSnapshot } from '@/types/roadmapComposer';
import type {
  SkillRelationshipItem,
  SkillRelationshipType,
  SkillGraphData,
} from '@/types/careerSkillGraph';

/** One scoped, consistent snapshot; includes hidden prerequisites for validation. */
export async function getCareerCompositionSnapshot(careerId: string): Promise<{ snapshot: ComposerSnapshot; fingerprint: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('phase_b_composer_snapshot', { career_id: careerId });
  if (error) throw error;
  if (!data?.snapshot?.career || !Array.isArray(data.snapshot.skills) || !Array.isArray(data.snapshot.mappings) || !Array.isArray(data.snapshot.edges) || !Array.isArray(data.snapshot.resources) || !/^[a-f0-9]{32}$/.test(data.fingerprint)) throw new Error('Invalid composition snapshot.');
  return data;
}

/**
 * Checks whether adding a directed prerequisite edge (source -> target)
 * would create a circular dependency cycle.
 *
 * An edge (source -> target) creates a cycle if and only if there already
 * exists a directed path from target to source in the prerequisite graph.
 */
export async function wouldCreatePrerequisiteCycle(
  sourceSkillId: string,
  targetSkillId: string,
  excludeRelationshipId?: string
): Promise<boolean> {
  if (sourceSkillId === targetSkillId) return true;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('phase_a_would_cycle', {
    source_id: sourceSkillId, target_id: targetSkillId, excluded_id: excludeRelationshipId || null,
  });
  requireDatabaseResult(error, 'Prerequisite validation');
  if (typeof data !== 'boolean') throw new Error('Prerequisite validation returned an invalid result.');
  return data;
}

/**
 * Get all relationships for a skill (both incoming and outgoing).
 */
export async function getSkillRelationships(skillId: string, publicOnly = false, page = 1): Promise<{
  prerequisites: SkillRelationshipItem[];
  builds_on: SkillRelationshipItem[];
  related: SkillRelationshipItem[];
  commonly_used_with: SkillRelationshipItem[];
  alternatives: SkillRelationshipItem[];
  dependents: SkillRelationshipItem[];
  page: number; total: number; totalPages: number;
}> {
  const supabase = await createClient();

  const { from, to } = catalogPage(page, 100);
  let query = supabase.from('skill_relationships').select(
    '*, source_skill:skill_catalog!skill_relationships_source_skill_id_fkey!inner(*), target_skill:skill_catalog!skill_relationships_target_skill_id_fkey!inner(*)',
    { count: 'exact' }
  ).or('source_skill_id.eq.' + skillId + ',target_skill_id.eq.' + skillId).order('id').range(from, to);
  if (publicOnly) query = query.eq('source_skill.status', 'published').eq('target_skill.status', 'published');
  const { data, error, count } = await query;
  requireDatabaseResult(error, 'Skill relationships');
  if (!data) throw new Error('Invalid relationship result.');
  const filtered = publicOnly ? data.filter(r => r.source_skill?.status === 'published' && r.target_skill?.status === 'published') : data;
  const seenAssociations = new Set<string>();
  const visible = filtered.filter(r => {
    if (!['related', 'alternative', 'commonly_used_with'].includes(r.relationship_type)) return true;
    const key = r.relationship_type + ':' + [r.source_skill_id, r.target_skill_id].sort().join(':');
    if (seenAssociations.has(key)) return false;
    seenAssociations.add(key);
    return true;
  });
  const incoming = visible.filter(r => r.target_skill_id === skillId);
  const outgoing = visible.filter(r => r.source_skill_id === skillId);
  const res = {
    dependents: [] as SkillRelationshipItem[],
    page, total: count || 0, totalPages: Math.ceil((count || 0) / 100),
    prerequisites: [] as SkillRelationshipItem[],
    builds_on: [] as SkillRelationshipItem[],
    related: [] as SkillRelationshipItem[],
    commonly_used_with: [] as SkillRelationshipItem[],
    alternatives: [] as SkillRelationshipItem[],
  };

  // If A is prerequisite to this skill (incoming prerequisite): A is prerequisite of this skill
  if (incoming) {
    for (const item of incoming) {
      if (item.relationship_type === 'prerequisite') {
        res.prerequisites.push(item);
      } else if (item.relationship_type === 'builds_on') {
        res.builds_on.push(item);
      } else if (item.relationship_type === 'related') res.related.push(item);
      else if (item.relationship_type === 'alternative') res.alternatives.push(item);
      else if (item.relationship_type === 'commonly_used_with') res.commonly_used_with.push(item);
    }
  }

  // If this skill is prerequisite to B (outgoing): this skill leads to B / builds on
  if (outgoing) {
    for (const item of outgoing) {
      if (item.relationship_type === 'prerequisite') res.dependents.push(item);
      else if (item.relationship_type === 'related') {
        res.related.push(item);
      } else if (item.relationship_type === 'commonly_used_with') {
        res.commonly_used_with.push(item);
      } else if (item.relationship_type === 'alternative') {
        res.alternatives.push(item);
      } else if (item.relationship_type === 'builds_on') {
        res.builds_on.push(item);
      }
    }
  }

  return res;
}

/**
 * Create a new relationship between two skills with cycle validation.
 */
export async function createSkillRelationship(params: {
  source_skill_id: string;
  target_skill_id: string;
  relationship_type: SkillRelationshipType;
  strength?: number;
  notes?: string;
}): Promise<{ success: boolean; relationship?: SkillRelationshipItem; error?: string }> {
  const { source_skill_id, target_skill_id, relationship_type, strength = 1.0, notes } = params;

  // Preserve the existing editor's 1–5 scale and fractional seed strengths.
  if (!source_skill_id || !target_skill_id || !['prerequisite','builds_on','related','commonly_used_with','alternative'].includes(relationship_type) || !Number.isFinite(strength) || strength < 0 || strength > 5) return { success: false, error: 'Invalid skill relationship.' };
  if (source_skill_id === target_skill_id) {
    return { success: false, error: 'A skill cannot have a relationship with itself.' };
  }

  // Prerequisite cycle detection
  if (relationship_type === 'prerequisite') {
    const isCycle = await wouldCreatePrerequisiteCycle(source_skill_id, target_skill_id);
    if (isCycle) {
      return {
        success: false,
        error: 'Invalid prerequisite: This would create a circular dependency cycle.',
      };
    }
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('skill_relationships')
    .insert({
      source_skill_id,
      target_skill_id,
      relationship_type,
      strength,
      notes: notes || null,
    })
    .select(`
      *,
      source_skill:skill_catalog!skill_relationships_source_skill_id_fkey(*),
      target_skill:skill_catalog!skill_relationships_target_skill_id_fkey(*)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'This relationship already exists.' };
    }
    if (error.code === '23514') return { success: false, error: 'Relationship violates graph integrity.' };
    requireDatabaseResult(error, 'Relationship insertion');
  }

  return { success: true, relationship: data };
}

/**
 * Delete a relationship.
 */
export async function deleteSkillRelationship(relationshipId: string, parentSkillId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('skill_relationships')
    .delete()
    .eq('id', relationshipId)
    .or('source_skill_id.eq.' + parentSkillId + ',target_skill_id.eq.' + parentSkillId)
    .select('id');

  requireDatabaseResult(error, 'Relationship deletion');
  if (!data?.length) return { success: false, error: 'Relationship not found in this skill.' };
  return { success: true };
}

/**
 * Get entire or scoped skill graph data for Admin graph inspection.
 */
export async function getSkillGraphData(category?: string, page = 1): Promise<SkillGraphData> {
  const supabase = await createClient();

  let skillQuery = supabase
    .from('skill_catalog')
    .select('id, slug, name, category, skill_type, difficulty, status', { count: 'exact' });

  if (category && category !== 'all') {
    skillQuery = skillQuery.eq('category', category);
  }

  const { from, to } = catalogPage(page, 100);
  const { data: skills, error: skillError, count } = await skillQuery.order('id').range(from, to);
  requireDatabaseResult(skillError, 'Graph nodes');
  if (!skills || skills.length === 0) {
    return { nodes: [], edges: [] };
  }

  const skillIds = new Set(skills.map((s) => s.id));

  // Count career mappings for each skill
  const mappings = await readCatalogRows((from, to) => supabase.from('career_skill_map').select('skill_id').in('skill_id', [...skillIds]).order('id').range(from, to));

  const careerCountMap = new Map<string, number>();
  if (mappings) {
    for (const m of mappings) {
      careerCountMap.set(m.skill_id, (careerCountMap.get(m.skill_id) || 0) + 1);
    }
  }

  const nodes = skills.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    category: s.category,
    skill_type: s.skill_type,
    difficulty: s.difficulty,
    status: s.status,
    career_count: careerCountMap.get(s.id) || 0,
  }));

  // Fetch edges connecting visible nodes
  const relationships = await readCatalogRows((from, to) => supabase.from('skill_relationships').select('id, source_skill_id, target_skill_id, relationship_type, strength').in('source_skill_id', [...skillIds]).in('target_skill_id', [...skillIds]).order('id').range(from, to), 10000);

  const edges = (relationships || [])
    .filter((r) => skillIds.has(r.source_skill_id) && skillIds.has(r.target_skill_id))
    .map((r) => ({
      id: r.id,
      source: r.source_skill_id,
      target: r.target_skill_id,
      relationship_type: r.relationship_type,
      strength: r.strength,
    }));

  return { nodes, edges, page, totalPages: Math.ceil((count || 0) / 100) };
}
