# ארכיטקטורת בוט הוואטסאפ — Hadar Automations

> עדכון אחרון: 2026-06-09

---

## סקירה כללית

הבוט הוא **פייפליין של 4 שלבים** (P4) — שני קריאות LLM ושתי מנועים דטרמיניסטיים — שמטרתו לחמם ולהבשיל לידים מוואטסאפ עד לקביעת שיחה עם הדר.

**דוקטרינת הליב:**
- תחושות אינן עובדות
- פתרונות אינם אבחנה
- מתקדמים לשלב הבא רק כשיש מספיק הבנה

---

## 1. נקודת כניסה

**webhook:** `POST /api/manychat/webhook`
([route.ts](../src/app/api/manychat/webhook/route.ts) — 549 שורות)

1. ManyChat שולח `ManyChatWebhookPayload` עם `subscriber_id`, `lead_uuid`, הודעה
2. בדיקות מקדימות (pre-checks) — ר׳ סעיף 4
3. שמירת הודעה ב-DB
4. הרצת הפייפליין
5. דחיפת תגובה חזרה דרך ManyChat Send API
6. עדכון state + context ב-DB

---

## 2. הסוכנים — 4 שלבי הפייפליין

### שלב 1 — Classifier (LLM)
**קובץ:** [classifier.ts](../src/lib/ai/classifier.ts)
**מודל:** `openai/gpt-4.1-mini` (זול ומהיר — ~$0.0001–0.0005 לתור)

מנתח את ההודעה הנוכחית בתוך ההיסטוריה ומחזיר `ClassifierOutput`:

| שדה | ערכים | תיאור |
|-----|-------|--------|
| `intent` | 16 סוגים | meeting_request, price_inquiry, objection, discovery_answer, process_described, short_answer, chaos_detected, guidance_receptive/resistant, info_request, frustration, opt_out, not_relevant, spam, affirmative, other |
| `confidence` | 0–1 | רמת ביטחון |
| `sentiment` | positive / neutral / negative | |
| `is_objection` | boolean | |
| `objection_type` | 8 סוגים | price, timing, trust, relevance, need_more_info, already_have_solution, too_busy, other |
| `communication_style` | red / yellow / green / blue | DISC detection |
| `new_facts` | אובייקט | business_type, main_challenge, pain_category, temperature, fit signals, clarity signals |
| `missing_slots` | מערך | מה עוד חסר לקידום |
| `should_handoff` | boolean | |
| `should_offer_booking` | boolean | |

**Fit Signals** שמחולצים:
`reason_for_reaching_out`, `active_business`, `problem_in_hadar_domain`, `process_exists`, `has_repeatability`, `open_to_guidance`, `bottleneck_identified`

**Clarity Signals:**
`process_flow_known`, `gap_identified`, `feelings_only`

---

### שלב 1ב — Understanding Engine (דטרמיניסטי)
**קובץ:** [understandingEngine.ts](../src/lib/agents/understandingEngine.ts)
**אין LLM — חישוב נקודות בלבד**

#### Fit Score (0–100)
| קריטריון | נקודות |
|----------|--------|
| active_business = true | +25 |
| problem_in_hadar_domain = true | +25 |
| process_exists = true | +25 |
| open_to_guidance = true | +25 |

#### Clarity Score (0–100)
| קריטריון | נקודות |
|----------|--------|
| reason_for_reaching_out קיים | +20 |
| business_type קיים | +20 |
| main_challenge קיים | +20 |
| process_flow_known = true | +20 |
| gap_identified = true | +20 |

#### recommended_next_step
| תנאי | המלצה |
|------|--------|
| problem_in_hadar_domain=false OR active_business=false | `D_NOT_RELEVANT` |
| fit≥75 AND clarity≥80 AND open_to_guidance=true | `A_DIAGNOSTIC` (שיחה 60 דק׳, 350₪) |
| fit≥50 AND clarity≥60 | `B_INTRO_CALL` (זום 20 דק׳, חינם) |
| אחרת | `C_HOMEWORK` (יומן כאוס) |

---

### שלב 2 — State Machine (דטרמיניסטי)
**קובץ:** [stateMachine.ts](../src/lib/agents/stateMachine.ts)
**אין LLM — מעברי state לוגיים בלבד**

#### מפת המצבים (13 סה״כ)

```
initial
  └─► discovery
        ├─► diagnostic
        │     └─► summary
        │           └─► vision
        │                 ├─► awaiting_confirmation
        │                 │     ├─► objection
        │                 │     └─► booking ──► closed
        │                 └─► homework (terminal)
        └─► irrelevant (terminal)

[global overrides:]
  opt_out / not_relevant ──► irrelevant
  spam                   ──► spam
  frustration / handoff  ──► escalated
```

