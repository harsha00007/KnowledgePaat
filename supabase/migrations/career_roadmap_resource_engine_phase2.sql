-- ============================================================
-- KnowledgePaat — Career Roadmap Resource Engine
-- Phase 2 Database Migration
-- 
-- Tables:
--   career_resources
--   career_roadmap_node_resources
--
-- This migration builds additively on top of Phase 1.
-- Phase 1 tables (career_roadmaps, career_roadmap_sections,
-- career_roadmap_nodes, career_roadmap_node_relationships,
-- career_roadmap_node_topics) remain completely untouched.
-- ============================================================

-- ── 1. career_resources ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS career_resources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  resource_type     TEXT NOT NULL DEFAULT 'ARTICLE', -- YOUTUBE | ARTICLE | DOCUMENTATION | UDEMY | KNOWLEDGEPAAT_COURSE | LIVE_COURSE | BOOK | PROJECT | PRACTICE
  provider          TEXT NOT NULL DEFAULT '',
  url               TEXT NOT NULL UNIQUE,
  thumbnail_url     TEXT,
  duration_minutes  INTEGER,
  difficulty        TEXT NOT NULL DEFAULT 'Beginner', -- Beginner | Intermediate | Advanced
  category          TEXT NOT NULL DEFAULT 'Development',
  is_free           BOOLEAN NOT NULL DEFAULT true,
  price             NUMERIC(10, 2),
  currency          TEXT DEFAULT 'INR',
  language          TEXT NOT NULL DEFAULT 'English',
  instructor        TEXT,
  rating            NUMERIC(3, 2),
  is_recommended    BOOLEAN NOT NULL DEFAULT false,
  priority          INTEGER NOT NULL DEFAULT 1,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_career_resources_url          ON career_resources(url);
CREATE INDEX IF NOT EXISTS idx_career_resources_is_active    ON career_resources(is_active);
CREATE INDEX IF NOT EXISTS idx_career_resources_type         ON career_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_career_resources_category     ON career_resources(category);
CREATE INDEX IF NOT EXISTS idx_career_resources_difficulty   ON career_resources(difficulty);
CREATE INDEX IF NOT EXISTS idx_career_resources_is_free      ON career_resources(is_free);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_career_resources_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_career_resources_updated_at ON career_resources;
CREATE TRIGGER trg_career_resources_updated_at
  BEFORE UPDATE ON career_resources
  FOR EACH ROW EXECUTE FUNCTION update_career_resources_updated_at();

-- ── 2. career_roadmap_node_resources (Many-to-Many) ───────────────────────

CREATE TABLE IF NOT EXISTS career_roadmap_node_resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id         UUID NOT NULL REFERENCES career_roadmap_nodes(id) ON DELETE CASCADE,
  resource_id     UUID NOT NULL REFERENCES career_resources(id) ON DELETE CASCADE,
  priority        INTEGER NOT NULL DEFAULT 1,
  is_recommended  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate node-resource attachments
  UNIQUE (node_id, resource_id)
);

-- Indexes for fast lookup on node drawer & detail views
CREATE INDEX IF NOT EXISTS idx_crnr_node_id     ON career_roadmap_node_resources(node_id);
CREATE INDEX IF NOT EXISTS idx_crnr_resource_id ON career_roadmap_node_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_crnr_priority    ON career_roadmap_node_resources(node_id, priority);

-- ── 3. Row Level Security (RLS) ───────────────────────────────────────────

ALTER TABLE career_resources                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_roadmap_node_resources     ENABLE ROW LEVEL SECURITY;

-- ── RLS: career_resources ─────────────────────────────────────────────────

-- Public: can read active resources
CREATE POLICY "public_read_active_career_resources"
  ON career_resources FOR SELECT
  USING (is_active = true);

-- Admin: full access
CREATE POLICY "admin_full_access_career_resources"
  ON career_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ── RLS: career_roadmap_node_resources ───────────────────────────────────

-- Public: can read node resources only when roadmap, section, node, and resource are all active
CREATE POLICY "public_read_active_node_resources"
  ON career_roadmap_node_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM career_roadmap_nodes n
      JOIN career_roadmap_sections s ON s.id = n.section_id
      JOIN career_roadmaps r ON r.id = s.roadmap_id
      WHERE n.id = node_id
        AND n.is_active = true
        AND s.is_active = true
        AND r.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM career_resources res
      WHERE res.id = resource_id
        AND res.is_active = true
    )
  );

-- Admin: full access
CREATE POLICY "admin_full_access_node_resources"
  ON career_roadmap_node_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- Phase 2 migration complete.
-- ============================================================
