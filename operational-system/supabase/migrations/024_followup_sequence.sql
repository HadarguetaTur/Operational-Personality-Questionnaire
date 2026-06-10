

ALTER TABLE pending_followups
  ADD COLUMN IF NOT EXISTS step INT NOT NULL DEFAULT 0;

-- The cron now drives on step + remind_at + closed_at (not reminder_sent).
DROP INDEX IF EXISTS idx_pending_followups_remind_at;
CREATE INDEX IF NOT EXISTS idx_pending_followups_due
  ON pending_followups (remind_at)
  WHERE closed_at IS NULL;

COMMENT ON COLUMN pending_followups.step IS
  'Follow-up touch progress: 0=scheduled, 1=first touch sent, 2=second touch sent (final).';
