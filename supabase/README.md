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

## Edge Function: trigger-send-report (Make)

אחרי עדכון הדוח ב-DB, האפליקציה קוראת ל-Edge Function שמפעילה את סנריו **send_report** ב-Make עם `submission_id` (מזהה הליד).

### פריסה והגדרות

1. **פריסת הפונקציה:**  
   `supabase functions deploy trigger-send-report`

2. **Secrets ב-Supabase:**  
   ב-Dashboard: **Project Settings** → **Edge Functions** → **Secrets**, הוסף:
   - `MAKE_API_KEY` – מפתח API של Make (חובה, אלא אם משתמשים רק ב-Webhook)
   - `MAKE_ORG_ID` – מזהה הארגון ב-Make (נדרש אם לא מגדירים SCENARIO_ID או WEBHOOK)
   - אופציונלי: `MAKE_ZONE` (ברירת מחדל: `eu2.make.com`), `MAKE_SEND_REPORT_SCENARIO_ID` (מזהה הסנריו), או `MAKE_SEND_REPORT_WEBHOOK_URL` (אם הסנריו מופעל רק דרך Webhook – אז לא צריך API key).
