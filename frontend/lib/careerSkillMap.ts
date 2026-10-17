import { requireDatabaseResult, readCatalogRows } from './catalogIntegrity';
/**
 * KnowledgePaat — Career-Skill Mapping Service
 * Phase A — Foundation
 */

import { createClient } from '@/utils/supabase/server';
import type {
  CareerSkillMapItem,
  SkillImportance,
  ProficiencyTarget,
} from '@/types/careerSkillGraph';

/**
 * Get all skills mapped to a career (partitioned or sorted by importance & order).
 */
export async function getCareerSkills(careerId: string): Promise<CareerSkillMapItem[]> {
  const supabase = await createClient();

  const data = await readCatalogRows((from, to) => supabase
    .from('career_skill_map')
    .select(`
      *,
      skill:skill_catalog!career_skill_map_skill_id_fkey(*)
    `)
    .eq('career_id', careerId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to));

  
  if (!data) throw new Error('Catalog returned an invalid result.');
  return data as CareerSkillMapItem[];
}

/**
 * Get all published skills mapped to a published career by career slug.
 */
export async function getPublicCareerSkillsBySlug(careerSlug: string): Promise<{
  required: CareerSkillMapItem[];
  recommended: CareerSkillMapItem[];
  optional: CareerSkillMapItem[];
}> {
  const supabase = await createClient();

  const { data: career, error: careerError } = await supabase
    .from('career_catalog')
    .select('id')
    .eq('slug', careerSlug.toLowerCase().trim())
    .eq('status', 'published')
    .maybeSingle();

  requireDatabaseResult(careerError, 'Public career lookup');
  if (!career) {
    return { required: [], recommended: [], optional: [] };
  }

  const mappings = await readCatalogRows((from, to) => supabase
    .from('career_skill_map')
    .select(`
      *,
      skill:skill_catalog!career_skill_map_skill_id_fkey(*)
    `)
    .eq('career_id', career.id)
    .order('display_order', { ascending: true }).order('id').range(from, to));
  const result = {
    required: [] as CareerSkillMapItem[],
    recommended: [] as CareerSkillMapItem[],
    optional: [] as CareerSkillMapItem[],
  };

  if (mappings) {
    for (const item of mappings) {
      if (!item.skill || item.skill.status !== 'published') continue;
      if (item.importance === 'required') {
        result.required.push(item);
      } else if (item.importance === 'recommended') {
        result.recommended.push(item);
      } else {
        result.optional.push(item);
      }
    }
  }

  return result;
}

/**
 * Get all careers using a specific skill.
 */
export async function getSkillCareers(skillId: string): Promise<CareerSkillMapItem[]> {
  const supabase = await createClient();

  const data = await readCatalogRows((from, to) => supabase
    .from('career_skill_map')
    .select(`
      *,
      career:career_catalog!career_skill_map_career_id_fkey(*)
    `)
    .eq('skill_id', skillId)
    .order('importance', { ascending: true }).order('id').range(from, to));
  if (!data) throw new Error('Catalog returned an invalid result.');
  return data as CareerSkillMapItem[];
}

/**
 * Attach a skill to a career.
 */
export async function attachSkillToCareer(params: {
  career_id: string;
  skill_id: string;
  importance?: SkillImportance;
  proficiency_target?: ProficiencyTarget;
  display_order?: number;
  is_core?: boolean;
  notes?: string;
}): Promise<{ success: boolean; mapping?: CareerSkillMapItem; error?: string }> {
  const {
    career_id,
    skill_id,
    importance = 'recommended',
    proficiency_target = 'working',
    display_order = 1,
    is_core = false,
    notes,
  } = params;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('career_skill_map')
    .insert({
      career_id,
      skill_id,
      importance,
      proficiency_target,
      display_order,
      is_core,
      notes: notes || null,
    })
    .select(`
      *,
      skill:skill_catalog!career_skill_map_skill_id_fkey(*)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'This skill is already mapped to this career.' };
    }
    requireDatabaseResult(error, 'Catalog mutation');
    return { success: false, error: 'Catalog mutation failed.' };
  }

  return { success: true, mapping: data as CareerSkillMapItem };
}

/**
 * Update an existing career-skill mapping.
 */
export async function updateCareerSkillMapping(
  mappingId: string,
  updates: Partial<{
    importance: SkillImportance;
    proficiency_target: ProficiencyTarget;
    display_order: number;
    is_core: boolean;
    notes: string | null;
  }>
): Promise<{ success: boolean; mapping?: CareerSkillMapItem; error?: string }> {
  const supabase = await createClient();

  const allowed = ['importance', 'proficiency_target', 'display_order', 'is_core', 'notes'];
  if (Object.keys(updates).some(key => !allowed.includes(key))) {
    return { success: false, error: 'Unsupported mapping field.' };
  }
  const { data, error } = await supabase
    .from('career_skill_map')
    .update(updates)
    .eq('id', mappingId)
    .select(`
      *,
      skill:skill_catalog!career_skill_map_skill_id_fkey(*)
    `)
    .single();

  requireDatabaseResult(error, 'Catalog mutation');
  return { success: true, mapping: data as CareerSkillMapItem };
}

/**
 * Detach a skill from a career.
 */
export async function detachSkillFromCareer(
  careerId: string,
  skillId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('career_skill_map')
    .delete()
    .eq('career_id', careerId)
    .eq('skill_id', skillId);

  requireDatabaseResult(error, 'Catalog mutation');
  return { success: true };
}
