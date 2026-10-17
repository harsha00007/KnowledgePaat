import type { CareerCatalogItem, CareerSkillMapItem, SkillCatalogItem, SkillRelationshipItem } from '@/types/careerSkillGraph';

export type GraphCareer = Pick<CareerCatalogItem, 'id' | 'slug' | 'name' | 'status'>;
export type GraphSkill = Pick<SkillCatalogItem, 'id' | 'slug' | 'name' | 'status' | 'display_order'>;
export type GraphMapping = Pick<CareerSkillMapItem, 'skill_id' | 'importance' | 'proficiency_target' | 'display_order' | 'is_core'>;
export type GraphEdge = Pick<SkillRelationshipItem, 'source_skill_id' | 'target_skill_id' | 'relationship_type'>;
export interface PrerequisiteGraph<S extends GraphSkill = GraphSkill, M extends GraphMapping = GraphMapping> {
  career: GraphCareer; skills: S[]; mappings: M[]; edges: GraphEdge[];
}
export const graphTextOrder = (a: string, b: string) => {
  const aa = [...a], bb = [...b];
  for (let i = 0; i < Math.min(aa.length, bb.length); i++) { const n = aa[i].codePointAt(0)! - bb[i].codePointAt(0)!; if (n) return n; }
  return aa.length - bb.length;
};

/** Shared Phase B validation and bounded deterministic ordering, with caller-owned errors. */
export function readPrerequisiteGraph<S extends GraphSkill, M extends GraphMapping>(
  {career, mappings, skills, edges}: PrerequisiteGraph<S,M>, fail: (code: string) => never
) {
  const textOrder = graphTextOrder;
  if (!career) fail('CAREER_NOT_FOUND');
  if (career.status !== 'published') fail('CAREER_NOT_PUBLISHED');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(career.slug) || skills.some(s => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug))) fail('SKILL_GRAPH_INVALID');
  if (!mappings.length || !mappings.some(m => ['required', 'recommended'].includes(m.importance))) fail('NO_PUBLISHED_REQUIREMENTS');
  if (skills.length > 5000 || edges.length > 20000) fail('GRAPH_LIMIT_EXCEEDED');
  const byId = new Map(skills.map(s => [s.id, s]));
  if (byId.size !== skills.length) fail('SKILL_GRAPH_INVALID');
  const mapping = new Map(mappings.map(m => [m.skill_id, m]));
  for (const m of mappings) { const s = byId.get(m.skill_id); if (!s) fail('SKILL_GRAPH_INVALID'); if (s.status !== 'published') fail('UNPUBLISHED_REQUIRED_SKILL'); }
  const incoming = new Map<string, string[]>(); const outgoing = new Map<string, string[]>();
  const edgeKeys = new Set<string>();
  for (const e of edges) {
    if (e.relationship_type !== 'prerequisite' || !byId.has(e.source_skill_id) || !byId.has(e.target_skill_id)) fail('SKILL_GRAPH_INVALID');
    const key = e.source_skill_id + ':' + e.target_skill_id;
    if (edgeKeys.has(key)) continue; edgeKeys.add(key);
    incoming.set(e.target_skill_id, [...(incoming.get(e.target_skill_id) || []), e.source_skill_id]);
    outgoing.set(e.source_skill_id, [...(outgoing.get(e.source_skill_id) || []), e.target_skill_id]);
  }
  const included = new Set<string>(); const queue = [...mapping.keys()];
  for (let i = 0; i < queue.length; i++) { const id = queue[i]; if (included.has(id)) continue; included.add(id); queue.push(...(incoming.get(id) || [])); }
  if (included.size !== byId.size) fail('SKILL_GRAPH_INVALID'); // scoped snapshot must contain exactly the closure
  for (const id of included) if (byId.get(id)?.status !== 'published') fail('UNPUBLISHED_PREREQUISITE');
  const required = new Set<string>(); const requiredQueue = mappings.filter(m => m.importance !== 'optional' || m.is_core).map(m => m.skill_id);
  for (let i = 0; i < requiredQueue.length; i++) { const id = requiredQueue[i]; if (required.has(id)) continue; required.add(id); requiredQueue.push(...(incoming.get(id) || [])); }
  // Existing curriculum stages: prerequisite concepts first, then terminal career skills.
  const foundation = (id: string) => !!outgoing.get(id)?.length;
  const compare = (a: string, b: string) => {
    const ma = mapping.get(a), mb = mapping.get(b), sa = byId.get(a)!, sb = byId.get(b)!;
    return Number(foundation(b)) - Number(foundation(a)) || (ma?.display_order ?? 2147483647) - (mb?.display_order ?? 2147483647)
      || Number(mb?.is_core ?? false) - Number(ma?.is_core ?? false) || sa.display_order - sb.display_order || textOrder(sa.name, sb.name) || textOrder(a, b);
  };
  const indegree = new Map([...included].map(id => [id, incoming.get(id)?.length || 0]));
  const ready = [...included].filter(id => !indegree.get(id)).sort(compare); const ordered: string[] = [];
  while (ready.length) { const id = ready.shift()!; ordered.push(id); for (const target of outgoing.get(id) || []) { const n = indegree.get(target)! - 1; indegree.set(target, n); if (!n) { ready.push(target); ready.sort(compare); } } }
  if (ordered.length !== included.size) fail('SKILL_GRAPH_CYCLE');
  return { byId, mapping, incoming, outgoing, required, ordered, foundation, edgeKeys };
}
