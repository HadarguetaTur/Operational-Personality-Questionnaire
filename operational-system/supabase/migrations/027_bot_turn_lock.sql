-- 027_bot_turn_lock.sql
-- Per-lead turn lock to serialize concurrent inbound messages.
--
-- Two messages for the same lead arriving close together (a double-send, a
-- ManyChat redelivery, the on-site chat firing twice) used to run through
-- handleInboundMessage concurrently. Both read the SAME bot state and both
-- replied — producing the loop ("מתי נוח לך?" twice) and the contradictory
-- pair ("סגרתי לך ✅" alongside "מתי נוח לך?"). A lease on the state row makes
-- the second turn wait for the first to finish, then run against fresh state.

ALTER TABLE bot_conversation_state
  ADD COLUMN IF NOT EXISTS processing_until TIMESTAMPTZ;

-- Atomically claim the turn for a lead. Returns TRUE if the caller now holds the
-- lease (free, expired, or brand-new row), FALSE if another turn holds a live
-- lease. The lease auto-expires after p_ttl_seconds so a crashed handler can
-- never wedge a lead permanently.
CREATE OR REPLACE FUNCTION claim_bot_turn(p_lead_uuid UUID, p_ttl_seconds INT DEFAULT 45)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_until TIMESTAMPTZ := now() + make_interval(secs => p_ttl_seconds);
BEGIN
  -- Claim an existing row whose lease is free or expired.
  UPDATE bot_conversation_state
     SET processing_until = v_until
   WHERE lead_uuid = p_lead_uuid
     AND (processing_until IS NULL OR processing_until < now());
  IF FOUND THEN
    RETURN TRUE;
  END IF;

  -- Row exists and holds a live lease → cannot claim.
  IF EXISTS (SELECT 1 FROM bot_conversation_state WHERE lead_uuid = p_lead_uuid) THEN
    RETURN FALSE;
  END IF;

  -- No row yet (first message) → create it already claimed.
  BEGIN
    INSERT INTO bot_conversation_state (lead_uuid, state, context, processing_until)
    VALUES (p_lead_uuid, 'initial', '{}'::jsonb, v_until);
    RETURN TRUE;
  EXCEPTION WHEN unique_violation THEN
    -- Lost the create race — another turn holds it now.
    RETURN FALSE;
  END;
END;
$$;

-- Release the lease so the next queued turn can proceed immediately (rather than
-- waiting for the TTL to expire).
CREATE OR REPLACE FUNCTION release_bot_turn(p_lead_uuid UUID)
RETURNS VOID
LANGUAGE SQL
AS $$
  UPDATE bot_conversation_state
     SET processing_until = NULL
   WHERE lead_uuid = p_lead_uuid;
$$;
