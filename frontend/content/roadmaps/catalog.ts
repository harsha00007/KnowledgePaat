/**
 * KnowledgePaat — Career Roadmap Platform
 * Phase 4 — Central Structured Roadmap Catalog
 */

import type { RoadmapContentDefinition } from './types';
import { pythonDeveloperRoadmap } from './roles/python-developer';
import { frontendDeveloperRoadmap } from './roles/frontend-developer';
import { backendDeveloperRoadmap } from './roles/backend-developer';
import { fullStackDeveloperRoadmap } from './roles/full-stack-developer';
import { qaAutomationEngineerRoadmap } from './roles/qa-automation-engineer';
import { dataAnalystRoadmap } from './roles/data-analyst';
import { devopsEngineerRoadmap } from './roles/devops-engineer';
import { aiEngineerRoadmap } from './roles/ai-engineer';

import { pythonSkillRoadmap } from './skills/python';
import { reactSkillRoadmap } from './skills/react';
import { sqlSkillRoadmap } from './skills/sql';
import { dockerSkillRoadmap } from './skills/docker';
import { gitGithubSkillRoadmap } from './skills/git-github';

import { programmingFundamentalsRoadmap } from './beginner/programming-fundamentals';
import { frontendBeginnerRoadmap } from './beginner/frontend-beginner';

import { apiSecurityRoadmap } from './best-practices/api-security';
import { frontendPerformanceRoadmap } from './best-practices/frontend-performance';

export const ROADMAP_CATALOG: RoadmapContentDefinition[] = [
  // ── 1. Role / Career Roadmaps ──
  pythonDeveloperRoadmap,
  frontendDeveloperRoadmap,
  backendDeveloperRoadmap,
  fullStackDeveloperRoadmap,
  qaAutomationEngineerRoadmap,
  dataAnalystRoadmap,
  devopsEngineerRoadmap,
  aiEngineerRoadmap,

  // ── 2. Technology / Skill Roadmaps ──
  pythonSkillRoadmap,
  reactSkillRoadmap,
  sqlSkillRoadmap,
  dockerSkillRoadmap,
  gitGithubSkillRoadmap,

  // ── 3. Beginner Pathways ──
  programmingFundamentalsRoadmap,
  frontendBeginnerRoadmap,

  // ── 4. Engineering Best Practices ──
  apiSecurityRoadmap,
  frontendPerformanceRoadmap,
];

/** Lookup a roadmap definition by its slug */
export function getCatalogRoadmapBySlug(
  slug: string
): RoadmapContentDefinition | undefined {
  const normalized = slug.toLowerCase().trim();
  return ROADMAP_CATALOG.find((rm) => rm.slug === normalized);
}

/** Filter catalog by type (ROLE, SKILL, BEGINNER, BEST_PRACTICE) */
export function getCatalogRoadmapsByType(
  type: RoadmapContentDefinition['type']
): RoadmapContentDefinition[] {
  return ROADMAP_CATALOG.filter((rm) => rm.type === type);
}
