-- ============================================================
-- KnowledgePaat — Career Roadmap Engine
-- Phase 3 Database Migration: User Roadmap Learning Progress
--
-- Table:
--   career_user_roadmap_progress
--
-- Run this in your Supabase SQL Editor.
-- Stores learner progress on roadmap nodes: 'learning' | 'done' | 'skip'.
-- Clearing status deletes the record (null = no record).
-- ============================================================

-- ── 1. career_user_roadmap_progress ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS career_user_roadmap_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id     UUID NOT NULL REFERENCES career_roadmap_nodes(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('learning', 'done', 'skip')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only one status per user per node
  UNIQUE (user_id, node_id)
);

-- Indexes for ultra-fast lookups and joins
CREATE INDEX IF NOT EXISTS idx_career_user_progress_user_id ON career_user_roadmap_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_career_user_progress_node_id ON career_user_roadmap_progress(node_id);
CREATE INDEX IF NOT EXISTS idx_career_user_progress_composite ON career_user_roadmap_progress(user_id, node_id);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_career_user_roadmap_progress_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_career_user_roadmap_progress_updated_at ON career_user_roadmap_progress;
CREATE TRIGGER trg_career_user_roadmap_progress_updated_at
  BEFORE UPDATE ON career_user_roadmap_progress
  FOR EACH ROW EXECUTE FUNCTION update_career_user_roadmap_progress_updated_at();

-- ── 2. Row Level Security (RLS) ───────────────────────────────────────────

ALTER TABLE career_user_roadmap_progress ENABLE ROW LEVEL SECURITY;

-- Learners can only select their own progress
CREATE POLICY "users_select_own_roadmap_progress"
  ON career_user_roadmap_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Learners can only insert their own progress
CREATE POLICY "users_insert_own_roadmap_progress"
  ON career_user_roadmap_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Learners can only update their own progress
CREATE POLICY "users_update_own_roadmap_progress"
  ON career_user_roadmap_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Learners can delete/clear their own progress
CREATE POLICY "users_delete_own_roadmap_progress"
  ON career_user_roadmap_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Admin full access for support / auditing
CREATE POLICY "admin_all_roadmap_progress"
  ON career_user_roadmap_progress FOR ALL
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
