-- Phase C infrastructure only. Requires Phase A hardening and Phase B.
-- Apply to an authorized development/staging database first; never auto-deploy.
BEGIN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_career_id uuid NULL
  REFERENCES public.career_catalog(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_target_career ON public.profiles(target_career_id)
  WHERE target_career_id IS NOT NULL;

-- Validate direct profile writes as well as the application selection endpoint.
-- Existing ownership RLS and role-protection triggers remain unchanged.
CREATE OR REPLACE FUNCTION public.phase_c_validate_target_career()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.target_career_id IS NOT DISTINCT FROM OLD.target_career_id THEN RETURN NEW; END IF;
 IF NEW.target_career_id IS NULL THEN RETURN NEW; END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN
   RAISE EXCEPTION 'Target career changes require READ COMMITTED isolation' USING ERRCODE='40001';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(73104,1);
 IF NEW.target_career_id IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM public.career_catalog c WHERE c.id=NEW.target_career_id AND c.status='published'
 ) THEN RAISE EXCEPTION 'TARGET_CAREER_UNAVAILABLE' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.phase_c_validate_target_career() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER phase_c_validate_target_career BEFORE INSERT OR UPDATE OF target_career_id ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION public.phase_c_validate_target_career();

-- A dedicated allowlisted read model, not a student-accessible composer RPC.
-- Definer visibility detects hidden prerequisites instead of silently omitting them.
CREATE OR REPLACE FUNCTION public.phase_c_student_skill_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path='' SET statement_timeout='15s' AS $$
DECLARE target uuid; student_role text; c public.career_catalog; ids uuid[];
 remaining uuid[]; frontier uuid[]; edge_count integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='42501'; END IF;
 SELECT p.target_career_id,p.role INTO target,student_role FROM public.profiles p WHERE p.id=auth.uid();
 IF student_role IS DISTINCT FROM 'student' THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 IF target IS NULL THEN RAISE EXCEPTION 'TARGET_CAREER_REQUIRED' USING ERRCODE='P0001'; END IF;
 SELECT * INTO c FROM public.career_catalog WHERE id=target AND status='published';
 IF NOT FOUND THEN RAISE EXCEPTION 'TARGET_CAREER_UNAVAILABLE' USING ERRCODE='P0001'; END IF;
 IF c.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'SKILL_GRAPH_INVALID' USING ERRCODE='P0001'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.career_skill_map m WHERE m.career_id=target AND m.importance IN ('required','recommended'))
 THEN RAISE EXCEPTION 'NO_PUBLISHED_REQUIREMENTS' USING ERRCODE='P0001'; END IF;
 IF EXISTS(SELECT 1 FROM public.career_skill_map m LEFT JOIN public.skill_catalog s ON s.id=m.skill_id
   WHERE m.career_id=target AND (s.id IS NULL OR s.status<>'published'))
 THEN RAISE EXCEPTION 'UNPUBLISHED_REQUIRED_SKILL' USING ERRCODE='P0001'; END IF;
 WITH RECURSIVE closure(id) AS (
   SELECT m.skill_id FROM public.career_skill_map m WHERE m.career_id=target
   UNION SELECT r.source_skill_id FROM public.skill_relationships r JOIN closure x ON x.id=r.target_skill_id
     WHERE r.relationship_type='prerequisite'
 ) SELECT array_agg(id ORDER BY id) INTO ids FROM (SELECT id FROM closure LIMIT 5001) bounded;
 IF cardinality(ids)>5000 THEN RAISE EXCEPTION 'GRAPH_LIMIT_EXCEEDED' USING ERRCODE='P0001'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(ids) x(id) LEFT JOIN public.skill_catalog s ON s.id=x.id
   WHERE s.id IS NULL OR s.status<>'published' OR s.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$')
 THEN RAISE EXCEPTION 'SKILL_GRAPH_INVALID' USING ERRCODE='P0001'; END IF;
 SELECT count(*) INTO edge_count FROM (SELECT 1 FROM public.skill_relationships r
   WHERE r.relationship_type='prerequisite' AND r.source_skill_id=ANY(ids) AND r.target_skill_id=ANY(ids) LIMIT 20001) bounded;
 IF edge_count>20000 THEN RAISE EXCEPTION 'GRAPH_LIMIT_EXCEEDED' USING ERRCODE='P0001'; END IF;
 -- Kahn validation also protects direct RPC calls from corrupt legacy cycles.
 remaining:=ids;
 WHILE cardinality(remaining)>0 LOOP
   SELECT array_agg(x.id) INTO frontier FROM unnest(remaining) x(id) WHERE NOT EXISTS(
     SELECT 1 FROM public.skill_relationships r WHERE r.relationship_type='prerequisite'
       AND r.target_skill_id=x.id AND r.source_skill_id=ANY(remaining));
   IF frontier IS NULL THEN RAISE EXCEPTION 'SKILL_GRAPH_CYCLE' USING ERRCODE='P0001'; END IF;
   SELECT array_agg(x.id) INTO remaining FROM unnest(remaining) x(id) WHERE NOT(x.id=ANY(frontier));
 END LOOP;
 RETURN jsonb_build_object(
   'career',jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name,'status',c.status),
   'skills',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'slug',s.slug,'name',s.name,
     'status',s.status,'display_order',s.display_order) ORDER BY s.id),'[]'::jsonb) FROM public.skill_catalog s WHERE s.id=ANY(ids)),
   'mappings',(SELECT coalesce(jsonb_agg(jsonb_build_object('skill_id',m.skill_id,'importance',m.importance,
     'proficiency_target',m.proficiency_target,'is_core',m.is_core,'display_order',m.display_order) ORDER BY m.skill_id),'[]'::jsonb)
     FROM public.career_skill_map m WHERE m.career_id=target),
   'edges',(SELECT coalesce(jsonb_agg(jsonb_build_object('source_skill_id',r.source_skill_id,
     'target_skill_id',r.target_skill_id,'relationship_type',r.relationship_type) ORDER BY r.source_skill_id,r.target_skill_id),'[]'::jsonb)
     FROM public.skill_relationships r WHERE r.relationship_type='prerequisite' AND r.source_skill_id=ANY(ids) AND r.target_skill_id=ANY(ids))
 );
END $$;
REVOKE ALL ON FUNCTION public.phase_c_student_skill_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.phase_c_student_skill_snapshot() TO authenticated;
COMMIT;
