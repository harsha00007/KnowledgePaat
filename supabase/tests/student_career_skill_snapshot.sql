-- Dedicated isolated database only; every fixture and corruption rolls back.
BEGIN;
DO $$ BEGIN IF current_database()<>'knowledgepaat_phase_a_test' THEN RAISE EXCEPTION 'Dedicated local database required'; END IF; END $$;
INSERT INTO auth.users(id,email) VALUES
 ('c0000000-0000-0000-0000-000000000001','snapshot-a@example.test'),
 ('c0000000-0000-0000-0000-000000000002','snapshot-b@example.test'),
 ('c0000000-0000-0000-0000-000000000003','snapshot-admin@example.test');
UPDATE public.profiles SET role='admin' WHERE id='c0000000-0000-0000-0000-000000000003';
INSERT INTO public.skill_catalog(id,slug,name,status,display_order) VALUES
 ('c1000000-0000-0000-0000-000000000001','snapshot-foundation','Foundation','published',1),
 ('c1000000-0000-0000-0000-000000000002','snapshot-required','Required Skill','published',2),
 ('c1000000-0000-0000-0000-000000000003','snapshot-optional','Optional Skill','published',3);
INSERT INTO public.career_catalog(id,slug,name,short_description) VALUES
 ('c2000000-0000-0000-0000-000000000001','snapshot-career','Snapshot Career','Meaningful published career description'),
 ('c2000000-0000-0000-0000-000000000002','snapshot-other','Other Career','Meaningful published other career description'),
 ('c2000000-0000-0000-0000-000000000003','snapshot-draft','Draft Career','Meaningful unpublished career description');
INSERT INTO public.career_skill_map(career_id,skill_id,importance,proficiency_target,is_core) VALUES
 ('c2000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','required','working',true),
 ('c2000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','optional','beginner',false),
 ('c2000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000003','required','beginner',false);
INSERT INTO public.skill_relationships(source_skill_id,target_skill_id,relationship_type) VALUES
 ('c1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','prerequisite');
UPDATE public.career_catalog SET status='published' WHERE id IN ('c2000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000002');
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;

SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.phase_c_student_skill_snapshot(); RAISE EXCEPTION 'Anon accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RAISE NOTICE 'PASS anonymous denied by explicit RPC grants';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.phase_c_student_skill_snapshot(); RAISE EXCEPTION 'No target accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'TARGET_CAREER_REQUIRED' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS missing target controlled error';
END $$;
UPDATE public.profiles SET target_career_id='c2000000-0000-0000-0000-000000000001' WHERE id=auth.uid();
DO $$ DECLARE changed integer; BEGIN
 UPDATE public.profiles SET target_career_id='c2000000-0000-0000-0000-000000000002' WHERE id='c0000000-0000-0000-0000-000000000002';
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>0 THEN RAISE EXCEPTION 'Other student target modified'; END IF;
 BEGIN UPDATE public.profiles SET role='admin' WHERE id=auth.uid(); RAISE EXCEPTION 'Role escalated'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RAISE NOTICE 'PASS target ownership and profile role integrity';
END $$;
DO $$ BEGIN
 BEGIN UPDATE public.profiles SET target_career_id='c2000000-0000-0000-0000-000000000003' WHERE id=auth.uid(); RAISE EXCEPTION 'Unpublished target accepted'; EXCEPTION WHEN check_violation THEN IF SQLERRM<>'TARGET_CAREER_UNAVAILABLE' THEN RAISE; END IF; END;
 BEGIN UPDATE public.profiles SET target_career_id='c2000000-0000-0000-0000-000000000099' WHERE id=auth.uid(); RAISE EXCEPTION 'Missing target accepted'; EXCEPTION WHEN check_violation THEN IF SQLERRM<>'TARGET_CAREER_UNAVAILABLE' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS direct writes reject unpublished and invalid targets';
