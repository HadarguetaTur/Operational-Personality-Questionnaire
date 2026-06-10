# דוח מצב מערכת — בוט המכירות WhatsApp (הדר תורגמן)

> מטרת הדוח: תמונת מצב מלאה של המערכת **לפני** כל שינוי. ניתוח בלבד — ללא הצעות פתרון (פרט לחלק 10 שמזהה סיכונים).
> בסיס הניתוח: קוד המקור בפועל ב-`operational-system/src`, לא מסמך התכנון.
> הערה קריטית: מסמך התכנון `docs/whatsapp-ai-bot-plan.md` מתאר מערכת שונה מהמומש (OpenAI + שאלון-interrupt + Calendly). **הקוד בפועל שונה** (OpenRouter + הודעת `lead_message` חופשית + Cal.com). ראו חלק 10.

---

## חלק 1 — מפת מערכת (סוכנים)

המערכת אינה "סוכנים אוטונומיים" קלאסיים אלא **pipeline של 4 שלבים** + שכבת pre-checks דטרמיניסטית + 2 סוכני-עזר. "סוכן" כאן = יחידה לוגית שמקבלת החלטה או מנסחת תשובה.

### 1.1 Classifier (מסווג כוונות)
- **תפקיד רשמי:** Stage 1 בפייפליין.
- **מטרה:** לנתח הודעת משתמש ולהחזיר JSON מובנה (intent, facts, flags). לא כותב תשובה.
- **מתי מופעל:** בכל הודעת `lead_message` שעברה את ה-pre-checks.
- **מי מפעיל:** `runAgentPipeline` (`agentPipeline.ts`).
- **מעביר ל:** State Machine (Stage 2).
- **כלים:** OpenRouter Chat Completions (`openai/gpt-4.1-mini`), `response_format: json_object`, temp 0.0.
- **מקורות ידע:** `CLASSIFIER_SYSTEM_PROMPT` (מוטמע ב-`classifier.ts`) + סיכום context (business_type/main_challenge/pain_category) + 4 הודעות אחרונות.

### 1.2 State Machine (מנוע מצבים)
- **תפקיד רשמי:** Stage 2 — דטרמיניסטי, ללא LLM.
- **מטרה:** לקבוע `nextState` ו-`forcedAction` לפי המצב הנוכחי + intent.
- **מתי מופעל:** מיד אחרי הסיווג, בכל הודעה.
- **מי מפעיל:** `runAgentPipeline`.
- **מעביר ל:** Anti-Loop Guard (Stage 3).
- **כלים:** טבלת מעברים ב-`stateMachine.ts` (קוד בלבד).
- **מקורות ידע:** אין — לוגיקה קשיחה. קורא `context.main_challenge` בלבד.

### 1.3 Anti-Loop Guard (שומר לולאות)
- **תפקיד רשמי:** Stage 3 — דטרמיניסטי.
- **מטרה:** לזהות לולאות (חזרות, תקיעות) ולכפות override על התשובה.
- **מתי מופעל:** אחרי State Machine, לפני ה-Writer.
- **מי מפעיל:** `runAgentPipeline`.
- **מעביר ל:** אם יש override → מחזיר ישירות (דילוג על ה-Writer). אחרת → מזריק `nudge` ל-context וממשיך ל-Writer.
- **כלים:** מונים ב-context + regex של מילות פגישה (`antiLoopGuard.ts`).
- **מקורות ידע:** ספי לולאה קשיחים (AL-1..AL-6) + תשובות מקובעות (canned).

### 1.4 Response Writer (כותב התשובה)
- **תפקיד רשמי:** Stage 4 — מנסח את הודעת ה-WhatsApp בפועל.
- **מטרה:** לכתוב reply בטון הדר לפי החלטת השלבים הקודמים. **לא** משנה החלטות אסטרטגיות.
- **מתי מופעל:** בכל הודעה שלא נעצרה ב-Anti-Loop.
- **מי מפעיל:** `runAgentPipeline`.
- **מעביר ל:** חוזר ל-webhook → נשלח ללקוחה דרך ManyChat Send API.
- **כלים:** OpenRouter (`openai/gpt-4.1-mini`), temp 0.3, `validateReply` (replyValidator).
- **מקורות ידע:** stage prompt (`stagePrompts.ts`) + knowledge base (`getSystemPrompt` → DB/defaults) + ניתוח הסיווג + context (known_facts, asked_questions, scalars).

### 1.5 Handoff Summary Agent (סוכן סיכום העברה)
- **תפקיד רשמי:** סוכן-עזר להעברה לאדם.
- **מטרה:** לסכם שיחה לצוות הפנימי + לנסח משפט ללקוחה בעת `human_handoff`.
- **מתי מופעל:** כשפעולה = `human_handoff` (מתסכול meta או מהחלטת agent).
- **מי מפעיל:** `handleHandoff` ב-webhook.
- **מעביר ל:** Slack (`notifySlackHandoff`) + תשובת לקוחה.
- **כלים:** OpenRouter (`openai/gpt-4.1-mini`), temp 0.2.
- **מקורות ידע:** היסטוריית השיחה + סיבת ההעברה. אין KB.

