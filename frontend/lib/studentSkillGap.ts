import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isCatalogId } from './catalogIntegrity';
import { serializeStudentSnapshot, StudentSnapshotError } from './studentCareerSnapshot';
import { deriveSkillGapSemantics, SkillGapSemanticsError } from './skillGapSemantics';
import type { LearnerEvidence, StudentSkillSnapshot } from '@/types/skillGapSemantics';

type Client = Awaited<ReturnType<typeof createClient>>;
type Row = Record<string, any>;
class EvidenceError extends Error {}

/** Bounded pagination: never silently treat a truncated evidence read as complete. */
async function readRows(query: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: unknown }>) {
  const rows: Row[] = [];
  for (let offset = 0; offset < 100000; offset += 200) {
    const result = await query(offset, offset + 199);
    if (result.error || !Array.isArray(result.data)) throw new EvidenceError();
    rows.push(...result.data);
    if (result.data.length < 200) return rows;
  }
  throw new EvidenceError();
}

/** Exact, unambiguous catalog labels only; no fuzzy association or proficiency conversion. */
export function adaptStudentEvidence(snapshot: StudentSkillSnapshot, claims: unknown, progress: Row[], tasks: Row[], attempts: Row[]): LearnerEvidence[] {
  const labels = new Map<string, Set<string>>();
  const key = (label: string) => label.trim().toLowerCase();
  for (const skill of snapshot.skills) for (const label of [skill.slug, skill.name]) {
    const normalized = key(label);
    if (!labels.has(normalized)) labels.set(normalized, new Set());
    labels.get(normalized)!.add(skill.id);
  }
  const match = (label: unknown) => {
    if (typeof label !== 'string') return null;
    const ids = labels.get(key(label));
    return ids?.size === 1 ? [...ids][0] : null;
  };
  if (claims != null && (!Array.isArray(claims) || claims.some(c => typeof c !== 'string'))) throw new EvidenceError();
  const evidence: LearnerEvidence[] = [];
  for (const claim of (claims ?? []) as string[]) {
    const skillId = match(claim);
    if (skillId) evidence.push({ kind: 'PROFILE_CLAIM', skillId, sourceId: `profile:${skillId}` });
  }
  for (const row of progress) {
    const node = row.career_roadmap_nodes;
    if (!isCatalogId(row.node_id) || !node || typeof node.slug !== 'string' || !['learning','done','skip'].includes(row.status)) throw new EvidenceError();
    const skillId = match(node.slug);
    if (skillId) evidence.push({ kind: 'ROADMAP_PROGRESS', skillId, sourceId: row.node_id, status: row.status });
  }
  for (const row of tasks) {
    if (!isCatalogId(row.id) || !['pending','in_progress','completed','skipped'].includes(row.status)) throw new EvidenceError();
    const skillId = match(row.related_skill);
    if (skillId) evidence.push({ kind: 'IMPROVEMENT_TASK', skillId, sourceId: row.id, status: row.status });
  }
  for (const row of attempts) {
    if (!isCatalogId(row.id)) throw new EvidenceError();
    evidence.push({ kind: 'ASSESSMENT_ACTIVITY', skillId: null, sourceId: row.id });
  }
  return evidence;
}

async function fetchEvidence(client: Client, userId: string, snapshot: StudentSkillSnapshot, claims: unknown) {
  const [progress, tasks, attempts] = await Promise.all([
    readRows((from, to) => client.from('career_user_roadmap_progress')
      .select('node_id,status,career_roadmap_nodes!inner(slug,career_roadmap_sections!inner(career_roadmaps!inner(id)))')
      .eq('user_id', userId).eq('career_roadmap_nodes.node_type','SKILL').eq('career_roadmap_nodes.is_active',true)
      .eq('career_roadmap_nodes.career_roadmap_sections.is_active',true)
      .eq('career_roadmap_nodes.career_roadmap_sections.career_roadmaps.is_active',true)
      .eq('career_roadmap_nodes.career_roadmap_sections.career_roadmaps.composer_career_id',snapshot.career.id)
      .order('node_id').range(from,to)),
    readRows((from, to) => client.from('career_plan_tasks')
      .select('id,related_skill,status,career_improvement_plans!inner(id)')
      .eq('student_id',userId).eq('career_improvement_plans.student_id',userId).order('id').range(from,to)),
    readRows((from, to) => client.from('student_test_attempts').select('id').eq('student_id',userId).order('id').range(from,to))
  ]);
  return adaptStudentEvidence(snapshot, claims, progress, tasks, attempts);
}

