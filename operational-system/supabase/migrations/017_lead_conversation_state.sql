-- ============================================================
-- Migration 017: Add conversation state columns to leads
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS conversation_state   TEXT    DEFAULT 'initial',
  ADD COLUMN IF NOT EXISTS conversation_context JSONB   DEFAULT '{}';

-- conversation_state values:
--   initial | discovery | qualifying | pitching | objection | booking | closed | irrelevant
