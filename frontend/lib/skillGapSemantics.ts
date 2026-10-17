import type { ProficiencyTarget } from '@/types/careerSkillGraph';
import type { AuthoritativeSkillEvidence, LearnerEvidence, SkillEvidenceState, SkillGapSemantics, StudentSkillSnapshot } from '@/types/skillGapSemantics';
import { graphTextOrder, readPrerequisiteGraph } from './prerequisiteGraph';

// An ordinal comparison of the existing canonical vocabulary, not a numeric gap score.
export const CANONICAL_PROFICIENCY: readonly ProficiencyTarget[] = Object.freeze(['beginner','working','proficient','advanced'] as ProficiencyTarget[]);
export class SkillGapSemanticsError extends Error {
  constructor(public code: string) { super(code); this.name='SkillGapSemanticsError'; }
}
const fail = (code: string): never => { throw new SkillGapSemanticsError(code); };
const record = (v: unknown): v is Record<string,unknown> => !!v && typeof v==='object' && !Array.isArray(v);
const exact = (v: Record<string,unknown>, keys: string[]) => Object.keys(v).length===keys.length && keys.every(k=>Object.hasOwn(v,k));
const canonical = (v: unknown): v is ProficiencyTarget => CANONICAL_PROFICIENCY.includes(v as ProficiencyTarget);
const id = (v: unknown): v is string => typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** No claims, scores, exposure, skips or completion records create proficiency. */
export function normalizeSkillEvidence(
  skillIds: readonly string[], activity: readonly LearnerEvidence[], authoritative: readonly AuthoritativeSkillEvidence[] = []
): { skills: SkillEvidenceState[]; unassignedAssessmentSourceIds: string[] } {
  if(!Array.isArray(skillIds) || skillIds.length>5000 || skillIds.some(s=>!id(s)) || new Set(skillIds).size!==skillIds.length) fail('INVALID_SKILLS');
  if(!Array.isArray(activity) || !Array.isArray(authoritative) || activity.length+authoritative.length>100000) fail('EVIDENCE_LIMIT_EXCEEDED');
  const states=new Map(skillIds.map(skillId=>[skillId,{skillId,evidenceState:'UNKNOWN' as SkillEvidenceState['evidenceState'],claimed:false,activityPresent:false,assessmentPresent:false,exposurePresent:false,skipped:false,verified:false,currentProficiency:null as ProficiencyTarget|null}]));
  const unassigned=new Set<string>();
  for(const row of activity) {
    if(!record(row) || typeof row.sourceId!=='string' || !row.sourceId.trim() || row.sourceId.length>200 || typeof row.kind!=='string') fail('INVALID_EVIDENCE');
    const withStatus=row.kind==='ROADMAP_PROGRESS'||row.kind==='IMPROVEMENT_TASK';
    if(!exact(row,withStatus?['kind','skillId','sourceId','status']:['kind','skillId','sourceId'])) fail('INVALID_EVIDENCE');
    if(row.kind==='ASSESSMENT_ACTIVITY' && row.skillId===null) {unassigned.add(row.sourceId);continue;}
    const skillId=row.skillId;
    if(!id(skillId) || !states.has(skillId)) return fail('EVIDENCE_OUTSIDE_SNAPSHOT');
    const state=states.get(skillId)!;
    switch(row.kind) {
      case 'PROFILE_CLAIM': state.claimed=true;break;
      case 'RESOURCE_ACCESS': state.exposurePresent=true;break;
      case 'ROADMAP_PROGRESS':
        if(!['learning','done','skip'].includes(row.status as string)) fail('INVALID_EVIDENCE');
        if(row.status==='skip') state.skipped=true;else state.activityPresent=true;
        break;
      case 'IMPROVEMENT_TASK':
        if(!['pending','in_progress','completed','skipped'].includes(row.status as string)) fail('INVALID_EVIDENCE');
        if(row.status==='completed'||row.status==='in_progress') state.activityPresent=true;
        if(row.status==='skipped') state.skipped=true;
        break;
      case 'ASSESSMENT_ACTIVITY': state.assessmentPresent=true;break;
      default: fail('INVALID_EVIDENCE');
    }
  }
  for(const row of authoritative) {
    if(!record(row) || !exact(row,['skillId','proficiency','sourceId']) || !id(row.skillId) || !states.has(row.skillId) || !canonical(row.proficiency) || typeof row.sourceId!=='string' || !row.sourceId.trim() || row.sourceId.length>200) fail('INVALID_AUTHORITATIVE_EVIDENCE');
    const state=states.get(row.skillId)!;
    if(state.currentProficiency===null || CANONICAL_PROFICIENCY.indexOf(row.proficiency)>CANONICAL_PROFICIENCY.indexOf(state.currentProficiency)) state.currentProficiency=row.proficiency;
    state.verified=true;
  }
  for(const state of states.values()) state.evidenceState=state.verified?'VERIFIED':state.assessmentPresent?'ASSESSMENT':state.activityPresent?'ACTIVITY':state.claimed?'CLAIMED':'UNKNOWN';
  return {skills:[...states.values()].sort((a,b)=>graphTextOrder(a.skillId,b.skillId)),unassignedAssessmentSourceIds:[...unassigned].sort(graphTextOrder)};
}

