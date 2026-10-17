import { requireDatabaseResult, catalogPage, catalogSearch, readCatalogRows } from './catalogIntegrity';
/**
 * KnowledgePaat — Career Catalog Service
 * Phase A — Foundation & Quality Architecture
 */

import { createClient } from '@/utils/supabase/server';
import type {
  CareerCatalogItem,
  CareerWithSkills,
  CareerStatus,
  CareerDifficulty,
  CareerQualityReport,
} from '@/types/careerSkillGraph';
import { toSafeSlug } from './skillCatalog';
import { getCareerSkills } from './careerSkillMap';

export interface CareerFilters {
  search?: string;
  category?: string;
  difficulty?: string;
  status?: string;
  is_featured?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedCareers {
  items: CareerCatalogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Public: Fetch published careers only with search, category filtering & pagination.
 */
export async function getPublicCareers(filters: CareerFilters = {}): Promise<PaginatedCareers> {
  const supabase = await createClient();
  const { page, limit, from, to } = catalogPage(filters.page, filters.limit);

  let query = supabase
    .from('career_catalog')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true }).order('id', { ascending: true })
    .range(from, to);

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
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

  // Get skill count for each career
  const careerIds = data.map((c) => c.id);
  const mappings = careerIds.length ? await readCatalogRows((from, to) => supabase.from('career_skill_map').select('career_id, skill:skill_catalog!inner(status)').in('career_id', careerIds).eq('skill.status', 'published').order('id').range(from, to)) : [];

  const skillCountMap = new Map<string, number>();
  if (mappings) {
    for (const m of mappings) {
      skillCountMap.set(m.career_id, (skillCountMap.get(m.career_id) || 0) + 1);
    }
  }

  const items = data.map((c) => ({
    ...c,
    skill_count: skillCountMap.get(c.id) || 0,
  })) as CareerCatalogItem[];

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
 * Public: Fetch single published career by slug, including mapped skills.
 */
export async function getPublicCareerBySlug(slug: string): Promise<CareerWithSkills | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('career_catalog')
    .select('*')
    .eq('slug', slug.toLowerCase().trim())
    .eq('status', 'published')
    .maybeSingle();

  requireDatabaseResult(error, 'Catalog detail');
  if (!data) return null;

  const skills = await getCareerSkills(data.id);
  return {
    ...(data as CareerCatalogItem),
    skills: skills.filter((s) => s.skill?.status === 'published'),
  };
}

/**
 * Admin: Fetch careers with all statuses, counts, and filters.
 */
export async function getAdminCareers(filters: CareerFilters = {}): Promise<PaginatedCareers> {
  const supabase = await createClient();
  const { page, limit, from, to } = catalogPage(filters.page, filters.limit);

  let query = supabase
    .from('career_catalog')
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

  const careerIds = data.map((c) => c.id);
  const mappings = careerIds.length ? await readCatalogRows((from, to) => supabase.from('career_skill_map').select('career_id').in('career_id', careerIds).order('id').range(from, to)) : [];

  const skillCountMap = new Map<string, number>();
  if (mappings) {
    for (const m of mappings) {
      skillCountMap.set(m.career_id, (skillCountMap.get(m.career_id) || 0) + 1);
    }
  }

  const items = data.map((c) => ({
    ...c,
    skill_count: skillCountMap.get(c.id) || 0,
  })) as CareerCatalogItem[];

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
 * Admin: Fetch single career by ID with its mapped skills.
 */
export async function getAdminCareerById(id: string): Promise<CareerWithSkills | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('career_catalog')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  requireDatabaseResult(error, 'Catalog detail');
  if (!data) return null;

  const skills = await getCareerSkills(data.id);
  return {
    ...(data as CareerCatalogItem),
    skills,
  };
}

/**
 * Create a career record.
 */
export async function createCareer(payload: {
  name: string;
  slug?: string;
  short_description?: string;
  description?: string;
  category?: string;
  difficulty?: CareerDifficulty;
  estimated_months?: number;
  status?: CareerStatus;
  icon?: string;
  display_order?: number;
  is_featured?: boolean;
  seo_title?: string;
  seo_description?: string;
}): Promise<{ success: boolean; career?: CareerCatalogItem; error?: string }> {
  const name = payload.name?.trim();
  if (!name) return { success: false, error: 'Career name is required.' };

  const slug = (payload.slug ? toSafeSlug(payload.slug) : toSafeSlug(name)) || toSafeSlug(name);
  if (!slug) return { success: false, error: 'A valid slug is required.' };

  if (payload.status === 'published') {
    const quality = evaluateCareerQuality({ name, slug, short_description: payload.short_description || '', description: payload.description || '', skills: [] });
    return { success: false, error: quality.errors.join(' ') };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('career_catalog')
    .insert({
      name,
      slug,
      short_description: payload.short_description?.trim() || '',
      description: payload.description?.trim() || '',
      category: payload.category?.trim() || 'software_development',
      difficulty: payload.difficulty || 'beginner',
      estimated_months: payload.estimated_months || 6,
      status: payload.status || 'draft',
      icon: payload.icon?.trim() || null,
      display_order: payload.display_order ?? 1,
      is_featured: payload.is_featured ?? false,
      seo_title: payload.seo_title?.trim() || `${name} Career Path | KnowledgePaat`,
      seo_description: payload.seo_description?.trim() || payload.short_description?.trim() || '',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `A career with slug "${slug}" already exists.` };
    }
    requireDatabaseResult(error, 'Catalog mutation');
    return { success: false, error: 'Catalog mutation failed.' };
  }

  return { success: true, career: data as CareerCatalogItem };
}

