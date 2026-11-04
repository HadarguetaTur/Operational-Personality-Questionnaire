-- ============================================================
-- Migration 031: Security lockdown
-- ============================================================
-- Context (security audit, 2026-11-04):
--   * The live DB never received migrations 006 and 007. `leads` still had
--     anon SELECT / INSERT / UPDATE policies with USING (true): anyone holding
--     the public anon key could read and modify every lead.
--   * is_admin() trusted raw_user_meta_data->>'role', which any signed-in user
--     can set on their own account via auth.updateUser().
--   * Several views / tables / functions were public and unused.
--   * Default grants gave anon + authenticated full DML on every public table
--     (RLS was the only barrier).
--
-- After this migration:
--   * Browser (anon) can only: read active funnels/stages/questionnaire
--     configs/guides, and insert analytics events. Everything else goes
--     through Next.js route handlers using the service role.
--   * Admin pages (authenticated) still work via is_admin() RLS policies.
--   * is_admin() trusts only app_metadata (server-controlled) and the
--     app.admin_emails setting.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Schema pieces of migration 007 that the live DB never received
--    (verified 2026-11-04: leads.followup_access_token missing,
--    email_logs.lead_id still NOT NULL). Used by /api/followup/metadata
--    and /api/email/send-bulk.
-- ------------------------------------------------------------
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS followup_access_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_followup_access_token
  ON public.leads (followup_access_token)
  WHERE followup_access_token IS NOT NULL;
ALTER TABLE public.email_logs ALTER COLUMN lead_id DROP NOT NULL;

-- ------------------------------------------------------------
-- 1. leads: remove every public / anon policy. Server code uses the service
--    role (bypasses RLS); the browser no longer touches this table.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Allow anon insert"        ON public.leads;
DROP POLICY IF EXISTS "anon_leads_no_select"     ON public.leads;
DROP POLICY IF EXISTS "anon_leads_no_insert"     ON public.leads;
DROP POLICY IF EXISTS "anon_leads_no_delete"     ON public.leads;
DROP POLICY IF EXISTS "Allow anon select"        ON public.leads;
DROP POLICY IF EXISTS "Allow anon update by id"  ON public.leads;
DROP POLICY IF EXISTS "anon_leads_select"        ON public.leads;
DROP POLICY IF EXISTS "anon_leads_insert"        ON public.leads;
DROP POLICY IF EXISTS "anon_leads_update"        ON public.leads;
DROP POLICY IF EXISTS "anon_leads_quiz_update"   ON public.leads;
DROP POLICY IF EXISTS "anon_leads_select_denied" ON public.leads;
DROP POLICY IF EXISTS "anon_leads_insert_denied" ON public.leads;
DROP POLICY IF EXISTS "anon_leads_delete_denied" ON public.leads;
DROP POLICY IF EXISTS "service_leads_insert"     ON public.leads;
DROP POLICY IF EXISTS "service_leads_update"     ON public.leads;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 2. Leftover "service_*" policies written without TO <role>: they applied to
--    anon as well. The service role bypasses RLS, so they are not needed.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "service_documents_insert"         ON public.documents;
DROP POLICY IF EXISTS "service_email_logs_insert"        ON public.email_logs;
DROP POLICY IF EXISTS "service_email_logs_update"        ON public.email_logs;
DROP POLICY IF EXISTS "service_notification_logs_insert" ON public.notification_logs;
DROP POLICY IF EXISTS "anon_followup_insert"             ON public.followup_submissions;
DROP POLICY IF EXISTS "service_role_all_bcs"             ON public.bot_conversation_state;
DROP POLICY IF EXISTS "service_role_all_ai_runs"         ON public.ai_runs;

-- ------------------------------------------------------------
-- 3. is_admin(): trust only server-controlled sources.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_list text;
  emails text[];
  jwt_role text;
  jwt_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- app_metadata can only be written with the service role (admin API).
  jwt_role  := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  IF jwt_role = 'admin' THEN
    RETURN true;
  END IF;

  admin_list := current_setting('app.admin_emails', true);
  IF admin_list IS NOT NULL AND btrim(admin_list) <> '' THEN
    emails := ARRAY(
      SELECT lower(btrim(x))
      FROM unnest(string_to_array(admin_list, ',')) AS t(x)
      WHERE btrim(x) <> ''
    );
    IF jwt_email <> '' AND jwt_email = ANY(emails) THEN
      RETURN true;
    END IF;
  END IF;

  -- Fallback for sessions whose JWT predates the app_metadata change.
  RETURN EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND coalesce(u.raw_app_meta_data ->> 'role', '') = 'admin'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- One-time data fix: move the admin role of existing admins into app_metadata
