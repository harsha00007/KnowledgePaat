-- Phase B: existing knowledge and delivery tables only. Apply after Phase A hardening and resource Phase 2.
BEGIN;
ALTER TABLE public.career_roadmaps ADD COLUMN IF NOT EXISTS composer_career_id uuid REFERENCES public.career_catalog(id) ON DELETE SET NULL;
ALTER TABLE public.career_roadmaps ADD COLUMN IF NOT EXISTS composer_version integer CHECK (composer_version IS NULL OR composer_version = 1);
CREATE UNIQUE INDEX IF NOT EXISTS uq_roadmap_composer_identity ON public.career_roadmaps(composer_career_id,composer_version) WHERE composer_career_id IS NOT NULL AND composer_version IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_composer_curated_skill_nodes ON public.career_roadmap_nodes(slug) WHERE node_type='SKILL' AND is_active;

-- A stable read-only snapshot includes unpublished dependencies for explicit validation.
-- INVOKER respects existing RLS. Authorization is derived from auth.uid(), never input.
CREATE OR REPLACE FUNCTION public.phase_b_composer_snapshot(career_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' SET statement_timeout='15s' AS $$
DECLARE c public.career_catalog; body jsonb; ids uuid[]; edge_count integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='42501'; END IF;
 IF NOT public.phase_a_is_admin() THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.career_catalog WHERE id=career_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'CAREER_NOT_FOUND' USING ERRCODE='P0001'; END IF;
 IF c.status<>'published' THEN RAISE EXCEPTION 'CAREER_NOT_PUBLISHED' USING ERRCODE='P0001'; END IF;
 IF c.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'SKILL_GRAPH_INVALID' USING ERRCODE='P0001'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.career_skill_map m WHERE m.career_id=c.id AND m.importance IN ('required','recommended')) THEN RAISE EXCEPTION 'NO_PUBLISHED_REQUIREMENTS' USING ERRCODE='P0001'; END IF;
 IF EXISTS(SELECT 1 FROM public.career_skill_map m LEFT JOIN public.skill_catalog s ON s.id=m.skill_id WHERE m.career_id=c.id AND (s.id IS NULL OR s.status<>'published')) THEN RAISE EXCEPTION 'UNPUBLISHED_REQUIRED_SKILL' USING ERRCODE='P0001'; END IF;
 WITH RECURSIVE closure(id) AS (
   SELECT m.skill_id FROM public.career_skill_map m WHERE m.career_id=c.id
   UNION SELECT r.source_skill_id FROM public.skill_relationships r JOIN closure x ON x.id=r.target_skill_id WHERE r.relationship_type='prerequisite'
 ) SELECT array_agg(id ORDER BY id) INTO ids FROM (SELECT id FROM closure LIMIT 5001) q;
 IF cardinality(ids)>5000 THEN RAISE EXCEPTION 'GRAPH_LIMIT_EXCEEDED' USING ERRCODE='P0001'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(ids) x(id) LEFT JOIN public.skill_catalog s ON s.id=x.id WHERE s.id IS NULL) THEN RAISE EXCEPTION 'SKILL_GRAPH_INVALID' USING ERRCODE='P0001'; END IF;
 IF EXISTS(SELECT 1 FROM public.skill_catalog WHERE id=ANY(ids) AND status<>'published') THEN RAISE EXCEPTION 'UNPUBLISHED_PREREQUISITE' USING ERRCODE='P0001'; END IF;
 IF EXISTS(SELECT 1 FROM public.skill_catalog WHERE id=ANY(ids) AND slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$') THEN RAISE EXCEPTION 'SKILL_GRAPH_INVALID' USING ERRCODE='P0001'; END IF;
 SELECT count(*) INTO edge_count FROM public.skill_relationships WHERE relationship_type='prerequisite' AND source_skill_id=ANY(ids) AND target_skill_id=ANY(ids);
 IF edge_count>20000 THEN RAISE EXCEPTION 'GRAPH_LIMIT_EXCEEDED' USING ERRCODE='P0001'; END IF;
 SELECT jsonb_build_object('career',to_jsonb(c),
   'mappings',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.id),'[]') FROM public.career_skill_map m WHERE m.career_id=c.id),
   'skills',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id),'[]') FROM public.skill_catalog s WHERE s.id=ANY(ids)),
   'edges',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),'[]') FROM public.skill_relationships r WHERE r.relationship_type='prerequisite' AND r.source_skill_id=ANY(ids) AND r.target_skill_id=ANY(ids)),
   'resources',(
     WITH candidates AS (
       SELECT DISTINCT ON (s.id,res.id) s.id AS skill_id,res.id AS resource_id,res.title,res.difficulty,
         a.priority,a.is_recommended,s.difficulty AS skill_difficulty
       FROM public.skill_catalog s
       JOIN public.career_roadmap_nodes n ON n.slug=s.slug AND n.node_type='SKILL' AND n.is_active
       JOIN public.career_roadmap_sections sec ON sec.id=n.section_id AND sec.is_active
       JOIN public.career_roadmaps rm ON rm.id=sec.roadmap_id AND rm.is_active
       JOIN public.career_roadmap_node_resources a ON a.node_id=n.id
       JOIN public.career_resources res ON res.id=a.resource_id AND res.is_active
       WHERE s.id=ANY(ids) ORDER BY s.id,res.id,a.is_recommended DESC,a.priority,a.id
     ), ranked AS (
       SELECT *,row_number() OVER(PARTITION BY skill_id ORDER BY is_recommended DESC,priority,(lower(difficulty)=skill_difficulty) DESC,title COLLATE "C",resource_id) AS rank FROM candidates
     ) SELECT coalesce(jsonb_agg(jsonb_build_object('skill_id',skill_id,'resource_id',resource_id,'title',title,'priority',priority,'is_recommended',is_recommended) ORDER BY skill_id,rank),'[]') FROM ranked WHERE rank<=5
   )) INTO body;
 RETURN jsonb_build_object('snapshot',body,'fingerprint',md5(body::text));
