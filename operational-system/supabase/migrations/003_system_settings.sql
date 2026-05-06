-- ============================================================
-- Migration 003: System Settings table
-- RUN THIS IN SUPABASE SQL EDITOR after 002
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_settings_all" ON system_settings;
CREATE POLICY "admin_settings_all" ON system_settings FOR ALL USING (is_admin());

-- Seed default settings
INSERT INTO system_settings (key, value) VALUES
  ('general', '{"admin_email": "", "calcom_url": "", "company_name": "ארכיטקטורת סקייל"}'),
  ('notifications', '{"email_on_new_lead": true, "email_on_payment": true, "email_on_followup": true}'),
  ('email_defaults', '{"from_name": "ארכיטקטורת סקייל", "reply_to": ""}')
ON CONFLICT (key) DO NOTHING;
