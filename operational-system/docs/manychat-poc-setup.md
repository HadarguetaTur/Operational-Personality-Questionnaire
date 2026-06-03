# ManyChat ↔ Vercel — Phase 0 POC Setup Guide

> **מטרה:** לוודא שתקשורת דו-כיוונית בין ManyChat לבין ה-backend ב-Vercel עובדת לפני שמוסיפים AI, לוח בקרה, או לוגיקה עסקית.

---

## שלב 1: הגדרת משתני סביבה

### צור Webhook Secret
הרץ בטרמינל מתוך תיקיית `operational-system`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

העתק את הפלט — זה ה-`MANYCHAT_WEBHOOK_SECRET`.

### הגדר ב-Vercel
בפרויקט Vercel שלך → **Settings → Environment Variables**, הוסף:

| שם משתנה | ערך |
|---|---|
| `MANYCHAT_WEBHOOK_SECRET` | הסוד שיצרת |
| `MANYCHAT_API_TOKEN` | ראה סעיף הבא |
| `SUPABASE_SERVICE_ROLE_KEY` | מ-Supabase → Project → API Settings |

### קבל ManyChat API Token
1. כנס ל-**ManyChat Dashboard**
2. לך ל-**Settings → API**
3. לחץ על **"Get API Key"** / **"Generate"**
4. העתק את ה-Token והדבק ב-Vercel כ-`MANYCHAT_API_TOKEN`

### הוסף גם ל-.env.local (לפיתוח מקומי)
```bash
MANYCHAT_WEBHOOK_SECRET=your-secret-here
MANYCHAT_API_TOKEN=your-token-here
```

---

## שלב 2: הרץ את ה-Migration ב-Supabase

1. כנס ל-**Supabase Dashboard → SQL Editor**
2. הדבק את תוכן הקובץ:
   `operational-system/supabase/migrations/015_manychat_events.sql`
3. לחץ **Run**
4. ודא שהטבלה `manychat_events` מופיעה ב-**Table Editor**

---

## שלב 3: הגדר Custom Fields ב-ManyChat

בתפריט **ManyChat Dashboard → Automation → Custom Fields**, צור:

| שם שדה | סוג | תיאור |
|---|---|---|
| `lead_uuid` | Text | ה-UUID שהשרת מחזיר לכל ליד |

---

## שלב 4: הגדר Tags ב-ManyChat

ב-**ManyChat Dashboard → Audience → Tags**, צור:

| שם תגית | מתי משתמשים |
|---|---|
| `poc_connected` | לאחר שה-test_connection עובד |

---

## שלב 5: External Request — test_connection

בתוך Flow ב-ManyChat, הוסף **External Request** step:

**הגדרות ה-Request:**

| שדה | ערך |
|---|---|
| URL | `https://YOUR_DOMAIN.vercel.app/api/manychat/webhook` |
| Method | `POST` |

**Headers:**
```
Content-Type: application/json
X-Webhook-Secret: [ה-MANYCHAT_WEBHOOK_SECRET שלך]
```

**Body (Raw JSON):**
```json
{
  "event_type": "test_connection",
  "subscriber_id": "{{user id}}",
  "lead_uuid": "{{lead_uuid}}"
}
```

> השתמש ב-`{{user id}}` ו-`{{lead_uuid}}` — אלה ManyChat variables מובנים/מותאמים.

**Map Response:**
- מ-body הכנס: `lead_uuid`
- לשדה: `lead_uuid` (Custom Field)

**תוצאה צפויה:**
```json
{
  "ok": true,
  "event_type": "test_connection",
  "lead_uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "received_at": "2026-06-02T..."
}
```

---

## שלב 6: External Request — test_send_message

הוסף External Request שני (או Step נוסף באותו Flow):

**Headers:** זהים לשלב 5