/** Summary is a projection of the existing semantic rows, not another gap calculation. */
export function skillGapResponse(result: ReturnType<typeof deriveSkillGapSemantics>) {
  return {
    ...result,
    summary: {
      requiredSkills: result.skills.filter(s => s.mappedToCareer && s.importance === 'required').length,
      gaps: result.skills.filter(s => s.status === 'GAP').length,
      satisfied: result.skills.filter(s => s.status === 'SATISFIED').length,
      blocked: result.skills.filter(s => s.blocked).length
    },
    topGaps: result.skills.filter(s => s.actionable).slice(0,10)
  };
}

export interface StudentSkillGapContext {
  client: Client;
  userId: string;
  snapshot: StudentSkillSnapshot;
  result: ReturnType<typeof deriveSkillGapSemantics>;
}

export async function handleStudentSkillGap(req: NextRequest, project?: (context: StudentSkillGapContext) => Promise<unknown>) {
  const respond = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control':'private, no-store' } });
  const error = (code: string, message: string, status: number) => respond({ code, error: message }, status);
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return error('UNAUTHORIZED','Sign in to access your skill gap.',401);
    const { data: profile, error: profileError } = await client.from('profiles').select('role,target_career_id,skills').eq('id',user.id).maybeSingle();
    if (profileError) throw new EvidenceError();
    if (profile?.role !== 'student') return error('FORBIDDEN','Student access required.',403);
    if (new URL(req.url).search || req.body !== null) return error('INVALID_INPUT','This endpoint accepts no parameters or body.',400);
    if (!profile.target_career_id) return error('TARGET_CAREER_REQUIRED','Select a target career first.',400);
    if (!isCatalogId(profile.target_career_id)) return error('TARGET_CAREER_UNAVAILABLE','Target career is unavailable.',404);
    const { data: raw, error: rpcError } = await client.rpc('phase_c_student_skill_snapshot');
    if (rpcError) {
      const code = rpcError.message;
      if (['UNAUTHORIZED','FORBIDDEN','TARGET_CAREER_REQUIRED','TARGET_CAREER_UNAVAILABLE'].includes(code))
        return error(code,'Student target career is unavailable.',code==='UNAUTHORIZED'?401:code==='FORBIDDEN'?403:code==='TARGET_CAREER_REQUIRED'?400:404);
      if (['SKILL_GRAPH_INVALID','SKILL_GRAPH_CYCLE','GRAPH_LIMIT_EXCEEDED','NO_PUBLISHED_REQUIREMENTS','UNPUBLISHED_REQUIRED_SKILL','UNPUBLISHED_PREREQUISITE'].includes(code))
        return error(code,'Career requirements are invalid or unavailable.',422);
      throw new EvidenceError();
    }
    if (raw?.career?.id && raw.career.id !== profile.target_career_id) return error('SNAPSHOT_CHANGED','Your target career changed. Please reload.',409);
    const snapshot = serializeStudentSnapshot(raw,profile.target_career_id);
    const evidence = await fetchEvidence(client,user.id,snapshot,profile.skills);
    // No repository source currently attests canonical proficiency. Never accept verified facts from clients.
    const result = deriveSkillGapSemantics(snapshot,evidence);
    return respond(project ? await project({client,userId:user.id,snapshot,result}) : skillGapResponse(result));
  } catch (caught) {
    if (caught instanceof StudentSnapshotError || caught instanceof SkillGapSemanticsError)
      return error(caught.code,'Career requirements or curriculum are invalid or unavailable.',caught instanceof StudentSnapshotError ? caught.status : 422);
    return error('SKILL_GAP_UNAVAILABLE','Skill gap is unavailable. Please try again.',500);
  }
}