#### לוגיקת מעברים

| State נוכחי | תנאי | State הבא |
|------------|------|-----------|
| initial | תמיד | discovery |
| discovery | feelings_only | נשאר |
| discovery | problem_in_hadar_domain=false | irrelevant |
| discovery | process_described / discovery_answer / chaos_detected | diagnostic |
| diagnostic | recommended_next_step ≠ continue | summary |
| summary | affirmative | vision |
| vision | A_DIAGNOSTIC | awaiting_confirmation + pending='diagnostic' |
| vision | B_INTRO_CALL | awaiting_confirmation + pending='intro' |
| vision | C_HOMEWORK | homework |
| awaiting_confirmation | affirmative / meeting_request | booking |
| awaiting_confirmation | objection / price_inquiry | objection |
| objection | affirmative | awaiting_confirmation |

---

### שלב 3 — Anti-Loop Guard (דטרמיניסטי)
**קובץ:** [antiLoopGuard.ts](../src/lib/agents/antiLoopGuard.ts)
**מונע תקיעות וחזרתיות בשיחה**

| כלל | תנאי | פעולה כפויה |
|-----|------|------------|
| AL-1 | מילות פגישה בזמן awaiting_confirmation | book_diagnostic/intro_call מיידי |
| AL-2 | clarification_count ≥ 2 | human_handoff |
| AL-3 | offered_booking_count ≥ 3 | human_handoff |
| AL-4 | objection_count ≥ 2 ב-objection state | request_followup |
| AL-5 | userMsgCount ≥ 4 ללא main_challenge | הזרקת nudge hint לכותב |
| AL-7a | diagnostic ≥ 5 תורות + clarity_score < 40 | assign_homework |
| AL-7b | diagnostic ≥ 3 תורות + domain=false + active=false | mark_irrelevant |
| AL-7c | diagnostic ≥ 3 תורות + process=false + repeatability=false | assign_homework |

---

### שלב 4 — Response Writer (LLM)
**קובץ:** [responseWriter.ts](../src/lib/ai/responseWriter.ts)
**מודל:** `anthropic/claude-sonnet-4-6` (~$0.001–0.01 לתור)

כותב את הודעת הוואטסאפ בפועל. מקבל:
- היסטוריית שיחה
- ה-state הבא (מה-state machine)
- forcedAction (מה-anti-loop guard)
- ClassifierOutput
- context מועשר (fit_score, clarity_score, nudge)

מחזיר `AgentOutput`:

```typescript
{
  reply: string,             // הודעת וואטסאפ (עד 400 תווים)
  action: ActionType,        // 10 סוגי פעולה
  state: string,             // state הבא
  extracted_facts: object,   // עובדות חדשות
  known_facts: string[],     // עובדות שאושרו
  usage: { prompt_tokens, completion_tokens, cost_usd }
}
```

#### בנייה system prompt
1. Stage-specific prompt (13 prompts — [stagePrompts.ts](../src/lib/ai/prompts/stagePrompts.ts))
2. כללי אנטי-הזיה + אנטי-חזרה
3. ניתוח classifier (intent, sentiment, objection)
4. בסיס ידע (זהות, מוצרים, קהל, התנגדויות, המלצות)
5. context (known_facts, asked_questions, scores)
6. DISC addendum (אם communication_style זוהה)
7. nudge (אם AL-5 הזריק)

#### Validation (replyValidator.ts)
- לא בבלוק-ליסט: "אני הבוט", "שמחה שפנית", "תודה ששיתפת" וכו׳
- מקסימום סימן שאלה אחד
- אסור רשימות bullets (2+ שורות עם -)
- מקסימום 400 תווים
- לא דומה מדי לתשובות קודמות (similarity < 0.8)
- חפיפת מילות שאלה < 0.45 מול asked_questions

---

## 3. האורקסטרטור

**קובץ:** [agentPipeline.ts](../src/lib/ai/agentPipeline.ts) (293 שורות)

**סדר הרצה:**
1. Remap legacy states
2. הרץ Classifier
3. שמור ai_run (classifier)
4. העשר context עם new_facts
5. חשב fit_score / clarity_score / recommended_next_step
6. הרץ State Machine
7. הרץ Anti-Loop Guard (override אם הופעל)
8. בנה discovery nudge (AL-5)
9. הרץ Response Writer
10. שמור ai_run (writer)
11. בנה contextPatch (מיזוג עובדות + מונים)

---

## 4. בדיקות מקדימות (Pre-Checks)

מתבצעות ב-webhook **לפני** הפייפליין:

