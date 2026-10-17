import type { SkillGapSemantics } from './skillGapSemantics';
import type { CareerRoadmapNode, CareerRoadmapNodeTopic, CareerRoadmapSection, ValidTopicStatus } from './roadmap';
import type { CareerNodeResourceView } from './resource';

export type ProjectionState = 'COMPLETED' | 'SATISFIED' | 'ACTIONABLE' | 'BLOCKED' | 'SUPPORTING_PREREQUISITE' | 'NOT_YET_RELEVANT';
export interface ProjectionCurriculum {
  roadmap: { id: string; title: string; composer_career_id: string; composer_version: number; is_active: boolean };
  sections: Pick<CareerRoadmapSection,'id'|'roadmap_id'|'title'|'sequence'|'is_active'>[];
  nodes: Pick<CareerRoadmapNode,'id'|'section_id'|'title'|'slug'|'node_type'|'sequence'|'is_active'>[];
  topics: CareerRoadmapNodeTopic[];
  resources: CareerNodeResourceView[];
  progress: { node_id: string; status: ValidTopicStatus }[];
}
export interface ProjectedNode {
  nodeId: string;
  nodeTitle: string;
  skillId: string | null;
  skillName: string | null;
  state: ProjectionState;
  priority: number;
  reason: string;
  progress: { status: ValidTopicStatus | null };
  gap: SkillGapSemantics | null;
  prerequisites: { skillId: string; skillName: string; state: SkillGapSemantics['status'] }[];
  topics: CareerRoadmapNodeTopic[];
  resources: { resourceId: string }[];
}
export interface PersonalizedRoadmap {
  career: { id: string; slug: string; name: string };
  sourceRoadmap: { id: string; title: string };
  summary: { totalRelevantNodes: number; completedNodes: number; inProgressNodes: number; actionableNodes: number; blockedNodes: number; nextNodeId: string | null };
  nextAction: { nodeId: string; skillId: string; title: string; reason: string; state: ProjectionState } | null;
  upcoming: string[];
  roadmap: { sectionId: string; sectionTitle: string; nodes: ProjectedNode[] }[];
  skills: SkillGapSemantics[];
  warnings: { code: 'NO_CURRICULUM_MAPPING' | 'AMBIGUOUS_CURRICULUM_MAPPING'; skillId: string }[];
}
