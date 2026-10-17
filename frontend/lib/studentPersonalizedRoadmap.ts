import 'server-only';
import { NextRequest } from 'next/server';
import { handleStudentSkillGap, type StudentSkillGapContext } from './studentSkillGap';
import { StudentSnapshotError } from './studentCareerSnapshot';
import { getNodesResourcesMap } from './resource';
import { projectPersonalizedRoadmap, ProjectionError } from './personalizedRoadmapProjection';
import type { ProjectionCurriculum } from '@/types/personalizedRoadmap';

type Row = Record<string, any>;
async function rows(query: (from: number,to: number)=>PromiseLike<{data: Row[] | null; error: unknown}>, maximum: number) {
  const found: Row[] = [];
  for (let from=0; from<=maximum; from+=200) {
    const {data,error}=await query(from,Math.min(from+199,maximum));
    if (error || !Array.isArray(data)) throw new Error('CURRICULUM_UNAVAILABLE');
    found.push(...data);
    if (found.length>maximum) throw new StudentSnapshotError('CURRICULUM_LIMIT_EXCEEDED',422);
    if (data.length<Math.min(200,maximum-from+1)) return found;
  }
  throw new StudentSnapshotError('CURRICULUM_LIMIT_EXCEEDED',422);
}

export async function personalizedRoadmapForStudent({client,userId,snapshot,result}: StudentSkillGapContext) {
  const {data:roadmap,error}=await client.from('career_roadmaps').select('id,title,composer_career_id,composer_version,is_active')
    .eq('composer_career_id',snapshot.career.id).eq('composer_version',1).eq('is_active',true).maybeSingle();
  if (error) throw new Error('CURRICULUM_UNAVAILABLE');
  if (!roadmap) throw new StudentSnapshotError('ROADMAP_UNAVAILABLE',404);
  const [sections,nodes]=await Promise.all([
    rows((from,to)=>client.from('career_roadmap_sections').select('id,roadmap_id,title,sequence,is_active').eq('roadmap_id',roadmap.id).eq('is_active',true).order('id').range(from,to),5000),
    rows((from,to)=>client.from('career_roadmap_nodes').select('id,section_id,title,slug,node_type,sequence,is_active,career_roadmap_sections!inner(id)')
      .eq('career_roadmap_sections.roadmap_id',roadmap.id).eq('career_roadmap_sections.is_active',true).eq('is_active',true).order('id').range(from,to),5000)
  ]);
  const [topics,progress,resourcesMap]=await Promise.all([
    rows((from,to)=>client.from('career_roadmap_node_topics').select('id,node_id,topic,sequence,career_roadmap_nodes!inner(career_roadmap_sections!inner(id))')
      .eq('career_roadmap_nodes.is_active',true).eq('career_roadmap_nodes.career_roadmap_sections.is_active',true)
      .eq('career_roadmap_nodes.career_roadmap_sections.roadmap_id',roadmap.id).order('id').range(from,to),100000),
    rows((from,to)=>client.from('career_user_roadmap_progress').select('node_id,status,career_roadmap_nodes!inner(career_roadmap_sections!inner(id))')
      .eq('user_id',userId).eq('career_roadmap_nodes.is_active',true).eq('career_roadmap_nodes.career_roadmap_sections.is_active',true)
      .eq('career_roadmap_nodes.career_roadmap_sections.roadmap_id',roadmap.id).order('node_id').range(from,to),5000),
    getNodesResourcesMap(nodes.map(n=>n.id),true)
  ]);
  const curriculum: ProjectionCurriculum={roadmap,sections:sections as ProjectionCurriculum['sections'],nodes:nodes as ProjectionCurriculum['nodes'],
    topics:topics.map(t=>({id:t.id,node_id:t.node_id,topic:t.topic,sequence:t.sequence})),
    progress:progress.map(p=>({node_id:p.node_id,status:p.status})),resources:Object.values(resourcesMap).flat()};
  try { return projectPersonalizedRoadmap(snapshot,result,curriculum); }
  catch (caught) {
    if (caught instanceof ProjectionError) throw new StudentSnapshotError(caught.code,422);
    throw caught;
  }
}

export function handleStudentPersonalizedRoadmap(req: NextRequest) {
  return handleStudentSkillGap(req,personalizedRoadmapForStudent);
}