/** Pure domain semantics only: no evidence collection, database, auth, API or UI. */
export function deriveSkillGapSemantics(
  snapshot: StudentSkillSnapshot, activity: readonly LearnerEvidence[] = [], authoritative: readonly AuthoritativeSkillEvidence[] = []
) {
  if(!record(snapshot) || !exact(snapshot,['career','skills','careerSkillMappings','prerequisites']) || !record(snapshot.career) || !exact(snapshot.career,['id','slug','name']) || !id(snapshot.career.id) || typeof snapshot.career.slug!=='string' || typeof snapshot.career.name!=='string' || !Array.isArray(snapshot.skills) || !Array.isArray(snapshot.careerSkillMappings) || !Array.isArray(snapshot.prerequisites)) fail('INVALID_SNAPSHOT');
  if(snapshot.skills.length>5000 || snapshot.prerequisites.length>20000 || snapshot.careerSkillMappings.length>5000) fail('GRAPH_LIMIT_EXCEEDED');
  for(const s of snapshot.skills) if(!record(s)||!exact(s,['id','slug','name','displayOrder'])||!id(s.id)||typeof s.slug!=='string'||typeof s.name!=='string'||!Number.isSafeInteger(s.displayOrder)||s.displayOrder<0) fail('INVALID_SNAPSHOT');
  for(const m of snapshot.careerSkillMappings) if(!record(m)||!exact(m,['skillId','importance','proficiency','core','order'])||!id(m.skillId)||!canonical(m.proficiency)||!['required','recommended','optional'].includes(m.importance)||typeof m.core!=='boolean'||!Number.isSafeInteger(m.order)||m.order<0) fail('INVALID_SNAPSHOT');
  for(const e of snapshot.prerequisites) if(!record(e)||!exact(e,['prerequisiteSkillId','dependentSkillId','relationship'])||!id(e.prerequisiteSkillId)||!id(e.dependentSkillId)||e.relationship!=='prerequisite') fail('INVALID_SNAPSHOT');
  if(new Set(snapshot.careerSkillMappings.map(m=>m.skillId)).size!==snapshot.careerSkillMappings.length) fail('INVALID_SNAPSHOT');
  // Adapt the C.1 published-only contract to its existing shared graph helper.
  const graph=readPrerequisiteGraph({career:{...snapshot.career,status:'published'},
    skills:snapshot.skills.map(s=>({...s,status:'published' as const,display_order:s.displayOrder})),
    mappings:snapshot.careerSkillMappings.map(m=>({skill_id:m.skillId,importance:m.importance,proficiency_target:m.proficiency,is_core:m.core,display_order:m.order})),
    edges:snapshot.prerequisites.map(e=>({source_skill_id:e.prerequisiteSkillId,target_skill_id:e.dependentSkillId,relationship_type:e.relationship}))},fail);
  const normalized=normalizeSkillEvidence(snapshot.skills.map(s=>s.id),activity,authoritative);
  const evidence=new Map(normalized.skills.map(s=>[s.skillId,s]));
  const meets=(skillId:string) => {const state=evidence.get(skillId)!,target=graph.mapping.get(skillId)?.proficiency_target;return state.verified && state.currentProficiency!==null && (!target || CANONICAL_PROFICIENCY.indexOf(state.currentProficiency)>=CANONICAL_PROFICIENCY.indexOf(target));};
  const ready=new Map<string,boolean>();
  const rows: SkillGapSemantics[]=graph.ordered.map(skillId=>{
    const s=graph.byId.get(skillId)!,m=graph.mapping.get(skillId),state=evidence.get(skillId)!;
    const prerequisites=[...(graph.incoming.get(skillId)||[])].sort(graphTextOrder);
    // A verified dependent does not erase an unresolved earlier link in the chain.
    const blockedBy=prerequisites.filter(p=>!meets(p)||!ready.get(p));
    const blocked=blockedBy.length>0;ready.set(skillId,!blocked);
    const satisfied=meets(skillId);
    const status=m?(satisfied?'SATISFIED':'GAP'):(satisfied?'PREREQUISITE_VERIFIED':'PREREQUISITE_UNVERIFIED');
    const reason=blocked?(blockedBy.some(p=>meets(p))?'An earlier prerequisite in the blocked dependency chain still requires evidence.':'Prerequisite skill requires evidence before this skill can be prioritized.'):
      !m?(satisfied?'Authoritative prerequisite evidence is present; no target proficiency is assigned.':'This supporting prerequisite needs authoritative evidence; no target proficiency is assigned.'):
      satisfied?'Authoritative evidence meets the career target.':state.currentProficiency===null?'Career target proficiency is required, but authoritative current proficiency is unknown.':'Authoritative current proficiency is below the career target.';
    return {...state,skillId,skillName:s.name,targetProficiency:m?.proficiency_target??null,importance:m?.importance??null,core:m?.is_core??false,
      mappedToCareer:!!m,prerequisiteOnly:!m,requiredForCareer:graph.required.has(skillId),status,prerequisites,blockedBy,blocked,
      actionable:!blocked&&!satisfied,priority:0,reason};
  });
  const category=(s:SkillGapSemantics) => s.importance==='required'?(s.core?0:1):s.importance==='recommended'?2:s.prerequisiteOnly?3:4;
  rows.sort((a,b)=>Number(!a.actionable)-Number(!b.actionable)||Number(a.blocked)-Number(b.blocked)||category(a)-category(b)||Number(b.core)-Number(a.core)||
    (graph.mapping.get(a.skillId)?.display_order??2147483647)-(graph.mapping.get(b.skillId)?.display_order??2147483647)||
    graph.byId.get(a.skillId)!.display_order-graph.byId.get(b.skillId)!.display_order||graphTextOrder(a.skillName,b.skillName)||graphTextOrder(a.skillId,b.skillId));
  rows.forEach((row,index)=>{row.priority=index+1;});
  return {career:{id:snapshot.career.id,slug:snapshot.career.slug,name:snapshot.career.name},skills:rows,unassignedAssessmentSourceIds:normalized.unassignedAssessmentSourceIds};
}
