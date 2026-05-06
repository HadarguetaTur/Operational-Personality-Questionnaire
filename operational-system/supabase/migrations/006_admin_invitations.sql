-- ============================================================
-- Migration 006: Admin invitations + password resets
-- ============================================================
-- Run this in Supabase Dashboard → SQL Editor.
-- Idempotent (safe to re-run).
-- ============================================================

-- ---- Admin invitations ----
CREATE TABLE IF NOT EXISTS admin_invitations (
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

-- Only one pending invitation per email at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_invitations_pending_email
  ON admin_invitations (LOWER(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_admin_invitations_token
  ON admin_invitations (token);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_status
  ON admin_invitations (status);

ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_invitations_all" ON admin_invitations;
CREATE POLICY "admin_invitations_all" ON admin_invitations
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---- Password resets ----
CREATE TABLE IF NOT EXISTS password_resets (
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

CREATE INDEX IF NOT EXISTS idx_password_resets_token
  ON password_resets (token);

CREATE INDEX IF NOT EXISTS idx_password_resets_user
  ON password_resets (user_id, status);

ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "password_resets_admin" ON password_resets;
CREATE POLICY "password_resets_admin" ON password_resets
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
