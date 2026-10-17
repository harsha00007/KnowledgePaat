import { requireDatabaseResult, catalogPage, catalogSearch, readCatalogRows } from './catalogIntegrity';
/**
 * KnowledgePaat — Skill Catalog Service
 * Phase A — Foundation
 */

import { createClient } from '@/utils/supabase/server';
import type {
  SkillCatalogItem,
  SkillType,
  SkillDifficulty,
  SkillStatus,
} from '@/types/careerSkillGraph';

export function toSafeSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface SkillFilters {
  search?: string;
  category?: string;
  skill_type?: string;
  difficulty?: string;
  status?: string;
  is_featured?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedSkills {
  items: SkillCatalogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Public: Fetch published skills only with search, category filtering & pagination.
 */
export async function getPublicSkills(filters: SkillFilters = {}): Promise<PaginatedSkills> {
  const supabase = await createClient();
  const { page, limit, from, to } = catalogPage(filters.page, filters.limit);

  let query = supabase
    .from('skill_catalog')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true }).order('id', { ascending: true })
    .range(from, to);

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  if (filters.skill_type && filters.skill_type !== 'all') {
    query = query.eq('skill_type', filters.skill_type);
  }
  if (filters.difficulty && filters.difficulty !== 'all') {
    query = query.eq('difficulty', filters.difficulty);
  }
  if (filters.is_featured !== undefined) {
    query = query.eq('is_featured', filters.is_featured);
  }
  if (filters.search?.trim()) {
    const q = `%${catalogSearch(filters.search)}%`;
    query = query.or(`name.ilike.${q},short_description.ilike.${q},description.ilike.${q}`);
  }

  const { data, count, error } = await query;
  requireDatabaseResult(error, 'Catalog list');
  if (!data) throw new Error('Catalog returned an invalid result.');

  const total = count || 0;
  return {
    items: data as SkillCatalogItem[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Public: Fetch single published skill by slug.
 */
export async function getPublicSkillBySlug(slug: string): Promise<SkillCatalogItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('skill_catalog')
    .select('*')
    .eq('slug', slug.toLowerCase().trim())
    .eq('status', 'published')
    .maybeSingle();

  requireDatabaseResult(error, 'Catalog detail');
  if (!data) return null;
  return data as SkillCatalogItem;
}

/**
 * Admin: Fetch skills (all statuses) with filters.
 */
export async function getAdminSkills(filters: SkillFilters = {}): Promise<PaginatedSkills> {
  const supabase = await createClient();
  const { page, limit, from, to } = catalogPage(filters.page, filters.limit);

  let query = supabase
    .from('skill_catalog')
    .select('*', { count: 'exact' })
    .order('display_order', { ascending: true })
    .order('updated_at', { ascending: false }).order('id', { ascending: true })
    .range(from, to);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  if (filters.skill_type && filters.skill_type !== 'all') {
    query = query.eq('skill_type', filters.skill_type);
  }
  if (filters.difficulty && filters.difficulty !== 'all') {
    query = query.eq('difficulty', filters.difficulty);
  }
  if (filters.search?.trim()) {
    const q = `%${catalogSearch(filters.search)}%`;
    query = query.or(`name.ilike.${q},slug.ilike.${q},short_description.ilike.${q}`);
  }

  const { data, count, error } = await query;
  requireDatabaseResult(error, 'Catalog list');
  if (!data) throw new Error('Catalog returned an invalid result.');

  // Count careers for each returned skill
  const skillIds = data.map((s) => s.id);
  const mappings = skillIds.length ? await readCatalogRows((from, to) => supabase.from('career_skill_map').select('skill_id').in('skill_id', skillIds).order('id').range(from, to)) : [];

  const careerCountMap = new Map<string, number>();
  if (mappings) {
    for (const m of mappings) {
      careerCountMap.set(m.skill_id, (careerCountMap.get(m.skill_id) || 0) + 1);
    }
  }

  const items = data.map((s) => ({
    ...s,
    career_count: careerCountMap.get(s.id) || 0,
  })) as SkillCatalogItem[];

  const total = count || 0;
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Admin: Fetch single skill by ID.
 */
export async function getAdminSkillById(id: string): Promise<SkillCatalogItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('skill_catalog')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  requireDatabaseResult(error, 'Catalog detail');
  if (!data) return null;
  return data as SkillCatalogItem;
}

/**
 * Create a new skill record.
 */
export async function createSkill(payload: {
  name: string;
  slug?: string;
  short_description?: string;
  description?: string;
  category?: string;
  skill_type?: SkillType;
  difficulty?: SkillDifficulty;
  status?: SkillStatus;
  icon?: string;
  display_order?: number;
  is_featured?: boolean;
}): Promise<{ success: boolean; skill?: SkillCatalogItem; error?: string }> {
  const name = payload.name?.trim();
  if (!name) return { success: false, error: 'Skill name is required.' };

  const slug = (payload.slug ? toSafeSlug(payload.slug) : toSafeSlug(name)) || toSafeSlug(name);
  if (!slug) return { success: false, error: 'A valid slug is required.' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('skill_catalog')
    .insert({
      name,
      slug,
      short_description: payload.short_description?.trim() || '',
      description: payload.description?.trim() || '',
      category: payload.category?.trim() || 'development',
      skill_type: payload.skill_type || 'concept',
      difficulty: payload.difficulty || 'beginner',
      status: payload.status || 'draft',
      icon: payload.icon?.trim() || null,
      display_order: payload.display_order ?? 1,
      is_featured: payload.is_featured ?? false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `A skill with slug "${slug}" already exists.` };
    }
    requireDatabaseResult(error, 'Catalog mutation');
    return { success: false, error: 'Catalog mutation failed.' };
  }

  return { success: true, skill: data as SkillCatalogItem };
}

/**
 * Update a skill record.
 */
export async function updateSkill(
  id: string,
  payload: Partial<{
    name: string;
    slug: string;
    short_description: string;
    description: string;
    category: string;
    skill_type: SkillType;
    difficulty: SkillDifficulty;
    status: SkillStatus;
    icon: string | null;
    display_order: number;
    is_featured: boolean;
  }>
): Promise<{ success: boolean; skill?: SkillCatalogItem; error?: string }> {
  const updates: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    if (!payload.name.trim()) return { success: false, error: 'Skill name cannot be empty.' };
    updates.name = payload.name.trim();
  }
  if (payload.slug !== undefined) {
    const s = toSafeSlug(payload.slug);
    if (!s) return { success: false, error: 'Invalid slug.' };
    updates.slug = s;
  }
  if (payload.short_description !== undefined) updates.short_description = payload.short_description.trim();
  if (payload.description !== undefined) updates.description = payload.description.trim();
  if (payload.category !== undefined) updates.category = payload.category.trim();
  if (payload.skill_type !== undefined) updates.skill_type = payload.skill_type;
  if (payload.difficulty !== undefined) updates.difficulty = payload.difficulty;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.icon !== undefined) updates.icon = payload.icon;
  if (payload.display_order !== undefined) updates.display_order = payload.display_order;
  if (payload.is_featured !== undefined) updates.is_featured = payload.is_featured;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('skill_catalog')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'A skill with this slug already exists.' };
    }
    requireDatabaseResult(error, 'Catalog mutation');
    return { success: false, error: 'Catalog mutation failed.' };
  }

  return { success: true, skill: data as SkillCatalogItem };
}
