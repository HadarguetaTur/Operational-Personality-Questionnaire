-- ============================================================
-- Migration 005: Attribution columns on leads
-- RUN THIS IN SUPABASE SQL EDITOR after 004
-- ============================================================
--
-- Connects an authored lead back to the anonymous visitor that browsed the
-- landing page. visitor_id is the same client-generated UUID stored in
-- localStorage that is used in landing_events, so a JOIN gives end-to-end
-- attribution: page_view → cta_click → quiz_start → lead created → completed.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS visitor_id   TEXT,
  ADD COLUMN IF NOT EXISTS session_id   TEXT,
  ADD COLUMN IF NOT EXISTS utm_source   TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium   TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_term     TEXT,
  ADD COLUMN IF NOT EXISTS utm_content  TEXT,
  ADD COLUMN IF NOT EXISTS landing_referrer TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_visitor_id ON leads(visitor_id);
CREATE INDEX IF NOT EXISTS idx_leads_utm        ON leads(utm_source, utm_medium, utm_campaign);

-- Convenience view: full funnel per visitor
CREATE OR REPLACE VIEW visitor_funnel AS
WITH events AS (
  SELECT
    visitor_id,
    MIN(created_at) FILTER (WHERE event_type = 'page_view')  AS first_page_view,
    MAX(created_at) FILTER (WHERE event_type = 'cta_click')  AS last_cta_click,
    MAX(created_at) FILTER (WHERE event_type = 'quiz_start') AS last_quiz_start,
    COUNT(*) FILTER (WHERE event_type = 'page_view')  AS page_views,
    COUNT(*) FILTER (WHERE event_type = 'cta_click')  AS cta_clicks,
    COUNT(*) FILTER (WHERE event_type = 'quiz_start') AS quiz_starts,
    -- pick first non-null UTM observed for this visitor
    (ARRAY_AGG(utm_source   ORDER BY created_at) FILTER (WHERE utm_source   IS NOT NULL))[1] AS utm_source,
    (ARRAY_AGG(utm_medium   ORDER BY created_at) FILTER (WHERE utm_medium   IS NOT NULL))[1] AS utm_medium,
    (ARRAY_AGG(utm_campaign ORDER BY created_at) FILTER (WHERE utm_campaign IS NOT NULL))[1] AS utm_campaign
  FROM landing_events
  WHERE visitor_id IS NOT NULL
  GROUP BY visitor_id
)
SELECT
  e.visitor_id,
  e.first_page_view,
  e.last_cta_click,
  e.last_quiz_start,
  e.page_views,
  e.cta_clicks,
  e.quiz_starts,
  e.utm_source,
  e.utm_medium,
  e.utm_campaign,
  l.id           AS lead_id,
  l.name         AS lead_name,
  l.email        AS lead_email,
  l.created_at   AS lead_created_at,
  l.completed_at AS lead_completed_at,
  l.lead_status,
  l.result_pattern,
  l.payment_status
FROM events e
LEFT JOIN leads l ON l.visitor_id = e.visitor_id;
