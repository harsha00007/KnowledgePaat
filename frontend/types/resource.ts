/**
 * KnowledgePaat — Career Roadmap Resource Engine
 * Phase 2 TypeScript Types
 */

// ── Resource Types ─────────────────────────────────────────────────────────

export type ResourceType =
  | 'YOUTUBE'
  | 'ARTICLE'
  | 'DOCUMENTATION'
  | 'UDEMY'
  | 'KNOWLEDGEPAAT_COURSE'
  | 'LIVE_COURSE'
  | 'BOOK'
  | 'PROJECT'
  | 'PRACTICE';

export type ResourceDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export const VALID_RESOURCE_TYPES: ResourceType[] = [
  'YOUTUBE',
  'ARTICLE',
  'DOCUMENTATION',
  'UDEMY',
  'KNOWLEDGEPAAT_COURSE',
  'LIVE_COURSE',
  'BOOK',
  'PROJECT',
  'PRACTICE',
];

export const VALID_RESOURCE_DIFFICULTIES: ResourceDifficulty[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
];

// ── Database Entities ──────────────────────────────────────────────────────

export interface CareerResource {
  id: string;
  title: string;
  description: string;
  resource_type: ResourceType;
  provider: string;
  url: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  difficulty: ResourceDifficulty;
  category: string;
  is_free: boolean;
  price: number | null;
  currency: string | null;
  language: string;
  instructor: string | null;
  rating: number | null;
  is_recommended: boolean;
  priority: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareerRoadmapNodeResource {
  id: string;
  node_id: string;
  resource_id: string;
  priority: number;
  is_recommended: boolean;
  created_at: string;
}

// ── Composite / Presentation View Types ────────────────────────────────────

/** Resource attached to a roadmap node with node-specific priority & recommendation */
export interface CareerNodeResourceView extends CareerResource {
  node_resource_id: string;
  node_id: string;
  resource_id: string;
  priority: number;
  is_recommended: boolean;
  resource?: CareerResource;
}

// ── API Payloads ───────────────────────────────────────────────────────────

export interface ResourceCreatePayload {
  title: string;
  description?: string;
  resource_type: ResourceType;
  provider: string;
  url: string;
  thumbnail_url?: string;
  duration_minutes?: number | null;
  difficulty?: ResourceDifficulty;
  category?: string;
  is_free?: boolean;
  price?: number | null;
  currency?: string;
  language?: string;
  instructor?: string;
  rating?: number | null;
  is_recommended?: boolean;
  priority?: number;
  is_active?: boolean;
}

export interface ResourceUpdatePayload extends Partial<ResourceCreatePayload> {}

export interface AttachResourcePayload {
  resource_id?: string;
  // If creating new resource on the fly
  new_resource?: ResourceCreatePayload;
  priority?: number;
  is_recommended?: boolean;
}

export interface UpdateNodeResourcePayload {
  priority?: number;
  is_recommended?: boolean;
}

// ── Filter State ───────────────────────────────────────────────────────────

export interface ResourceFilters {
  search?: string;
  resource_type?: string;
  category?: string;
  difficulty?: string;
  is_free?: boolean;
  is_recommended?: boolean;
  is_active?: boolean;
}
