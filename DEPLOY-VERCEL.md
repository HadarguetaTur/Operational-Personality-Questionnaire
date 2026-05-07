# פריסה ל־Vercel — מדריך צעד־אחר־צעד

מסמך זה מתייחס לפרויקט ה־Next.js (`operational-system`) בלבד: דף נחיתה, שאלון אבחון בנתיב `/quiz`, אדמין ו־API. **אל תוסיפו מפתחות או סיסמאות ל־Git.**

## 1. Supabase (פרודקשן)

**פרויקט:** `betqmjxvinyqicmqgrmt` (או הפרויקט הפעיל שלכם).

### הרצת מיגרציות (בסדר מספרי הקבצים)

ב־**SQL Editor** של Supabase, הריצו **פעם אחת** ובסדר:

1. `operational-system/supabase/migrations/001_initial_schema.sql`
2. `operational-system/supabase/migrations/002_run_in_supabase.sql`
3. `operational-system/supabase/migrations/003_system_settings.sql`
4. `operational-system/supabase/migrations/004_landing_analytics.sql` — נדרש ל־`landing_events` בדף הנחיתה
5. `operational-system/supabase/migrations/005_lead_attribution.sql`
6. `operational-system/supabase/migrations/006_admin_invitations.sql`
7. `operational-system/supabase/migrations/007_leads_rls_followup_token.sql` — RLS מחוזק ל־`leads`, טוקן המשך, RPC לשאלון (`create_quiz_lead`, `get_lead_for_report`)

לאחר ההתקנה בדקו שה־bucket `documents` **פרטי** — ראו [`supabase/STORAGE_DOCUMENTS.md`](operational-system/supabase/STORAGE_DOCUMENTS.md).

### מפתח service role

1. Dashboard → **Project Settings** → **API**
2. העתיקו את **service_role** (לא את ה־anon).
3. שמרו אותו רק ב־**Vercel → Environment Variables** כ־`SUPABASE_SERVICE_ROLE_KEY` (ועותק מקומי ב־`.env.local` לפיתוח).
4. **לעולם** אל תשתפו את המפתח הזה ב־Git או בצד לקוח.

### Auth — כתובות הפניה (Redirect URLs)

ב־**Authentication** → **URL Configuration**:

- **Site URL:** הדומיין הציבורי שלכם (למשל `https://hadarturgemanautomations.com`)
- **Redirect URLs:** הוסיפו לפחות את דומיין האתר + נתיבי האדמין (`/admin/**`)

### וידוא מהיר אחרי המיגרציות

- קיימת טבלה `landing_events` (מיגרציה 004).
- RLS מופעל בהתאם לקבצים — אם יש שגיאות insert מהדף הציבורי, בדקו מדיניות `anon_insert_landing_events`.

---

## 2. Google OAuth ל־Gmail (טופס "צור קשר")

נדרש ל־`/api/contact` ([`operational-system/src/app/api/contact/route.ts`](operational-system/src/app/api/contact/route.ts)).

