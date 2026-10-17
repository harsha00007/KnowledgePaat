-- Isolated database only. All fixtures, failure triggers and progress roll back.
BEGIN;
DO $$ BEGIN IF current_database()<>'knowledgepaat_phase_a_test' THEN RAISE EXCEPTION 'Isolated test database required'; END IF; END $$;
INSERT INTO auth.users(id,email) VALUES('b0000000-0000-0000-0000-000000000001','composer-admin@example.test'),('b0000000-0000-0000-0000-000000000002','composer-student@example.test');
UPDATE public.profiles SET role='admin' WHERE id='b0000000-0000-0000-0000-000000000001';
INSERT INTO public.skill_catalog(id,slug,name,status,display_order) VALUES
 ('b1000000-0000-0000-0000-000000000001','composer-foundation','Foundation Skill','published',1),
 ('b1000000-0000-0000-0000-000000000002','composer-required','Required Skill','published',2),
 ('b1000000-0000-0000-0000-000000000003','composer-optional','Optional Skill','published',3);
INSERT INTO public.career_catalog(id,slug,name,short_description) VALUES('b2000000-0000-0000-0000-000000000001','composer-career','Composer Career','A meaningful career description');
INSERT INTO public.career_catalog(id,slug,name) VALUES('b2000000-0000-0000-0000-000000000003','composer-draft','Draft Career');
INSERT INTO public.career_skill_map(career_id,skill_id,importance,display_order) VALUES
 ('b2000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002','required',1),
 ('b2000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000003','optional',2);
INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES
 ('b1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002'),
 ('b1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000003');
UPDATE public.career_catalog SET status='published' WHERE slug='composer-career';
SET CONSTRAINTS ALL IMMEDIATE;
INSERT INTO public.career_roadmaps(id,title,slug,is_active) VALUES('b3000000-0000-0000-0000-000000000001','Existing Curated Curriculum','composer-curated',true);
INSERT INTO public.career_roadmap_sections(id,roadmap_id,title,slug) VALUES('b4000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000001','Foundation','foundation');
INSERT INTO public.career_roadmap_nodes(id,section_id,title,slug,node_type) VALUES('b5000000-0000-0000-0000-000000000001','b4000000-0000-0000-0000-000000000001','Foundation Skill','composer-foundation','SKILL');
INSERT INTO public.career_resources(id,title,url,is_active) VALUES
 ('b6000000-0000-0000-0000-000000000001','Curated Resource','https://example.test/composer-resource',true),
 ('b6000000-0000-0000-0000-000000000002','Inactive Resource','https://example.test/composer-inactive',false);
