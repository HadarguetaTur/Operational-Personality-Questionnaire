-- Migration 021: ai_runs table for tracking LLM usage per lead message
-- Each time the pipeline calls an LLM (classify or write) it inserts a row here.

CREATE TABLE IF NOT EXISTS ai_runs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid         UUID        NOT NULL,
  task              TEXT        NOT NULL, -- 'classify' | 'write' | 'handoff_summary' | 'quiz_intake'
  model             TEXT        NOT NULL,
  state_in          TEXT,
  state_out         TEXT,
  intent            TEXT,
  action            TEXT,
  prompt_tokens     INT,
  completion_tokens INT,
  total_tokens      INT,
  cost_usd          NUMERIC(12, 6),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_runs_lead
  ON ai_runs (lead_uuid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_runs_task
  ON ai_runs (task, created_at DESC);

ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ai_runs"
  ON ai_runs FOR ALL
  USING (auth.role() = 'service_role');
