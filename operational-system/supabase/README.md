# Supabase migrations

Run these **once**, in order, in the Supabase SQL Editor (see repository root **[`DEPLOY-VERCEL.md`](../DEPLOY-VERCEL.md)** for full deployment steps).

| Order | File |
|------:|------|
| 1 | `migrations/001_initial_schema.sql` |
| 2 | `migrations/002_run_in_supabase.sql` |
| 3 | `migrations/003_system_settings.sql` |
| 4 | `migrations/004_landing_analytics.sql` |
| 5 | `migrations/005_lead_attribution.sql` |
| 6 | `migrations/006_admin_invitations.sql` |

After migrations: copy **service_role** from Project Settings → API into `SUPABASE_SERVICE_ROLE_KEY` (Vercel / local `.env.local` only).
