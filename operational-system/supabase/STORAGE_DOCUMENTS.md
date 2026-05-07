# Storage bucket: `documents`

Follow-up uploads and admin access should assume this bucket is **private**.

1. **Supabase Dashboard** → **Storage** → bucket `documents` → **Public bucket: off**.
2. Clients do **not** call `getPublicUrl` for sensitive uploads. The Next app uploads via service role where needed, and admins open files via `POST /api/admin/documents/sign-url` (short-lived signed URL).
3. Older rows may still have a legacy `file_url` populated; the admin UI falls back to that when `storage_path` is empty.
