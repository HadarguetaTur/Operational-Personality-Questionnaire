-- Multi-channel support: WhatsApp / Instagram / Facebook / Web share one bot engine.
-- bot_conversation_state.channel is the SOURCE OF TRUTH for outbound routing
-- (the cron reads it to pick the right sender). Not stored in context JSONB so
-- it stays indexable and can't be clobbered by context merges.

ALTER TABLE bot_conversation_state
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp';

-- Nullable, analytics only.
ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS channel TEXT;

ALTER TABLE manychat_events
  ADD COLUMN IF NOT EXISTS channel TEXT;

CREATE INDEX IF NOT EXISTS idx_bcs_channel ON bot_conversation_state (channel);

COMMENT ON COLUMN bot_conversation_state.channel IS
  'Lead channel: whatsapp | instagram | facebook | web. Drives outbound routing (cron follow-ups).';
