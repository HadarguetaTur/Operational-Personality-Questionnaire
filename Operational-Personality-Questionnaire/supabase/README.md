# Supabase – טבלת לידים

## יצירת הטבלה

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard) ובחר את הפרויקט.
2. בתפריט השמאלי: **SQL Editor** → **New query**.
3. העתק את כל התוכן מקובץ `leads_table.sql` והדבק בחלון.
4. לחץ **Run** (או Ctrl+Enter).

אחרי ההרצה תופיע טבלה `public.leads` עם כל העמודות וה-RLS.

## מה נשמר בקוד

- **טופס ליד (LeadForm):** `name`, `email`, `marketing_consent` → נשמרים ביצירת הליד.
- **תחילת אבחון (DiagnosticChat):** `started_at` מתעדכן כשהמשתמש נכנס לאבחון.
- **סיום (FinalReport):** מתעדכן `completed_at`, `duration_seconds`, `result_pattern`, `result_scale_stage`, `result_top_metric`, ו-`result_snapshot` (JSON עם כל הנתונים: מדדים, דגלים, תקציר, פערים, המלצות וכו').

## Edge Function: finalize-diagnostic

מסיים בצורה אטומית הגשת אבחון: כותב את ה-snapshot, מייצר `report_token`,
מעדכן את הליד ל-`completed`, ומפעיל בשרשרת את `trigger-send-report`.
מובטחת idempotency – קריאה חוזרת עם אותו `lead_id` שכבר סוּיים תחזיר את
ה-token הקיים בלי לכתוב פעמיים.

הלקוח קורא לפונקציה דרך `src/lib/finalizeDiagnostic.ts` במקום לעדכן את
טבלת `leads` ישירות. זה מבטיח: אימות service-role (לא תלוי ב-RLS),
נקודת audit אחת, ניסוי חוזר בטוח.

### פריסה
```
supabase functions deploy finalize-diagnostic
```

### Secrets
משתמש באותם secrets של הסביבה:
- `SUPABASE_URL` (אוטומטי)
- `SUPABASE_SERVICE_ROLE_KEY` (אוטומטי)

(תלוי גם ב-`trigger-send-report` עם ה-secrets שלה — ראו בהמשך.)

## Edge Function: generate-pdf (Browserless)

מפיק PDF אמיתי בצד שרת על ידי רינדור הדף החי `/result/{token}?print=1`
דרך Browserless.io, מעלה את הקובץ ל-Storage bucket `reports`, ושומר URL
ציבורי ב-`leads.report_pdf_url`. הסטטוס מתעדכן ב-`leads.report_pdf_status`
(`pending`/`generating`/`ready`/`failed`/`unconfigured`).

הפונקציה מופעלת בשרשרת מתוך `finalize-diagnostic` (אחרי `generate-ai-diagnosis`
וכך ה-PDF כולל את הסעיפים האישיים), ובהמשך מפעילה את `trigger-send-report`
כדי שה-Make scenario יקבל URL מוכן לצרף למייל.

### דרישת migration

לפני הפריסה הראשונה, הריצי את `supabase/add_pdf_columns.sql`:
- מוסיף עמודות `report_pdf_url`, `report_pdf_status`, `report_pdf_generated_at`
- מקים את ה-Storage bucket `reports` (public)
- יוצר RLS policy לקריאה אנונימית של דוחות

### פריסה
```
supabase functions deploy generate-pdf
```

### Secrets ב-Supabase
- `BROWSERLESS_API_KEY` – חובה. נרשמים ב-https://browserless.io
  (מסלול חינמי 1000 PDF/חודש; מסלולי תשלום סטנדרטיים).
- `APP_BASE_URL` – חובה. ה-URL הציבורי של אפליקציית ה-Vite (לא Next.js!),
  לדוגמה `https://diagnostic.example.com`. ה-Edge function מרכיב את ה-URL
  לרינדור: `${APP_BASE_URL}/result/${token}?print=1`.
- אופציונלי: `BROWSERLESS_ENDPOINT` (ברירת מחדל: `https://production-sfo.browserless.io`).
- אופציונלי: `REPORTS_BUCKET` (ברירת מחדל: `reports`).

### זרימת ה-Pipeline המלאה (אחרי כל ה-Sprints)

```
1. הלקוח מסיים שאלון
2. handleContinue() → finalize-diagnostic
3. finalize-diagnostic:
   - כותב snapshot + token
   - מחזיר report_token ללקוח (תוך <1s)
   - מפעיל ברקע (EdgeRuntime.waitUntil) את:
     a. generate-ai-diagnosis (~3-8s)
     b. generate-pdf (~10-15s, רק אחרי שה-AI נשמר)
     c. trigger-send-report (~1s, רק אחרי שה-PDF מוכן)
4. הלקוח עובר ל-/result/{token} ורואה את הדוח מיידית
5. סעיפי AI נטענים תוך 3-8s
6. כפתור "הורדת PDF" מופיע אחרי רענון אם ה-PDF מוכן
7. המייל מגיע אחרי ~15s עם קישור ל-PDF
```

## Edge Function: generate-ai-diagnosis (OpenRouter)

מפיק אבחנה אישית מ-OpenRouter על בסיס ה-`result_snapshot` שכבר נשמר בטבלת
`leads`. הפלט נשמר ב-`leads.ai_diagnosis` (JSONB) עם מטא-נתוני קריאה
ב-`leads.ai_diagnosis_meta` (מודל בפועל, ספק, tokens, זמן הפקה).

מובטחת idempotency – קריאה חוזרת על אותו `lead_id` תחזיר את התוצאה
המוקלטת בלי לחייב את החשבון שוב, אלא אם נשלח `force_refresh: true`.

הלקוח קורא לפונקציה דרך `src/lib/aiDiagnosis.ts` באופן fire-and-forget אחרי
שהדוח הבסיסי כבר עלה למסך. אם הקריאה נכשלת, מקטעי ה-AI פשוט לא נרנדרים –
הדוח התבניתי תקין כשלעצמו.

### דרישת migration

לפני הפריסה הראשונה, הוסיפי שני שדות JSONB לטבלת `leads`:

```bash
# Supabase Dashboard → SQL Editor → New query
# הדביקי את התוכן של supabase/add_ai_diagnosis.sql והריצי
```

### פריסה
```
supabase functions deploy generate-ai-diagnosis
```

### Secrets ב-Supabase
ב-Dashboard: **Project Settings** → **Edge Functions** → **Secrets**:
- `OPENROUTER_API_KEY` – חובה. קיים גם ב-`operational-system/.env.local` —
  להעלות גם לסביבת ה-Edge Functions של Supabase.
- אופציונלי: `OPENROUTER_MODEL` (ברירת מחדל: `openai/gpt-4o`).
- אופציונלי: `OPENROUTER_FALLBACK_MODELS` (פסיקים: `openai/gpt-4o-mini,anthropic/claude-sonnet-4-6`).
- אופציונלי: `OPENROUTER_APP_TITLE`, `OPENROUTER_APP_REFERER` (לאנליטיקס OpenRouter).

### עלויות מוערכות

כ-3K טוקנים לכל submission. ב-`gpt-4o`: ~$0.015 לפנייה. אפשר להוזיל ל-
`gpt-4o-mini` (~$0.001) אם איכות התוצאה מקובלת.

## Edge Function: trigger-send-report (Make)

אחרי שה-`finalize-diagnostic` שמר את הדוח, הוא מפעיל בשרשרת את ה-Edge
Function הזו, שמפעילה את סנריו **send_report** ב-Make עם `submission_id`
(מזהה הליד).

### פריסה והגדרות

1. **פריסת הפונקציה:**  
   `supabase functions deploy trigger-send-report`

2. **Secrets ב-Supabase:**  
   ב-Dashboard: **Project Settings** → **Edge Functions** → **Secrets**, הוסף:
   - `MAKE_API_KEY` – מפתח API של Make (חובה, אלא אם משתמשים רק ב-Webhook)
   - `MAKE_ORG_ID` – מזהה הארגון ב-Make (נדרש אם לא מגדירים SCENARIO_ID או WEBHOOK)
   - אופציונלי: `MAKE_ZONE` (ברירת מחדל: `eu2.make.com`), `MAKE_SEND_REPORT_SCENARIO_ID` (מזהה הסנריו), או `MAKE_SEND_REPORT_WEBHOOK_URL` (אם הסנריו מופעל רק דרך Webhook – אז לא צריך API key).
