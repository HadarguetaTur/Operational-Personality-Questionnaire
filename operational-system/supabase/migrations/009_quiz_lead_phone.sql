-- ============================================================
-- 009: Add optional phone to create_quiz_lead RPC
-- Run via Supabase CLI or SQL Editor after migration 007.
-- ============================================================

DROP FUNCTION IF EXISTS public.create_quiz_lead(text, text, boolean);

CREATE OR REPLACE FUNCTION public.create_quiz_lead(
  p_name text,
  p_email text,
  p_marketing_consent boolean,
  p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) < 1 THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE = 'P0001';
  END IF;
  IF p_email IS NULL OR length(trim(p_email)) < 3 OR position('@' in trim(p_email)) < 2 THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.leads (name, email, marketing_consent, phone)
  VALUES (
    trim(p_name),
    lower(trim(p_email)),
    coalesce(p_marketing_consent, false),
    nullif(trim(coalesce(p_phone, '')), '')
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_quiz_lead(text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_quiz_lead(text, text, boolean, text) TO anon, authenticated;

COMMENT ON FUNCTION public.create_quiz_lead(text, text, boolean, text) IS 'Creates a quiz lead with optional phone; used instead of anon INSERT on leads.';
