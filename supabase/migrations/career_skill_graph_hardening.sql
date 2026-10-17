-- Apply AFTER career_skill_graph_phase_a.sql. No tables or IDs are replaced.
-- Review and run in staging first. Existing invalid rows are reported by health,
-- not deleted or silently rewritten. Deploy this before the updated application.
BEGIN;

CREATE OR REPLACE FUNCTION public.phase_a_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;
REVOKE ALL ON FUNCTION public.phase_a_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase_a_is_admin() TO anon, authenticated;

-- Serialize graph and publication mutations, including direct and seed writes.
-- VOLATILE trigger queries obtain fresh READ COMMITTED snapshots after waiting.
-- Higher isolation levels are rejected rather than validating a stale snapshot.
CREATE OR REPLACE FUNCTION public.phase_a_lock_mutations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Phase A mutations require READ COMMITTED isolation' USING ERRCODE = '40001';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(73104, 1);
  RETURN NULL;
END;
$$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['career_catalog','skill_catalog','career_skill_map','skill_relationships'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS phase_a_serialize ON public.%I', t);
    EXECUTE format('CREATE TRIGGER phase_a_serialize BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.phase_a_lock_mutations()', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.phase_a_would_cycle(source_id uuid, target_id uuid, excluded_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.phase_a_is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  RETURN source_id = target_id OR EXISTS (
    WITH RECURSIVE reachable(id) AS (
      SELECT target_id
      UNION
      SELECT r.target_skill_id FROM public.skill_relationships r JOIN reachable p ON r.source_skill_id = p.id
      WHERE r.relationship_type = 'prerequisite' AND (excluded_id IS NULL OR r.id <> excluded_id)
    ) SELECT 1 FROM reachable WHERE id = source_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.phase_a_would_cycle(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase_a_would_cycle(uuid,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.phase_a_check_edge()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.relationship_type IN ('related','alternative','commonly_used_with') AND EXISTS (
    SELECT 1 FROM public.skill_relationships r WHERE r.id <> NEW.id AND r.relationship_type=NEW.relationship_type
    AND r.source_skill_id=NEW.target_skill_id AND r.target_skill_id=NEW.source_skill_id
  ) THEN RAISE EXCEPTION 'Symmetric relationship already exists' USING ERRCODE = '23505'; END IF;
  IF NEW.relationship_type = 'prerequisite' AND EXISTS (
    WITH RECURSIVE reachable(id) AS (
      SELECT NEW.target_skill_id
      UNION
      SELECT r.target_skill_id FROM public.skill_relationships r JOIN reachable p ON r.source_skill_id = p.id
      WHERE r.relationship_type = 'prerequisite' AND r.id <> NEW.id
    ) SELECT 1 FROM reachable WHERE id = NEW.source_skill_id
  ) THEN
    RAISE EXCEPTION 'Prerequisite would create a cycle' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS phase_a_prerequisite_guard ON public.skill_relationships;
CREATE TRIGGER phase_a_prerequisite_guard BEFORE INSERT OR UPDATE ON public.skill_relationships
FOR EACH ROW EXECUTE FUNCTION public.phase_a_check_edge();
CREATE INDEX IF NOT EXISTS idx_phase_a_prerequisite_source ON public.skill_relationships(source_skill_id, target_skill_id) WHERE relationship_type = 'prerequisite';
CREATE INDEX IF NOT EXISTS idx_phase_a_career_page ON public.career_catalog(status, display_order, name, id);
CREATE INDEX IF NOT EXISTS idx_phase_a_skill_page ON public.skill_catalog(status, display_order, name, id);

-- Validate affected careers at transaction end; draft -> mappings -> publish
-- remains possible in one transaction. No unrelated legacy rows are rewritten.
CREATE OR REPLACE FUNCTION public.phase_a_check_publication()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE ids uuid[]; cid uuid;
BEGIN
  IF TG_TABLE_NAME = 'career_catalog' THEN
    ids := ARRAY[COALESCE(NEW.id, OLD.id)];
  ELSIF TG_TABLE_NAME = 'career_skill_map' THEN
    ids := ARRAY[NEW.career_id, OLD.career_id];
  ELSE
    SELECT array_agg(career_id) INTO ids FROM public.career_skill_map WHERE skill_id = COALESCE(NEW.id, OLD.id);
  END IF;
  FOREACH cid IN ARRAY COALESCE(ids, ARRAY[]::uuid[]) LOOP
    IF EXISTS (SELECT 1 FROM public.career_catalog c WHERE c.id = cid AND c.status = 'published' AND (
      length(trim(c.name)) < 3 OR trim(c.slug) = '' OR length(trim(c.short_description)) < 15 OR NOT EXISTS (
        SELECT 1 FROM public.career_skill_map m JOIN public.skill_catalog s ON s.id = m.skill_id
        WHERE m.career_id = c.id AND m.importance IN ('required','recommended') AND s.status = 'published'
      )
    )) THEN RAISE EXCEPTION 'Published career requires valid metadata and a published required or recommended skill' USING ERRCODE = '23514'; END IF;
  END LOOP;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS phase_a_career_publication ON public.career_catalog;
DROP TRIGGER IF EXISTS phase_a_mapping_publication ON public.career_skill_map;
DROP TRIGGER IF EXISTS phase_a_skill_publication ON public.skill_catalog;
CREATE CONSTRAINT TRIGGER phase_a_career_publication AFTER INSERT OR UPDATE ON public.career_catalog DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.phase_a_check_publication();
CREATE CONSTRAINT TRIGGER phase_a_mapping_publication AFTER INSERT OR UPDATE OR DELETE ON public.career_skill_map DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.phase_a_check_publication();
CREATE CONSTRAINT TRIGGER phase_a_skill_publication AFTER UPDATE OR DELETE ON public.skill_catalog DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.phase_a_check_publication();

-- Role protection is independent of browser payloads and profile RLS.
CREATE OR REPLACE FUNCTION public.phase_a_protect_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Trusted provisioning uses service_role or a database-owner session.
  IF current_setting('role', true) = 'service_role' OR
    (current_setting('role', true) = 'none' AND session_user IN ('postgres', 'supabase_admin')) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND COALESCE(NEW.role, 'student') <> 'student' AND NOT public.phase_a_is_admin() THEN
    RAISE EXCEPTION 'Role changes require administrator privileges' USING ERRCODE = '42501';
  ELSIF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role AND NOT public.phase_a_is_admin() THEN
    RAISE EXCEPTION 'Role changes require administrator privileges' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS phase_a_profile_role ON public.profiles;
CREATE TRIGGER phase_a_profile_role BEFORE INSERT OR UPDATE OF role ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.phase_a_protect_profile_role();
-- Replace known recursive policies without broadening anonymous access.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile or admins can view all" ON public.profiles;
CREATE POLICY "Users can view their own profile or admins can view all" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.phase_a_is_admin());
DROP POLICY IF EXISTS "Users can update their own profile or admins can update all" ON public.profiles;
CREATE POLICY "Users can update their own profile or admins can update all" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.phase_a_is_admin()) WITH CHECK (id = auth.uid() OR public.phase_a_is_admin());
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.phase_a_is_admin());

-- Only existence/active state for supplied static slugs; no draft metadata.
CREATE OR REPLACE FUNCTION public.phase_a_roadmap_overrides(slugs text[])
RETURNS TABLE(slug text, is_active boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.slug, r.is_active FROM public.career_roadmaps r WHERE r.slug = ANY(slugs);
$$;
REVOKE ALL ON FUNCTION public.phase_a_roadmap_overrides(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase_a_roadmap_overrides(text[]) TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.phase_a_health()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET statement_timeout = '10s' AS $$
DECLARE issues jsonb; warnings jsonb; total_issues integer;
BEGIN
  IF NOT public.phase_a_is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  WITH RECURSIVE reach(source, target) AS (
    SELECT source_skill_id, target_skill_id FROM public.skill_relationships WHERE relationship_type = 'prerequisite'
    UNION
    SELECT p.source, r.target_skill_id FROM reach p JOIN public.skill_relationships r ON r.source_skill_id = p.target WHERE r.relationship_type = 'prerequisite'
  ), problems(message) AS (
    SELECT 'Prerequisite cycle involving ' || source::text FROM reach WHERE source = target
    UNION ALL
    SELECT 'Orphan career-skill mapping ' || m.id::text FROM public.career_skill_map m LEFT JOIN public.career_catalog c ON c.id=m.career_id LEFT JOIN public.skill_catalog s ON s.id=m.skill_id WHERE c.id IS NULL OR s.id IS NULL
    UNION ALL
    SELECT 'Invalid relationship ' || r.id::text FROM public.skill_relationships r LEFT JOIN public.skill_catalog a ON a.id=r.source_skill_id LEFT JOIN public.skill_catalog b ON b.id=r.target_skill_id WHERE a.id IS NULL OR b.id IS NULL OR a.id=b.id
    UNION ALL
    SELECT 'Published career lacks visible requirements: ' || c.slug FROM public.career_catalog c WHERE c.status='published' AND NOT EXISTS (SELECT 1 FROM public.career_skill_map m JOIN public.skill_catalog s ON s.id=m.skill_id WHERE m.career_id=c.id AND s.status='published' AND m.importance IN ('required','recommended'))
    UNION ALL
    SELECT 'Duplicate career slug: ' || slug FROM public.career_catalog GROUP BY slug HAVING count(*)>1
    UNION ALL
    SELECT 'Duplicate skill slug: ' || slug FROM public.skill_catalog GROUP BY slug HAVING count(*)>1
  ) SELECT COALESCE(jsonb_agg(message), '[]'), count(*) INTO issues, total_issues FROM problems;
  SELECT COALESCE(jsonb_agg(message), '[]') INTO warnings FROM (
    SELECT 'Unpublished skill attached to published career: ' || c.slug || ' / ' || s.slug AS message FROM public.career_skill_map m JOIN public.career_catalog c ON c.id=m.career_id JOIN public.skill_catalog s ON s.id=m.skill_id WHERE c.status='published' AND s.status<>'published'
    UNION ALL
    SELECT 'Unpublished prerequisite for published skill: ' || a.slug || ' -> ' || b.slug FROM public.skill_relationships r JOIN public.skill_catalog a ON a.id=r.source_skill_id JOIN public.skill_catalog b ON b.id=r.target_skill_id WHERE r.relationship_type='prerequisite' AND b.status='published' AND a.status<>'published'
  ) w;
  RETURN jsonb_build_object('status', CASE WHEN total_issues>0 THEN 'ERROR' WHEN jsonb_array_length(warnings)>0 THEN 'WARNING' ELSE 'PASS' END,
    'health', CASE WHEN total_issues>0 THEN 'ERROR' WHEN jsonb_array_length(warnings)>0 THEN 'WARNING' ELSE 'HEALTHY' END,
    'issues', issues || warnings,
    'stats', jsonb_build_object('totalCareers',(SELECT count(*) FROM public.career_catalog),'publishedCareers',(SELECT count(*) FROM public.career_catalog WHERE status='published'),'totalSkills',(SELECT count(*) FROM public.skill_catalog),'publishedSkills',(SELECT count(*) FROM public.skill_catalog WHERE status='published'),'totalMappings',(SELECT count(*) FROM public.career_skill_map),'totalRelationships',(SELECT count(*) FROM public.skill_relationships)));
END;
$$;
REVOKE ALL ON FUNCTION public.phase_a_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase_a_health() TO authenticated;
COMMIT;
