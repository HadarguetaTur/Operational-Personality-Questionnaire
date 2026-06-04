CREATE TABLE IF NOT EXISTS pending_followups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid    UUID NOT NULL UNIQUE,
  remind_at    TIMESTAMPTZ NOT NULL,
  closed_at    TIMESTAMPTZ,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_followups_remind_at ON pending_followups (remind_at)
  WHERE closed_at IS NULL AND reminder_sent = false;
