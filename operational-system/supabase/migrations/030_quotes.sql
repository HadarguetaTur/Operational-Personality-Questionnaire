-- ============================================================
-- Migration 030: Manual leads + price quotes + remote e-signature
-- RUN THIS IN SUPABASE SQL EDITOR after 029
-- ============================================================
--
-- Adds:
--   * lead_source 'manual' (leads created by hand in the admin)
--   * lead_status 'quote_sent' | 'quote_signed'
--   * quotes             — one row per price quote (draft → sent → signed → paid)
--   * quote_signatures   — audit trail for each remote signature
--   * quote_catalog_items — structured price list the AI quote generator draws from
--
-- Storage: PDFs and signature images live in the existing PRIVATE bucket
-- `documents` under quotes/{quoteId}/... (see supabase/STORAGE_DOCUMENTS.md).

-- ---- leads: allow manual source + quote statuses ----
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_lead_source_check
  CHECK (lead_source IS NULL OR lead_source IN (
    'instagram', 'facebook', 'landing_page', 'whatsapp', 'manual'
  ));

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_lead_status_check
  CHECK (lead_status IN (
    'new', 'in_progress', 'completed', 'paid', 'followup_sent', 'meeting_booked',
    'meeting_completed', 'awaiting_quote', 'awaiting_diagnostic', 'meeting_cancelled',
    'quote_sent', 'quote_signed'
  ));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS business_name TEXT;

-- ---- quotes ----
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1001;