| בדיקה | תנאי | תוצאה |
|-------|------|--------|
| Opt-out | regex הסר/עצור/STOP | irrelevant, אין פייפליין |
| Msg count | userMsgCount ≥ 10 | human_handoff אוטומטי |
| Audience filter | לא ישראל / גבר / חברת מוצר | mark_irrelevant |
| Opening fix | הודעה ראשונה | טקסט קבוע (ללא LLM), state=discovery |
| Meeting detect | awaiting_confirmation + מילות פגישה | book מיידי (ללא פייפליין) |
| Meta frustration | תסכול מטא-שיחה | human_handoff |

---

## 5. זיכרון ארוך טווח — מבנה ה-Context

### טבלאות DB (Supabase)

| טבלה | מטרה |
|------|------|
| `conversation_messages` | כל הודעה (user + assistant) עם metadata |
| `bot_conversation_state` | state + context JSONB לכל lead_uuid |
| `ai_runs` | מעקב עלויות LLM פר תור |
| `manychat_events` | לוג webhooks |
| `pending_followups` | תזכורות למי שאמר "לא עכשיו" |

### סכמת Context (bot_conversation_state.context)

```typescript
{
  // עובדות ליד
  known_facts: string[]           // רשימת עובדות שנאמרו
  asked_questions: string[]       // שאלות שכבר נשאלו (עד 20)
  main_challenge: string | null
  business_type: string | null
  pain_category: string | null
  temperature: 'cold' | 'warm' | 'hot'

  // fit signals
  reason_for_reaching_out: string | null
  active_business: boolean | null
  problem_in_hadar_domain: boolean | null
  process_exists: boolean | null
  has_repeatability: boolean | null
  open_to_guidance: boolean | null
  bottleneck_identified: string | null

  // clarity signals
  process_flow_known: boolean | null
  gap_identified: boolean | null
  feelings_only: boolean

  // ציונים והמלצה
  fit_score: number               // 0–100
  clarity_score: number           // 0–100
  recommended_next_step: string

  // מונים anti-loop
  offered_booking_count: number
  objection_count: number
  clarification_count: number
  diagnostic_turn_count: number
  last_asked_question: string | null
  last_intent: string | null

  // booking
  pending_booking_type: 'diagnostic' | 'intro' | null

  // DISC
  communication_style: 'red' | 'yellow' | 'green' | 'blue' | null

  // nudge מ-AL-5
  nudge: string | null
}
```

**עדכון Context:** כל תור מחזיר `contextPatch` — מיזוג על הקיים (patch, לא overwrite).

---

## 6. סגנונות DISC

הClassifier מזהה את סגנון התקשורת. הWriter מתאים בהתאם:

| סגנון | תיאור | השפעה על תגובה |
|-------|-------|----------------|
| Red | ישיר, תוצאות | 2 שורות, benefits ראשונים |
| Yellow | אנרגטי, קשר | חמימות, דוגמאות, אמוג׳י |
| Green | אמפתי, איטי | הכרה, שלב-שלב, אין לחץ |
| Blue | אנליטי, נתונים | תשובות ספציפיות, ROI |

---

## 7. פעולות ותוצאות

| פעולה | טריגר | שינוי state | אפקט |
|-------|-------|------------|------|
| continue | ברירת מחדל | לפי state machine | שלח תגובה |
| propose_diagnostic_call | A_DIAGNOSTIC | → awaiting_confirmation | הצע (ללא קישור) |
| propose_intro_call | B_INTRO_CALL | → awaiting_confirmation | הצע (ללא קישור) |
| book_diagnostic_call | אישור בawait | → booking → closed | שלח + CALCOM_URL_DIAGNOSTIC |
| book_intro_call | אישור בawait | → booking → closed | שלח + CALCOM_URL_INTRO |
| assign_homework | C_HOMEWORK / AL-7 | → homework | יומן כאוס |
| mark_irrelevant | D_NOT_RELEVANT | → irrelevant | "תודה שפנית..." |
| request_followup | "לא עכשיו" / AL-4 | + remind_at+7 ימים | schedule followup |
| mark_spam | ספאם | → spam | שתיקה |
| human_handoff | תסכול / AL-2,3 | → escalated | Slack + תגובה |

---

## 8. Handoff לאדם

כשמופעל `human_handoff`:
1. **handoffSummaryAgent.ts** — מפיק סיכום (LLM) עם headline, summary, key_facts
2. **slackHandoff.ts** — שולח לSlack עם עובדות הליד
3. State → escalated (terminal)

---

## 9. עלויות LLM

| שלב | מודל | עלות לתור |
|-----|------|-----------|
| Classifier | gpt-4.1-mini | ~$0.0001–0.0005 |
| Response Writer | claude-sonnet-4-6 | ~$0.001–0.01 |
| **סה״כ** | | ~$0.001–0.015 |

