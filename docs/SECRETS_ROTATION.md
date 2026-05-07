# Secret rotation & storage (launch checklist)

If real credentials were ever stored in a tracked file, a shared machine, or chat: **rotate them** and treat them as compromised.

## 1. Supabase database password

1. Supabase Dashboard → **Project Settings** → **Database** → reset / rotate the database password.
2. Update only **server-side** tooling that connects with the DB password (e.g. CLI, migration tools). **Never** put `SUPABASE_DB_PASSWORD` in `VITE_*` or client bundles.
3. Prefer **`.env.local`** (gitignored) over `.env` for local dev.

## 2. Make.com API key

1. Make.com → regenerate the API key for the organization.
2. Store it in **Supabase Edge Function secrets** (or another server-only secret store), **not** in the Vite app's public env vars.
3. Remove any old key from local `.env` files after rotation.

## 3. Keys that must stay server-only

| Secret | Where it belongs |
|--------|------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env (Next), `.env.local`, never client |
| `SUMIT_WEBHOOK_SECRET` | Vercel env — **required** for Sumit webhook validation |
| `REPORT_SEND_SECRET` | Vercel env — optional header auth for automated report sends |
| `TWILIO_*`, `GOOGLE_*` | Vercel env |

## 4. Operational checklist

- [ ] Rotated `SUPABASE_DB_PASSWORD` after any exposure.
- [ ] Rotated `MAKE_API_KEY` after any exposure; configured in Supabase Secrets / backend only.
- [ ] Confirmed `SUMIT_WEBHOOK_SECRET` is set in Vercel Production.
- [ ] Confirmed `NEXT_PUBLIC_APP_URL` (Next) and `VITE_PUBLIC_APP_URL` (quiz) match production hosts (no trailing slash).
