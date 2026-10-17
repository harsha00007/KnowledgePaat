-- Verification only. Dedicated local database; fixtures and trigger changes roll back.
BEGIN;
DO $$ BEGIN IF current_database()<>'knowledgepaat_phase_a_test' THEN RAISE EXCEPTION 'Isolated test database required'; END IF; END $$;
INSERT INTO auth.users(id,email) VALUES
 ('10000000-0000-0000-0000-000000000001','student-a@example.test'),
 ('10000000-0000-0000-0000-000000000002','student-b@example.test'),
 ('10000000-0000-0000-0000-000000000003','admin@example.test');
UPDATE public.profiles SET role='admin' WHERE id='10000000-0000-0000-0000-000000000003';
INSERT INTO public.skill_catalog(id,slug,name,status) VALUES
 ('20000000-0000-0000-0000-000000000001','verify-published','Published Skill','published'),
 ('20000000-0000-0000-0000-000000000002','verify-draft','Draft Skill','draft'),
 ('20000000-0000-0000-0000-000000000003','verify-archived','Archived Skill','archived');
INSERT INTO public.career_catalog(id,slug,name,short_description) VALUES
 ('30000000-0000-0000-0000-000000000001','verify-career','Verified Career','A meaningful career description'),
 ('30000000-0000-0000-0000-000000000002','verify-draft-career','Draft Career','A meaningful career description');
INSERT INTO public.career_skill_map(career_id,skill_id,importance) VALUES
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','required');
UPDATE public.career_catalog SET status='published' WHERE slug='verify-career';
INSERT INTO public.skill_relationships(source_skill_id,target_skill_id,relationship_type) VALUES
 ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','related'),
 ('20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','prerequisite');