INSERT INTO public.career_roadmap_node_resources(node_id,resource_id,priority,is_recommended) VALUES
 ('b5000000-0000-0000-0000-000000000001','b6000000-0000-0000-0000-000000000001',7,true),
 ('b5000000-0000-0000-0000-000000000001','b6000000-0000-0000-0000-000000000002',1,true);
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE snap jsonb; result jsonb; repeated jsonb; rid uuid; before_count integer; node_ids uuid[]; BEGIN
 SELECT count(*) INTO before_count FROM public.career_roadmaps;
 BEGIN PERFORM public.phase_b_composer_snapshot('b2000000-0000-0000-0000-000000000003'); RAISE EXCEPTION 'Draft career accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'CAREER_NOT_PUBLISHED' THEN RAISE; END IF; END;
 snap:=public.phase_b_composer_snapshot('b2000000-0000-0000-0000-000000000001');
 IF (SELECT count(*) FROM public.career_roadmaps)<>before_count THEN RAISE EXCEPTION 'Preview wrote data'; END IF;
 IF jsonb_array_length(snap->'snapshot'->'skills')<>3 OR jsonb_array_length(snap->'snapshot'->'resources')<>1 THEN RAISE EXCEPTION 'Closure/resource snapshot invalid'; END IF;
 BEGIN PERFORM public.phase_b_compose_roadmap('b2000000-0000-0000-0000-000000000001','stale',ARRAY[]::uuid[]); RAISE EXCEPTION 'Stale preview accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'PREVIEW_STALE' THEN RAISE; END IF; END;
 BEGIN PERFORM public.phase_b_compose_roadmap('b2000000-0000-0000-0000-000000000001',snap->>'fingerprint',ARRAY['b1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000003']::uuid[]); RAISE EXCEPTION 'Wrong order accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'SKILL_GRAPH_INVALID' THEN RAISE; END IF; END;
 BEGIN
   INSERT INTO public.career_roadmaps(title,slug) VALUES('Manually authored collision','composer-career-composed-v1');
   PERFORM public.phase_b_compose_roadmap('b2000000-0000-0000-0000-000000000001',snap->>'fingerprint',ARRAY['b1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000003']::uuid[]);
   RAISE EXCEPTION 'Manual slug collision adopted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'ROADMAP_ALREADY_EXISTS' THEN RAISE; END IF; END;
 result:=public.phase_b_compose_roadmap('b2000000-0000-0000-0000-000000000001',snap->>'fingerprint',ARRAY['b1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000003']::uuid[]);
 rid:=(result->>'roadmapId')::uuid;
 IF result->>'status'<>'created' OR result->>'nodeCount'<>'3' OR result->>'resourceCount'<>'1' OR result->>'sections'<>'2' THEN RAISE EXCEPTION 'Incorrect composition result'; END IF;
 IF EXISTS(SELECT 1 FROM public.career_roadmaps WHERE id=rid AND is_active) THEN RAISE EXCEPTION 'Composition automatically published'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.career_roadmap_node_resources a JOIN public.career_roadmap_nodes n ON n.id=a.node_id JOIN public.career_roadmap_sections s ON s.id=n.section_id WHERE s.roadmap_id=rid AND a.resource_id='b6000000-0000-0000-0000-000000000001' AND a.priority=7 AND a.is_recommended) THEN RAISE EXCEPTION 'Curated resource identity/flags lost'; END IF;
 IF EXISTS(SELECT 1 FROM public.career_roadmap_nodes n JOIN public.career_roadmap_sections s ON s.id=n.section_id WHERE s.roadmap_id=rid AND n.slug='composer-optional' AND n.is_required) THEN RAISE EXCEPTION 'Optional requirement lost'; END IF;
 IF (SELECT count(*) FROM public.career_roadmap_node_relationships r JOIN public.career_roadmap_nodes n ON n.id=r.source_node_id JOIN public.career_roadmap_sections s ON s.id=n.section_id WHERE s.roadmap_id=rid AND r.relationship_type='PREREQUISITE')<>2 THEN RAISE EXCEPTION 'Dependency relationships lost'; END IF;
 SELECT array_agg(n.id ORDER BY n.id) INTO node_ids FROM public.career_roadmap_nodes n JOIN public.career_roadmap_sections s ON s.id=n.section_id WHERE s.roadmap_id=rid;
 UPDATE public.career_roadmaps SET is_active=true,title='Reviewed Title' WHERE id=rid;
 repeated:=public.phase_b_compose_roadmap('b2000000-0000-0000-0000-000000000001','ignored',ARRAY[]::uuid[],'{"title":"Override"}');
 IF repeated->>'roadmapId'<>rid::text OR repeated->>'status'<>'existing' OR repeated->>'title'<>'Reviewed Title' THEN RAISE EXCEPTION 'Idempotency replaced curriculum'; END IF;
 IF node_ids<>(SELECT array_agg(n.id ORDER BY n.id) FROM public.career_roadmap_nodes n JOIN public.career_roadmap_sections s ON s.id=n.section_id WHERE s.roadmap_id=rid) THEN RAISE EXCEPTION 'Node IDs changed'; END IF;
 RAISE NOTICE 'PASS preview, closure, stale/order validation, draft structure, resources, optional flags, relationships and idempotent node identity';
