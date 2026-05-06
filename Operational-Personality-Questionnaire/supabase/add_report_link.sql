-- ============================================================
-- הוספת עמודת report_link לטבלת leads (לינק ציבורי לדוח – לאימיילים/וובхуוקים)
-- ============================================================
-- הרץ אחרי leads_table.sql ו-add_report_token.sql
-- Supabase Dashboard → SQL Editor → New query → הדבק והרץ
-- ============================================================

alter table public.leads
  add column if not exists report_link text;
