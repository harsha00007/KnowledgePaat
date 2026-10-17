/**
 * KnowledgePaat — Career Roadmap Platform
 * Phase 4 — Structured Content Types
 */

import type {
  RoadmapCategory,
  RoadmapDifficulty,
  NodeType,
  NodeDifficulty,
  RelationshipType,
  CareerOutcome,
  RoadmapClassification,
} from '@/types/roadmap';
import type { ResourceType, ResourceDifficulty } from '@/types/resource';

export interface ContentResource {
  title: string;
  description: string;
  resource_type: ResourceType;
  provider: string;
  url: string;
  difficulty: ResourceDifficulty;
  is_free: boolean;
  is_recommended: boolean;
  priority: number;
}

export interface ContentNode {
  title: string;
  slug: string;
  description: string;
  node_type: NodeType;
  difficulty: NodeDifficulty;
  estimated_minutes: number;
  sequence: number;
  is_required: boolean;
  topics: string[];
  prerequisites?: string[]; // array of node slugs
  nextNodes?: string[];     // array of node slugs
  recommendedNext?: string[];
  resources?: ContentResource[];
}

export interface ContentSection {
  title: string;
  slug: string;
  description: string;
  sequence: number;
  is_required: boolean;
  nodes: ContentNode[];
}

export interface RoadmapContentDefinition {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category: RoadmapCategory;
  difficulty: RoadmapDifficulty;
  estimated_duration: string;
  seo_title?: string;
  seo_description?: string;
  is_active: boolean;
  type: RoadmapClassification;
  careerOutcome?: CareerOutcome;
  sections: ContentSection[];
}
