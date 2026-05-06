-- ============================================================
-- PDF generation columns + storage bucket for reports
-- ============================================================
-- מוסיף שלושה שדות לטבלת leads למעקב אחר הפקת ה-PDF, ומקים bucket
-- ב-Storage לאחסון קבצי הדוח.
-- ============================================================
-- איך להריץ: Supabase Dashboard → SQL Editor → New query → הדבק והרץ.
-- ============================================================

-- 1. עמודות ב-leads
alter table public.leads
  add column if not exists report_pdf_url text,
  add column if not exists report_pdf_status text,
  add column if not exists report_pdf_generated_at timestamptz;

comment on column public.leads.report_pdf_url is 'URL ציבורי לדוח PDF שנוצר (ב-Storage bucket reports). NULL כל עוד לא הופק.';
comment on column public.leads.report_pdf_status is 'מצב הפקת PDF: pending/generating/ready/failed/unconfigured';
comment on column public.leads.report_pdf_generated_at is 'מתי ה-PDF הופק בהצלחה (NULL אם נכשל או לא הופק עדיין)';

-- 2. Storage bucket
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do nothing;

-- 3. RLS policy לקריאה אנונימית של דוחות מה-bucket
drop policy if exists "Public read of report PDFs" on storage.objects;
create policy "Public read of report PDFs"
on storage.objects for select to anon
using (bucket_id = 'reports');

-- כתיבה רק לפי service-role key (Edge Function generate-pdf) — לא נדרש policy
-- מפורש כי service-role עוקף RLS.