-- and strip the user-writable copy.
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE lower(email) IN ('hadart20@gmail.com', 'cs@hadarturgemanautomations.com')
   OR raw_user_meta_data ->> 'role' = 'admin';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE raw_user_meta_data ? 'role';

-- Pin search_path on the remaining functions (advisor: function_search_path_mutable).
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.update_bcs_updated_at()    SET search_path = '';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'claim_bot_turn') THEN
    EXECUTE 'ALTER FUNCTION public.claim_bot_turn(uuid, integer) SET search_path = public';
    EXECUTE 'REVOKE ALL ON FUNCTION public.claim_bot_turn(uuid, integer) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.claim_bot_turn(uuid, integer) TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'release_bot_turn') THEN
    EXECUTE 'ALTER FUNCTION public.release_bot_turn(uuid) SET search_path = public';
    EXECUTE 'REVOKE ALL ON FUNCTION public.release_bot_turn(uuid) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.release_bot_turn(uuid) TO service_role';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. Public / unused objects
-- ------------------------------------------------------------
DROP VIEW IF EXISTS public.visitor_funnel;              -- exposed lead name + email to anon
DROP VIEW IF EXISTS public.landing_funnel_daily;        -- unused
DROP VIEW IF EXISTS public.landing_funnel_by_source;    -- unused
DROP TABLE IF EXISTS public.landing_events_backup_20260701;  -- RLS off, stale backup
DROP TABLE IF EXISTS public.admin_activity_log;         -- never written by the app
DROP FUNCTION IF EXISTS public.create_quiz_lead(text, text, boolean, text);  -- unused, anon-executable
DROP FUNCTION IF EXISTS public.get_lead_for_report(text);                    -- returned whole lead row

-- guide_download_stats: used only by the admin API (service role).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'guide_download_stats') THEN
    EXECUTE 'ALTER VIEW public.guide_download_stats SET (security_invoker = true)';
  END IF;
END $$;

-- create_short_quiz_lead: now called only from /api/quiz/lead (service role).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'create_short_quiz_lead') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.create_short_quiz_lead(text, text, text, text, jsonb, boolean, jsonb) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_short_quiz_lead(text, text, text, text, jsonb, boolean, jsonb) TO service_role';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5. Table grants: stop relying on RLS alone. anon gets the bare minimum.
-- ------------------------------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Public read of funnel configuration + guides (existing read policies apply).
GRANT SELECT ON public.funnels, public.funnel_stages, public.questionnaire_configs, public.guides
  TO anon;
-- Public analytics inserts (existing insert policies apply).
GRANT INSERT ON public.landing_events, public.guide_download_events TO anon;

-- Signed-in admins use the browser client; RLS (is_admin()) gates every row.
-- `authenticated` keeps default DML grants, but the two service-role-only
-- tables are not exposed to it at all.
REVOKE ALL ON public.bot_conversation_state, public.ai_runs FROM anon, authenticated;
REVOKE ALL ON public.funnel_events, public.pending_followups FROM anon, authenticated;

-- Future tables created via the dashboard / migrations should not be
-- auto-granted to anon.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- ------------------------------------------------------------
-- 6. Migration 006 was never applied: admin invitations + password resets.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired','revoked')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_invitations_pending_email
  ON public.admin_invitations (LOWER(email)) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token  ON public.admin_invitations (token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON public.admin_invitations (status);
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_invitations_all" ON public.admin_invitations;
CREATE POLICY "admin_invitations_all" ON public.admin_invitations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
REVOKE ALL ON public.admin_invitations FROM anon;

CREATE TABLE IF NOT EXISTS public.password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','used','expired','revoked')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON public.password_resets (token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user  ON public.password_resets (user_id, status);
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "password_resets_admin" ON public.password_resets;
CREATE POLICY "password_resets_admin" ON public.password_resets
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
REVOKE ALL ON public.password_resets FROM anon;

-- ------------------------------------------------------------
-- 7. Private `documents` storage bucket (follow-up uploads). Only the service
--    role writes; admins read through short-lived signed URLs.
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "admin_read_documents_storage" ON storage.objects;
CREATE POLICY "admin_read_documents_storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin());