/**
 * Update a career record.
 */
export async function updateCareer(
  id: string,
  payload: Partial<{
    name: string;
    slug: string;
    short_description: string;
    description: string;
    category: string;
    difficulty: CareerDifficulty;
    estimated_months: number;
    status: CareerStatus;
    icon: string | null;
    display_order: number;
    is_featured: boolean;
    seo_title: string;
    seo_description: string;
  }>
): Promise<{ success: boolean; career?: CareerCatalogItem; error?: string }> {
  const updates: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    if (!payload.name.trim()) return { success: false, error: 'Career name cannot be empty.' };
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
  if (payload.difficulty !== undefined) updates.difficulty = payload.difficulty;
  if (payload.estimated_months !== undefined) updates.estimated_months = payload.estimated_months;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.icon !== undefined) updates.icon = payload.icon;
  if (payload.display_order !== undefined) updates.display_order = payload.display_order;
  if (payload.is_featured !== undefined) updates.is_featured = payload.is_featured;
  if (payload.seo_title !== undefined) updates.seo_title = payload.seo_title.trim();
  if (payload.seo_description !== undefined) updates.seo_description = payload.seo_description.trim();

  const existing = await getAdminCareerById(id);
  if (!existing) return { success: false, error: 'Career not found.' };
  const candidate = { ...existing, ...updates } as CareerWithSkills;
  if (candidate.status === 'published') {
    const quality = evaluateCareerQuality(candidate);
    if (!quality.isPublishable) return { success: false, error: quality.errors.join(' ') };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('career_catalog')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'A career with this slug already exists.' };
    }
    requireDatabaseResult(error, 'Catalog mutation');
    return { success: false, error: 'Catalog mutation failed.' };
  }

  return { success: true, career: data as CareerCatalogItem };
}

/**
 * Pure quality evaluator for Career entities.
 */
export function evaluateCareerQuality(career: Pick<CareerWithSkills, 'name' | 'slug' | 'short_description' | 'description' | 'skills'>): CareerQualityReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!career.name || career.name.length < 3) {
    errors.push('Career name must be at least 3 characters.');
  }
  if (!career.slug) {
    errors.push('Career slug is required.');
  }
  if (!career.short_description || career.short_description.length < 15) {
    errors.push('Short description is required (at least 15 characters).');
  }
  if (!career.description || career.description.length < 30) {
    warnings.push('Detailed description is recommended (at least 30 characters).');
  }

  const skills = career.skills || [];
  if (skills.length === 0) {
    errors.push('Cannot publish this career because it has no skills mapped.');
  } else {
    const hasCoreOrRequired = skills.some(
      (s) => s.skill?.status === 'published' && (s.importance === 'required' || s.importance === 'recommended')
    );
    if (!hasCoreOrRequired) {
      errors.push('Career must have at least one published required or recommended skill.');
    }

    const archivedSkills = skills.filter((s) => s.skill?.status === 'archived');
    if (archivedSkills.length > 0) {
      warnings.push(`Career contains ${archivedSkills.length} archived skills.`);
    }
  }

  let score = 100;
  score -= errors.length * 30;
  score -= warnings.length * 10;
  score = Math.max(0, Math.min(100, score));

  return {
    isPublishable: errors.length === 0,
    score,
    errors,
    warnings,
  };
}

/**
 * Validate whether a career is ready to be published.
 */
export async function evaluateCareerPublishReadiness(careerId: string): Promise<CareerQualityReport> {
  const career = await getAdminCareerById(careerId);
  if (!career) {
    return { isPublishable: false, score: 0, errors: ['Career not found.'], warnings: [] };
  }
  return evaluateCareerQuality(career);
}

/**
 * Audit & Health Check across the entire Career & Skill knowledge layer.
 */
export async function runCareerCatalogHealthCheck(): Promise<{
  status: 'PASS' | 'WARNING' | 'ERROR';
  issues: string[];
  stats: {
    totalCareers: number;
    publishedCareers: number;
    totalSkills: number;
    publishedSkills: number;
    totalMappings: number;
    totalRelationships: number;
  };
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('phase_a_health');
  requireDatabaseResult(error, 'Career health check');
  if (!data || !['PASS','WARNING','ERROR'].includes(data.status) || !Array.isArray(data.issues) || !data.stats) {
    throw new Error('Invalid health-check response.');
  }
  return data;
}
