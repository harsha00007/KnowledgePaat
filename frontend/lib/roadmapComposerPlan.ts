import { readPrerequisiteGraph, graphTextOrder as textOrder } from './prerequisiteGraph';
import type { ComposerOptions, ComposerPreview, ComposerSnapshot, ComposerNode } from '@/types/roadmapComposer';
import type { RoadmapCategory, RoadmapDifficulty } from '@/types/roadmap';

export const COMPOSER_VERSION = 1;
export class ComposerError extends Error {
  constructor(public code: string, message: string, public status = 422) { super(message); this.name = 'ComposerError'; }
}
export const composerMessages: Record<string, string> = {
  CAREER_NOT_FOUND: 'Career not found.', CAREER_NOT_PUBLISHED: 'Only published careers can be composed.',
  NO_PUBLISHED_REQUIREMENTS: 'Career has no qualifying published requirements.',
  UNPUBLISHED_REQUIRED_SKILL: 'A selected career requirement is unpublished.', UNPUBLISHED_PREREQUISITE: 'A prerequisite is unpublished.',
  SKILL_GRAPH_INVALID: 'Career dependency graph is invalid.', SKILL_GRAPH_CYCLE: 'Roadmap cannot be composed because the Career dependency graph contains a cycle.',
  GRAPH_LIMIT_EXCEEDED: 'Career dependency graph exceeds the supported composition size.',
  PREVIEW_STALE: 'Career, graph or curated resources changed. Preview again before generating.',
  ROADMAP_ALREADY_EXISTS: 'The generated slug is occupied by another roadmap.', FORBIDDEN: 'Administrator privileges required.',
  UNAUTHORIZED: 'Sign in to compose roadmaps.', INVALID_INPUT: 'Invalid composer input.',
  ROADMAP_GENERATION_FAILED: 'Roadmap composition is unavailable. Please try again.',
};
export function composerFailure(code: string): never { throw new ComposerError(code, composerMessages[code] || composerMessages.ROADMAP_GENERATION_FAILED); }
const difficulty = (value: string): RoadmapDifficulty => value === 'advanced' ? 'Advanced' : value === 'intermediate' ? 'Intermediate' : 'Beginner';
export function composerCategory(category: string): RoadmapCategory {
  const map: Record<string, RoadmapCategory> = { software_development: 'Development', web_development: 'Development', data: 'Data', data_science: 'Data', data_analytics: 'Data', ai: 'AI', artificial_intelligence: 'AI', testing: 'QA & Testing', qa_testing: 'QA & Testing', devops: 'DevOps & Cloud', cloud: 'DevOps & Cloud', cybersecurity: 'Cybersecurity', product: 'Product', design: 'Design' };
  return map[category] || 'Other';
}

/** Pure, bounded, repeatable planning. No database writes, clocks, random IDs or AI. */
export function buildComposerPlan(snapshot: ComposerSnapshot, fingerprint: string, options: ComposerOptions = {}): ComposerPreview {
  const { career, mappings, skills, edges, resources } = snapshot;
  const { byId, mapping, required, ordered, foundation, edgeKeys } = readPrerequisiteGraph(snapshot, composerFailure);
  const sections: ComposerPreview['sections'] = [];
  for (const stage of [{ title: 'Foundation', slug: 'foundation', test: true }, { title: 'Core Skills', slug: 'core-skills', test: false }]) {
    const nodes: ComposerNode[] = ordered.filter(id => foundation(id) === stage.test).map((id, i) => {
      const s = byId.get(id)!, m = mapping.get(id);
      return { skillId: id, title: s.name, slug: s.slug, description: (s.description || s.short_description) + (m ? `\n\nTarget proficiency: ${m.proficiency_target}.` : ''), node_type: 'SKILL', difficulty: difficulty(s.difficulty), estimated_minutes: 30, sequence: i + 1,
        is_required: required.has(id), importance: m?.importance || 'prerequisite', proficiency_target: m?.proficiency_target || null, is_core: m?.is_core || false, resources: resources.filter(r => r.skill_id === id) };
    });
    if (nodes.length) sections.push({ title: stage.title, slug: stage.slug, sequence: sections.length + 1, nodes });
  }
  const missingResources = ordered.filter(id => !resources.some(r => r.skill_id === id));
  return { career, fingerprint, roadmap: { title: options.title || `${career.name} Roadmap`, slug: `${career.slug}-composed-v1`, description: career.description,
    short_description: career.short_description, category: composerCategory(career.category), difficulty: options.difficulty || difficulty(career.difficulty),
    estimated_duration: options.targetDuration || (career.estimated_months > 0 ? `${career.estimated_months} months` : ''), is_active: false },
    sections, orderedSkillIds: ordered,
    relationships: [...edgeKeys].sort(textOrder).map(key => { const [sourceSkillId, targetSkillId] = key.split(':'); return { sourceSkillId, targetSkillId, relationship_type: 'PREREQUISITE' }; }),
    counts: { mapped: mapping.size, required: mappings.filter(m => m.importance === 'required').length, prerequisites: skills.filter(s => !mapping.has(s.id)).length, nodes: ordered.length, resources: resources.length },
    warnings: missingResources.length ? [`${missingResources.length} skills have no matching active curated resources. Learning times use the existing 30-minute default; review before publication.`] : ['Learning times use the existing 30-minute default; review before publication.'] };
}