### 1.6 Quiz Intake Agent (סוכן קליטת שאלון)
- **תפקיד רשמי:** סוכן-עזר לאירוע שאלון.
- **מטרה:** לנתח תשובות שאלון → "opening_hook" + עובדות מקדימות (pre_extracted_facts).
- **מתי מופעל:** באירוע `questionnaire_completed`.
- **מי מפעיל:** webhook (case `questionnaire_completed`).
- **מעביר ל:** כותב ל-`leads.conversation_context` (לא ל-`bot_conversation_state`!).
- **כלים:** OpenRouter (`openai/gpt-4.1-mini`), temp 0.2.
- **מקורות ידע:** `leads.short_quiz_answers` / `conversation_context`.

### 1.7 Sales Agent (legacy) — קוד מת
- **תפקיד רשמי:** הגרסה הישנה — קריאת LLM יחידה שעשתה הכל.
- **מטרה:** הוחלפה ע"י הפייפליין.
- **מתי מופעל:** **אף פעם.** `runSalesAgent` אינו מיובא בשום נתיב חי (רק טיפוסים `AgentOutput`/`AgentAction` מיובאים ממנו).
- **כלים:** OpenRouter `openai/gpt-4.1` (המודל היקר — $2/$8 ל-1M).
- **הערה:** מחזיק את `buildPersonaSection`/`matchPersona` — שגם הם מתים בנתיב החי.

### 1.8 שכבת Pre-Checks (דטרמיניסטית, regex — לפני הפייפליין)
| בודק | קובץ | מה עושה |
|---|---|---|
| Opt-out | webhook (`OPT_OUT_REGEX`) | "הסר/עצור/STOP" → mark_irrelevant מיד |
| Audience filter | `audienceFilter.ts` | בהודעה ראשונה בלבד — מילות "לא קהל יעד" → mark_irrelevant |
| Meeting intent | `detectMeetingIntent.ts` | regex לבקשת פגישה → book_meeting מיד (fast path) |
| Meta frustration | `detectMetaFrustration.ts` | "חופרת/מספיק שאלות" → book_meeting (בשלב פעיל) או human_handoff |
| Auto-escalate | webhook | ≥10 הודעות משתמש → escalated |
| Reply validator | `replyValidator.ts` | חוסם blocklist / 2+ שאלות / >400 תווים / דמיון ≥0.8 |

---

## חלק 2 — פרומפטים (מוצגים במלואם)

### 2.1 בלוקים משותפים (מוזרקים לכל פרומפט שלב)

**OVERRIDE_RULE (עדיפות מוחלטת):**
```
## כלל עקיפה — עדיפות מוחלטת על כל שאר ההוראות
אם המשתמשת אמרה — בהודעה הנוכחית או בכל מקום בהיסטוריה — שהיא רוצה לקבוע:
("אשמח לקבוע", "בואי נקבע", "פגישה", "רוצה פגישה", "נקבע", "תשלחי קישור", "קישור", "שלחי לינק", "רוצה להתקדם")
→ action: book_meeting, state: booking מיד — ללא שאלות, ללא הסברים.

אם המשתמשת מתוסכלת ("את חופרת", "ביקשתי פגישה", "מספיק שאלות", "עניי על מה ששאלתי"):
→ action: book_meeting, state: booking מיד — ללא הגנה עצמית, ללא הסברים.

אסור לומר "לא ראיתי תשובה לשאלות" — אף פעם.
```

**ANTI_HALLUCINATION (כלל ברזל — אסור להמציא):**
```
- לשקף רק מה שנאמר במפורש בשיחה.
- שיקוף = שאלת בדיקה: "כלומר, [מה שנאמר]?" — לא טענה.
- אם הכאב לא נאמר — לשאול, לא להניח.
- אסור: "נשמע שהאתגר שלך הוא..." אם זה לא נאמר.
```

**ANTI_REPETITION (כלל אנטי-חזרה):**
```
- לפני כל שאלה: בדקי אם שאלה דומה כבר מופיעה ב"שאלות שכבר נשאלו" — אם כן, אסור לשאול שוב.
- לפני כל שיקוף: בדקי שהנקודה כבר מופיעה ב"מה הלקוחה אמרה" — אל תחזרי על מה שכתוב שם.
- אם ידוע business_type — אל תשאלי שוב על סוג העסק.
- אם ידוע main_challenge — עברי ישירות ל-pitching, אל תשאלי שוב על הכאב.
```

**FORMAT (פורמט JSON — מוזרק בסוף כל שלב):**
```json
{
  "reply": "הטקסט שישלח למשתמשת",
  "action": "continue | book_meeting | mark_irrelevant | request_followup | mark_spam | human_handoff",
  "state": "initial | discovery | qualifying | pitching | objection | booking | closed | irrelevant | spam | escalated",
  "extracted_facts": {
    "business_type": "סוג העסק אם נאמר",
    "main_challenge": "הכאב שנאמר בפועל — רק אם נאמר, אחרת ריק",
    "pain_category": "leads_followup | scheduling | overload | conversion | process | trust | other",
    "temperature": "cold | warm | hot"
  },
  "known_facts": ["נקודה חדשה שנאמרה בתגובה הנוכחית בלבד"]
}
```

