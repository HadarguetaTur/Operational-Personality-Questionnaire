-- 028: allow `payment_click` in landing_events.
--
-- The funnel now sells the 350₪ strategy call directly (Sumit payment link on
-- the result/meeting pages). `payment_click` is fired by the client right
-- before redirecting to the payment page, closing the measurement gap between
-- `cta_click` and the server-side `payment_completed` funnel event.

ALTER TABLE landing_events
  DROP CONSTRAINT IF EXISTS landing_events_event_type_check;

ALTER TABLE landing_events
  ADD CONSTRAINT landing_events_event_type_check
  CHECK (event_type IN ('page_view', 'cta_click', 'quiz_start', 'payment_click'));
