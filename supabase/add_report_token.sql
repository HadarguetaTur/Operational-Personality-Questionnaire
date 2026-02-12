-- ============================================================
-- הוספת עמודת report_token לטבלת leads
-- ============================================================
-- הרץ אחרי leads_table.sql
-- Supabase Dashboard → SQL Editor → New query → הדבק והרץ
-- ============================================================

alter table public.leads
  add column if not exists report_token text unique;

create unique index if not exists idx_leads_report_token
  on public.leads (report_token)
  where report_token is not null;