END $$;
REVOKE ALL ON FUNCTION public.phase_b_composer_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase_b_composer_snapshot(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.phase_b_compose_roadmap(career_id uuid, expected_fingerprint text, ordered_skill_ids uuid[], options jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' SET statement_timeout='30s' AS $$
DECLARE envelope jsonb; body jsonb; c public.career_catalog; rm public.career_roadmaps;
 item jsonb; selected uuid; supplied uuid; section_id uuid; stage integer; idx integer:=0; section_count integer:=0;
 resource_count integer:=0; node_count integer; title_value text; difficulty_value text; category_value text; duration_value text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='42501'; END IF;
 IF NOT public.phase_a_is_admin() THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'ROADMAP_GENERATION_FAILED' USING ERRCODE='40001'; END IF;
 IF options IS NULL OR jsonb_typeof(options)<>'object' THEN RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE='P0001'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(options) k WHERE k NOT IN ('title','difficulty','targetDuration')) THEN RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE='P0001'; END IF;
 IF (options ? 'title' AND (jsonb_typeof(options->'title')<>'string' OR length(trim(options->>'title')) NOT BETWEEN 3 AND 200))
 OR (options ? 'difficulty' AND options->>'difficulty' NOT IN ('Beginner','Intermediate','Advanced'))
 OR (options ? 'targetDuration' AND (jsonb_typeof(options->'targetDuration')<>'string' OR length(trim(options->>'targetDuration')) NOT BETWEEN 1 AND 100)) THEN RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE='P0001'; END IF;
 -- Shares Phase A's graph/publication lock; resource/curriculum locks freeze curation.
 PERFORM pg_catalog.pg_advisory_xact_lock(73104,1);
 LOCK TABLE public.career_resources,public.career_roadmaps,public.career_roadmap_sections,public.career_roadmap_nodes,public.career_roadmap_node_resources IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO c FROM public.career_catalog WHERE id=career_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'CAREER_NOT_FOUND' USING ERRCODE='P0001'; END IF;
 IF c.status<>'published' THEN RAISE EXCEPTION 'CAREER_NOT_PUBLISHED' USING ERRCODE='P0001'; END IF;
 SELECT * INTO rm FROM public.career_roadmaps WHERE composer_career_id=c.id AND composer_version=1;
 IF FOUND THEN
   RETURN jsonb_build_object('roadmapId',rm.id,'slug',rm.slug,'title',rm.title,'status','existing','is_active',rm.is_active,
     'sections',(SELECT count(*) FROM public.career_roadmap_sections WHERE roadmap_id=rm.id),
     'nodeCount',(SELECT count(*) FROM public.career_roadmap_nodes n JOIN public.career_roadmap_sections s ON s.id=n.section_id WHERE s.roadmap_id=rm.id),
     'resourceCount',(SELECT count(*) FROM public.career_roadmap_node_resources a JOIN public.career_roadmap_nodes n ON n.id=a.node_id JOIN public.career_roadmap_sections s ON s.id=n.section_id WHERE s.roadmap_id=rm.id),
     'warnings',jsonb_build_array('Existing composition returned unchanged. Graph changes and options are not applied; review in the existing builder.'));
 END IF;
 envelope:=public.phase_b_composer_snapshot(c.id); body:=envelope->'snapshot';
 IF expected_fingerprint IS NULL OR envelope->>'fingerprint'<>expected_fingerprint THEN RAISE EXCEPTION 'PREVIEW_STALE' USING ERRCODE='P0001'; END IF;
 node_count:=jsonb_array_length(body->'skills');
 IF ordered_skill_ids IS NULL OR cardinality(ordered_skill_ids)<>node_count OR (SELECT count(DISTINCT x) FROM unnest(ordered_skill_ids) x)<>node_count THEN RAISE EXCEPTION 'SKILL_GRAPH_INVALID' USING ERRCODE='P0001'; END IF;
 -- Session-local work sets, dropped at transaction end; no persistent entities.
 DROP TABLE IF EXISTS pg_temp.phase_b_nodes; DROP TABLE IF EXISTS pg_temp.phase_b_edges;
 CREATE TEMP TABLE phase_b_nodes(id uuid PRIMARY KEY,skill jsonb,mapping jsonb,indegree integer,foundation boolean,is_required boolean DEFAULT false,position integer,node_id uuid DEFAULT gen_random_uuid()) ON COMMIT DROP;
 CREATE TEMP TABLE phase_b_edges(source uuid,target uuid,PRIMARY KEY(source,target)) ON COMMIT DROP;
 INSERT INTO pg_temp.phase_b_nodes(id,skill,mapping,indegree,foundation)
 SELECT (s->>'id')::uuid,s,m,0,false FROM jsonb_array_elements(body->'skills') s LEFT JOIN jsonb_array_elements(body->'mappings') m ON m->>'skill_id'=s->>'id';
 INSERT INTO pg_temp.phase_b_edges SELECT DISTINCT (e->>'source_skill_id')::uuid,(e->>'target_skill_id')::uuid FROM jsonb_array_elements(body->'edges') e;
 CREATE INDEX ON pg_temp.phase_b_edges(target); CREATE INDEX ON pg_temp.phase_b_edges(source);
 UPDATE pg_temp.phase_b_nodes n SET indegree=(SELECT count(*) FROM pg_temp.phase_b_edges e WHERE e.target=n.id),foundation=EXISTS(SELECT 1 FROM pg_temp.phase_b_edges e WHERE e.source=n.id);
 WITH RECURSIVE required(id) AS (
   SELECT id FROM pg_temp.phase_b_nodes WHERE mapping->>'importance'<>'optional' OR (mapping->>'is_core')::boolean
   UNION SELECT e.source FROM pg_temp.phase_b_edges e JOIN required r ON r.id=e.target
 ) UPDATE pg_temp.phase_b_nodes SET is_required=true WHERE id IN (SELECT id FROM required);
 FOREACH supplied IN ARRAY ordered_skill_ids LOOP
   SELECT id INTO selected FROM pg_temp.phase_b_nodes WHERE position IS NULL AND indegree=0
     ORDER BY foundation DESC,coalesce((mapping->>'display_order')::integer,2147483647),coalesce((mapping->>'is_core')::boolean,false) DESC,(skill->>'display_order')::integer,(skill->>'name') COLLATE "C",id LIMIT 1;
   IF NOT FOUND THEN RAISE EXCEPTION 'SKILL_GRAPH_CYCLE' USING ERRCODE='P0001'; END IF;
   IF selected<>supplied THEN RAISE EXCEPTION 'SKILL_GRAPH_INVALID' USING ERRCODE='P0001'; END IF;
   idx:=idx+1; UPDATE pg_temp.phase_b_nodes SET position=idx WHERE id=selected;
   UPDATE pg_temp.phase_b_nodes SET indegree=indegree-1 WHERE id IN (SELECT target FROM pg_temp.phase_b_edges WHERE source=selected);
 END LOOP;
 title_value:=coalesce(trim(options->>'title'),c.name||' Roadmap');
 difficulty_value:=coalesce(options->>'difficulty',initcap(c.difficulty));
 duration_value:=coalesce(trim(options->>'targetDuration'),CASE WHEN c.estimated_months>0 THEN c.estimated_months||' months' ELSE '' END);
 category_value:=CASE c.category WHEN 'software_development' THEN 'Development' WHEN 'web_development' THEN 'Development' WHEN 'data' THEN 'Data' WHEN 'data_science' THEN 'Data' WHEN 'data_analytics' THEN 'Data' WHEN 'ai' THEN 'AI' WHEN 'artificial_intelligence' THEN 'AI' WHEN 'testing' THEN 'QA & Testing' WHEN 'qa_testing' THEN 'QA & Testing' WHEN 'devops' THEN 'DevOps & Cloud' WHEN 'cloud' THEN 'DevOps & Cloud' WHEN 'cybersecurity' THEN 'Cybersecurity' WHEN 'product' THEN 'Product' WHEN 'design' THEN 'Design' ELSE 'Other' END;
 IF EXISTS(SELECT 1 FROM public.career_roadmaps WHERE slug=c.slug||'-composed-v1') THEN RAISE EXCEPTION 'ROADMAP_ALREADY_EXISTS' USING ERRCODE='P0001'; END IF;
 INSERT INTO public.career_roadmaps(title,slug,short_description,description,category,difficulty,estimated_duration,is_active,created_by,composer_career_id,composer_version)
 VALUES(title_value,c.slug||'-composed-v1',c.short_description,c.description,category_value,difficulty_value,duration_value,false,auth.uid(),c.id,1) RETURNING * INTO rm;
 FOR stage IN 1..2 LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_temp.phase_b_nodes WHERE foundation=(stage=1)) THEN CONTINUE; END IF;
   section_count:=section_count+1;
   INSERT INTO public.career_roadmap_sections(roadmap_id,title,slug,sequence,is_required,is_active)
   VALUES(rm.id,CASE stage WHEN 1 THEN 'Foundation' ELSE 'Core Skills' END,CASE stage WHEN 1 THEN 'foundation' ELSE 'core-skills' END,section_count,true,true) RETURNING id INTO section_id;
   INSERT INTO public.career_roadmap_nodes(id,section_id,title,slug,description,node_type,difficulty,estimated_minutes,sequence,is_required,is_active)
   SELECT node_id,section_id,skill->>'name',skill->>'slug',coalesce(nullif(skill->>'description',''),skill->>'short_description')||CASE WHEN mapping IS NOT NULL THEN E'\n\nTarget proficiency: '||(mapping->>'proficiency_target')||'.' ELSE '' END,'SKILL',initcap(skill->>'difficulty'),30,row_number() OVER(ORDER BY position),is_required,true FROM pg_temp.phase_b_nodes WHERE foundation=(stage=1);
 END LOOP;
 INSERT INTO public.career_roadmap_node_relationships(source_node_id,target_node_id,relationship_type)
 SELECT s.node_id,t.node_id,'PREREQUISITE' FROM pg_temp.phase_b_edges e JOIN pg_temp.phase_b_nodes s ON s.id=e.source JOIN pg_temp.phase_b_nodes t ON t.id=e.target;
 INSERT INTO public.career_roadmap_node_resources(node_id,resource_id,priority,is_recommended)
 SELECT n.node_id,(r->>'resource_id')::uuid,(r->>'priority')::integer,(r->>'is_recommended')::boolean FROM jsonb_array_elements(body->'resources') r JOIN pg_temp.phase_b_nodes n ON n.id=(r->>'skill_id')::uuid;
 GET DIAGNOSTICS resource_count=ROW_COUNT;
 RETURN jsonb_build_object('roadmapId',rm.id,'slug',rm.slug,'title',rm.title,'sections',section_count,'nodeCount',node_count,'resourceCount',resource_count,'status','created','is_active',false,
   'warnings',jsonb_build_array('Draft created. Learning times use the existing 30-minute default; review curriculum and estimates in the existing builder before publication.'));
END $$;
REVOKE ALL ON FUNCTION public.phase_b_compose_roadmap(uuid,text,uuid[],jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase_b_compose_roadmap(uuid,text,uuid[],jsonb) TO authenticated;
COMMIT;
