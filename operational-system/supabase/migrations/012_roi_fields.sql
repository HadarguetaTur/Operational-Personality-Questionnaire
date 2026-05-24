-- ============================================================
-- 012: Add ROI calculator fields to leads table
-- Run via: Supabase Dashboard → SQL Editor → paste & run
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS roi_data   JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lead_score INT   DEFAULT 0;

-- roi_data shape:
-- {
--   "result_type":       "FOLLOWUP" | "TIME" | "COLLECTION" | "CENTRALIZED",
--   "accuracy_level":   "גבוהה" | "בינונית" | "נמוכה",
--   "confidence_notes": "string",
--   "show_cap_message": boolean,
--   "components": {
--     "time_cost_low", "time_cost_high",
--     "collection_cost_low", "collection_cost_high",
--     "opportunity_low", "opportunity_high",
--     "total_low", "total_high",
--     "efficiency_low", "efficiency_high"
--   },
--   "inputs": { ...raw answer values }
-- }

CREATE INDEX IF NOT EXISTS idx_leads_lead_score
  ON public.leads (lead_score);

CREATE INDEX IF NOT EXISTS idx_leads_roi_result_type
  ON public.leads ((roi_data->>'result_type'));

COMMENT ON COLUMN public.leads.roi_data IS
  'ROI calculator result: components, result_type, accuracy_level, lead_score inputs.';

COMMENT ON COLUMN public.leads.lead_score IS
  'Lead heat score 0–100 derived from ROI calculator (higher = closer to purchase).';
