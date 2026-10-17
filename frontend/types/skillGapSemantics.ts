import type { ProficiencyTarget, SkillImportance } from './careerSkillGraph';
import type { serializeStudentSnapshot } from '@/lib/studentCareerSnapshot';

export type StudentSkillSnapshot = ReturnType<typeof serializeStudentSnapshot>;
export type SkillEvidenceKind = 'UNKNOWN' | 'CLAIMED' | 'ACTIVITY' | 'ASSESSMENT' | 'VERIFIED';
export type LearnerEvidence =
  | { kind: 'PROFILE_CLAIM' | 'RESOURCE_ACCESS'; skillId: string; sourceId: string }
  | { kind: 'ROADMAP_PROGRESS'; skillId: string; sourceId: string; status: 'learning' | 'done' | 'skip' }
  | { kind: 'IMPROVEMENT_TASK'; skillId: string; sourceId: string; status: 'pending' | 'in_progress' | 'completed' | 'skipped' }
  | { kind: 'ASSESSMENT_ACTIVITY'; skillId: string | null; sourceId: string };

/** Trusted domain facts ONLY. No existing adapter produces these from activity or scores.
 * A future producer must establish canonical association and authoritative provenance
 * before supplying this separate input; it must never come from a request payload. */
export interface AuthoritativeSkillEvidence {
  skillId: string;
  proficiency: ProficiencyTarget;
  sourceId: string;
}
export interface SkillEvidenceState {
  skillId: string;
  evidenceState: SkillEvidenceKind;
  claimed: boolean;
  activityPresent: boolean;
  assessmentPresent: boolean;
  exposurePresent: boolean;
  skipped: boolean;
  verified: boolean;
  currentProficiency: ProficiencyTarget | null;
}
export interface SkillRequirement {
  skillId: string;
  targetProficiency: ProficiencyTarget | null;
  importance: SkillImportance | null;
  core: boolean;
  mappedToCareer: boolean;
  prerequisiteOnly: boolean;
  requiredForCareer: boolean;
}
export type SkillGapStatus = 'GAP' | 'SATISFIED' | 'PREREQUISITE_VERIFIED' | 'PREREQUISITE_UNVERIFIED';
export interface SkillGapSemantics extends SkillRequirement, SkillEvidenceState {
  skillName: string;
  status: SkillGapStatus;
  prerequisites: string[];
  actionable: boolean;
  blocked: boolean;
  blockedBy: string[];
  priority: number;
  reason: string;
}
