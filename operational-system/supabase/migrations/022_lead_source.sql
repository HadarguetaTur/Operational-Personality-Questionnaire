-- ============================================================
-- Migration 022: Lead source (מקור הגעה)
-- RUN THIS IN SUPABASE SQL EDITOR after 021
-- ============================================================
--
-- Records where a lead arrived from. Allowed values:
--   instagram | facebook | landing_page | whatsapp
-- NULL = unknown / not yet documented.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'landing_page';

-- Ensure the default applies even if the column already existed without one.
ALTER TABLE leads
  ALTER COLUMN lead_source SET DEFAULT 'landing_page';

-- Constrain to the known channels (NULL stays allowed for "unknown").
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_lead_source_check'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_lead_source_check
      CHECK (lead_source IS NULL OR lead_source IN (
        'instagram', 'facebook', 'landing_page', 'whatsapp'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_lead_source ON leads(lead_source);

-- Existing leads were all created through the landing-page quiz funnel.
UPDATE leads
SET lead_source = 'landing_page'
WHERE lead_source IS NULL;

-- ------------------------------------------------------------
-- Default new landing-page (short quiz) leads to 'landing_page'
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_short_quiz_lead(text, text, text, text, jsonb, boolean);
DROP FUNCTION IF EXISTS public.create_short_quiz_lead(text, text, text, text, jsonb, boolean, jsonb);

CREATE OR REPLACE FUNCTION public.create_short_quiz_lead(
  p_name              text,
  p_phone             text,
  p_email             text    DEFAULT NULL,
  p_short_result_id   text    DEFAULT NULL,
  p_answers_json      jsonb   DEFAULT NULL,
  p_marketing_consent boolean DEFAULT true,
  p_roi_data          jsonb   DEFAULT NULL
)
RETURNS text  -- returns report_token
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id       uuid;
  token        text;
  v_lead_score int;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) < 1 THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE = 'P0001';
  END IF;
  IF p_phone IS NULL OR length(regexp_replace(p_phone, '\D', '', 'g')) < 7 THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = 'P0001';
  END IF;

  -- Extract lead_score from roi_data if present
  v_lead_score := COALESCE((p_roi_data->>'lead_score')::int, 0);

  -- Generate a unique report token (32 hex chars) using built-in uuid function
  token := replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.leads (
    name,
    email,
    phone,
    marketing_consent,
    result_pattern,
    result_snapshot,
    roi_data,
    lead_score,
    report_token,
    lead_status,
    lead_source,
    completed_at
  )
  VALUES (
    trim(p_name),
    CASE WHEN p_email IS NOT NULL AND length(trim(p_email)) > 0
      THEN lower(trim(p_email))
      ELSE NULL
    END,
    trim(p_phone),
    COALESCE(p_marketing_consent, true),
    COALESCE(p_short_result_id, p_roi_data->>'result_type'),
    jsonb_build_object(
      'quiz_type',   'roi_calculator',
      'result_id',   COALESCE(p_short_result_id, p_roi_data->>'result_type'),
      'answers',     p_answers_json,
      'user_name',   trim(p_name)
    ),
    p_roi_data,
    v_lead_score,
    token,
    'new',
    'landing_page',
    now()
  )
  RETURNING id INTO new_id;

  RETURN token;
END;
$$;

-- Re-grant permissions
REVOKE ALL ON FUNCTION public.create_short_quiz_lead(text, text, text, text, jsonb, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_short_quiz_lead(text, text, text, text, jsonb, boolean, jsonb) TO anon, authenticated;

COMMENT ON FUNCTION public.create_short_quiz_lead(text, text, text, text, jsonb, boolean, jsonb) IS
  'Creates an ROI-calculator lead (phone required, email optional). Tags lead_source=landing_page. Returns report_token.';
