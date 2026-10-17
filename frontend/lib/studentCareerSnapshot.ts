import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isCatalogId } from './catalogIntegrity';
import { readPrerequisiteGraph, type PrerequisiteGraph } from './prerequisiteGraph';

export class StudentSnapshotError extends Error {
  constructor(public code: string, public status = 422) { super(code); }
}
const messages: Record<string,string> = {
  UNAUTHORIZED:'Sign in to access your target career.', FORBIDDEN:'Student access required.',
  TARGET_CAREER_REQUIRED:'Select a target career first.', TARGET_CAREER_UNAVAILABLE:'Target career is unavailable.',
  INVALID_INPUT:'Invalid request.', GRAPH_LIMIT_EXCEEDED:'Career graph exceeds the supported size.',
  SKILL_GRAPH_INVALID:'Career graph is unavailable because its requirements are invalid.',
  SKILL_GRAPH_CYCLE:'Career graph contains a prerequisite cycle.',
  NO_PUBLISHED_REQUIREMENTS:'Career has no published requirements.',
  UNPUBLISHED_REQUIRED_SKILL:'Career includes an unpublished requirement.',
  UNPUBLISHED_PREREQUISITE:'Career includes an unpublished prerequisite.',
  SNAPSHOT_CHANGED:'Your target career changed. Please reload.',
  SNAPSHOT_UNAVAILABLE:'Career snapshot is unavailable. Please try again.'
};
const record = (v: unknown): v is Record<string,unknown> => !!v && typeof v==='object' && !Array.isArray(v);
const exact = (v: Record<string,unknown>, keys: string[]) => Object.keys(v).every(k=>keys.includes(k)) && keys.every(k=>Object.hasOwn(v,k));
const order = (v: unknown) => Number.isSafeInteger(v) && (v as number)>=0;

/** Validate and serialize a minimal public read model; never pass through RPC metadata. */
export function serializeStudentSnapshot(value: unknown, target: string) {
  const fail = (code: string): never => { throw new StudentSnapshotError(code); };
  if (!record(value) || !exact(value,['career','skills','mappings','edges']) || !record(value.career) ||
    !Array.isArray(value.skills) || !Array.isArray(value.mappings) || !Array.isArray(value.edges)) fail('SKILL_GRAPH_INVALID');
  const v=value as Record<string,any>;
  const c=v.career;
  if (!exact(c,['id','slug','name','status']) || !isCatalogId(c.id) || c.id!==target || typeof c.slug!=='string' || typeof c.name!=='string' || c.status!=='published') fail('SKILL_GRAPH_INVALID');
  if(v.skills.length>5000 || v.edges.length>20000 || v.mappings.length>5000) fail('GRAPH_LIMIT_EXCEEDED');
  for(const s of v.skills) if(!record(s) || !exact(s,['id','slug','name','status','display_order']) || !isCatalogId(s.id) || typeof s.slug!=='string' || typeof s.name!=='string' || s.status!=='published' || !order(s.display_order)) fail('SKILL_GRAPH_INVALID');
  for(const m of v.mappings) if(!record(m) || !exact(m,['skill_id','importance','proficiency_target','is_core','display_order']) || !isCatalogId(m.skill_id) || !['required','recommended','optional'].includes(m.importance as string) || !['beginner','working','proficient','advanced'].includes(m.proficiency_target as string) || typeof m.is_core!=='boolean' || !order(m.display_order)) fail('SKILL_GRAPH_INVALID');
  if(new Set(v.mappings.map((m: {skill_id:string})=>m.skill_id)).size!==v.mappings.length) fail('SKILL_GRAPH_INVALID');
  for(const e of v.edges) if(!record(e) || !exact(e,['source_skill_id','target_skill_id','relationship_type']) || !isCatalogId(e.source_skill_id) || !isCatalogId(e.target_skill_id) || e.relationship_type!=='prerequisite') fail('SKILL_GRAPH_INVALID');
  const graph=v as PrerequisiteGraph;
  const {ordered,byId,mapping,edgeKeys}=readPrerequisiteGraph(graph,fail);
  return {
    career:{id:c.id as string,slug:c.slug as string,name:c.name as string},
    skills:ordered.map(id=>{const s=byId.get(id)!;return {id:s.id,slug:s.slug,name:s.name,displayOrder:s.display_order};}),
    careerSkillMappings:ordered.filter(id=>mapping.has(id)).map(id=>{const m=mapping.get(id)!;return {skillId:id,importance:m.importance,proficiency:m.proficiency_target,core:m.is_core,order:m.display_order};}),
    prerequisites:[...edgeKeys].sort().map(key=>{const [prerequisiteSkillId,dependentSkillId]=key.split(':');return {prerequisiteSkillId,dependentSkillId,relationship:'prerequisite' as const};})
  };
}

