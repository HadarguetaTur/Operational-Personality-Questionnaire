-- 026_lead_meeting_status.sql
-- Meeting details live on the lead itself (not only in bot context), so the
-- admin can track meeting status, upload a summary, and the bot can react
-- correctly when a booked lead messages again (before/after the meeting).

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS meeting_at TIMESTAMPTZ,    -- when the meeting takes place (meeting_booked_at = when it was booked)
  ADD COLUMN IF NOT EXISTS meeting_type TEXT,         -- 'intro' | 'diagnostic'
  ADD COLUMN IF NOT EXISTS meeting_calcom_uid TEXT,   -- Cal.com booking uid (for cancellation)
  ADD COLUMN IF NOT EXISTS meeting_status TEXT,       -- 'scheduled' | 'completed' | 'no_show' | 'cancelled'
  ADD COLUMN IF NOT EXISTS meeting_summary TEXT;      -- Hadar's post-meeting summary

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_meeting_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_meeting_status_check
  CHECK (meeting_status IS NULL OR meeting_status IN ('scheduled', 'completed', 'no_show', 'cancelled'));

-- Extend the lead pipeline statuses (admin-managed):
-- meeting_completed / awaiting_quote / awaiting_diagnostic / meeting_cancelled.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_lead_status_check
  CHECK (lead_status IN (
    'new', 'in_progress', 'completed', 'paid', 'followup_sent', 'meeting_booked',
    'meeting_completed', 'awaiting_quote', 'awaiting_diagnostic', 'meeting_cancelled'
  ));

-- Backfill: leads that already booked via the in-chat flow have the slot in
-- bot_conversation_state.context. Copy it onto the lead row.
UPDATE leads l
SET
  meeting_at         = (b.context->>'booked_slot')::timestamptz,
  meeting_calcom_uid = NULLIF(b.context->>'calcom_booking_uid', ''),
  meeting_type       = CASE WHEN b.context->>'pending_booking_type' IN ('intro', 'diagnostic')
                            THEN b.context->>'pending_booking_type' END,
  meeting_status     = COALESCE(l.meeting_status, 'scheduled')
FROM bot_conversation_state b
WHERE b.lead_uuid = l.id
  AND b.context->>'booked_slot' IS NOT NULL
  AND l.meeting_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_meeting_status ON leads (meeting_status) WHERE meeting_status IS NOT NULL;