**Body (Raw JSON):**
```json
{
  "event_type": "test_send_message",
  "subscriber_id": "{{user id}}",
  "lead_uuid": "{{lead_uuid}}"
}
```

**תוצאה צפויה:**
1. תגובת 200 ACK מיידית (תוך ~200ms)
2. כ-1-3 שניות לאחר מכן: הודעת WhatsApp מגיעה לטלפון של ה-Test Contact:
   > `בדיקת חיבור: השרת קיבל את ההודעה ושלח תשובה דרך ManyChat ✓`

> **REQUIRES MANUAL VALIDATION:**
> פורמט ה-payload שנשלח ל-ManyChat Send API (`/fb/sending/sendContent`) מתועד בעיקר עבור Messenger.
> לפני שימוש בסביבת ייצור, ודא ב-ManyChat API Docs שהפורמט תואם לערוץ WhatsApp.

---

## שלב 7: רשימת בדיקות — קריטריוני הצלחה

### Test 1: חיבור בסיסי
- [ ] ManyChat שולח External Request לכתובת Vercel
- [ ] Vercel מחזיר HTTP 200 תוך פחות מ-2 שניות
- [ ] שורה חדשה מופיעה ב-`manychat_events` ב-Supabase
- [ ] `event_type = 'test_connection'` בשורה
- [ ] `process_status = 'pending'` בשורה

### Test 2: יצירת lead_uuid
- [ ] שלח payload ללא `lead_uuid`
- [ ] השרת מחזיר UUID חדש ב-`lead_uuid`
- [ ] ManyChat שומר אותו ב-Custom Field

### Test 3: אימות Secret
- [ ] שלח Request עם `X-Webhook-Secret` שגוי
- [ ] השרת מחזיר HTTP **401**
- [ ] לא נוצרת שורה ב-Supabase

### Test 4: שליחת הודעה חזרה
- [ ] שלח `event_type = 'test_send_message'` עם `subscriber_id` תקין
- [ ] תגובת 200 ACK מגיעה תוך פחות מ-2 שניות
- [ ] הודעת WhatsApp מגיעה לטלפון תוך 1-5 שניות

### Test 5: Idempotency
- **TODO Phase 1** — בשלב זה, שתי קריאות זהות יוצרות שתי שורות ב-Supabase.
  זו התנהגות מכוונת ב-Phase 0.

---

## Troubleshooting

| תסמין | בדוק |
|---|---|
| HTTP 401 מ-Vercel | שם ה-Header חייב להיות `X-Webhook-Secret` (בדיוק) |
| HTTP 500 מ-Vercel | בדוק Vercel Function Logs — סביר שחסר `MANYCHAT_WEBHOOK_SECRET` |
| שורה לא נוצרת ב-Supabase | בדוק Vercel Logs לשגיאת "Insert failed"; ודא ש-`SUPABASE_SERVICE_ROLE_KEY` מוגדר |
| לא מגיעה הודעת WA | בדוק Vercel Logs לשגיאת "sendManyChatText failed"; ודא ש-`MANYCHAT_API_TOKEN` תקין |
| "API Token unauthorized" מ-ManyChat | Token פג תוקף — צור חדש ב-Settings → API |
| `lead_uuid` לא נשמר ב-ManyChat | ודא שה-"Map Response" מוגדר נכון ב-External Request step |

---

## מה לא בסקופ של Phase 0

- OpenAI / AI מכל סוג
- לוח בקרה לאירועי ManyChat
- קישור subscriber_id לטבלת `leads`
- Idempotency / ניסיון-מחדש חכם
- אימות HMAC signature (shared secret מספיק ל-POC)
- Rate limiting על נקודת הקצה (יתווסף ב-Phase 1)
- עדכון `process_status` מ-`pending` ל-`done`
- קריאות לـ`setCustomField` / `addTag` מתוך הנתב
- לוגיקת ה-Flow המלאה (עצירת שאלון על free-text, הגשת פגישה, ניתוח AI)