export async function handleStudentCareerRequest(req: NextRequest, update = false) {
  const response = (body: unknown,status=200) => NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
  try {
    const supabase=await createClient();
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError || !user) throw new StudentSnapshotError('UNAUTHORIZED',401);
    const {data:profile,error}=await supabase.from('profiles').select('role,target_career_id').eq('id',user.id).maybeSingle();
    if(error) throw error;
    if(profile?.role!=='student') throw new StudentSnapshotError('FORBIDDEN',403);
    if(new URL(req.url).search) throw new StudentSnapshotError('INVALID_INPUT',400);
    if(update) {
      let body: unknown; try {body=await req.json();} catch {throw new StudentSnapshotError('INVALID_INPUT',400);}
      if(!record(body) || !exact(body,['targetCareerId']) || (body.targetCareerId!==null && !isCatalogId(body.targetCareerId))) throw new StudentSnapshotError('INVALID_INPUT',400);
      if(body.targetCareerId!==null) {
        const {data:career,error:careerError}=await supabase.from('career_catalog').select('id').eq('id',body.targetCareerId).eq('status','published').maybeSingle();
        if(careerError) throw careerError;
        if(!career) throw new StudentSnapshotError('TARGET_CAREER_UNAVAILABLE',404);
      }
      const {data:saved,error:saveError}=await supabase.from('profiles').update({target_career_id:body.targetCareerId}).eq('id',user.id).select('target_career_id').maybeSingle();
      if(saveError) throw saveError;
      if(!saved) throw new StudentSnapshotError('SNAPSHOT_UNAVAILABLE',503);
      return response({targetCareerId:saved.target_career_id});
    }
    if(!profile.target_career_id) throw new StudentSnapshotError('TARGET_CAREER_REQUIRED',400);
    if(!isCatalogId(profile.target_career_id)) throw new StudentSnapshotError('TARGET_CAREER_UNAVAILABLE',404);
    const {data:snapshot,error:rpcError}=await supabase.rpc('phase_c_student_skill_snapshot');
    if(rpcError) throw rpcError;
    if(record(snapshot) && record(snapshot.career) && snapshot.career.id!==profile.target_career_id) throw new StudentSnapshotError('SNAPSHOT_CHANGED',409);
    return response(serializeStudentSnapshot(snapshot,profile.target_career_id));
  } catch(error) {
    if(error instanceof StudentSnapshotError) return response({code:error.code,error:messages[error.code]||messages.SNAPSHOT_UNAVAILABLE},error.status);
    const code=(error as {message?:string})?.message;
    if(code && Object.hasOwn(messages,code)) return response({code,error:messages[code]},code==='UNAUTHORIZED'?401:code==='FORBIDDEN'?403:code==='TARGET_CAREER_REQUIRED'?400:code==='TARGET_CAREER_UNAVAILABLE'?404:422);
    return response({code:'SNAPSHOT_UNAVAILABLE',error:messages.SNAPSHOT_UNAVAILABLE},503);
  }
}