CREATE TABLE IF NOT EXISTS quotes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                 UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  quote_number            INT NOT NULL DEFAULT nextval('quote_number_seq'),
  status                  TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'paid', 'declined', 'expired')),

  -- Document content (all editable by the admin before sending)
  title                   TEXT NOT NULL DEFAULT 'הצעת מחיר',
  client_name             TEXT,
  client_business         TEXT,
  client_email            TEXT,
  client_phone            TEXT,
  intro                   TEXT,
  scope_items             JSONB NOT NULL DEFAULT '[]',  -- [{ title, description }]
  line_items              JSONB NOT NULL DEFAULT '[]',  -- [{ title, description, qty, unit_price }]
  subtotal                NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate                NUMERIC(5,2)  NOT NULL DEFAULT 18,
  vat_amount              NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency                TEXT NOT NULL DEFAULT 'ILS',
  payment_terms           TEXT,
  timeline                TEXT,
  terms                   TEXT,
  valid_until             DATE,

  -- AI interview that produced the draft
  interview_transcript    JSONB,   -- [{ role, content }]
  collected_facts         JSONB,   -- interviewer's structured notes
  ai_summary              TEXT,

  -- Public access + files
  access_token            TEXT UNIQUE,
  pdf_storage_path        TEXT,
  signed_pdf_storage_path TEXT,
  document_sha256         TEXT,

  -- Lifecycle
  sent_at                 TIMESTAMPTZ,
  viewed_at               TIMESTAMPTZ,
  signed_at               TIMESTAMPTZ,
  paid_at                 TIMESTAMPTZ,
  payment_transaction_id  TEXT,
  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_lead ON quotes(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_access_token ON quotes(access_token) WHERE access_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_number ON quotes(quote_number);

-- ---- quote_signatures (audit trail) ----
CREATE TABLE IF NOT EXISTS quote_signatures (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id             UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  signer_name          TEXT NOT NULL,
  signer_email         TEXT,
  signer_id_number     TEXT,
  signature_image_path TEXT NOT NULL,
  consent_text         TEXT NOT NULL,
  ip                   TEXT,
  user_agent           TEXT,
  document_sha256      TEXT,
  signed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_signatures_quote ON quote_signatures(quote_id);

-- ---- quote_catalog_items (price list for the generator) ----
CREATE TABLE IF NOT EXISTS quote_catalog_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT,
  unit          TEXT NOT NULL DEFAULT 'project',   -- project | hour | month | item
  default_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_price     NUMERIC(12,2),
  max_price     NUMERIC(12,2),
  active        BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed from the ranges already in the bot's product knowledge (botPromptDefaults.product)
INSERT INTO quote_catalog_items (name, description, category, unit, default_price, min_price, max_price, sort_order)
SELECT * FROM (VALUES
  ('שיחת אפיון', '60 דקות עם הדר. מיפוי התהליך ומפת אוטומציה כתובה ומתועדפת. מתקזז במלואו מפרויקט.', 'שירותים', 'item', 350, 350, 350, 10),
  ('בוט מכירות / ניהול לידים ב-WhatsApp', 'מערכת אוטומטית שמנהלת פניות WhatsApp מרגע הכניסה ועד שיחת מכירה. כולל אפיון, הקמה, חיבור ל-CRM והדרכה.', 'פרויקטים', 'project', 2500, 500, 4500, 20),
  ('פרויקט אוטומציה מלא', 'מיפוי תהליכים, בניית אוטומציות בין המערכות, הטמעה והדרכה.', 'פרויקטים', 'project', 8000, 5000, 15000, 30),
  ('שעת פיתוח / התאמות', 'עבודה לפי שעה להתאמות, שינויים ותוספות מעבר להיקף.', 'שירותים', 'hour', 350, 250, 450, 40),
  ('תחזוקה ותמיכה חודשית', 'ניטור, תיקונים שוטפים ועדכונים קטנים.', 'ריטיינר', 'month', 500, 300, 1500, 50)
) AS v(name, description, category, unit, default_price, min_price, max_price, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM quote_catalog_items);

-- ---- Quote document settings (business details printed on every quote) ----
INSERT INTO system_settings (key, value) VALUES
  ('quote_settings', '{
    "business_name": "הדר תורג׳מן — אוטומציות לעסקים",
    "business_id": "",
    "business_id_label": "עוסק מורשה",
    "address": "",
    "phone": "",
    "email": "",
    "logo_url": "",
    "vat_rate": 18,
    "validity_days": 14,
    "default_payment_terms": "50% מקדמה עם החתימה, 50% עם המסירה.",
    "default_terms": "ההצעה כוללת את ההיקף המפורט בלבד. שינויים והרחבות מעבר להיקף יתומחרו בנפרד לאחר תיאום. זמני הביצוע מותנים בקבלת כל החומרים והגישות הנדרשים מהלקוח/ה. התשלום באמצעות העברה בנקאית או כרטיס אשראי דרך קישור מאובטח.",
    "signature_consent": "אני מאשר/ת כי קראתי את הצעת המחיר על כל סעיפיה, ומסכים/ה לתנאיה. חתימתי האלקטרונית מהווה הסכמה מחייבת."
  }')
ON CONFLICT (key) DO NOTHING;

-- ---- updated_at triggers ----
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quotes_updated_at ON quotes;
CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_quote_catalog_updated_at ON quote_catalog_items;
CREATE TRIGGER trg_quote_catalog_updated_at BEFORE UPDATE ON quote_catalog_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---- RLS: admins only. Public quote page goes through Next.js API (service role + access_token). ----
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_quotes_all" ON quotes;
CREATE POLICY "admin_quotes_all" ON quotes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_quote_signatures_all" ON quote_signatures;
CREATE POLICY "admin_quote_signatures_all" ON quote_signatures
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_quote_catalog_all" ON quote_catalog_items;
CREATE POLICY "admin_quote_catalog_all" ON quote_catalog_items
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

COMMENT ON TABLE quotes IS 'Price quotes: AI-drafted, admin-edited, sent by email, signed remotely at /q/[access_token].';
COMMENT ON TABLE quote_signatures IS 'Audit trail of remote e-signatures (who, when, from where, document hash).';
COMMENT ON TABLE quote_catalog_items IS 'Structured price list the quote generator draws from.';