### 2.2 Classifier — System Prompt (במלואו)
```
אתה מסווג שיחות לבוט מכירות בוואטסאפ. עבודתך: לנתח הודעת משתמש ולהחזיר JSON מובנה.
אסור לכתוב תשובת מכירה — רק ניתוח.

## הוראות
1. intent: meeting_request | price_inquiry | objection | discovery_answer | info_request |
   frustration | opt_out | not_relevant | spam | affirmative | other
2. confidence: 0-1
3. sentiment: positive / neutral / negative
4. is_objection: true אם יש חסם שמונע מהלקוח להתקדם
5. objection_type: price | tech_fear | not_sure | has_system | need_to_think | no_time |
   want_to_build_alone | not_interested | other
6. new_facts: business_type / main_challenge / pain_category / temperature
7. missing_slots: business_type / main_challenge (לא לרשום מה שכבר ידוע)
8. should_handoff: בקשת אדם מפורשת / כאב חריג / 2+ אי-הבנות
9. should_offer_booking: כאב ברור + חמה / affirmative אחרי הצעה / meeting_request
10. is_opt_out: בקשת הסרה מפורשת
פורמט: JSON בלבד.
```
- **Guardrails:** "אסור לכתוב תשובת מכירה — רק ניתוח." temp 0.0, `json_object`.
- **Constraints:** intents/objection_types/pain_category מתוך enum סגור.

### 2.3 Response Writer — System Prompt
ה-Writer מרכיב את הפרומפט מ: `stagePrompt` (לפי `nextState`) + ניתוח הסיווג + `knowledgeBase` + context. אין לו System Prompt עצמאי — הזהות מגיעה מה-KB.
- **Instructions:** "כותב את הודעת ה-WhatsApp... לא משנה החלטות אסטרטגיות — רק מנסח."
- **Guardrails:** אם יש `forcedAction` → מוזרק `[OVERRIDE] action חייב להיות X, state חייב להיות Y`.
- **Constraints:** עובר `validateReply` (ראו 2.7). temp 0.3.

### 2.4 פרומפטי שלבים (Stage Prompts — מוצגים במלואם בקובץ `stagePrompts.ts`)

> כל פרומפט שלב = OVERRIDE_RULE + ANTI_HALLUCINATION + ANTI_REPETITION + טקסט השלב + FORMAT.

**TRIAGE (initial):** הצגה עצמית חובה בת 3 חלקים (הצגה + מטרה + שאלה אחת). קהל יעד = אישה עצמאית, עסק שירותים בישראל. המוצר = שיחת היכרות 15 דק' חינם. עדיפויות תגובה: בקשת פגישה→booking; שאלת מוצר→תשובה קצרה+שאלה; כללי→"מה קורה עכשיו עם הפניות?"; לא רלוונטי→mark_irrelevant; ספאם→mark_spam.

**DISCOVERY:** שאלת גילוי אחת בלבד מתוך 3 ("מה קורה עם הפניות"/"מה לא עובד"/"מה הכי מתיש"). כל תשובה בת 3+ מילים → מעבר מיד ל-pitching. אסור שאלת גילוי שנייה.

**QUALIFYING:** אם הכאב ברור → pitching. אחרת שאלה אחת ("מה הכי כואב לך?"). שיקוף לפני מעבר.

**PITCHING:** סימן שאלה אחד בלבד בכל התשובה. שיקוף כהצהרה (ללא "?") + הצעת שיחה 15 דק' חינם. עדות אחת אם מתאים. אסור מחירים כאן.

**OBJECTION:** ספריית התנגדויות מוטמעת (לא טכנולוגית / הקהל שונה / צריכה לחשוב / יש כבר אוטומציה / לא בא לי לשווק / יקר). מקס לולאה אחת נוספת.

**BOOKING:** "מעולה! שולחת לך עכשיו את הקישור..." → book_meeting, state: closed.

**CLOSED / IRRELEVANT / SPAM / ESCALATED:** תשובות מינימליות מקובעות.

### 2.5 פרומפט Handoff Summary (במלואו)
```
את מסכמת שיחת WhatsApp לצוות פנימי בלבד.
החזר JSON: { "headline": "", "summary": "", "key_facts": [], "customer_reply": "" }
customer_reply: משפט קצר ללקוחה בעברית (מקס 2 משפטים).
אל תמציא עובדות שלא בשיחה.
```

### 2.6 פרומפט Quiz Intake (במלואו)
```
נתח תשובות שאלון ליד. החזר JSON:
{ "opening_hook": "משפט פתיחה ל-WhatsApp",
  "pre_extracted_facts": { "pain_category": "", "business_type": "", "main_challenge": "", "temperature": "cold|warm|hot" } }
אל תמציא. עברית, קצר.
```

### 2.7 Guardrails דטרמיניסטיים (replyValidator — אכיפה קשיחה אחרי כל LLM)
- **Blocklist:** "אני העוזרת הדיגיטלית", "אני המערכת האוטומטית", "אני הבוט", "שמחה שפנית", "תודה ששיתפת", "כל ליד עולה", "תקבלי", "עבדנו עם", "לא ראיתי תשובה", "נהדר שפנית", "כמובן!", "אלינו היום", "--".
- **Constraints:** מקסימום סימן שאלה אחד; אורך ≤400 תווים; דמיון <0.8 ל-5 תשובות אחרונות; reply לא ריק.

---

## חלק 3 — Knowledge Base

