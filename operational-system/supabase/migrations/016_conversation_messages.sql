-- ============================================================
-- Migration 016: Conversation messages for AI sales agent
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS conversation_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid     UUID        NOT NULL,
  subscriber_id TEXT,
  role          TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content       TEXT        NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No FK to leads intentionally — subscriber may not have a quiz lead row yet.

CREATE INDEX IF NOT EXISTS idx_cm_lead_created ON conversation_messages(lead_uuid, created_at);
CREATE INDEX IF NOT EXISTS idx_cm_subscriber   ON conversation_messages(subscriber_id);

ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_conversation_messages" ON conversation_messages;

CREATE POLICY "admin_all_conversation_messages" ON conversation_messages
  FOR ALL USING (is_admin());
