-- ============================================================
-- Migration 014: Guide download tracking (lead magnets)
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Bucket: guides (public read) ─────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('guides', 'guides', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if re-running migration
DROP POLICY IF EXISTS "public_read_guides_storage"  ON storage.objects;
DROP POLICY IF EXISTS "admin_write_guides_storage"  ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_guides_storage" ON storage.objects;

-- Anyone can read files from the guides bucket
CREATE POLICY "public_read_guides_storage"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'guides');

-- Only admins can upload
CREATE POLICY "admin_write_guides_storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'guides' AND is_admin());

-- Only admins can delete
CREATE POLICY "admin_delete_guides_storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'guides' AND is_admin());

-- ── Table: guides ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guides (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT        NOT NULL UNIQUE
                         CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       TEXT        NOT NULL,
  file_url   TEXT        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guides_slug      ON guides(slug);
CREATE INDEX IF NOT EXISTS idx_guides_is_active ON guides(is_active);

ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_active_guides" ON guides;
DROP POLICY IF EXISTS "admin_all_guides"           ON guides;

CREATE POLICY "public_read_active_guides" ON guides
  FOR SELECT USING (is_active = true);

CREATE POLICY "admin_all_guides" ON guides
  FOR ALL USING (is_admin());

-- ── Table: guide_download_events ──────────────────────────────
CREATE TABLE IF NOT EXISTS guide_download_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_slug   TEXT        NOT NULL REFERENCES guides(slug) ON DELETE CASCADE,
  visitor_id   TEXT,
  ip_address   TEXT,
  user_agent   TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  referer      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gde_slug    ON guide_download_events(guide_slug);
CREATE INDEX IF NOT EXISTS idx_gde_created ON guide_download_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gde_visitor ON guide_download_events(visitor_id);

ALTER TABLE guide_download_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_download_events" ON guide_download_events;
DROP POLICY IF EXISTS "admin_read_download_events"  ON guide_download_events;

-- Public (anon + authenticated): insert only — no auth required for tracking
CREATE POLICY "anon_insert_download_events" ON guide_download_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admins: read all events
CREATE POLICY "admin_read_download_events" ON guide_download_events
  FOR SELECT USING (is_admin());

-- ── View: guide_download_stats ────────────────────────────────
CREATE OR REPLACE VIEW guide_download_stats AS
SELECT
  g.id,
  g.slug,
  g.name,
  g.file_url,
  g.is_active,
  g.created_at,
  COUNT(e.id)                                                            AS total_downloads,
  COUNT(e.id) FILTER (WHERE e.created_at >= NOW() - INTERVAL '7 days')  AS downloads_7d,
  COUNT(e.id) FILTER (WHERE e.created_at >= NOW() - INTERVAL '30 days') AS downloads_30d,
  COUNT(DISTINCT e.visitor_id)                                           AS unique_visitors
FROM guides g
LEFT JOIN guide_download_events e ON e.guide_slug = g.slug
GROUP BY g.id, g.slug, g.name, g.file_url, g.is_active, g.created_at
ORDER BY total_downloads DESC;
