# פריסה ל־Vercel — מדריך צעד־אחר־צעד

מסמך זה משלים את פרויקט ה־Next (`operational-system`) ואת שאלון ה־Vite (`Operational-Personality-Questionnaire`). **אל תוסיפו מפתחות או סיסמאות ל־Git.**

## 1. Supabase (פרודקשן)

**פרויקט:** `betqmjxvinyqicmqgrmt` (או הפרויקט הפעיל שלכם).

### הרצת מיגרציות (בסדר מספרי הקבצים)

ב־**SQL Editor** של Supabase, הריצו **פעם אחת** ובסדר:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_run_in_supabase.sql`
3. `supabase/migrations/003_system_settings.sql`
4. `supabase/migrations/004_landing_analytics.sql` — נדרש ל־`landing_events` בדף הנחיתה
5. `supabase/migrations/005_lead_attribution.sql`
6. `supabase/migrations/006_admin_invitations.sql`
7. `supabase/migrations/007_leads_rls_followup_token.sql` — RLS מחוזק ל־`leads`, טוקן המשך, RPC לשאלון

לאחר ההתקנה בדקו שה־bucket `documents` **פרטי** — ראו [`supabase/STORAGE_DOCUMENTS.md`](operational-system/supabase/STORAGE_DOCUMENTS.md).

### מפתח service role

1. Dashboard → **Project Settings** → **API**
2. העתיקו את **service_role** (לא את ה־anon).
3. שמרו אותו רק ב־**Vercel → Environment Variables** כ־`SUPABASE_SERVICE_ROLE_KEY` (ועותק מקומי ב־`.env.local` לפיתוח).
4. **לעולם** אל תשתפו את המפתח הזה ב־Git או בצד לקוח.

### Auth — כתובות הפניה (Redirect URLs)

ב־**Authentication** → **URL Configuration**:

- **Site URL:** `https://www.automateyourbiznow.com` (או הדומיין הסופי שלכם)
- **Redirect URLs:** הוסיפו לפחות:
  - `https://www.automateyourbiznow.com/**`
  - `https://www.automateyourbiznow.com/admin/accept-invite`
  - `https://www.automateyourbiznow.com/admin/reset-password`

(התאימו לדומיין האמיתי אם הוא שונה.)

### וידוא מהיר אחרי המיגרציות

- קיימת טבלה `landing_events` (מיגרציה 004).
- RLS מופעל בהתאם לקבצים — אם יש שגיאות insert מהדף הציבורי, בדקו מדיניות `anon_insert_landing_events`.

---

## 2. Google OAuth ל־Gmail (טופס "צור קשר")

נדרש ל־`/api/contact` ([`src/app/api/contact/route.ts`](operational-system/src/app/api/contact/route.ts)).