SET CONSTRAINTS ALL IMMEDIATE;
DO $$ BEGIN
 BEGIN INSERT INTO public.career_catalog(slug,name) VALUES('verify-career','Duplicate'); RAISE EXCEPTION 'Duplicate career slug accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN INSERT INTO public.skill_catalog(slug,name) VALUES('verify-published','Duplicate'); RAISE EXCEPTION 'Duplicate skill slug accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN INSERT INTO public.career_skill_map(career_id,skill_id) VALUES(gen_random_uuid(),'20000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'Missing career accepted'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES(gen_random_uuid(),'20000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'Missing source accepted'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES('20000000-0000-0000-0000-000000000001',gen_random_uuid()); RAISE EXCEPTION 'Missing target accepted'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN INSERT INTO public.skill_relationships(source_skill_id,target_skill_id,relationship_type) VALUES('20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','related'); RAISE EXCEPTION 'Reverse symmetric duplicate accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN UPDATE public.skill_catalog SET status='draft' WHERE slug='verify-published'; RAISE EXCEPTION 'Last requirement disabled'; EXCEPTION WHEN check_violation THEN NULL; END;
 IF NOT EXISTS(SELECT 1 FROM public.skill_relationships WHERE source_skill_id='20000000-0000-0000-0000-000000000001' AND target_skill_id='20000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'Direction changed'; END IF;
 RAISE NOTICE 'PASS unique slugs, source/target/career FKs, symmetric uniqueness, disable protection and direction';
END $$;
-- Replacement of the last requirement within a valid final transaction succeeds.
SET CONSTRAINTS ALL DEFERRED;
DELETE FROM public.career_skill_map WHERE career_id='30000000-0000-0000-0000-000000000001';
INSERT INTO public.career_skill_map(career_id,skill_id,importance) VALUES('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','recommended');
SET CONSTRAINTS ALL IMMEDIATE;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM public.profiles; IF n<>1 THEN RAISE EXCEPTION 'Student A ownership failed'; END IF;
 UPDATE public.profiles SET full_name='Own profile' WHERE id=auth.uid();
 UPDATE public.profiles SET full_name='Forbidden' WHERE id='10000000-0000-0000-0000-000000000002'; GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Cross-student update accepted'; END IF;
 BEGIN UPDATE public.profiles SET role='admin' WHERE id=auth.uid(); RAISE EXCEPTION 'Promotion accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.skill_relationships) THEN RAISE EXCEPTION 'Draft relationship leaked'; END IF;
 IF EXISTS(SELECT 1 FROM public.skill_catalog WHERE status<>'published') THEN RAISE EXCEPTION 'Unpublished skill leaked'; END IF;
 IF EXISTS(SELECT 1 FROM public.career_catalog WHERE status<>'published') THEN RAISE EXCEPTION 'Unpublished career leaked'; END IF;
 BEGIN PERFORM public.phase_a_health(); RAISE EXCEPTION 'Student health permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.skill_catalog(slug,name) VALUES('student-write','Forbidden'); RAISE EXCEPTION 'Student write permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RAISE NOTICE 'PASS Student A ownership, cross-user update rejection, roles and publication isolation';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.profiles)<>1 OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid()) THEN RAISE EXCEPTION 'Student B ownership failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.skill_relationships) THEN RAISE EXCEPTION 'Student B relationship leak'; END IF;
 RAISE NOTICE 'PASS Student B isolation';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.profiles)<>3 THEN RAISE EXCEPTION 'Admin profile access failed'; END IF;
 IF (SELECT count(*) FROM public.skill_relationships)<>2 THEN RAISE EXCEPTION 'Admin relationship inspection failed'; END IF;
 UPDATE public.profiles SET full_name='Admin edit' WHERE id='10000000-0000-0000-0000-000000000002';
 UPDATE public.profiles SET role='admin' WHERE id='10000000-0000-0000-0000-000000000002';
 UPDATE public.profiles SET role='student' WHERE id='10000000-0000-0000-0000-000000000002';
 IF public.phase_a_health()->>'status'<>'WARNING' THEN RAISE EXCEPTION 'Unpublished-neighbor health warning missing'; END IF;
 RAISE NOTICE 'PASS legitimate admin profile/role changes, relationships and health';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles) THEN RAISE EXCEPTION 'Anonymous profile leak'; END IF;
 IF EXISTS(SELECT 1 FROM public.skill_relationships) THEN RAISE EXCEPTION 'Anonymous relationship leak'; END IF;
 IF (SELECT count(*) FROM public.skill_catalog)<>1 THEN RAISE EXCEPTION 'Anonymous skill visibility failed'; END IF;
 IF (SELECT count(*) FROM public.career_catalog)<>1 THEN RAISE EXCEPTION 'Anonymous career visibility failed'; END IF;
 BEGIN PERFORM public.phase_a_health(); RAISE EXCEPTION 'Anonymous health permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RAISE NOTICE 'PASS anonymous published reads, profile isolation and RPC grants';
END $$;
RESET ROLE;
-- Model content predating enforcement, without silently repairing it.
ALTER TABLE public.career_catalog DISABLE TRIGGER phase_a_career_publication;
INSERT INTO public.career_catalog(slug,name,status) VALUES('legacy-invalid','Legacy Invalid','published');
ALTER TABLE public.career_catalog ENABLE TRIGGER phase_a_career_publication;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN IF public.phase_a_health()->>'status'<>'ERROR' THEN RAISE EXCEPTION 'Invalid legacy content reported healthy'; END IF; RAISE NOTICE 'PASS invalid legacy content health diagnostic'; END $$;
RESET ROLE;
-- Archived career visibility and actual FK deletion behavior.
UPDATE public.career_catalog SET status='archived' WHERE slug='verify-career';
DELETE FROM public.career_catalog WHERE slug='verify-career';
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.career_skill_map) THEN RAISE EXCEPTION 'Career delete failed to cascade'; END IF; END $$;
DELETE FROM public.skill_catalog WHERE slug='verify-draft';
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.skill_relationships) THEN RAISE EXCEPTION 'Skill delete failed to cascade edges'; END IF; RAISE NOTICE 'PASS lifecycle and FK cascade deletion'; END $$;
ROLLBACK;
