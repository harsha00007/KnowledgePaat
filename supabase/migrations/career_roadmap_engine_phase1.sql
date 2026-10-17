-- ============================================================
-- KnowledgePaat — Career Roadmap Engine
-- Phase 1 Database Migration
-- 
-- Tables:
--   career_roadmaps
--   career_roadmap_sections
--   career_roadmap_nodes
--   career_roadmap_node_relationships
--   career_roadmap_node_topics
--
-- Run this in your Supabase SQL Editor.
-- All tables use UUID primary keys, consistent with the existing schema.
-- ============================================================

-- Enable UUID extension (already enabled in most Supabase projects)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. career_roadmaps ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS career_roadmaps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  short_description   TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  category            TEXT NOT NULL DEFAULT 'Development',
  difficulty          TEXT NOT NULL DEFAULT 'Beginner',
  estimated_duration  TEXT NOT NULL DEFAULT '',
  thumbnail_url       TEXT,
  seo_title           TEXT,
  seo_description     TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT false,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_career_roadmaps_slug        ON career_roadmaps(slug);
CREATE INDEX IF NOT EXISTS idx_career_roadmaps_is_active   ON career_roadmaps(is_active);
CREATE INDEX IF NOT EXISTS idx_career_roadmaps_category    ON career_roadmaps(category);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_career_roadmaps_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_career_roadmaps_updated_at ON career_roadmaps;
CREATE TRIGGER trg_career_roadmaps_updated_at
  BEFORE UPDATE ON career_roadmaps
  FOR EACH ROW EXECUTE FUNCTION update_career_roadmaps_updated_at();

-- ── 2. career_roadmap_sections ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS career_roadmap_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id  UUID NOT NULL REFERENCES career_roadmaps(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  sequence    INTEGER NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (roadmap_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_career_roadmap_sections_roadmap_id ON career_roadmap_sections(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_career_roadmap_sections_sequence   ON career_roadmap_sections(roadmap_id, sequence);

CREATE OR REPLACE FUNCTION update_career_roadmap_sections_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_career_roadmap_sections_updated_at ON career_roadmap_sections;
CREATE TRIGGER trg_career_roadmap_sections_updated_at
  BEFORE UPDATE ON career_roadmap_sections
  FOR EACH ROW EXECUTE FUNCTION update_career_roadmap_sections_updated_at();

-- ── 3. career_roadmap_nodes ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS career_roadmap_nodes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id          UUID NOT NULL REFERENCES career_roadmap_sections(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL,
  description         TEXT,
  node_type           TEXT NOT NULL DEFAULT 'TOPIC',  -- SKILL | TOPIC | MILESTONE | CHECKPOINT
  difficulty          TEXT NOT NULL DEFAULT 'Beginner',
  estimated_minutes   INTEGER NOT NULL DEFAULT 60,
  sequence            INTEGER NOT NULL DEFAULT 1,
  is_required         BOOLEAN NOT NULL DEFAULT true,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (section_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_career_roadmap_nodes_section_id ON career_roadmap_nodes(section_id);
CREATE INDEX IF NOT EXISTS idx_career_roadmap_nodes_sequence   ON career_roadmap_nodes(section_id, sequence);

CREATE OR REPLACE FUNCTION update_career_roadmap_nodes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_career_roadmap_nodes_updated_at ON career_roadmap_nodes;
CREATE TRIGGER trg_career_roadmap_nodes_updated_at
  BEFORE UPDATE ON career_roadmap_nodes
  FOR EACH ROW EXECUTE FUNCTION update_career_roadmap_nodes_updated_at();

-- ── 4. career_roadmap_node_relationships ──────────────────────────────────

CREATE TABLE IF NOT EXISTS career_roadmap_node_relationships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id    UUID NOT NULL REFERENCES career_roadmap_nodes(id) ON DELETE CASCADE,
  target_node_id    UUID NOT NULL REFERENCES career_roadmap_nodes(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'NEXT',  -- PREREQUISITE | NEXT | RECOMMENDED | OPTIONAL | ALTERNATIVE
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicates
  UNIQUE (source_node_id, target_node_id, relationship_type),

  -- Prevent self-reference (enforced at DB level)
  CONSTRAINT chk_no_self_relationship CHECK (source_node_id <> target_node_id)
);

CREATE INDEX IF NOT EXISTS idx_career_roadmap_relationships_source ON career_roadmap_node_relationships(source_node_id);
CREATE INDEX IF NOT EXISTS idx_career_roadmap_relationships_target ON career_roadmap_node_relationships(target_node_id);

-- ── 5. career_roadmap_node_topics ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS career_roadmap_node_topics (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id   UUID NOT NULL REFERENCES career_roadmap_nodes(id) ON DELETE CASCADE,
  topic     TEXT NOT NULL,
  sequence  INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_career_roadmap_node_topics_node_id ON career_roadmap_node_topics(node_id);

-- ── 6. Row Level Security (RLS) ───────────────────────────────────────────

-- Enable RLS on all new tables
ALTER TABLE career_roadmaps                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_roadmap_sections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_roadmap_nodes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_roadmap_node_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_roadmap_node_topics       ENABLE ROW LEVEL SECURITY;

-- ── RLS: career_roadmaps ──────────────────────────────────────────────────

-- Public: can read active roadmaps only
CREATE POLICY "public_read_active_roadmaps"
  ON career_roadmaps FOR SELECT
  USING (is_active = true);

-- Admin: full access (auth.users must have role='admin' in profiles table)
CREATE POLICY "admin_full_access_roadmaps"
  ON career_roadmaps FOR ALL
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

-- ── RLS: career_roadmap_sections ──────────────────────────────────────────

CREATE POLICY "public_read_active_sections"
  ON career_roadmap_sections FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM career_roadmaps
      WHERE career_roadmaps.id = roadmap_id
        AND career_roadmaps.is_active = true
    )
  );

CREATE POLICY "admin_full_access_sections"
  ON career_roadmap_sections FOR ALL
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

-- ── RLS: career_roadmap_nodes ─────────────────────────────────────────────

CREATE POLICY "public_read_active_nodes"
  ON career_roadmap_nodes FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM career_roadmap_sections
      WHERE career_roadmap_sections.id = section_id
        AND career_roadmap_sections.is_active = true
    )
  );

CREATE POLICY "admin_full_access_nodes"
  ON career_roadmap_nodes FOR ALL
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

-- ── RLS: career_roadmap_node_relationships ────────────────────────────────

CREATE POLICY "public_read_relationships"
  ON career_roadmap_node_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM career_roadmap_nodes src
      WHERE src.id = source_node_id AND src.is_active = true
    )
  );

CREATE POLICY "admin_full_access_relationships"
  ON career_roadmap_node_relationships FOR ALL
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

-- ── RLS: career_roadmap_node_topics ──────────────────────────────────────

CREATE POLICY "public_read_topics"
  ON career_roadmap_node_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM career_roadmap_nodes n
      WHERE n.id = node_id AND n.is_active = true
    )
  );

CREATE POLICY "admin_full_access_topics"
  ON career_roadmap_node_topics FOR ALL
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
-- Migration complete.
-- ============================================================
