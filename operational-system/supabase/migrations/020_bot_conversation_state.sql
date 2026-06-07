-- Migration 020: dedicated bot_conversation_state table
-- Replaces the broken pattern of storing bot state in the `leads` table.
-- ManyChat leads don't always have a row in `leads`, so this table is keyed
-- only on lead_uuid (the generated UUID from the webhook) with no FK constraint.

CREATE TABLE IF NOT EXISTS bot_conversation_state (
  lead_uuid     UUID        PRIMARY KEY,
  subscriber_id TEXT,
  state         TEXT        NOT NULL DEFAULT 'initial',
  context       JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bcs_subscriber
  ON bot_conversation_state (subscriber_id)
  WHERE subscriber_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bcs_state
  ON bot_conversation_state (state);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_bcs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bcs_updated_at ON bot_conversation_state;
CREATE TRIGGER trg_bcs_updated_at
  BEFORE UPDATE ON bot_conversation_state
  FOR EACH ROW EXECUTE FUNCTION update_bcs_updated_at();

ALTER TABLE bot_conversation_state ENABLE ROW LEVEL SECURITY;

-- Service role can do everything; no public access.
CREATE POLICY "service_role_all_bcs"
  ON bot_conversation_state FOR ALL
  USING (auth.role() = 'service_role');
