-- ============================================================
-- מעקב אחר נטישת שאלון – זיהוי לידים קרים
-- ============================================================
-- הרץ אחרי leads_table.sql
-- Supabase Dashboard → SQL Editor → New query → הדבק והרץ
-- ============================================================

-- סטטוס ליד: new (מילא טופס), in_progress (התחיל שאלון), completed (סיים), cold_lead (נטש)
alter table public.leads
  add column if not exists lead_status text not null default 'new';

-- חותמת זמן של הפעילות האחרונה (מתעדכנת בכל תשובה)
alter table public.leads
  add column if not exists last_active_at timestamptz;

-- השאלה האחרונה שנענתה לפני הנטישה
alter table public.leads
  add column if not exists drop_off_question text;

-- אחוז התקדמות בשאלון (0-100)
alter table public.leads
  add column if not exists progress_percent integer default 0;

-- תשובות חלקיות – snapshot של מה שנענה עד כה
alter table public.leads
  add column if not exists partial_answers jsonb;

-- אינדקס לסינון מהיר לפי סטטוס
create index if not exists idx_leads_lead_status
  on public.leads (lead_status);

-- אינדקס לזיהוי לידים לא פעילים
create index if not exists idx_leads_last_active_at
  on public.leads (last_active_at desc)
  where lead_status = 'in_progress';

-- עדכון לידים קיימים: מי שכבר סיים → completed, מי שהתחיל ולא סיים → cold_lead
update public.leads set lead_status = 'completed' where completed_at is not null and lead_status = 'new';
update public.leads set lead_status = 'cold_lead'  where started_at is not null and completed_at is null and lead_status = 'new';

-- ============================================================
-- שאילתות שימושיות (לא חובה להריץ – לרפרנס)
-- ============================================================

-- כל הלידים שנטשו (התחילו ולא סיימו, לא פעילים 30+ דקות)
-- SELECT name, email, lead_status, drop_off_question, progress_percent, last_active_at
-- FROM leads
-- WHERE lead_status = 'in_progress'
--   AND last_active_at < now() - interval '30 minutes'
-- ORDER BY last_active_at DESC;

-- ============================================================
-- אופציונלי: pg_cron לסימון אוטומטי של לידים קרים
-- ============================================================
-- אם pg_cron מופעל בפרויקט, אפשר להריץ את זה:
--
-- select cron.schedule(
--   'mark-cold-leads',          -- שם הג'וב
--   '*/30 * * * *',             -- כל 30 דקות
--   $$
--     UPDATE public.leads
--     SET lead_status = 'cold_lead'
--     WHERE lead_status = 'in_progress'
--       AND last_active_at < now() - interval '30 minutes';
--   $$
-- );