1. **Google Cloud Console** → פרויקט → **APIs & Services** → הפעילו **Gmail API**.
2. **Credentials** → OAuth 2.0 Client ID (סוג **Web application**).
3. הוסיפו **Authorized redirect URIs** בהתאם לזרימת ההשגה של ה־refresh token (למשל OAuth Playground).
4. השיגו (פעם אחת):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN` (דרך OAuth Playground או סקריפט מאושר)
5. `GMAIL_SENDER_ADDRESS` — כתובת השולח שאושרה ב־OAuth.

הזינו את הערכים ב־Vercel (וגם מקומית ב־`.env.local` לבדיקות).

---

## 3. Git ו־GitHub

**מבנה:** אפליקציה אחת תחת `operational-system/` (שאלון בנתיב `/quiz` באותו דומיין).

- ודאו ש־`.gitignore` מכסה: `**/.env`, `**/.env.local`, `**/node_modules`, `**/.next`.
- **לפני** `git push`: `git status` — ודאו שאין קבצי `.env` עם סודות.

---

## 4. Vercel — פרויקט Next.js יחיד (`operational-system`)

1. **New Project** → Import מהריפו.
2. **Root Directory:** `operational-system`
3. **Framework Preset:** Next.js.
4. **Build & Development Settings** (חשוב אחרי מיגרציה מ־Vite):  
   **Project → Settings → Build and Deployment** — ודאו שאין Override ישן:
   - **Build Command:** השאירו ריק (ברירת המחדל של Next), או **`npm run build`**.  
     אם רשום **`vite build`** — מחקו והשאירו ריק / עדכנו כמו למעלה ושמרו.
   - **Install Command:** בדרך כלל ריק (`npm install`), אלא אם אתם יודעים שצריך אחרת.
   - **Output Directory:** ריק ל־Next.js (לא `dist` של Vite).

### משתני סביבה (Production + Preview לפי הצורך)

| משתנה | הערה |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | מ־Supabase API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon בלבד (צד לקוח + שאלון) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role — **שרת בלבד** |
| `NEXT_PUBLIC_APP_URL` | כתובת האתר ללא סלאש בסוף — **חובה** ל־OG, קישורי דוח במייל (`…/quiz/result/…`) |
| `ADMIN_EMAILS` | מופרד בפסיקים |
| `ADMIN_NOTIFICATION_EMAIL` | התראות |
| Gmail / Sumit / GA4 וכו׳ | ראו [`operational-system/.env.example`](operational-system/.env.example) |

**חשוב:** אין עוד `NEXT_PUBLIC_QUIZ_URL` ואין פרויקט Vite נפרד. מחקו מפרויקט Vercel ישן כל משתנה כזה אם נשאר ממיגרציה קודמת.

5. **Domains:** חברו את הדומיין הציבורי (למשל `hadarturgemanautomations.com` ו־`www`).
6. אם היה פרויקט Vercel נפרד לשאלון (`quiz.*`) — ניתן למחוק אותו ולבטל את תת־הדומיין.

---

## 5. Troubleshooting

### Root Directory לא קיים

אם הבילד נכשל עם הודעה כמו  
`The specified Root Directory "Operational-Personality-Questionnaire" does not exist`:

1. ב־Vercel: **Project → Settings → General**.
2. בשדה **Root Directory** החליפו ל־**`operational-system`** (בלי סלאש בתחילה/סוף).
3. **Save**, ואז **Deployments → … → Redeploy** (או דחיפת commit חדש).

אם נשאר פרויקט Vercel נפרד לשאלון הישן — עדכנו אותו באותו אופן או מחקו אותו וחברו רק פרויקט אחד לריפו.

### `vite: command not found` / `vite build` exited with 127

הפרויקט כבר **לא** משתמש ב־Vite. השגיאה מגיעה כמעט תמיד מ־**Override ישן** בהגדרות Vercel:

1. **Project → Settings → Build and Deployment**.
2. תחת **Build Command** — אם מופיע **`vite build`**, לחצו **Edit** מחקו את הערך והשאירו ריק, או הגדירו **`npm run build`**.
3. תחת **Output Directory** — אם מוגדר משהו כמו `dist`, נקו את השדה (Next משרת מ־`.next`).
4. **Save** ו־**Redeploy**.

בקובץ [`operational-system/vercel.json`](operational-system/vercel.json) מוגדר `buildCommand`/`installCommand` תואמים Next — אם עדיין רואים `vite build`, זה כמעט תמיד כי ב־Dashboard עדיין יש Override (ההגדרות ב־UI גוברות על ברירות המחדל).

---

## 6. בדיקות אחרי פריסה (Smoke test)

- [ ] `https://<דומיין>/` נטען; וידאו ו־CTA עובדים.
- [ ] לחיצה על "להתחיל אבחון חינם" מובילה ל־`/quiz` (עם שמירת `?utm_*` אם היו).
- [ ] שליחת טופס האבחון → מעבר ל־`/quiz/diagnostic` → השלמה → `/quiz/result/<token>`.
- [ ] טופס **צור קשר** שולח מייל.
- [ ] ב־Supabase → `landing_events` מופיעים אירועים מביקור אמיתי.
- [ ] `/admin/login` עובד עם Redirect URLs שהוגדרו ב־Supabase Auth.

---

## קבצים רלוונטיים בקוד

- מטא־דאטה, GA4: [`operational-system/src/app/layout.tsx`](operational-system/src/app/layout.tsx)
- שאלון: [`operational-system/src/app/quiz/`](operational-system/src/app/quiz/)
- דוגמאות env: [`operational-system/.env.example`](operational-system/.env.example)
