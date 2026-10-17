/**
 * KnowledgePaat — Career & Skill Graph Types
 * Phase A — Foundation
 */

export type CareerStatus = 'draft' | 'published' | 'archived';
export type CareerDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type SkillType =
  | 'language'
  | 'framework'
  | 'library'
  | 'database'
  | 'tool'
  | 'platform'
  | 'concept'
  | 'soft_skill'
  | 'domain'
  | 'practice'
  | 'architecture'
  | 'other';

export type SkillDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type SkillStatus = 'draft' | 'published' | 'archived';

export type SkillImportance = 'required' | 'recommended' | 'optional';
export type ProficiencyTarget = 'beginner' | 'working' | 'proficient' | 'advanced';

export type SkillRelationshipType =
  | 'prerequisite'
  | 'related'
  | 'commonly_used_with'
  | 'builds_on'
  | 'alternative';

export interface CareerCatalogItem {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  category: string;
  icon: string | null;
  status: CareerStatus;
  difficulty: CareerDifficulty;
  estimated_months: number;
  display_order: number;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  skill_count?: number;
}

export interface SkillCatalogItem {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  category: string;
  skill_type: SkillType;
  difficulty: SkillDifficulty;
  status: SkillStatus;
  icon: string | null;
  display_order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  career_count?: number;
}

export interface CareerSkillMapItem {
  id: string;
  career_id: string;
  skill_id: string;
  importance: SkillImportance;
  proficiency_target: ProficiencyTarget;
  display_order: number;
  is_core: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  skill?: SkillCatalogItem;
  career?: CareerCatalogItem;
}

export interface SkillRelationshipItem {
  id: string;
  source_skill_id: string;
  target_skill_id: string;
  relationship_type: SkillRelationshipType;
  strength: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  source_skill?: SkillCatalogItem;
  target_skill?: SkillCatalogItem;
}

export interface CareerWithSkills extends CareerCatalogItem {
  skills: CareerSkillMapItem[];
}

export interface SkillDetailWithRelations extends SkillCatalogItem {
  page?: number;
  totalPages?: number;
  prerequisites: SkillRelationshipItem[];
  builds_on: SkillRelationshipItem[];
  related: SkillRelationshipItem[];
  commonly_used_with: SkillRelationshipItem[];
  alternatives: SkillRelationshipItem[];
  careers: Array<{
    career: CareerCatalogItem;
    importance: SkillImportance;
    proficiency_target: ProficiencyTarget;
  }>;
}

export interface CareerQualityReport {
  isPublishable: boolean;
  score: number;
  errors: string[];
  warnings: string[];
}

export interface SkillGraphNode {
  id: string;
  slug: string;
  name: string;
  category: string;
  skill_type: SkillType;
  difficulty: SkillDifficulty;
  status: SkillStatus;
  career_count: number;
}

export interface SkillGraphEdge {
  id: string;
  source: string; // source skill id
  target: string; // target skill id
  relationship_type: SkillRelationshipType;
  strength: number;
}

export interface SkillGraphData {
  page?: number;
  totalPages?: number;
  nodes: SkillGraphNode[];
  edges: SkillGraphEdge[];
}