END $$;
RESET ROLE;
-- Real progress survives repeated composition of a reviewed roadmap.
INSERT INTO public.career_user_roadmap_progress(user_id,node_id,status)
SELECT 'b0000000-0000-0000-0000-000000000002',n.id,'done' FROM public.career_roadmap_nodes n JOIN public.career_roadmap_sections s ON s.id=n.section_id JOIN public.career_roadmaps r ON r.id=s.roadmap_id WHERE r.composer_career_id='b2000000-0000-0000-0000-000000000001' LIMIT 1;
SET LOCAL ROLE authenticated;
SELECT public.phase_b_compose_roadmap('b2000000-0000-0000-0000-000000000001','ignored',ARRAY[]::uuid[]);
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*) FROM public.career_user_roadmap_progress WHERE user_id='b0000000-0000-0000-0000-000000000002' AND status='done')<>1 THEN RAISE EXCEPTION 'Progress lost'; END IF; RAISE NOTICE 'PASS existing progress identity'; END $$;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.phase_b_composer_snapshot('b2000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'Student preview accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.phase_b_compose_roadmap('b2000000-0000-0000-0000-000000000001','ignored',ARRAY[]::uuid[]); RAISE EXCEPTION 'Student generation accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RAISE NOTICE 'PASS database student rejection';
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.phase_b_composer_snapshot('b2000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'Anonymous preview accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RAISE NOTICE 'PASS database anonymous RPC grants';
END $$;
RESET ROLE;
-- Force failure after roadmap/section inserts, then verify atomic rollback.
INSERT INTO public.career_catalog(id,slug,name,short_description) VALUES('b2000000-0000-0000-0000-000000000002','composer-rollback','Rollback Career','A meaningful career description');
INSERT INTO public.career_skill_map(career_id,skill_id,importance) VALUES('b2000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000002','required');
UPDATE public.career_catalog SET status='published' WHERE slug='composer-rollback';
-- Invalid requirements/prerequisites fail even when the career remains publishable.
UPDATE public.skill_catalog SET status='archived' WHERE slug='composer-optional';
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.phase_b_composer_snapshot('b2000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'Unpublished requirement accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'UNPUBLISHED_REQUIRED_SKILL' THEN RAISE; END IF; END;
 BEGIN PERFORM public.phase_b_composer_snapshot(gen_random_uuid()); RAISE EXCEPTION 'Missing career accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'CAREER_NOT_FOUND' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS unpublished requirement and missing career errors';
END $$;
RESET ROLE;
UPDATE public.skill_catalog SET status='published' WHERE slug='composer-optional';
UPDATE public.skill_catalog SET status='archived' WHERE slug='composer-foundation';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.phase_b_composer_snapshot('b2000000-0000-0000-0000-000000000002'); RAISE EXCEPTION 'Unpublished prerequisite accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'UNPUBLISHED_PREREQUISITE' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS unpublished prerequisite error';
END $$;
RESET ROLE;
UPDATE public.skill_catalog SET status='published' WHERE slug='composer-foundation';
-- Model a preexisting corrupt cycle; composer must not write a partial roadmap.
ALTER TABLE public.skill_relationships DISABLE TRIGGER phase_a_prerequisite_guard;
INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES('b1000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001');
ALTER TABLE public.skill_relationships ENABLE TRIGGER phase_a_prerequisite_guard;
SET LOCAL ROLE authenticated;
DO $$ DECLARE snap jsonb; BEGIN
 snap:=public.phase_b_composer_snapshot('b2000000-0000-0000-0000-000000000002');
 BEGIN PERFORM public.phase_b_compose_roadmap('b2000000-0000-0000-0000-000000000002',snap->>'fingerprint',ARRAY['b1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000003']::uuid[]); RAISE EXCEPTION 'Corrupt cycle accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'SKILL_GRAPH_CYCLE' THEN RAISE; END IF; END;
 IF EXISTS(SELECT 1 FROM public.career_roadmaps WHERE composer_career_id='b2000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'Cycle produced partial hierarchy'; END IF;
 RAISE NOTICE 'PASS corrupt cycle rejection without hierarchy writes';
END $$;
RESET ROLE;
DELETE FROM public.skill_relationships WHERE source_skill_id='b1000000-0000-0000-0000-000000000003' AND target_skill_id='b1000000-0000-0000-0000-000000000001';
CREATE FUNCTION public.phase_b_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected rollback'; END $$;
CREATE TRIGGER phase_b_test_fail BEFORE INSERT ON public.career_roadmap_nodes FOR EACH ROW EXECUTE FUNCTION public.phase_b_test_fail();
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE snap jsonb; before_sections integer; BEGIN
 SELECT count(*) INTO before_sections FROM public.career_roadmap_sections;
 snap:=public.phase_b_composer_snapshot('b2000000-0000-0000-0000-000000000002');
 BEGIN PERFORM public.phase_b_compose_roadmap('b2000000-0000-0000-0000-000000000002',snap->>'fingerprint',ARRAY['b1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002']::uuid[]); RAISE EXCEPTION 'Injected failure not reached'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Injected rollback' THEN RAISE; END IF; END;
 IF EXISTS(SELECT 1 FROM public.career_roadmaps WHERE composer_career_id='b2000000-0000-0000-0000-000000000002') OR (SELECT count(*) FROM public.career_roadmap_sections)<>before_sections THEN RAISE EXCEPTION 'Partial generation persisted'; END IF;
 RAISE NOTICE 'PASS atomic rollback after hierarchy insertion';
END $$;
RESET ROLE;
ROLLBACK;
