-- ============================================================
-- Migration 008: Align is_admin() with app middleware
-- RUN IN SUPABASE SQL EDITOR after 007
--
-- Problem: Next.js middleware grants admin access when ADMIN_EMAILS
-- (env) matches OR user_metadata.role === 'admin'. The OLD is_admin()
-- only checked DB user_metadata + Postgres setting app.admin_emails.
-- Manual logins listed only in ADMIN_EMAILS could pass middleware but fail
-- RLS on landing_events → empty dashboard while rows exist in the table.
--
-- This migration:
-- 1. Treats raw_app_meta_data->>'role' = 'admin' like user_metadata.role
-- 2. Parses app.admin_emails safely (comma-separated), case-insensitive match
--
-- IMPORTANT: Duplicate your Vercel ADMIN_EMAILS into Postgres so RLS stays in sync:
--   ALTER DATABASE postgres SET app.admin_emails TO 'cs@example.com,other@example.com';
-- Or set on the project's pooler role as documented in Supabase.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_list text;
  emails text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  admin_list := current_setting('app.admin_emails', true);
  IF admin_list IS NOT NULL AND btrim(admin_list) <> '' THEN
    emails := ARRAY(
      SELECT lower(btrim(x))
      FROM unnest(string_to_array(admin_list, ',')) AS t(x)
      WHERE btrim(x) <> ''
    );
  ELSE
    emails := ARRAY[]::text[];
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND (
        u.raw_user_meta_data->>'role' = 'admin'
        OR coalesce(u.raw_app_meta_data->>'role', '') = 'admin'
        OR lower(u.email) = ANY(emails)
      )
  );
END;
$$;
