import type { CareerCatalogItem, CareerSkillMapItem, SkillCatalogItem, SkillRelationshipItem } from './careerSkillGraph';
import type { RoadmapCategory, RoadmapDifficulty } from './roadmap';

export interface ComposerResource {
  skill_id: string; resource_id: string; title: string; priority: number; is_recommended: boolean;
}
export interface ComposerSnapshot {
  career: CareerCatalogItem;
  mappings: CareerSkillMapItem[];
  skills: SkillCatalogItem[];
  edges: SkillRelationshipItem[];
  resources: ComposerResource[];
}
export interface ComposerOptions { title?: string; difficulty?: RoadmapDifficulty; targetDuration?: string }
export interface ComposerInput extends ComposerOptions { careerId: string; fingerprint?: string }
export interface ComposerNode {
  skillId: string; title: string; slug: string; description: string; node_type: 'SKILL';
  difficulty: RoadmapDifficulty; estimated_minutes: 30; sequence: number; is_required: boolean;
  importance: string; proficiency_target: string | null; is_core: boolean; resources: ComposerResource[];
}
export interface ComposerPreview {
  career: CareerCatalogItem; fingerprint: string;
  roadmap: { title: string; slug: string; description: string; short_description: string; category: RoadmapCategory; difficulty: RoadmapDifficulty; estimated_duration: string; is_active: false };
  sections: { title: string; slug: string; sequence: number; nodes: ComposerNode[] }[];
  orderedSkillIds: string[]; relationships: { sourceSkillId: string; targetSkillId: string; relationship_type: 'PREREQUISITE' }[];
  counts: { mapped: number; required: number; prerequisites: number; nodes: number; resources: number };
  warnings: string[];
}
export interface ComposerResult {
  roadmapId: string; slug: string; title: string; sections: number; nodeCount: number; resourceCount: number;
  status: 'created' | 'existing'; is_active: boolean; warnings: string[];
}