### 3.1 `bot_prompt_sections` (system_settings בדיפולט: `botPromptDefaults.ts`)
- **מיקום:** טבלת `system_settings` (key=`bot_prompt_sections`) ב-Supabase; אם ריק → `DEFAULT_SECTIONS` בקוד. cache 60 שניות.
- **מטרתו:** מקור האמת המרכזי לזהות/מוצר/קהל/התנגדויות/עדויות/כללים של הבוט.
- **מי משתמש:** `getSystemPrompt()` → Response Writer (וגם ה-salesAgent המת).
- **סיכום תוכן (6 sections):**
  - `identity` — זהות, Brand Voice, מילים מותרות/אסורות, כלל אין-המצאה, מסלול שיחה 5-8 הודעות.
  - `product` — שיחת היכרות חינם; אפיון 350₪; בוט 500–4,500₪; זמן הקמה 3–6 שבועות; מדיניות מחיר; FAQ.
  - `target_audience` — קהל מתאים, סימני ליד חם/לא בשל, מי לא מתאים, שאלות סינון.
  - `objections` — ספריית התנגדויות (9 תרחישים).
  - `testimonials` — 4 עדויות מאושרות + מתי להשתמש.
  - `rules` — כללי WhatsApp, escalation, opt-out, pain_category enum, פעולות, דוגמאות ניסוח אידיאליות.
