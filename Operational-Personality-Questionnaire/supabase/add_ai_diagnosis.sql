-- ============================================================
-- AI diagnosis columns for leads
-- ============================================================
-- מוסיף שני שדות JSONB לטבלת leads:
--  ai_diagnosis      – פלט מובנה מ-OpenRouter (executive summary אישי,
--                      דפוס סמוי, ראיות מותאמות, תוכנית 30/60/90...)
--  ai_diagnosis_meta – מטא לבקרה: מודל, ספק, tokens, עלות, חתימת זמן
-- ============================================================
-- איך להריץ: Supabase Dashboard → SQL Editor → New query → הדבק והרץ.
-- ============================================================

alter table public.leads
  add column if not exists ai_diagnosis jsonb,
  add column if not exists ai_diagnosis_meta jsonb;

comment on column public.leads.ai_diagnosis is 'פלט אבחנת AI על דוח האבחון – JSON עם executive summary אישי, דפוס סמוי, ראיות, תוכנית 30/60/90';
comment on column public.leads.ai_diagnosis_meta is 'מטא של קריאת ה-AI: מודל בפועל, ספק, tokens, עלות USD, זמן הפקה';