1. **Google Cloud Console** → פרויקט → **APIs & Services** → הפעילו **Gmail API**.
2. **Credentials** → OAuth 2.0 Client ID (סוג **Web application**).
3. הוסיפו **Authorized redirect URIs** בהתאם לזרימת ההשגה של ה־refresh token (למשל OAuth Playground).
4. השיגו (פעם אחת):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN` (דרך OAuth Playground או סקריפט מאושר)
5. `GMAIL_SENDER_ADDRESS` — כתובת השולח שאושרה ב־OAuth (למשל `cs@hadarturgemanautomations.com`).

הזינו את ארבעת הערכים ב־Vercel (וגם מקומית ב־`.env.local` לבדיקות).

---

## 3. Git ו־GitHub

**מבנה הנוכחי:** מונוריפו אחד בתיקיית העבודה (Next תחת `operational-system/`, שאלון תחת `Operational-Personality-Questionnaire/`).

**אפשרות א — שני פרויקטי Vercel על אותו ריפו:**

- פרויקט Next: **Root Directory** = `operational-system`
- פרויקט Vite: **Root Directory** = `Operational-Personality-Questionnaire`

**אפשרות ב — שני ריפו נפרדים ב־GitHub:** שכפול/העתקת כל תיקיית משנה לריפו משלו (או `git subtree split`).

בשורש התיקייה (`עסק`):

- ודאו ש־`.gitignore` מכסה: `**/.env`, `**/.env.local`, `**/node_modules`, `**/.next`, `**/dist`.
- **לפני** `git push` ראשון: `git status` — ודאו שאין קבצי `.env` או מפתחות.

דוגמה ל־push לריפו Next (אחרי יצירת הריפו ב־GitHub):

```bash
cd operational-system
git remote add origin https://github.com/YOUR_ORG/automateyourbiznow-web.git
git branch -M main
git push -u origin main
```

(או דחיפה משורש המונוריפו בהתאם למבנה שבחרתם.)

---

## 4. Vercel — פרויקט A: Next.js (`operational-system`)

1. **New Project** → Import מהריפו.
2. **Root Directory:** `operational-system`
3. **Framework Preset:** Next.js (ברירת מחדל; קיים [`vercel.json`](operational-system/vercel.json)).
4. **Environment Variables** (Production + במידת צורך Preview):

| משתנה | הערה |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | מ־Supabase API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | מ־Supabase API |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role בלבד |
| `NEXT_PUBLIC_APP_URL` | `https://www.automateyourbiznow.com` (ללא סלאש בסוף) — **חובה** ל־Open Graph / canonical |
| `NEXT_PUBLIC_QUIZ_URL` | `https://quiz.automateyourbiznow.com` |
| `ADMIN_EMAILS` | מופרד בפסיקים |
| `ADMIN_NOTIFICATION_EMAIL` | התראות |
| `GOOGLE_CLIENT_ID` , `GOOGLE_CLIENT_SECRET` , `GOOGLE_REFRESH_TOKEN` | Gmail |
| `GMAIL_SENDER_ADDRESS` | שולח |
| `NEXT_PUBLIC_PAYMENT_URL` | Sumit |
| `NEXT_PUBLIC_BUSINESS_*` , `NEXT_PUBLIC_SUPPORT_EMAIL` | פרטי עסק (אם בשימוש) |
| `NEXT_PUBLIC_GA4_ID` | לדוגמה `G-XXXXXXXXXX` |
| `SUMIT_WEBHOOK_SECRET` | **חובה** בעלייה לאוויר — אימות Webhook תשלום |
| `REPORT_SEND_SECRET` | אופציונלי — אימות ראוט שליחת דוח מאוטומציה חיצונית |

5. **Domains:** חברו `automateyourbiznow.com` ו־`www` לפי הוראות Vercel DNS.

---

## 5. Vercel — פרויקט B: Vite (שאלון)

1. **New Project** → Import (ריפו נפרד או אותו מונוריפו עם Root Directory `Operational-Personality-Questionnaire`).
2. **Build:** `npm run build` · **Output:** `dist` (קיים [`vercel.json`](Operational-Personality-Questionnaire/vercel.json)).
3. **Environment Variables:**

| משתנה | הערה |
|--------|------|
| `VITE_SUPABASE_URL` | כמו Next |
| `VITE_SUPABASE_ANON_KEY` | anon בלבד |
| `VITE_PUBLIC_APP_URL` | `https://quiz.automateyourbiznow.com` (חובה ל־OG בתוך אפליקציית ה־Vite והקישורים המוחלטים) |
| `VITE_PAYMENT_URL` | Sumit |

4. **Domain:** `quiz.automateyourbiznow.com`
5. אחרי שהדומיין חי: בפרויקט Next (פרויקט A) ודאו ש־`NEXT_PUBLIC_QUIZ_URL` מצביע ל־`https://quiz.automateyourbiznow.com` ו־**Redeploy**.

---

## 6. בדיקות אחרי פריסה (Smoke test)

- [ ] `https://www.<דומיין>/` נטען, וידאו ו־CTA עובדים.
- [ ] לחיצה על "להתחיל אבחון חינם" מובילה ל־`https://quiz.<דומיין>/#/lead-form` (עם שמירת פרמטרי UTM אם היו).
- [ ] טופס **צור קשר** שולח מייל לנמל שקבעתם.
- [ ] ב־Supabase → טבלת `landing_events` מופיעים לפחות `page_view` / `cta_click` מביקור אמיתי.
- [ ] `/admin/login` נטען; הזמנת אדמין / התחברות עובדת עם ה־redirect URLs שהגדרתם.
- [ ] בדפדפן: Network — אם הוגדר `NEXT_PUBLIC_GA4_ID`, נשלחות בקשות ל־Google Analytics.

---

## קבצים רלוונטיים בקוד

- מטא־דאטה, GA4, `robots.txt`, `sitemap.xml`: [`operational-system/src/app/layout.tsx`](operational-system/src/app/layout.tsx)
- כתובת האתר ל־SEO: [`operational-system/src/lib/site.ts`](operational-system/src/lib/site.ts)
- דוגמאות env: [`operational-system/.env.example`](operational-system/.env.example)