END $$;
DO $$ DECLARE a jsonb; b jsonb; BEGIN
 a:=public.phase_c_student_skill_snapshot(); b:=public.phase_c_student_skill_snapshot();
 IF a<>b OR jsonb_array_length(a->'skills')<>3 OR jsonb_array_length(a->'edges')<>1 OR jsonb_array_length(a->'mappings')<>2 THEN RAISE EXCEPTION 'Snapshot closure or determinism mismatch'; END IF;
 IF a->'career'->>'id'<>'c2000000-0000-0000-0000-000000000001' OR a ? 'resources' OR a->'career' ? 'description' THEN RAISE EXCEPTION 'Unexpected snapshot disclosure'; END IF;
 RAISE NOTICE 'PASS own target exact prerequisite closure, optional mapping and deterministic allowlist';
END $$;
SELECT public.phase_c_student_skill_snapshot();
DO $$ BEGIN
 BEGIN PERFORM public.phase_b_composer_snapshot('c2000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'Student admin snapshot accepted'; EXCEPTION WHEN insufficient_privilege THEN IF SQLERRM<>'FORBIDDEN' THEN RAISE; END IF; END;
 BEGIN PERFORM public.phase_b_compose_roadmap('c2000000-0000-0000-0000-000000000001',repeat('a',32),ARRAY[]::uuid[],'{}'); RAISE EXCEPTION 'Student compose accepted'; EXCEPTION WHEN insufficient_privilege THEN IF SQLERRM<>'FORBIDDEN' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS Phase B snapshot and compose still reject students';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000002',true);
SET LOCAL ROLE authenticated;
UPDATE public.profiles SET target_career_id='c2000000-0000-0000-0000-000000000002' WHERE id=auth.uid();
DO $$ DECLARE a jsonb; BEGIN
 a:=public.phase_c_student_skill_snapshot();
 IF jsonb_array_length(a->'skills')<>1 OR a->'career'->>'id'<>'c2000000-0000-0000-0000-000000000002' THEN RAISE EXCEPTION 'Student B context leaked'; END IF;
 RAISE NOTICE 'PASS student B resolves only own target';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000003',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 PERFORM public.phase_b_composer_snapshot('c2000000-0000-0000-0000-000000000001');
 BEGIN PERFORM public.phase_c_student_skill_snapshot(); RAISE EXCEPTION 'Admin student path accepted'; EXCEPTION WHEN insufficient_privilege THEN IF SQLERRM<>'FORBIDDEN' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS separate student and administrator authorization';
END $$;
RESET ROLE;
UPDATE public.career_catalog SET status='draft' WHERE id='c2000000-0000-0000-0000-000000000001';
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.phase_c_student_skill_snapshot(); RAISE EXCEPTION 'Draft returned'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'TARGET_CAREER_UNAVAILABLE' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS unpublished target after selection fails closed';
END $$;
RESET ROLE;
UPDATE public.career_catalog SET status='published' WHERE id='c2000000-0000-0000-0000-000000000001';
UPDATE public.skill_catalog SET status='archived' WHERE id='c1000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.phase_c_student_skill_snapshot(); RAISE EXCEPTION 'Hidden prerequisite omitted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'SKILL_GRAPH_INVALID' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS hidden unpublished prerequisite rejects whole snapshot';
END $$;
RESET ROLE;
UPDATE public.skill_catalog SET status='published' WHERE id='c1000000-0000-0000-0000-000000000001';
ALTER TABLE public.skill_relationships DISABLE TRIGGER USER;
INSERT INTO public.skill_relationships(source_skill_id,target_skill_id,relationship_type) VALUES
 ('c1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001','prerequisite');
ALTER TABLE public.skill_relationships ENABLE TRIGGER USER;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.phase_c_student_skill_snapshot(); RAISE EXCEPTION 'Cycle accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'SKILL_GRAPH_CYCLE' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS corrupt legacy cycle rejected by direct RPC';
END $$;
RESET ROLE;
DELETE FROM public.skill_relationships WHERE source_skill_id='c1000000-0000-0000-0000-000000000002';

CREATE TEMP TABLE phase_c_deep_skills AS SELECT gen_random_uuid() id,n FROM generate_series(1,1201) n;
INSERT INTO public.skill_catalog(id,slug,name,status,display_order) SELECT id,'snapshot-deep-'||n,'Deep Skill '||n,'published',n FROM phase_c_deep_skills;
INSERT INTO public.career_catalog(id,slug,name,short_description) VALUES
 ('c2000000-0000-0000-0000-000000000005','snapshot-deep','Deep Career','Meaningful deep career description');
