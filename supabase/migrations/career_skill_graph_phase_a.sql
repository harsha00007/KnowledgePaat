-- ============================================================
-- KnowledgePaat — Career & Skill Graph Foundation
-- Phase A Database Migration
-- 
-- Tables:
--   1. career_catalog
--   2. skill_catalog
--   3. career_skill_map (Many-to-Many)
--   4. skill_relationships (Graph Edges / Prerequisites)
--
-- Preserves existing Phase 1, Phase 2, and Phase 3 roadmap tables.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. career_catalog ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS career_catalog (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  short_description   TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  category            TEXT NOT NULL DEFAULT 'software_development',
  icon                TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  difficulty          TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_months    INTEGER NOT NULL DEFAULT 6,
  display_order       INTEGER NOT NULL DEFAULT 1,
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  seo_title           TEXT,
  seo_description     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_catalog_slug        ON career_catalog(slug);
CREATE INDEX IF NOT EXISTS idx_career_catalog_status      ON career_catalog(status);
CREATE INDEX IF NOT EXISTS idx_career_catalog_category    ON career_catalog(category);
CREATE INDEX IF NOT EXISTS idx_career_catalog_is_featured ON career_catalog(is_featured);
CREATE INDEX IF NOT EXISTS idx_career_catalog_order       ON career_catalog(display_order);

CREATE OR REPLACE FUNCTION update_career_catalog_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_career_catalog_updated_at ON career_catalog;
CREATE TRIGGER trg_career_catalog_updated_at
  BEFORE UPDATE ON career_catalog
  FOR EACH ROW EXECUTE FUNCTION update_career_catalog_updated_at();

-- ── 2. skill_catalog ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skill_catalog (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  short_description   TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  category            TEXT NOT NULL DEFAULT 'development',
  skill_type          TEXT NOT NULL DEFAULT 'concept' CHECK (skill_type IN (
    'language', 'framework', 'library', 'database', 'tool',
    'platform', 'concept', 'soft_skill', 'domain', 'practice',
    'architecture', 'other'
  )),
  difficulty          TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  icon                TEXT,
  display_order       INTEGER NOT NULL DEFAULT 1,
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_catalog_slug        ON skill_catalog(slug);
CREATE INDEX IF NOT EXISTS idx_skill_catalog_status      ON skill_catalog(status);
CREATE INDEX IF NOT EXISTS idx_skill_catalog_category    ON skill_catalog(category);
CREATE INDEX IF NOT EXISTS idx_skill_catalog_type        ON skill_catalog(skill_type);
CREATE INDEX IF NOT EXISTS idx_skill_catalog_difficulty  ON skill_catalog(difficulty);
CREATE INDEX IF NOT EXISTS idx_skill_catalog_is_featured ON skill_catalog(is_featured);

CREATE OR REPLACE FUNCTION update_skill_catalog_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_skill_catalog_updated_at ON skill_catalog;
CREATE TRIGGER trg_skill_catalog_updated_at
  BEFORE UPDATE ON skill_catalog
  FOR EACH ROW EXECUTE FUNCTION update_skill_catalog_updated_at();

-- ── 3. career_skill_map (Many-to-Many) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS career_skill_map (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_id           UUID NOT NULL REFERENCES career_catalog(id) ON DELETE CASCADE,
  skill_id            UUID NOT NULL REFERENCES skill_catalog(id) ON DELETE RESTRICT,
  importance          TEXT NOT NULL DEFAULT 'recommended' CHECK (importance IN ('required', 'recommended', 'optional')),
  proficiency_target  TEXT NOT NULL DEFAULT 'working' CHECK (proficiency_target IN ('beginner', 'working', 'proficient', 'advanced')),
  display_order       INTEGER NOT NULL DEFAULT 1,
  is_core             BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_career_skill UNIQUE (career_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_csm_career_id    ON career_skill_map(career_id);
CREATE INDEX IF NOT EXISTS idx_csm_skill_id     ON career_skill_map(skill_id);
CREATE INDEX IF NOT EXISTS idx_csm_importance   ON career_skill_map(career_id, importance);
CREATE INDEX IF NOT EXISTS idx_csm_order        ON career_skill_map(career_id, display_order);

CREATE OR REPLACE FUNCTION update_career_skill_map_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_career_skill_map_updated_at ON career_skill_map;
CREATE TRIGGER trg_career_skill_map_updated_at
  BEFORE UPDATE ON career_skill_map
  FOR EACH ROW EXECUTE FUNCTION update_career_skill_map_updated_at();

-- ── 4. skill_relationships (Graph Edges / Prerequisites) ────────────────────

CREATE TABLE IF NOT EXISTS skill_relationships (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_skill_id     UUID NOT NULL REFERENCES skill_catalog(id) ON DELETE CASCADE,
  target_skill_id     UUID NOT NULL REFERENCES skill_catalog(id) ON DELETE CASCADE,
  relationship_type   TEXT NOT NULL DEFAULT 'prerequisite' CHECK (relationship_type IN (
    'prerequisite', 'related', 'commonly_used_with', 'builds_on', 'alternative'
  )),
  strength            NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_skill_relationship UNIQUE (source_skill_id, target_skill_id, relationship_type),
  CONSTRAINT chk_no_self_skill_relationship CHECK (source_skill_id <> target_skill_id)
);

CREATE INDEX IF NOT EXISTS idx_sr_source ON skill_relationships(source_skill_id);
CREATE INDEX IF NOT EXISTS idx_sr_target ON skill_relationships(target_skill_id);
CREATE INDEX IF NOT EXISTS idx_sr_type   ON skill_relationships(relationship_type);

CREATE OR REPLACE FUNCTION update_skill_relationships_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_skill_relationships_updated_at ON skill_relationships;
CREATE TRIGGER trg_skill_relationships_updated_at
  BEFORE UPDATE ON skill_relationships
  FOR EACH ROW EXECUTE FUNCTION update_skill_relationships_updated_at();

-- ── 5. Row Level Security (RLS) ──────────────────────────────────────────────

ALTER TABLE career_catalog        ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_catalog         ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_skill_map      ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_relationships   ENABLE ROW LEVEL SECURITY;

-- ── RLS: career_catalog ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "public_read_published_careers" ON career_catalog;
CREATE POLICY "public_read_published_careers"
  ON career_catalog FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "admin_full_access_careers" ON career_catalog;
CREATE POLICY "admin_full_access_careers"
  ON career_catalog FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ── RLS: skill_catalog ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "public_read_published_skills" ON skill_catalog;
CREATE POLICY "public_read_published_skills"
  ON skill_catalog FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "admin_full_access_skills" ON skill_catalog;
CREATE POLICY "admin_full_access_skills"
  ON skill_catalog FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ── RLS: career_skill_map ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "public_read_published_career_skills" ON career_skill_map;
CREATE POLICY "public_read_published_career_skills"
  ON career_skill_map FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM career_catalog
      WHERE career_catalog.id = career_skill_map.career_id
        AND career_catalog.status = 'published'
    )
    AND EXISTS (
      SELECT 1 FROM skill_catalog
      WHERE skill_catalog.id = career_skill_map.skill_id
        AND skill_catalog.status = 'published'
    )
  );

DROP POLICY IF EXISTS "admin_full_access_career_skills" ON career_skill_map;
CREATE POLICY "admin_full_access_career_skills"
  ON career_skill_map FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ── RLS: skill_relationships ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "public_read_published_skill_relationships" ON skill_relationships;
CREATE POLICY "public_read_published_skill_relationships"
  ON skill_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skill_catalog
      WHERE skill_catalog.id = skill_relationships.source_skill_id
        AND skill_catalog.status = 'published'
    )
    AND EXISTS (
      SELECT 1 FROM skill_catalog
      WHERE skill_catalog.id = skill_relationships.target_skill_id
        AND skill_catalog.status = 'published'
    )
  );

DROP POLICY IF EXISTS "admin_full_access_skill_relationships" ON skill_relationships;
CREATE POLICY "admin_full_access_skill_relationships"
  ON skill_relationships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
