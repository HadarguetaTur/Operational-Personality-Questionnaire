-- ============================================================
-- Migration 004: Landing page analytics events
-- RUN THIS IN SUPABASE SQL EDITOR after 003
-- ============================================================
--
-- Tracks anonymous visitor activity on the public landing page:
--   - page_view: someone loaded the landing page
--   - cta_click: someone clicked a "start quiz" button
--   - quiz_start: the questionnaire app was reached (cross-app handshake)
--
-- visitor_id is a client-generated UUID stored in localStorage so we can
-- group events by visitor without identifying anyone.

CREATE TABLE IF NOT EXISTS landing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'cta_click', 'quiz_start')),
  page_path TEXT,
  cta_id TEXT,
  visitor_id TEXT,
  session_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_events_created_at ON landing_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_events_type        ON landing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_landing_events_visitor     ON landing_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_landing_events_utm         ON landing_events(utm_source, utm_medium, utm_campaign);

ALTER TABLE landing_events ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors can insert their own events (no auth required)
DROP POLICY IF EXISTS "anon_insert_landing_events" ON landing_events;
CREATE POLICY "anon_insert_landing_events" ON landing_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read events
DROP POLICY IF EXISTS "admin_read_landing_events" ON landing_events;
CREATE POLICY "admin_read_landing_events" ON landing_events
  FOR SELECT USING (is_admin());

-- Convenience views for the admin dashboard
CREATE OR REPLACE VIEW landing_funnel_daily AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) FILTER (WHERE event_type = 'page_view')  AS page_views,
  COUNT(*) FILTER (WHERE event_type = 'cta_click')  AS cta_clicks,
  COUNT(*) FILTER (WHERE event_type = 'quiz_start') AS quiz_starts,
  COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view') AS unique_visitors
FROM landing_events
GROUP BY 1
ORDER BY 1 DESC;

CREATE OR REPLACE VIEW landing_funnel_by_source AS
SELECT
  COALESCE(utm_source, 'direct') AS source,
  COALESCE(utm_medium, 'none')   AS medium,
  COALESCE(utm_campaign, 'none') AS campaign,
  COUNT(*) FILTER (WHERE event_type = 'page_view')  AS page_views,
  COUNT(*) FILTER (WHERE event_type = 'cta_click')  AS cta_clicks,
  COUNT(*) FILTER (WHERE event_type = 'quiz_start') AS quiz_starts
FROM landing_events
GROUP BY 1, 2, 3
ORDER BY page_views DESC;
