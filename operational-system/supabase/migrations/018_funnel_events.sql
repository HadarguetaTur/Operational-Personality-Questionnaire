-- Funnel events for bot / quiz tracking
CREATE TABLE IF NOT EXISTS funnel_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid   UUID NOT NULL,
  event_type  TEXT NOT NULL,
  meta        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_lead_uuid ON funnel_events (lead_uuid);
CREATE INDEX IF NOT EXISTS idx_funnel_events_event_type ON funnel_events (event_type);
