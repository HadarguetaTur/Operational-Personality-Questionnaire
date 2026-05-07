# Legacy Supabase SQL

**Do not run these on production** unless you fully understand the historical context.

- `leads_table.sql` — early minimal `leads` table with **overly permissive RLS** (`anon` insert/update/select with `true`). The canonical schema and security model live in `operational-system/supabase/migrations/` (see `001_initial_schema.sql` and later migrations such as `007_leads_rls_followup_token.sql`).

Use the **Next app migrations** as the single source of truth for `leads`, RLS, and RPCs (`create_quiz_lead`, `get_lead_for_report`).
