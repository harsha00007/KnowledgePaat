import type { StudentSkillSnapshot, SkillGapSemantics } from '@/types/skillGapSemantics';
import type { PersonalizedRoadmap, ProjectionCurriculum, ProjectedNode } from '@/types/personalizedRoadmap';
import { graphTextOrder } from './prerequisiteGraph';

export class ProjectionError extends Error {
  constructor(public code: string) { super(code); }
}

/** Pure projection. C.2 alone resolves proficiency and prerequisite readiness. */
export function projectPersonalizedRoadmap(snapshot: StudentSkillSnapshot, result: { career: { id: string; slug: string; name: string }; skills: SkillGapSemantics[] }, curriculum: ProjectionCurriculum): PersonalizedRoadmap {
  const fail = (code: string): never => { throw new ProjectionError(code); };
  if (result.career.id !== snapshot.career.id || curriculum.roadmap.composer_career_id !== snapshot.career.id || curriculum.roadmap.composer_version !== 1 || !curriculum.roadmap.is_active) fail('CURRICULUM_INVALID');
  if (curriculum.sections.length > 5000 || curriculum.nodes.length > 5000 || curriculum.topics.length > 100000 || curriculum.resources.length > 100000 || curriculum.progress.length > 5000) fail('CURRICULUM_LIMIT_EXCEEDED');
  const sections = curriculum.sections.filter(s => s.is_active);
  if (sections.some(s => s.roadmap_id !== curriculum.roadmap.id) || new Set(sections.map(s=>s.id)).size !== sections.length) fail('CURRICULUM_INVALID');
  const sectionMap = new Map(sections.map(s=>[s.id,s]));
  const nodes = curriculum.nodes.filter(n => n.is_active);
  if (nodes.some(n=>!sectionMap.has(n.section_id)) || new Set(nodes.map(n=>n.id)).size !== nodes.length) fail('CURRICULUM_INVALID');
  const nodeIds = new Set(nodes.map(n=>n.id));
  if (curriculum.progress.some(p=>!nodeIds.has(p.node_id)||!['learning','done','skip'].includes(p.status)) || new Set(curriculum.progress.map(p=>p.node_id)).size !== curriculum.progress.length) fail('CURRICULUM_INVALID');
  const skills = new Map(result.skills.map(s=>[s.skillId,s]));
  if (skills.size !== snapshot.skills.length || snapshot.skills.some(s=>!skills.has(s.id))) fail('CURRICULUM_INVALID');
  const slugs = new Map(snapshot.skills.map(s=>[s.slug,s.id]));
  if (slugs.size !== snapshot.skills.length) fail('CURRICULUM_INVALID');
  const mappings = new Map<string,string[]>();
  for (const node of nodes) {
    const skillId = node.node_type === 'SKILL' ? slugs.get(node.slug) : undefined;
    if (skillId) mappings.set(skillId,[...(mappings.get(skillId)||[]),node.id]);
  }
  const warnings: PersonalizedRoadmap['warnings'] = result.skills.filter(s=>(mappings.get(s.skillId)?.length ?? 0)!==1).map(s=>({code:(mappings.get(s.skillId)?.length ?? 0)>1?'AMBIGUOUS_CURRICULUM_MAPPING':'NO_CURRICULUM_MAPPING',skillId:s.skillId}));
  warnings.sort((a,b)=>graphTextOrder(a.skillId,b.skillId));
  const progress = new Map(curriculum.progress.map(p=>[p.node_id,p.status]));
  const topicsByNode = new Map<string, ProjectionCurriculum['topics']>();
  const resourcesByNode = new Map<string, ProjectionCurriculum['resources']>();
  for (const topic of curriculum.topics) {
    if (!nodeIds.has(topic.node_id)) fail('CURRICULUM_INVALID');
    if (!topicsByNode.has(topic.node_id)) topicsByNode.set(topic.node_id,[]);
    topicsByNode.get(topic.node_id)!.push(topic);
  }
  // Preserve the existing resource helper's recommendation/priority/title ranking.
  for (const resource of curriculum.resources) {
    if (!nodeIds.has(resource.node_id)) fail('CURRICULUM_INVALID');
    if (!resourcesByNode.has(resource.node_id)) resourcesByNode.set(resource.node_id,[]);
    if (resource.is_active) resourcesByNode.get(resource.node_id)!.push(resource);
  }
  const blockers = new Set(result.skills.filter(s=>s.requiredForCareer).flatMap(s=>s.blockedBy));
  const projected = nodes.map(node => {
    const matched = node.node_type === 'SKILL' ? slugs.get(node.slug) : undefined;
    const skillId = matched && mappings.get(matched)?.length === 1 ? matched : null;
    const gap = skillId ? skills.get(skillId)! : null;
    const status = progress.get(node.id) ?? null;
    const state: ProjectedNode['state'] = !gap?'NOT_YET_RELEVANT':status==='done'?'COMPLETED':gap.blocked?'BLOCKED':gap.status==='SATISFIED'||gap.status==='PREREQUISITE_VERIFIED'?'SATISFIED':gap.prerequisiteOnly?'SUPPORTING_PREREQUISITE':'ACTIONABLE';
    return {
      nodeId:node.id,nodeTitle:node.title,skillId,skillName:gap?.skillName ?? null,state,priority:0,
      reason:status==='done'?'Node activity is completed; canonical proficiency and prerequisite blocking remain unchanged.':gap?.reason ?? 'No unambiguous canonical skill association for this node.',
      progress:{status},gap,
      prerequisites:(gap?.prerequisites ?? []).map(id=>({skillId:id,skillName:skills.get(id)!.skillName,state:skills.get(id)!.status})),
      topics:[...(topicsByNode.get(node.id) ?? [])].sort((a,b)=>a.sequence-b.sequence||graphTextOrder(a.id,b.id)),
      resources:(resourcesByNode.get(node.id) ?? []).map(r=>({resourceId:r.resource_id}))
    } satisfies ProjectedNode;
  });
  const nodeMap = new Map(nodes.map(n=>[n.id,n]));
  const eligible = (n: ProjectedNode) => !!n.gap?.actionable && n.progress.status !== 'done';
  const category = (n: ProjectedNode) => n.skillId && blockers.has(n.skillId) && n.gap?.requiredForCareer ? 0 : n.gap?.importance==='required'?1:n.gap?.requiredForCareer&&n.gap.prerequisiteOnly?2:n.gap?.importance==='recommended'?3:4;
  const mappingOrder = new Map(snapshot.careerSkillMappings.map(m=>[m.skillId,m.order]));
  projected.sort((a,b)=>Number(!eligible(a))-Number(!eligible(b))||category(a)-category(b)||Number(!!b.gap?.core)-Number(!!a.gap?.core)||
    (mappingOrder.get(a.skillId ?? '')??2147483647)-(mappingOrder.get(b.skillId ?? '')??2147483647)||
    sectionMap.get(nodeMap.get(a.nodeId)!.section_id)!.sequence-sectionMap.get(nodeMap.get(b.nodeId)!.section_id)!.sequence||
    nodeMap.get(a.nodeId)!.sequence-nodeMap.get(b.nodeId)!.sequence||graphTextOrder(a.nodeId,b.nodeId));
  projected.forEach((n,index)=>{n.priority=index+1;});
  const actionable = projected.filter(eligible), next = actionable[0];
  return {
    career:{...result.career},sourceRoadmap:{id:curriculum.roadmap.id,title:curriculum.roadmap.title},
    summary:{totalRelevantNodes:projected.filter(n=>n.skillId).length,completedNodes:projected.filter(n=>n.skillId&&n.progress.status==='done').length,inProgressNodes:projected.filter(n=>n.skillId&&n.progress.status==='learning').length,actionableNodes:actionable.length,blockedNodes:projected.filter(n=>n.gap?.blocked).length,nextNodeId:next?.nodeId ?? null},
    nextAction:next?{nodeId:next.nodeId,skillId:next.skillId!,title:next.nodeTitle,reason:next.reason,state:next.state}:null,
    upcoming:actionable.slice(1,11).map(n=>n.nodeId),
    roadmap:sections.sort((a,b)=>a.sequence-b.sequence||graphTextOrder(a.id,b.id)).map(s=>({sectionId:s.id,sectionTitle:s.title,nodes:projected.filter(n=>nodeMap.get(n.nodeId)!.section_id===s.id)})),
    skills:result.skills.map(s=>({...s})),warnings
  };
}
