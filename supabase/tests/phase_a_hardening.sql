-- Run ONLY against an isolated, migrated database named knowledgepaat_phase_a_test.
-- All fixtures are rolled back. psql ON_ERROR_STOP must be enabled.
BEGIN;
DO $$ BEGIN
 IF current_database() <> 'knowledgepaat_phase_a_test' THEN RAISE EXCEPTION 'Isolated test database required'; END IF;
END $$;
CREATE TEMP TABLE phase_a_test_ids(label text PRIMARY KEY, id uuid DEFAULT gen_random_uuid());
INSERT INTO phase_a_test_ids(label) VALUES ('a'),('b'),('c'),('career');
INSERT INTO public.skill_catalog(id,slug,name,status)
SELECT id, 'hardening-test-'||label, label, 'published' FROM phase_a_test_ids WHERE label <> 'career';
INSERT INTO public.career_catalog(id,slug,name,short_description)
SELECT id,'hardening-test-career','Test Career','A valid test career description' FROM phase_a_test_ids WHERE label='career';
DO $$ DECLARE a uuid; b uuid; c uuid; career uuid; BEGIN
 SELECT id INTO a FROM phase_a_test_ids WHERE label='a'; SELECT id INTO b FROM phase_a_test_ids WHERE label='b'; SELECT id INTO c FROM phase_a_test_ids WHERE label='c'; SELECT id INTO career FROM phase_a_test_ids WHERE label='career';
 INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES(a,b),(b,c);
 BEGIN INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES(b,a); RAISE EXCEPTION 'Direct cycle accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES(c,a); RAISE EXCEPTION 'Transitive cycle accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES(a,a); RAISE EXCEPTION 'Self edge accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES(a,b); RAISE EXCEPTION 'Duplicate edge accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN INSERT INTO public.career_skill_map(career_id,skill_id) VALUES(career,gen_random_uuid()); RAISE EXCEPTION 'Orphan mapping accepted'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN
   UPDATE public.career_catalog SET status='published' WHERE id=career;
   SET CONSTRAINTS ALL IMMEDIATE;
   RAISE EXCEPTION 'Unmapped publication accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SET CONSTRAINTS ALL DEFERRED;
 INSERT INTO public.career_skill_map(career_id,skill_id,importance) VALUES(career,a,'required');
 UPDATE public.career_catalog SET status='published' WHERE id=career;
 SET CONSTRAINTS ALL IMMEDIATE;
 BEGIN UPDATE public.skill_catalog SET status='archived' WHERE id=a; RAISE EXCEPTION 'Last visible requirement archived'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN DELETE FROM public.career_skill_map WHERE career_id=career; RAISE EXCEPTION 'Last visible requirement removed'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.career_skill_map(career_id,skill_id) VALUES(career,a); RAISE EXCEPTION 'Duplicate mapping accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN UPDATE public.skill_catalog SET status='invalid' WHERE id=b; RAISE EXCEPTION 'Invalid lifecycle accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 RAISE NOTICE 'PASS database cycles, uniqueness, FK, self-edge, publication, mapping, and lifecycle invariants';
END $$;
-- Traversal must not depend on the REST API's usual 1,000-row limit.
CREATE TEMP TABLE phase_a_chain AS SELECT n, gen_random_uuid() AS id FROM generate_series(1,1201) n;
INSERT INTO public.skill_catalog(id,slug,name,status) SELECT id,'hardening-chain-'||n,'Chain '||n,'draft' FROM phase_a_chain;
INSERT INTO public.skill_relationships(source_skill_id,target_skill_id)
SELECT a.id,b.id FROM phase_a_chain a JOIN phase_a_chain b ON b.n=a.n+1 ORDER BY a.n;
DO $$ DECLARE first_id uuid; last_id uuid; BEGIN
 SELECT id INTO first_id FROM phase_a_chain WHERE n=1; SELECT id INTO last_id FROM phase_a_chain WHERE n=1201;
 BEGIN INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES(last_id,first_id); RAISE EXCEPTION 'Long cycle accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 RAISE NOTICE 'PASS 1201-skill prerequisite chain';
END $$;
-- Existing auth provisioning creates normal test profiles; no auth architecture
-- or production identities are replaced. Fixtures remain in this transaction.
INSERT INTO phase_a_test_ids(label) VALUES ('student'),('admin');
INSERT INTO auth.users(id,email,raw_user_meta_data)
SELECT id,'phase-a-'||label||'@example.test','{}'::jsonb FROM phase_a_test_ids WHERE label IN ('student','admin');
INSERT INTO public.profiles(id,user_id,role)
SELECT id,id,CASE WHEN label='admin' THEN 'admin' ELSE 'student' END FROM phase_a_test_ids WHERE label IN ('student','admin')
ON CONFLICT(id) DO UPDATE SET role=EXCLUDED.role;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM phase_a_test_ids WHERE label='student'),true);
SELECT set_config('request.jwt.claims',json_build_object('sub',(SELECT id::text FROM phase_a_test_ids WHERE label='student'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN UPDATE public.profiles SET role='admin' WHERE id=auth.uid(); RAISE EXCEPTION 'Student self-promotion accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.profiles SET full_name='Normal profile edit' WHERE id=auth.uid();
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='student') THEN RAISE EXCEPTION 'Student role not preserved'; END IF;
 IF EXISTS(SELECT 1 FROM public.skill_catalog WHERE slug LIKE 'hardening-chain-%') THEN RAISE EXCEPTION 'Draft skill leaked to student'; END IF;
 RAISE NOTICE 'PASS student role protection, profile edits, and draft visibility';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM phase_a_test_ids WHERE label='admin'),true);
SELECT set_config('request.jwt.claims',json_build_object('sub',(SELECT id::text FROM phase_a_test_ids WHERE label='admin'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF NOT public.phase_a_is_admin() THEN RAISE EXCEPTION 'Admin identity lost'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.skill_catalog WHERE slug='hardening-chain-1') THEN RAISE EXCEPTION 'Admin cannot inspect draft'; END IF;
 RAISE NOTICE 'PASS admin role and draft inspection';
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.skill_catalog WHERE slug LIKE 'hardening-chain-%') THEN RAISE EXCEPTION 'Draft skill leaked anonymously'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.skill_catalog WHERE slug='hardening-test-a') THEN RAISE EXCEPTION 'Published skill invisible'; END IF;
 RAISE NOTICE 'PASS anonymous published-only RLS';
END $$;
RESET ROLE;
ROLLBACK;