INSERT INTO public.career_skill_map(career_id,skill_id) SELECT 'c2000000-0000-0000-0000-000000000005',id FROM phase_c_deep_skills WHERE n=1201;
INSERT INTO public.skill_relationships(source_skill_id,target_skill_id,relationship_type)
 SELECT a.id,b.id,'prerequisite' FROM phase_c_deep_skills a JOIN phase_c_deep_skills b ON b.n=a.n+1;
UPDATE public.career_catalog SET status='published' WHERE id='c2000000-0000-0000-0000-000000000005';
UPDATE public.profiles SET target_career_id='c2000000-0000-0000-0000-000000000005' WHERE id='c0000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
DO $$ DECLARE a jsonb; BEGIN
 a:=public.phase_c_student_skill_snapshot();
 IF jsonb_array_length(a->'skills')<>1201 OR jsonb_array_length(a->'edges')<>1200 THEN RAISE EXCEPTION 'Deep closure incomplete'; END IF;
 RAISE NOTICE 'PASS direct RPC deep 1201-skill chain without REST truncation';
END $$;
SELECT public.phase_c_student_skill_snapshot();
RESET ROLE;

CREATE TEMP TABLE phase_c_bound_skills AS SELECT gen_random_uuid() id,n FROM generate_series(1,5001) n;
INSERT INTO public.skill_catalog(id,slug,name,status) SELECT id,'snapshot-bound-'||n,'Bound Skill '||n,'published' FROM phase_c_bound_skills;
INSERT INTO public.career_catalog(id,slug,name,short_description) VALUES
 ('c2000000-0000-0000-0000-000000000004','snapshot-bound','Bound Career','Meaningful bounded career description');
INSERT INTO public.career_skill_map(career_id,skill_id) SELECT 'c2000000-0000-0000-0000-000000000004',id FROM phase_c_bound_skills;
UPDATE public.career_catalog SET status='published' WHERE id='c2000000-0000-0000-0000-000000000004';
UPDATE public.profiles SET target_career_id='c2000000-0000-0000-0000-000000000004' WHERE id='c0000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.phase_c_student_skill_snapshot(); RAISE EXCEPTION 'Node overflow accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'GRAPH_LIMIT_EXCEEDED' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS direct RPC 5000-node bound';
END $$;
RESET ROLE;
DELETE FROM public.career_skill_map WHERE career_id='c2000000-0000-0000-0000-000000000004' AND skill_id IN(SELECT id FROM phase_c_bound_skills WHERE n>201);
ALTER TABLE public.skill_relationships DISABLE TRIGGER USER;
INSERT INTO public.skill_relationships(source_skill_id,target_skill_id,relationship_type)
 SELECT a.id,b.id,'prerequisite' FROM phase_c_bound_skills a CROSS JOIN phase_c_bound_skills b WHERE a.n<=201 AND b.n<=201 AND a.id<>b.id LIMIT 20001;
ALTER TABLE public.skill_relationships ENABLE TRIGGER USER;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.phase_c_student_skill_snapshot(); RAISE EXCEPTION 'Edge overflow accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'GRAPH_LIMIT_EXCEEDED' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS direct RPC 20000-edge bound';
END $$;
RESET ROLE;
DO $$ DECLARE p record; BEGIN
 SELECT * INTO p FROM pg_proc WHERE oid='public.phase_c_student_skill_snapshot()'::regprocedure;
 IF NOT p.prosecdef OR p.provolatile<>'s' OR NOT(p.proconfig @> ARRAY['search_path=""']) THEN RAISE EXCEPTION 'Function security configuration incorrect'; END IF;
 IF has_function_privilege('anon',p.oid,'EXECUTE') OR NOT has_function_privilege('authenticated',p.oid,'EXECUTE') THEN RAISE EXCEPTION 'RPC grant mismatch'; END IF;
 IF (SELECT count(*) FROM public.career_roadmaps)<>0 THEN RAISE EXCEPTION 'Snapshot wrote roadmap data'; END IF;
 RAISE NOTICE 'PASS stable read-only function, fixed search path, explicit grants and no roadmap writes';
END $$;
ROLLBACK;
