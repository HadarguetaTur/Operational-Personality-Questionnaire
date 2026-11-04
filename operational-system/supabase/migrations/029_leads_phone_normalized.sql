-- 029: normalized phone column on leads for cross-funnel identity matching
-- (quiz lead ↔ WhatsApp/ManyChat lead ↔ Sumit payment).
--
-- IMPORTANT: normalize_il_phone must stay in exact sync with normalizePhone()
-- in src/lib/phone.ts. Shared test vectors:
--   '050-1234567'      → '0501234567'
--   '+972 50-123 4567' → '0501234567'
--   '972501234567'     → '0501234567'
--   '501234567'        → '0501234567'
--   'abc'              → NULL

CREATE OR REPLACE FUNCTION normalize_il_phone(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p IS NULL THEN NULL
    WHEN length(regexp_replace(p, '\D', '', 'g')) < 7 THEN NULL
    WHEN regexp_replace(p, '\D', '', 'g') LIKE '972%'
      THEN '0' || substring(regexp_replace(p, '\D', '', 'g') FROM 4)
    WHEN regexp_replace(p, '\D', '', 'g') LIKE '0%'
      THEN regexp_replace(p, '\D', '', 'g')
    ELSE '0' || regexp_replace(p, '\D', '', 'g')
  END
$$;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT
  GENERATED ALWAYS AS (normalize_il_phone(phone)) STORED;

CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized
  ON leads(phone_normalized)
  WHERE phone_normalized IS NOT NULL;