- **מידע עסקי חשוב:** מחירים (350₪ אפיון, 500–4,500₪ בוט), זמני הקמה, הצעת ערך (שיחה חינם 15 דק').

### 3.2 `stagePrompts.ts` (פרומפטי שלבים)
- **מיקום:** קוד (hard-coded). **מטרתו:** הנחיות התנהגות פר-שלב. **מי משתמש:** Writer + salesAgent.
- **מידע עסקי:** מחזיק עותק שני של ספריית ההתנגדויות + עדויות + תיאור המוצר.

### 3.3 `personas.ts` (4 פרסונות עסק)
- **מיקום:** קוד. **מטרתו:** שאלת גילוי מותאמת לפי business_type. **מי משתמש:** רק `salesAgent.ts` — **מת בנתיב החי.**

### 3.4 `testimonials.ts` (4 עדויות מובנות)
- **מיקום:** קוד. **מטרתו:** בחירת עדות לפי pain_category/industry. **מי משתמש:** `selectTestimonial`/`formatTestimonialForPrompt` — **לא מיובאים בשום מקום. קוד מת.** העדויות בפועל מגיעות מטקסט ב-stagePrompts/botPromptDefaults.

### 3.5 בעיות איכות בידע

**מידע כפול:**
- **ספריית התנגדויות** ב-2 מקומות בניסוחים שונים: `OBJECTION_PROMPT` (stagePrompts) **וגם** `objections` (botPromptDefaults) — שניהם מוזרקים לאותו פרומפט.
- **עדויות ב-3 מקומות:** stagePrompts (PITCHING), botPromptDefaults (testimonials), knowledge/testimonials.ts — רשימות שונות.
- **כלל "אסור להמציא"** מופיע ב-ANTI_HALLUCINATION וגם בסעיף identity של ה-KB.
- **חילוץ שאלה** (extractQuestion) משוכפל ב-3 קבצים (antiLoopGuard, webhook, conversationMessages).
- **מילות פגישה** ב-`detectMeetingIntent` regex וגם ב-`antiLoopGuard.MEETING_KEYWORDS`.
- **תשובת קביעת פגישה** (`MEETING_BOOKING_REPLY`) משוכפלת ב-3 מקומות.

**מידע סותר:**
- **עדות לאה:** stagePrompts="לאה, אדריכלות"; testimonials.ts="לאה סוליטר, אדריכלות, overload"; botPromptDefaults="לאה סוליטר (אדריכלות)". מסד גרופ: testimonials="תפעול" vs stagePrompts מצטט בלי תעשייה.
- **pain_category enum:** הקוד החי = `leads_followup|scheduling|overload|conversion|process|trust|other`; מסמך התכנון = `collection|whatsapp|leads_followup|tools|overload`. **לא תואמים.**
- **מודל LLM:** הפייפליין החי = `gpt-4.1-mini`; ה-salesAgent המת = `gpt-4.1` (יקר פי 4-13).

**מידע שאינו בשימוש:**
- `personas.ts` (matchPersona) — מת בנתיב החי.
- `testimonials.ts` (selectTestimonial) — מת לחלוטין.
- `salesAgent.ts` (runSalesAgent) — מת.
- `getStageDirective`/`STAGE_DIRECTIVES` — לא נקראים בשום מקום.

---

## חלק 4 — Flow Analysis (מסע השיחה בפועל)

### Entry Point — הודעה ראשונה
1. ManyChat שולח `POST /api/manychat/webhook` (event_type=`lead_message`) עם `X-Webhook-Secret`.
2. אימות secret (timing-safe) → שמירת RAW ב-`manychat_events` → החזרת `200` ריק מיד.
3. העיבוד רץ ברקע (`waitUntil`): שמירת הודעת user, `funnel_event=lead_arrived`.
4. **Pre-checks בסדר:** opt-out → ספירת הודעות → auto-escalate(≥10) → טעינת history+state → audience filter (הודעה 1) → meeting regex → meta frustration.
5. אם אף pre-check לא תפס → הפייפליין (Classifier→StateMachine→AntiLoop→Writer).

### Discovery — איסוף מידע
- מתבצע בשלבים `initial`/`discovery`/`qualifying`.
- ה-Classifier מחלץ `business_type`/`main_challenge`/`pain_category` מההודעה.
- חוק קשיח: שאלת גילוי אחת בלבד; כל תשובה בת 3+ מילים → pitching.
- `asked_questions` נשמר כדי למנוע חזרה; `known_facts` מצטבר.

### Qualification — האם הליד מתאים
- אין ניקוד/score מספרי. ההחלטה היא בינארית-איכותית:
  - audience filter (regex) פוסל בהודעה ראשונה.
  - ה-Classifier מסמן `not_relevant` → irrelevant.
  - "כשירות" = פשוט קיום `main_challenge` כלשהו → מעבר ל-pitching. אין סף ממשי.

### Objection Handling — טיפול בהתנגדויות
- intent=`objection`/`price_inquiry` בשלב pitching → state `objection`.
- ה-Writer עונה מספריית ההתנגדויות + מציע שוב.
- AL-4: `objection_count>=2` בשלב objection → סגירה רכה (request_followup).

### Offer Presentation — הצגת השירות
- שלב `pitching`: שיקוף הכאב (הצהרה) + הצעת שיחת היכרות 15 דק' חינם. עדות אחת אם מתאים. ללא מחירים.

### Booking — הובלה לפגישה
- טריגרים: meeting regex / affirmative אחרי pitch / shouldOfferBooking / AL-1 / AL-6 / meta-frustration.
- ב-`book_meeting` → `buildBookingMessages` שולח reply + `CALCOM_BOOKING_URL` כטקסט. `funnel_event=meeting_offered`.
- **הערה:** הקישור נשלח ישירות בלי `lead_uuid` כ-utm_content → ה-Calendly webhook לא יוכל לשייך `meeting_booked` לליד (ראו חלק 10). קיים route `/r/[leadUuid]` שמוסיף tracking — אך **אינו בשימוש** בזרימת ה-WhatsApp.

### Exit Conditions — סיום שיחה
- `closed` (אחרי קביעה), `irrelevant` (לא מתאים/opt-out/"לא מעניין"), `spam`, `escalated` (handoff/≥10 הודעות), `request_followup` (תזכורת בעוד 7 ימים דרך cron).

---

## חלק 5 — Conversation State

המצב נשמר בטבלת `bot_conversation_state` (PK=`lead_uuid`, עמודות `state` + `context` JSONB). העדכון ב-`upsertBotState` עם **merge** (patch semantics).

### 5.1 משתנים שנשמרים
| משתנה | היכן | מתי מתעדכן | מי משתמש |
|---|---|---|---|
| `state` | עמודה ייעודית | בכל הודעה | State Machine, AntiLoop, pre-checks |
| `known_facts[]` | context | כשה-Writer מחזיר נקודות חדשות | Writer (buildContextSection) |
| `asked_questions[]` | context | webhook מחלץ שאלה מכל reply (cap 20) | Writer (איסור חזרה) |
| `business_type` | context | classifier new_facts | Classifier, Writer |
| `main_challenge` | context | classifier new_facts | State Machine (תנאי מעבר ל-pitching), Writer |
| `pain_category` | context | classifier new_facts | Writer (תצוגה) |
| `temperature` | context | classifier new_facts | — (נשמר, לא מניע לוגיקה) |
| `offered_booking_count` | context | בכל book_meeting | AntiLoop (AL-3, AL-6) |
| `objection_count` | context | בכל state=objection (מתאפס ביציאה) | AntiLoop (AL-4) |
| `clarification_count` | context | כשנשאלת אותה שאלה פעמיים | AntiLoop (AL-2) |
| `last_asked_question` | context | בכל reply עם שאלה | AntiLoop (זיהוי חזרה) |
| `last_intent` | context | בכל הודעה | — (נשמר, כמעט לא בשימוש) |
| `opt_out` / `stale_closed` | context | opt-out / cron | דגלים |
| `opening_hook` | `leads.conversation_context` | quiz intake | — (לא נקרא בפועל בפייפליין) |
| `subscriber_id` | עמודה ייעודית | webhook | cron silent-leads, push |

### 5.2 משתנים שאינם בשימוש
- `temperature` — נשמר אך אף החלטה לא נגזרת ממנו.
- `last_intent` — נכתב, כמעט לא נקרא.
- `repeated_user_intent_count` — מוזכר ב-AL-7 (docstring) וב-skip-list של ה-Writer, אך **לעולם לא מחושב/נכתב** → AL-7 לא ממומש.
- `opening_hook` — נכתב ב-`leads.conversation_context` ע"י quiz intake, אך הפייפליין קורא מ-`bot_conversation_state` ולא מ-`leads` → **מנותק**.

### 5.3 משתנים חסרים
- אין `score`/`meeting_readiness_score` (מסמך התכנון דרש; הקוד לא מימש).
- אין `confidence` מתמשך / `urgency` / `buying_readiness`.
- אין שדה שמסמן שהקישור כבר נשלח (`meeting_link_sent`) → סיכון לשליחה כפולה.

### 5.4 כפילויות מצב
- המצב נשמר **גם** ב-`bot_conversation_state` **וגם** (best-effort) ב-`leads.conversation_state`/`conversation_context` → שני מקורות אמת חופפים שעלולים להתפצל.
- quiz intake כותב ל-`leads.conversation_context` בלבד, בעוד הפייפליין משתמש ב-`bot_conversation_state` — שתי "זיכרונות" נפרדים.

---

## חלק 6 — Decision Tree (תרשים החלטות)

```
הודעה נכנסת (lead_message)
│
├─ [צומת A] secret תקין? → לא: 401 STOP | כן: המשך
├─ [צומת B] הודעה ריקה/{{var}}? → כן: ack STOP
├─ [צומת C] opt-out regex? → כן: mark_irrelevant → irrelevant STOP
├─ [צומת D] userMsgCount ≥ 10? → כן: human_handoff → escalated STOP
├─ [צומת E] הודעה ראשונה + לא קהל יעד? → כן: mark_irrelevant STOP
├─ [צומת F] meeting regex? → כן: book_meeting → booking STOP
├─ [צומת G] meta-frustration?
│     ├─ שלב פעיל → book_meeting → booking STOP
│     └─ אחרת → human_handoff → escalated STOP
│
└─ [פייפליין]
   ├─ [Stage1 Classifier] → intent + flags
   ├─ [Stage2 StateMachine] עדיפויות:
   │     opt_out → spam → handoff/frustration → meeting/booking →
   │     not_relevant → terminal-guard → מעברים פר-שלב
   ├─ [Stage3 AntiLoop]
   │     AL-1 מילת פגישה → book_meeting
   │     AL-2 clarification≥2 → handoff
   │     AL-3 offered_booking≥3 → handoff
   │     AL-4 objection≥2 → request_followup
   │     AL-6 ≥6 הודעות ו-0 הצעות → book_meeting
   │     אחרת → nudge ל-context
   └─ [Stage4 Writer] → reply + validate → push
```

**פירוט צמתים (תנאי כניסה / החלטה / פעולה / תוצאה):**

| צומת | תנאי כניסה | החלטה | פעולה | תוצאה |
|---|---|---|---|---|
| StateMachine: discovery+discovery_answer | יש main_challenge? | כן→pitching, לא→qualifying | nextState | התקדמות לפי כאב |
| StateMachine: pitching+affirmative | "כן/נשמע טוב" | book | forcedAction=book_meeting | booking |
| StateMachine: pitching+objection | "אבל..." | objection | nextState=objection | טיפול בהתנגדות |
| AntiLoop AL-6 | ≥6 הודעות, 0 הצעות | כפיית הצעה | forced_reply קבוע | booking |
| Writer validation fail (early) | תשובה דומה/חסומה | escalate fallback | pitching fallback | המשך |

---

## חלק 7 — Tool Usage

> "כלים" כאן = שירותי חוץ / יכולות שהסוכנים קוראים להן (אין function-calling אמיתי; הכל קריאות קוד/HTTP).

| כלי | מטרה | מי משתמש | קלט | פלט | תדירות |
|---|---|---|---|---|---|
| OpenRouter Chat (`gpt-4.1-mini`) | סיווג + כתיבה + סיכומים | Classifier, Writer, Handoff, Quiz | messages+system | JSON | 2 קריאות לכל הודעת lead (classify+write) |
| `getSystemPrompt()` | טעינת KB מ-DB (cache 60s) | Writer, salesAgent(מת) | key=`bot_prompt_sections` | טקסט KB | כל הודעה (לרוב cache hit) |
| Supabase (service role) | קריאה/כתיבה של state/messages/events | כל המערכת | SQL | rows | תדיר מאוד |
| ManyChat Send API (`pushManyChatReply`) | דחיפת תשובה ללקוחה | webhook (`finalize`) | subscriber_id+messages | success/error | פעם לכל הודעה |
| `recordAiRun` → `ai_runs` | מעקב עלות/טוקנים | agentPipeline | usage | row | פעמיים לכל הודעה |
| `recordFunnelEvent` → `funnel_events` | מעקב פאנל | webhook, calendly, /r | event_type+meta | row | בכל אירוע משמעותי |
| `notifySlackHandoff` | התראת העברה לאדם | handleHandoff | סיכום | Slack message | בעת handoff |
| Cal.com link (`CALCOM_BOOKING_URL`) | קביעת פגישה | buildBookingMessages, /r | env | URL טקסט | בעת book_meeting |
| Calendly webhook | רישום meeting_booked | route חיצוני | invitee.created | funnel_event | חיצונית |
| Cron `silent-leads` | תזכורות + סגירת לידים שקטים | Vercel cron (07:00 יומי) | — | reminders | יומית |
| regex pre-checks | מסלול מהיר (פגישה/תסכול/קהל/opt-out) | webhook | טקסט | bool/action | כל הודעה |

---

## חלק 8 — Handoffs (מעברים בין סוכנים)

| סוכן מקור | סוכן יעד | תנאי מעבר | מידע שעובר | מידע שאובד |
|---|---|---|---|---|
| Classifier | State Machine | תמיד | intent, should_offer_booking, should_handoff, is_opt_out | confidence, sentiment, objection_type, new_facts (לא נכנסים למעבר) |
| State Machine | Anti-Loop Guard | תמיד | nextState, forcedAction | reason (רק ללוג) |
| Anti-Loop | Writer | אין override | nextState, forcedAction, nudge (ב-context) | מונים גולמיים |
| Anti-Loop | (החזרה ישירה) | יש override | forced_reply, forced_action | **כל ה-context העשיר + הסיווג** — ה-reply המקובע אינו אישי |
| Writer | webhook → ManyChat | תמיד | reply, action, state, extracted_facts, known_facts | usage (נשמר ב-ai_runs בנפרד) |
| Pre-check (frustration/handoff) | Handoff Summary | action=human_handoff | history מלא, reason | context העשיר (known_facts/asked_questions לא נשלחים) |
| Quiz Intake | (Pipeline) | — | **לא עובר!** נכתב ל-`leads.conversation_context` בלבד | opening_hook ו-pre_extracted_facts לא מגיעים ל-`bot_conversation_state` |

**נקודות איבוד מידע מרכזיות:**
1. **Anti-Loop override** דורס את ה-Writer בתשובה גנרית מקובעת — מאבד את ההקשר האישי של השיחה.
2. **Quiz Intake מנותק** מהפייפליין (טבלאות שונות) — כל הניתוח המקדים של השאלון אינו זמין לבוט בשיחה.
3. ה-Classifier מחזיר `objection_type`/`sentiment`/`confidence` — אך ה-State Machine מתעלם מ-`objection_type` ו-`confidence` (אין סף ביטחון).

---

## חלק 9 — Sales Analysis (ניתוח בלבד — ללא פתרונות)

| שלב | מטרת השלב | מידע שנאסף | מידע שחסר | אסטרטגיית מכירה ברורה? |
|---|---|---|---|---|
| Entry/Triage | להציג, לסנן קהל, לפתוח שאלה | סוג העסק (לעיתים) | תקציב, דחיפות, גודל עסק | חלקית — סקריפט פתיחה קשיח בן 3 חלקים |
| Discovery | לזהות כאב בלשון הלקוחה | main_challenge, pain_category | היקף הכאב, עלות הבעיה, ניסיונות קודמים | כן בכוונה (שאלה אחת→pitch) אך **רדודה** — מספיק 3 מילים |
| Qualification | להחליט אם מתאים | קיום כאב | סף כשירות אמיתי (אין score) | **לא** — אין קריטריון "ליד חם" מדיד |
| Objection | להסיר חסם ולהציע שוב | סוג ההתנגדות (חלקית) | מה באמת מעכב, עומק ההתנגדות | כן — ספרייה מוכנה, אך מקס לולאה 1 → ויתור מהיר |
| Offer | להציג שיחת היכרות | — | אין הצגת ערך מותאמת לפי pain_category | כן — אך הצעה אחידה לכולם, ללא התאמה אישית |
| Booking | לשלוח קישור | — | אין תיאום זמן בפועל, אין מעקב לחיצה בזרימה | חלקית — שולח URL גולמי |

**תצפיות:** המכירה אגרסיבית לכיוון "פגישה" (מספר טריגרים כופים booking כבר אחרי 6 הודעות / כל אזכור פגישה). העמקה (discovery) מינימלית בכוונה. אין ניצול של `temperature`/`pain_category` להתאמת עדות או הצעה. אין ניקוד כשירות → לידים לא-בשלים עלולים להידחף לפגישה.

---

## חלק 10 — Risk Report

### נקודות כשל
- **OPENROUTER_API_KEY חסר/לא תקין** → כל קריאות ה-LLM נופלות ל-fallbacks מקובעים; הבוט הופך לסקריפט סטטי בלי שמתריע.
- **שליחת קישור פגישה ללא tracking:** הבוט שולח `CALCOM_BOOKING_URL` גולמי בלי `utm_content=lead_uuid`. ה-Calendly webhook מסתמך על `utm_content` → **`meeting_booked` כמעט לעולם לא יירשם**. ה-route `/r/[leadUuid]` שפותר זאת אינו בשימוש בזרימה.
- **כפילות מקור-אמת למצב:** `bot_conversation_state` מול `leads` — עלולים להתפצל ולגרום למצב לא עקבי.
- **אין הגנת idempotency** מלאה על הודעות נכנסות → ריצה כפולה של אותה הודעה אפשרית.
- **`waitUntil` ב-Vercel:** אם ה-plan אינו Pro, העיבוד ברקע נחתך (~10-25 שניות) → הלקוחה לא מקבלת תשובה כלל (השרת כבר החזיר 200).

### תלות בקבצים בודדים (Single Points of Failure)
- **`botPromptDefaults.ts` / system_settings:** כל הזהות, המחירים, ההתנגדויות — בנקודה אחת. שגיאת עריכה ב-DB משנה את כל התנהגות הבוט מיידית (cache 60s).
- **`stateMachine.ts`:** קובע את כל מסלול השיחה. באג כאן → כל הלידים מושפעים.
- **`agentPipeline.ts`:** מתזמר הכל; נפילה כאן = אין תשובה.

### תלות בפרומפטים בודדים
- ההתנהגות נשענת על `CLASSIFIER_SYSTEM_PROMPT` יחיד. **סיווג שגוי** (intent לא נכון) מזרים את כל השיחה למסלול שגוי — אין שכבת ביטחון (confidence לא נבדק).
- `OVERRIDE_RULE` מוזרק לכל שלב — שינוי בו משפיע גלובלית.

### מידע חסר
- אין הגדרת "ליד חם" מדידה; אין score; אין קריטריוני דיסקווליפיקציה לפי תקציב/גודל.
- `temperature` נאסף אך לא מנוצל.

### ידע סותר
- pain_category enum שונה בין הקוד למסמך התכנון.
- עדויות/תעשיות לא עקביות בין 3 מקורות.
- מסמך התכנון (OpenAI/שאלון-interrupt/Calendly) מתאר מערכת שאינה המומשת (OpenRouter/lead_message/Cal.com) → מטעה למי שמסתמך עליו.

### נקודות שעלולות לגרום לשיחות גרועות
- **דחיפה כפויה לפגישה אחרי 6 הודעות** (AL-6) — גם אם הכאב לא הובן.
- **ויתור מהיר** אחרי לולאת התנגדות אחת (AL-4 ב-objection_count≥2).
- **תשובות Anti-Loop גנריות** דורסות תשובה אישית.
- **escalate אוטומטי ב-10 הודעות** — קוטע שיחות לגיטימיות ארוכות.
- **discovery רדוד** (3 מילים מספיקות) → שיקוף שגוי / pitch לא ממוקד.
- **`validateReply` דמיון ≥0.8** עלול לפסול תשובות תקינות ולהפיל ל-fallback שחוזר על עצמו.

---

## חלק 11 — Executive Summary

- **כמה סוכנים:** 4 בפייפליין (Classifier, State Machine, Anti-Loop, Writer) + 2 עזר (Handoff Summary, Quiz Intake) + 6 pre-checks דטרמיניסטיים + 1 סוכן מת (legacy Sales Agent). **סה"כ ~6 חיים.**
- **כמה מסמכי ידע:** 4 מקורות ידע (botPromptDefaults/system_settings, stagePrompts, personas, testimonials) — מתוכם **2 מתים** (personas, testimonials) ו-2 חיים עם כפילויות.
- **מסע הלקוח בפועל:** ManyChat → webhook (pre-checks) → Classifier → State Machine → Anti-Loop → Writer → push. שלבים: initial→discovery→qualifying→pitching→(objection)→booking→closed. דחיפה מהירה לפגישה.
- **שלושת מקורות האמת המרכזיים:**
  1. `system_settings.bot_prompt_sections` (+ `botPromptDefaults.ts`) — הידע/הזהות.
  2. `stateMachine.ts` — מסלול השיחה הדטרמיניסטי.
  3. `bot_conversation_state` (Supabase) — זיכרון השיחה (state + context).
- **חלקים קריטיים להבנת הפרויקט:** `agentPipeline.ts` (תזמור), `stateMachine.ts` (מסלול), `stagePrompts.ts` + `botPromptDefaults.ts` (התנהגות/ידע), `antiLoopGuard.ts` (overrides), `webhook/route.ts` (entry + pre-checks).

### טבלת רכיבים מסכמת

| רכיב | סטטוס | חשיבות | הערות |
|---|---|---|---|
| webhook `lead_message` | פעיל | קריטי | Entry point יחיד; מסתמך על `waitUntil` |
| Classifier | פעיל | קריטי | אין בדיקת confidence → טעות סיווג מזרימה שגוי |
| State Machine | פעיל | קריטי | מסלול דטרמיניסטי; מתעלם מ-objection_type/confidence |
| Anti-Loop Guard | פעיל | גבוה | רק AL-1..AL-6; AL-7/8/9 לא ממומשים; overrides גנריים |
| Response Writer | פעיל | קריטי | gpt-4.1-mini; כפוף ל-validateReply |
| Reply Validator | פעיל | גבוה | סף דמיון 0.8 עלול לפסול-יתר |
| botPromptDefaults / system_settings | פעיל | קריטי | מקור אמת לזהות+מחירים; SPOF |
| stagePrompts | פעיל | גבוה | כפילות התנגדויות/עדויות מול ה-KB |
| personas.ts | קוד מת | נמוך | בשימוש רק ב-salesAgent המת |
| testimonials.ts | קוד מת | נמוך | selectTestimonial לא מיובא |
| salesAgent.ts (legacy) | קוד מת | נמוך | gpt-4.1 יקר; לא מחובר |
| Handoff Summary | פעיל | בינוני | לא מקבל context עשיר |
| Quiz Intake | פעיל-מנותק | בינוני | כותב ל-`leads`, לא ל-`bot_conversation_state` |
| Cron silent-leads | פעיל | בינוני | תזכורות + סגירה אחרי 72h |
| Calendly webhook | פעיל-שבור | גבוה | תלוי ב-utm_content שלא נשלח → meeting_booked לא נרשם |
| `/r/[leadUuid]` redirect | פעיל-לא בשימוש | בינוני | פותר tracking אך הבוט לא משתמש בו |
| `bot_conversation_state` | פעיל | קריטי | מקור אמת לזיכרון; כפילות מול `leads` |
| `ai_runs` | פעיל | בינוני | מעקב עלות/טוקנים |
| `funnel_events` | פעיל | בינוני | meeting_booked כמעט לא נרשם |
| temperature (משתנה) | לא בשימוש | נמוך | נאסף, לא מניע לוגיקה |
| repeated_user_intent_count | חסר מימוש | נמוך | מוזכר ב-AL-7 בלבד |
| מסמך התכנון `whatsapp-ai-bot-plan.md` | מיושן | סיכון | מתאר ארכיטקטורה שונה מהמומש |

---

*דוח זה הוא ניתוח מצב בלבד (snapshot). השלב הבא — לבחור אילו פערים/סיכונים לטפל, ולתעדף.*


