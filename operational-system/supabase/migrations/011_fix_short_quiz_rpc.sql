-- ============================================================
-- 011: Fix create_short_quiz_lead
--
-- Fixes:
-- 1. Replace gen_random_bytes(16) (requires pgcrypto) with
--    gen_random_uuid() which is built-in since PostgreSQL 13.
-- 2. Make leads.email nullable so short-quiz leads (phone-first)
--    can omit email without inserting an empty string.
-- 3. Insert NULL for email when not provided instead of ''.
--
-- Run via: Supabase Dashboard → SQL Editor → paste & run
-- ============================================================

-- Allow email to be omitted on new short-quiz leads
ALTER TABLE public.leads ALTER COLUMN email DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.create_short_quiz_lead(
  p_name            text,
  p_phone           text,
  p_email           text    DEFAULT NULL,
  p_short_result_id text    DEFAULT NULL,
  p_answers_json    jsonb   DEFAULT NULL,
  p_marketing_consent boolean DEFAULT true
)
RETURNS text  -- returns report_token
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id  uuid;
  token   text;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) < 1 THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE = 'P0001';
  END IF;
  IF p_phone IS NULL OR length(regexp_replace(p_phone, '\D', '', 'g')) < 7 THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = 'P0001';
  END IF;

  -- gen_random_uuid() is built-in (PostgreSQL 13+), no extension required
  token := replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.leads (
    name,
    email,
    phone,
    marketing_consent,
    result_pattern,
    result_snapshot,
    report_token,
    lead_status,
    completed_at
  )
  VALUES (
    trim(p_name),
    NULLIF(lower(trim(coalesce(p_email, ''))), ''),
    trim(p_phone),
    coalesce(p_marketing_consent, true),
    p_short_result_id,
    jsonb_build_object(
      'quiz_type',  'short',
      'result_id',  p_short_result_id,
      'answers',    p_answers_json,
      'user_name',  trim(p_name)
    ),
    token,
    'new',
    now()
  )
  RETURNING id INTO new_id;

  RETURN token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_short_quiz_lead(text, text, text, text, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_short_quiz_lead(text, text, text, text, jsonb, boolean) TO anon, authenticated;

COMMENT ON FUNCTION public.create_short_quiz_lead IS
  'Creates a short-quiz lead (phone required, email optional). Returns report_token.';
