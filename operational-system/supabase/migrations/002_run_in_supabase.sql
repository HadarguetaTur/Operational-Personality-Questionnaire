-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Go to: Supabase Dashboard → SQL Editor → New query → Paste & Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Funnels table (NEW)
-- ============================================================
CREATE TABLE IF NOT EXISTS funnels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnels_status ON funnels(status);

-- ============================================================
-- 2. Funnel stages table (NEW)
-- ============================================================
CREATE TABLE IF NOT EXISTS funnel_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('landing', 'questionnaire', 'payment', 'followup_form', 'meeting_booking', 'email')),
  "order" INT NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  email_template_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_stages_funnel ON funnel_stages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_stages_order ON funnel_stages(funnel_id, "order");

-- ============================================================
-- 3. Email templates table (NEW)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  html_content TEXT NOT NULL DEFAULT '',
  json_design JSONB,
  variables JSONB NOT NULL DEFAULT '{}',
  funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
  stage_trigger UUID REFERENCES funnel_stages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_funnel ON email_templates(funnel_id);

-- FK from funnel_stages.email_template_id -> email_templates.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stage_email_template') THEN
    ALTER TABLE funnel_stages
      ADD CONSTRAINT fk_stage_email_template
      FOREIGN KEY (email_template_id)
      REFERENCES email_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 4. Questionnaire configs table (NEW)
-- ============================================================
CREATE TABLE IF NOT EXISTS questionnaire_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES funnel_stages(id) ON DELETE CASCADE,
  questions JSONB NOT NULL DEFAULT '[]',
  scoring_config JSONB NOT NULL DEFAULT '{}',
  branching_rules JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_configs_funnel ON questionnaire_configs(funnel_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_questionnaire_configs_stage ON questionnaire_configs(stage_id);

-- ============================================================
-- 5. Leads table - ADD new columns to EXISTING table
-- ============================================================
-- These ALTER TABLE commands will add columns if they don't exist.
-- If leads table doesn't exist at all, create it first.
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT,
  result_pattern TEXT,
  result_scale_stage TEXT,
  result_top_metric TEXT,
  result_snapshot JSONB,
  report_token TEXT UNIQUE
);

