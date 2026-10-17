/**
 * KnowledgePaat — Career Roadmap Engine
 * Phase 1 TypeScript Types
 */

// ── Enums / String Unions ──────────────────────────────────────────────────

export type RoadmapCategory =
  | 'Development'
  | 'Data'
  | 'AI'
  | 'QA & Testing'
  | 'DevOps & Cloud'
  | 'Cybersecurity'
  | 'Product'
  | 'Design'
  | 'Other';

export type RoadmapDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type NodeType = 'SKILL' | 'TOPIC' | 'MILESTONE' | 'CHECKPOINT';

export type NodeDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type RelationshipType =
  | 'PREREQUISITE'
  | 'NEXT'
  | 'RECOMMENDED'
  | 'OPTIONAL'
  | 'ALTERNATIVE';

// ── Core DB Entities ───────────────────────────────────────────────────────

export interface CareerRoadmap {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category: RoadmapCategory;
  difficulty: RoadmapDifficulty;
  estimated_duration: string;
  thumbnail_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareerRoadmapSection {
  id: string;
  roadmap_id: string;
  title: string;
  slug: string;
  description: string | null;
  sequence: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CareerRoadmapNode {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  description: string | null;
  node_type: NodeType;
  difficulty: NodeDifficulty;
  estimated_minutes: number;
  sequence: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CareerRoadmapNodeRelationship {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: RelationshipType;
  created_at: string;
}

export interface CareerRoadmapNodeTopic {
  id: string;
  node_id: string;
  topic: string;
  sequence: number;
}

// ── Composite / View Types ─────────────────────────────────────────────────

import type { CareerNodeResourceView } from './resource';
export * from './resource';

/** Full roadmap detail with sections, nodes, topics, relationships, resources */
export interface RoadmapDetail {
  roadmap: CareerRoadmap;
  sections: Array<
    CareerRoadmapSection & {
      nodes: Array<
        CareerRoadmapNode & {
          topics: CareerRoadmapNodeTopic[];
          resources?: CareerNodeResourceView[];
        }
      >;
    }
  >;
  relationships: CareerRoadmapNodeRelationship[];
  stats: {
    total_sections: number;
    total_nodes: number;
  };
}

/** Lightweight card for directory listing */
export interface RoadmapCard {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  category: RoadmapCategory;
  difficulty: RoadmapDifficulty;
  estimated_duration: string;
  thumbnail_url: string | null;
  is_active: boolean;
  section_count: number;
  node_count: number;
  updated_at: string;
  classification?: RoadmapClassification;
  skills?: string[];
}

// ── API Request/Response Types ─────────────────────────────────────────────

export interface CreateRoadmapPayload {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category: RoadmapCategory;
  difficulty: RoadmapDifficulty;
  estimated_duration: string;
  thumbnail_url?: string;
  seo_title?: string;
  seo_description?: string;
  is_active?: boolean;
}

export interface UpdateRoadmapPayload extends Partial<CreateRoadmapPayload> {}

export interface CreateSectionPayload {
  title: string;
  slug: string;
  description?: string;
  sequence?: number;
  is_required?: boolean;
  is_active?: boolean;
}

export interface UpdateSectionPayload extends Partial<CreateSectionPayload> {}

export interface CreateNodePayload {
  section_id: string;
  title: string;
  slug: string;
  description?: string;
  node_type: NodeType;
  difficulty?: NodeDifficulty;
  estimated_minutes?: number;
  sequence?: number;
  is_required?: boolean;
  is_active?: boolean;
  topics?: string[];
}

export interface UpdateNodePayload extends Partial<CreateNodePayload> {}

export interface CreateRelationshipPayload {
  source_node_id: string;
  target_node_id: string;
  relationship_type: RelationshipType;
}

// ── UI State Types ─────────────────────────────────────────────────────────

export interface RoadmapFilters {
  search: string;
  category: RoadmapCategory | '';
  difficulty: RoadmapDifficulty | '';
}

// ── Phase 3: Learner Roadmap Progress Types ────────────────────────────────

export type TopicProgressStatus = 'learning' | 'done' | 'skip' | null;
export type ValidTopicStatus = 'learning' | 'done' | 'skip';

export interface CareerUserRoadmapProgress {
  id: string;
  user_id: string;
  node_id: string;
  status: ValidTopicStatus;
  created_at: string;
  updated_at: string;
}

export interface RoadmapProgressStats {
  totalTopics: number;
  completedCount: number;
  progressPercent: number;
  learningCount: number;
  doneCount: number;
  skipCount: number;
}

export interface RoadmapProgressMergeItem {
  nodeId: string;
  status: ValidTopicStatus;
  updatedAt?: string;
}

export interface RoadmapProgressMergePayload {
  items: RoadmapProgressMergeItem[];
}

// ── Phase 4: Taxonomy, Career Outcomes & Quality Checker Types ─────────────

export type RoadmapClassification =
  | 'ROLE'
  | 'SKILL'
  | 'BEGINNER'
  | 'BEST_PRACTICE';

export interface PortfolioProjectOutcome {
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedHours: number;
  skillsUsed: string[];
  portfolioValue: string;
}

export interface CareerOutcome {
  targetRoles: string[];
  skillsAcquired: string[];
  portfolioProjects: PortfolioProjectOutcome[];
  practiceAreas: string[];
  interviewTopics: string[];
  careerReadinessMilestone: string;
}

export interface NextStepRecommendation {
  nodeId: string;
  nodeTitle: string;
  sectionTitle: string;
  difficulty: NodeDifficulty;
  rationale: string;
  estimatedMinutes: number;
}

export interface RoadmapQualityReport {
  isReadyToPublish: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  stats: {
    sectionCount: number;
    nodeCount: number;
    topicCount: number;
    resourceCount: number;
    recommendedResourceCount: number;
  };
}
