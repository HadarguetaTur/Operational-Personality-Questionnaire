-- ============================================================
-- 007: Tighten leads RLS + follow-up access token + RPC helpers
-- Run via Supabase CLI or SQL Editor after previous migrations.
-- ============================================================

-- ---- Schema: follow-up gate + nullable lead on test email logs ----
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS followup_access_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_followup_access_token
  ON public.leads (followup_access_token)
  WHERE followup_access_token IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_logs' AND column_name = 'lead_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.email_logs ALTER COLUMN lead_id DROP NOT NULL;
  END IF;
END $$;

-- ---- Drop ALL existing policies on leads (names differ between legacy scripts) ----
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.leads', r.policyname);
  END LOOP;
END $$;

-- ---- RPC: create lead from quiz (anon cannot SELECT/INSERT table directly) ----
CREATE OR REPLACE FUNCTION public.create_quiz_lead(
  p_name text,
  p_email text,
  p_marketing_consent boolean
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

  INSERT INTO public.leads (name, email, marketing_consent)
  VALUES (
    trim(p_name),
    lower(trim(p_email)),
    coalesce(p_marketing_consent, false)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_quiz_lead(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_quiz_lead(text, text, boolean) TO anon, authenticated;

-- ---- RPC: fetch completed report by token (replaces anon SELECT on leads) ----
CREATE OR REPLACE FUNCTION public.get_lead_for_report(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(l)
  FROM public.leads l
  WHERE l.report_token IS NOT DISTINCT FROM p_token
    AND l.completed_at IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_lead_for_report(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lead_for_report(text) TO anon, authenticated;

-- ---- RLS policies on leads ----
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Admins (JWT) full access
CREATE POLICY "admin_leads_all" ON public.leads
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Quiz progress + completion (anon key from Vite app)
-- Allow updates only while not completed; allow transition to completed with report_token set.
CREATE POLICY "anon_leads_quiz_update" ON public.leads
  FOR UPDATE
  TO anon
  USING (completed_at IS NULL)
  WITH CHECK (
    completed_at IS NULL
    OR (
      completed_at IS NOT NULL
      AND report_token IS NOT NULL
      AND lead_status = 'completed'
    )
  );

-- Block direct table reads for anon (use get_lead_for_report + Next.js APIs for follow-up)
CREATE POLICY "anon_leads_no_select" ON public.leads
  FOR SELECT
  TO anon
  USING (false);

-- No direct INSERT for anon (use create_quiz_lead RPC)
CREATE POLICY "anon_leads_no_insert" ON public.leads
  FOR INSERT
  TO anon
  WITH CHECK (false);

-- No anon DELETE
CREATE POLICY "anon_leads_no_delete" ON public.leads
  FOR DELETE
  TO anon
  USING (false);

COMMENT ON FUNCTION public.create_quiz_lead(text, text, boolean) IS 'Creates a quiz lead; used instead of anon INSERT on leads.';
COMMENT ON FUNCTION public.get_lead_for_report(text) IS 'Returns lead row as jsonb for public report page; token must match and lead completed.';