-- Add new columns to existing leads table (safe - IF NOT EXISTS)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS current_stage_id UUID REFERENCES funnel_stages(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_transaction_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_submitted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS meeting_booked_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS drop_off_question TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS progress_percent INT DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS partial_answers JSONB;

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_funnel ON leads(funnel_id);
CREATE INDEX IF NOT EXISTS idx_leads_report_token ON leads(report_token);
CREATE INDEX IF NOT EXISTS idx_leads_payment_status ON leads(payment_status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ============================================================
-- 6. Documents table (NEW)
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES funnel_stages(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT,
  drive_url TEXT,
  drive_file_id TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_lead ON documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_funnel ON documents(funnel_id);

-- ============================================================
-- 7. Email logs table (NEW)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES funnel_stages(id) ON DELETE SET NULL,
  subject TEXT,
  recipient_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_lead ON email_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_funnel ON email_logs(funnel_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);

-- ============================================================
-- 8. Notification logs (NEW)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  recipient_phone TEXT NOT NULL,
  message_body TEXT,
  template_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  provider_message_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_lead ON notification_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

-- ============================================================
-- 9. Follow-up form submissions (NEW)
-- ============================================================
CREATE TABLE IF NOT EXISTS followup_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES funnel_stages(id) ON DELETE SET NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followup_submissions_lead ON followup_submissions(lead_id);

-- ============================================================
-- 10. Admin activity log (NEW)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_user ON admin_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created ON admin_activity_log(created_at DESC);

-- ============================================================
-- 11. Auto-update triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_funnels_updated_at ON funnels;
CREATE TRIGGER tr_funnels_updated_at
  BEFORE UPDATE ON funnels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_funnel_stages_updated_at ON funnel_stages;
CREATE TRIGGER tr_funnel_stages_updated_at
  BEFORE UPDATE ON funnel_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_email_templates_updated_at ON email_templates;
CREATE TRIGGER tr_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_questionnaire_configs_updated_at ON questionnaire_configs;
CREATE TRIGGER tr_questionnaire_configs_updated_at
  BEFORE UPDATE ON questionnaire_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 12. Row Level Security (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Admin check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        raw_user_meta_data->>'role' = 'admin'
        OR email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies first (safe re-run)
DROP POLICY IF EXISTS "admin_funnels_all" ON funnels;
DROP POLICY IF EXISTS "anon_funnels_read_active" ON funnels;
DROP POLICY IF EXISTS "admin_stages_all" ON funnel_stages;
DROP POLICY IF EXISTS "anon_stages_read" ON funnel_stages;
DROP POLICY IF EXISTS "admin_email_templates_all" ON email_templates;
DROP POLICY IF EXISTS "admin_questionnaire_configs_all" ON questionnaire_configs;
DROP POLICY IF EXISTS "anon_questionnaire_configs_read" ON questionnaire_configs;
DROP POLICY IF EXISTS "admin_leads_all" ON leads;
DROP POLICY IF EXISTS "service_leads_insert" ON leads;
DROP POLICY IF EXISTS "service_leads_update" ON leads;
DROP POLICY IF EXISTS "admin_documents_all" ON documents;
DROP POLICY IF EXISTS "service_documents_insert" ON documents;
DROP POLICY IF EXISTS "admin_email_logs_all" ON email_logs;
DROP POLICY IF EXISTS "service_email_logs_insert" ON email_logs;
DROP POLICY IF EXISTS "service_email_logs_update" ON email_logs;
DROP POLICY IF EXISTS "admin_notification_logs_all" ON notification_logs;
DROP POLICY IF EXISTS "service_notification_logs_insert" ON notification_logs;
DROP POLICY IF EXISTS "admin_followup_all" ON followup_submissions;
DROP POLICY IF EXISTS "anon_followup_insert" ON followup_submissions;
DROP POLICY IF EXISTS "admin_activity_log_all" ON admin_activity_log;

-- Funnels: admin full access, anon read active
CREATE POLICY "admin_funnels_all" ON funnels FOR ALL USING (is_admin());
CREATE POLICY "anon_funnels_read_active" ON funnels FOR SELECT USING (status = 'active');

-- Funnel stages
CREATE POLICY "admin_stages_all" ON funnel_stages FOR ALL USING (is_admin());
CREATE POLICY "anon_stages_read" ON funnel_stages FOR SELECT USING (
  is_active = true AND EXISTS (SELECT 1 FROM funnels WHERE funnels.id = funnel_stages.funnel_id AND funnels.status = 'active')
);

-- Email templates: admin only
CREATE POLICY "admin_email_templates_all" ON email_templates FOR ALL USING (is_admin());

-- Questionnaire configs
CREATE POLICY "admin_questionnaire_configs_all" ON questionnaire_configs FOR ALL USING (is_admin());
CREATE POLICY "anon_questionnaire_configs_read" ON questionnaire_configs FOR SELECT USING (
  EXISTS (SELECT 1 FROM funnels WHERE funnels.id = questionnaire_configs.funnel_id AND funnels.status = 'active')
);

-- Leads
CREATE POLICY "admin_leads_all" ON leads FOR ALL USING (is_admin());
CREATE POLICY "service_leads_insert" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "service_leads_update" ON leads FOR UPDATE USING (true);
CREATE POLICY "anon_leads_select" ON leads FOR SELECT USING (true);

-- Documents
CREATE POLICY "admin_documents_all" ON documents FOR ALL USING (is_admin());
CREATE POLICY "service_documents_insert" ON documents FOR INSERT WITH CHECK (true);

-- Email logs
CREATE POLICY "admin_email_logs_all" ON email_logs FOR ALL USING (is_admin());
CREATE POLICY "service_email_logs_insert" ON email_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "service_email_logs_update" ON email_logs FOR UPDATE USING (true);

-- Notification logs
CREATE POLICY "admin_notification_logs_all" ON notification_logs FOR ALL USING (is_admin());
CREATE POLICY "service_notification_logs_insert" ON notification_logs FOR INSERT WITH CHECK (true);

-- Follow-up submissions
CREATE POLICY "admin_followup_all" ON followup_submissions FOR ALL USING (is_admin());
CREATE POLICY "anon_followup_insert" ON followup_submissions FOR INSERT WITH CHECK (true);

-- Admin activity log
CREATE POLICY "admin_activity_log_all" ON admin_activity_log FOR ALL USING (is_admin());

-- ============================================================
-- 13. Seed default funnel
-- ============================================================
INSERT INTO funnels (name, description, status)
SELECT 'אבחון תפעולי',
       'משפך ברירת מחדל: שאלון אבחון → תוצאות → דף נחיתה → תשלום → טופס המשך → פגישה',
       'active'
WHERE NOT EXISTS (SELECT 1 FROM funnels WHERE name = 'אבחון תפעולי');

-- Add default stages for the diagnostic funnel
DO $$
DECLARE
  v_funnel_id UUID;
BEGIN
  SELECT id INTO v_funnel_id FROM funnels WHERE name = 'אבחון תפעולי' LIMIT 1;
  
  IF v_funnel_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM funnel_stages WHERE funnel_id = v_funnel_id) THEN
    INSERT INTO funnel_stages (funnel_id, name, type, "order", config) VALUES
      (v_funnel_id, 'שאלון אבחוני', 'questionnaire', 1, '{"description": "שאלון אישיות תפעולית"}'),
      (v_funnel_id, 'דף נחיתה מותאם', 'landing', 2, '{"description": "דף נחיתה עם תוצאות מותאמות"}'),
      (v_funnel_id, 'תשלום', 'payment', 3, '{"description": "תשלום דרך Sumit"}'),
      (v_funnel_id, 'טופס המשך', 'followup_form', 4, '{"description": "טופס עם מסמכים נלווים"}'),
      (v_funnel_id, 'קביעת פגישה', 'meeting_booking', 5, '{"description": "קביעת פגישת ייעוץ דרך Cal.com"}'),
      (v_funnel_id, 'מייל סיכום', 'email', 6, '{"description": "מייל סיכום עם לינק לפגישה"}');
  END IF;
END $$;

-- ============================================================
-- DONE! Refresh your admin dashboard.
-- ============================================================
