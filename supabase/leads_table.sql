-- ============================================================
-- טבלת לידים – אבחון Architecture of Scale
-- ============================================================
-- איך להריץ: Supabase Dashboard → SQL Editor → New query → הדבק והרץ (Run)
-- ============================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds numeric,
  result_pattern text,
  result_scale_stage text,
  result_top_metric text,
  result_snapshot jsonb,
  report_token text unique
);

-- מנגנון אבטחה (RLS)
alter table public.leads enable row level security;

-- הסרת policy קיימים אם רצים שוב (למקרה של עדכון)
drop policy if exists "Allow anon insert" on public.leads;
drop policy if exists "Allow anon update by id" on public.leads;
drop policy if exists "Allow anon select" on public.leads;

create policy "Allow anon insert" on public.leads
  for insert to anon with check (true);

create policy "Allow anon update by id" on public.leads
  for update to anon using (true) with check (true);

create policy "Allow anon select" on public.leads
  for select to anon using (true);

-- אינדקסים לשימוש נוח
create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_leads_email on public.leads (email);
create index if not exists idx_leads_completed_at on public.leads (completed_at desc) where completed_at is not null;

comment on table public.leads is 'לידים מאבחון Architecture of Scale – פרטים, הסכמה לדיוור, תוצאה ומשך';