כל קריאה נרשמת בטבלת `ai_runs` עם breakdown מלא של tokens + cost_usd.

---

## 10. מפת קבצים

```
operational-system/src/
├── app/api/
│   └── manychat/webhook/route.ts       ← נקודת כניסה ראשית (549 שורות)
└── lib/
    ├── ai/
    │   ├── agentPipeline.ts             ← אורקסטרטור (293 שורות)
    │   ├── classifier.ts                ← שלב 1 — LLM classifier (313 שורות)
    │   ├── responseWriter.ts            ← שלב 4 — LLM writer (247 שורות)
    │   ├── salesAgent.ts                ← legacy (לא בשימוש פעיל)
    │   ├── redact.ts                    ← הסרת PII לפני שליחה ל-LLM
    │   └── prompts/
    │       ├── stagePrompts.ts          ← 13 stage prompts (419 שורות)
    │       ├── botPromptDefaults.ts     ← brand voice, מוצרים, כללים (220 שורות)
    │       └── salesAgentSystemPrompt.ts
    ├── agents/
    │   ├── stateMachine.ts              ← שלב 2 — מעברי state (200 שורות)
    │   ├── antiLoopGuard.ts             ← שלב 3 — מניעת לופים (237 שורות)
    │   ├── understandingEngine.ts       ← ציוני fit & clarity (102 שורות)
    │   ├── replyValidator.ts            ← בדיקות תגובה (124 שורות)
    │   ├── handoffSummaryAgent.ts       ← סיכום לslack בהסלמה
    │   ├── quizIntakeAgent.ts           ← מיפוי quiz → opening hook
    │   └── preCheck/
    │       ├── audienceFilter.ts        ← פילטר קהל לא מתאים
    │       ├── detectMeetingIntent.ts   ← זיהוי מילות פגישה
    │       └── detectMetaFrustration.ts ← זיהוי תסכול
    ├── db/
    │   └── conversationMessages.ts      ← helpers לDB (257 שורות)
    ├── manychat/
    │   ├── types.ts
    │   ├── verifyWebhookSecret.ts
    │   └── sendApi.ts                   ← דחיפת תגובה ל-ManyChat
    └── notifications/
        ├── whatsapp.ts
        └── slackHandoff.ts
```

---

## 11. זרימת תור מלאה — דוגמה

**הודעה:** "יש לי עסק של טיפול פיזיו ולא מספיקה לענות לכל הפניות"
**state קיים:** discovery

```
Webhook ← ManyChat
  ↓ pre-checks (pass)
  ↓ שמור הודעה
  ↓ getBotState → {state: 'discovery', context: {}}
  ↓
  ┌── Classifier ──────────────────────────────────────────────┐
  │  intent: process_described                                  │
  │  new_facts: {business_type:'פיזיו', active_business:true,  │
  │              problem_in_hadar_domain:true}                  │
  └────────────────────────────────────────────────────────────┘
  ↓
  ┌── Understanding Engine ─────────────────────────────────────┐
  │  fit_score: 50 | clarity_score: 40                          │
  │  recommended_next_step: continue_diagnostic                 │
  └────────────────────────────────────────────────────────────┘
  ↓
  ┌── State Machine ────────────────────────────────────────────┐
  │  discovery + process_described → diagnostic                 │
  └────────────────────────────────────────────────────────────┘
  ↓
  ┌── Anti-Loop Guard ──────────────────────────────────────────┐
  │  userMsgCount=2, אין לופ → null                             │
  └────────────────────────────────────────────────────────────┘
  ↓
  ┌── Response Writer ──────────────────────────────────────────┐
  │  nextState: diagnostic                                       │
  │  reply: "כשמגיעה פנייה — מה הצעד הראשון שאת עושה?"         │
  │  action: continue                                           │
  └────────────────────────────────────────────────────────────┘
  ↓
  upsertBotState → {state:'diagnostic', context:{...merged...}}
  ↓
  pushManyChatReply → הודעה ל-WhatsApp
```

---

## 12. עקרונות עיצוב מרכזיים

1. **שני מודלים, תפקידים שונים** — classifier זול ומהיר; writer שומר על קול המותג
2. **שכבה דטרמיניסטית** — state machine + anti-loop guard לא מאפשרים ל-LLM לשבור את הזרימה
3. **context כזיכרון** — שורה אחת ב-DB לכל ליד, patch semantics — שורד כל round-trip
4. **אין שאלות חוזרות** — asked_questions + word-overlap check ב-validator
5. **forced actions** — anti-loop יכול לכפות פעולה (ספר AL-1: book מיידי אם מבקש פגישה)
6. **pre-checks לפני pipeline** — מסנן spam/לא-מתאים לפני שריפת tokens
