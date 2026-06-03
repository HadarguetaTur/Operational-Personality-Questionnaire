-- ============================================================
-- Migration 015: ManyChat webhook event log
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS manychat_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid      UUID        NOT NULL,
  subscriber_id  TEXT,
  event_type     TEXT        NOT NULL,
  payload        JSONB       NOT NULL DEFAULT '{}',
  process_status TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (process_status IN ('pending', 'processing', 'done', 'error')),
  process_error  TEXT,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No FK to leads.id intentionally:
-- At Phase 0 the ManyChat subscriber may not yet have a quiz lead row.
-- The relationship will be hardened in Phase 1 when lead matching is added.

CREATE INDEX IF NOT EXISTS idx_mce_lead_uuid      ON manychat_events(lead_uuid);
CREATE INDEX IF NOT EXISTS idx_mce_event_type     ON manychat_events(event_type);
CREATE INDEX IF NOT EXISTS idx_mce_process_status ON manychat_events(process_status);
CREATE INDEX IF NOT EXISTS idx_mce_received_at    ON manychat_events(received_at DESC);

ALTER TABLE manychat_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_manychat_events" ON manychat_events;

-- The webhook route uses createServiceRoleClient() which bypasses RLS entirely,
-- so no anon INSERT policy is needed. Admins can read/write via dashboard.
CREATE POLICY "admin_all_manychat_events" ON manychat_events
  FOR ALL USING (is_admin());
