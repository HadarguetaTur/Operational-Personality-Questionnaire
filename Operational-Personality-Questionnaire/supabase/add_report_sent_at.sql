-- ============================================================
-- הוספת עמודת report_sent_at לטבלת leads
-- ============================================================
-- מונעת שליחה כפולה של דוח ל-Make.
-- הרץ אחרי leads_table.sql
-- Supabase Dashboard → SQL Editor → New query → הדבק והרץ
-- ============================================================

alter table public.leads
  add column if not exists report_sent_at timestamptz;

comment on column public.leads.report_sent_at is 'מתי נשלח הדוח ל-Make – משמש להגנת idempotency';
