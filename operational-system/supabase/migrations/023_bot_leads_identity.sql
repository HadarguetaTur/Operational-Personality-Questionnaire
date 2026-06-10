
ALTER TABLE leads
  ALTER COLUMN email DROP NOT NULL;

-- 2. ManyChat subscriber id (stable identity for dedup).
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS subscriber_id TEXT;

-- One lead per subscriber (NULL allowed for quiz/landing leads without a subscriber).
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_subscriber_id
  ON leads(subscriber_id)
  WHERE subscriber_id IS NOT NULL;

COMMENT ON COLUMN leads.subscriber_id IS
  'ManyChat subscriber id. Stable identity for WhatsApp bot leads; used to dedup returning conversations.';
