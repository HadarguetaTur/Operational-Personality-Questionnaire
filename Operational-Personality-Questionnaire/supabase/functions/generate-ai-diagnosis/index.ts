// Supabase Edge Function: generate-ai-diagnosis
// ----------------------------------------------------------------------
// Calls OpenRouter (OpenAI-compatible) to produce a personalized diagnosis
// on top of the deterministic management-pattern engine output.
//
// Flow:
//   1. Receives { lead_id, report_token }
//   2. Loads lead row (service role); requires result_snapshot to exist
//   3. Idempotency: if ai_diagnosis is already populated, returns it
//   4. Builds a structured Hebrew prompt from snapshot + history
//   5. Calls OpenRouter with a primary model + fallback list
//   6. Parses the JSON response, saves to leads.ai_diagnosis (+ meta)
//   7. Returns { ai_diagnosis, meta }
//
// Failure-mode design:
//   - Strict JSON via response_format → either we get parseable JSON or fail
//   - On any failure, we DO NOT throw to the caller's UI; we return 200 with
//     ai_diagnosis: null + reason. The client renders the static template-based
//     report; AI sections are simply omitted.
// ----------------------------------------------------------------------
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const PRIMARY_MODEL = Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o";
const FALLBACK_MODELS = (Deno.env.get("OPENROUTER_FALLBACK_MODELS") ??
  "openai/gpt-4o-mini,anthropic/claude-sonnet-4-6")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const APP_TITLE = Deno.env.get("OPENROUTER_APP_TITLE") ?? "Operational Diagnostic";
const APP_REFERER = Deno.env.get("OPENROUTER_APP_REFERER") ??
  "https://operational-diagnostic.app";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// ── Question-id → human-readable metric label (for evidence prompts) ──
// Mirrors src/engine/report.ts QUESTION_EVIDENCE — kept in sync manually.
const QUESTION_LABELS: Record<string, { context: string }> = {
  S1: { context: "תקרת קיבולת" }, S2: { context: "תפיסת המותג" },
  S3: { context: "ניהול ידע אישי" }, S4: { context: "שכפול הצלחה" },
  S5: { context: "עומס כובעים" }, S6: { context: "אוטומציה ומערכות" },
  S7: { context: "ריכוז הכנסה" }, S8: { context: "מבחן ההיעדרות" },
  T1: { context: "מבחן החופשה" }, T2: { context: "מותג מנוהל" },
  T3: { context: "רצף עבודה" }, T4: { context: "האצלה וביצוע" },
  T5: { context: "תהליכי עבודה" }, T6: { context: "ידע ארגוני" },
  T7: { context: "קליטת עובד" }, T8: { context: "פרויקט דחוף" },
  T9: { context: "ניהול מידע לקוחות" },
  G1: { context: "ריכוזיות בהחלטות" }, G2: { context: "זיהוי חריגות" },
  G3: { context: "בקרת איכות" }, G4: { context: "מבנה ארגוני" },
  G5: { context: "תהליכי עבודה" }, G6: { context: "ניהול ידע" },
  G7: { context: "קליטה וחניכה" }, G8: { context: "צוואר בקבוק" },
  G9: { context: "נתונים ומדדים" },
  ST1: { context: "תכנון לרבעון" }, ST2: { context: "חוסן עסקי" },
  ST3: { context: "השקעה בתשתיות" },
  BD1: { context: "מעבר לעבודה על העסק" }, BD2: { context: "סמכויות כספיות" },
  BC1: { context: "סוף יום עבודה" }, BC2: { context: "תעדוף בלחץ" },
  BP1: { context: "משימות חוזרות" }, BP2: { context: "תיאור העסק" },
  BK1: { context: "העברת ידע" }, BK2: { context: "שחזור משימה" },
  BS1: { context: "הגדרת יעדים" }, BS2: { context: "מדדי הצלחה חודשיים" },
  Q1: { context: "סולם העסק" },
};

const SYSTEM_PROMPT = `את/ה יועץ/ת ניהול תפעולי לעסקים קטנים בישראל. המשתמש סיים שאלון אבחון
שמיפה את דפוס הניהול שלו לפי 5 מדדים. ניתן לך גם את הציונים המנורמלים, גם
את הדפוס הדומיננטי והמשני, וגם את התשובות הספציפיות שלו. תפיק/י אבחנה
אישית, עברית, RTL.

טון: ישיר, חם, מקצועי, ללא קלישאות. בלי הצהרות כלליות. כל משפט חייב לחבר
את הניתוח לתשובה ספציפית או לציון ספציפי. לא מתחכמ/ת. לא דרמטי/ת.

מבנה התשובה: JSON תקני יחיד לפי הסכמה שמופיעה בהודעת המשתמש. אין להחזיר
טקסט מחוץ ל-JSON. אין markdown. אין הסברים.`;

interface RequestBody {
  lead_id?: string;
  report_token?: string;
  force_refresh?: boolean; // skip idempotency check
}

interface HistoryItem { questionId: string; answerText: string }

interface AiDiagnosisMeta {
  model: string;
  provider?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
  generated_at: string;
}

function buildUserPrompt(snapshot: Record<string, unknown>): string {
  const patternName = snapshot.pattern_name ?? snapshot.pattern_id ?? "לא ידוע";
  const secondaryPattern = (snapshot.secondary_pattern as { name?: string } | null)?.name;
  const uncertainty = snapshot.pattern_uncertainty
    ? "ודאות נמוכה — הציונים קרובים"
    : "ודאות גבוהה";
  const scaleLabel = snapshot.scale_stage_label ?? snapshot.scale_stage ?? "לא ידוע";
  const topMetric = snapshot.top_metric ?? "לא ידוע";

  const normalized = (snapshot.normalized_scores ?? {}) as Record<string, number>;
  const scoresText = Object.entries(normalized)
    .map(([k, v]) => `  ${k}: ${typeof v === "number" ? v.toFixed(2) : v}`)
    .join("\n");

  const history = (snapshot.history ?? []) as HistoryItem[];
  const historyText = history
    .map((h, i) => {
      const ctx = QUESTION_LABELS[h.questionId]?.context ?? h.questionId;
      return `  ${i + 1}. [${ctx}] ${h.answerText}`;
    })
    .join("\n");

  const userName = (snapshot.user_info as { name?: string } | undefined)?.name ?? "";

  return `שם הפונה: ${userName || "(לא ידוע)"}

דפוס דומיננטי: ${patternName}
דפוס משני: ${secondaryPattern ?? "אין"}
${uncertainty}
שלב תפעולי: ${scaleLabel}
מדד הסיכון הגבוה ביותר: ${topMetric}

ציונים מנורמלים (0-1, גבוה = יותר סיכון, חוץ מ-Knowledge_Asset_Value שגבוה = טוב):
${scoresText}

תשובות בפועל בשאלון:
${historyText || "  (אין היסטוריה)"}

החזר/י JSON בדיוק לפי הסכמה הבאה (אין להוסיף שדות, אין להשמיט שדות חובה):

{
  "personal_executive_summary": "פסקה אישית בת 4-6 שורות. משלבת את הדפוס הדומיננטי עם 1-2 תשובות ספציפיות. מסתיימת בקריאה לפעולה ברורה.",
  "hidden_pattern": "1-2 משפטים על שילוב סמוי בין מדדים (לדוגמה: עומס קוגניטיבי גבוה ותהליכים חזקים = הפעילות תקינה אבל הבעלת/ת תקועים בתפעול). אם אין דפוס סמוי משמעותי, החזירי מחרוזת ריקה.",
  "personalized_evidence": [
    { "from_question": "שם הקונטקסט בשאלה", "insight": "תובנה אישית של 1-2 משפטים שמחברת את התשובה לדפוס" }
  ],
  "personalized_recommendations": [
    {
      "what": "פעולה קונקרטית",
      "why": "למה זה הראשון לטפל בו עכשיו (קישור לציון או לתשובה)",
      "first_step": "מה לעשות בשעה הראשונה",
      "deadline": "7 ימים | 14 ימים | 30 יום | 60 יום",
      "kpi": "איך מודדים הצלחה תוך הזמן הנקוב"
    }
  ],
  "risk_narrative": "פסקה קצרה (3-4 שורות) שמסבירה למה דחוף לטפל עכשיו, בהקשר של הציונים שעלו.",
  "plan_30_60_90": {
    "30": ["פעולה למימוש בתוך 30 יום", "..."],
    "60": ["פעולה למימוש בתוך 60 יום", "..."],
    "90": ["פעולה למימוש בתוך 90 יום", "..."]
  }
}

הנחיות:
- לפחות 3 פריטים ב-personalized_evidence ולפחות 3 ב-personalized_recommendations.
- כל פריט ב-plan_30_60_90 — בין 2 ל-4 פעולות.
- כל המחרוזות בעברית, מנוסחות ישירות ב-2nd person ("את/ה", "תפעלי/תפעל").
- אין markdown, אין שורות ריקות מיותרות, JSON תקני יחיד בלבד.`;
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  model?: string;
  provider?: string;
  error?: { message?: string };
}

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ data: unknown; meta: AiDiagnosisMeta } | { error: string }> {
  if (!OPENROUTER_API_KEY) {
    return { error: "OPENROUTER_API_KEY not configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": APP_REFERER,
        "X-Title": APP_TITLE,
      },
      body: JSON.stringify({
        model: PRIMARY_MODEL,
        models: [PRIMARY_MODEL, ...FALLBACK_MODELS],
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1800,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: `OpenRouter HTTP ${res.status}: ${text.slice(0, 400)}` };
    }
    const body = (await res.json()) as OpenRouterResponse;
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      return { error: `OpenRouter returned no content: ${JSON.stringify(body).slice(0, 400)}` };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return { error: `JSON parse failed: ${(err as Error).message}` };
    }
    const meta: AiDiagnosisMeta = {
      model: body.model ?? PRIMARY_MODEL,
      provider: body.provider,
      prompt_tokens: body.usage?.prompt_tokens,
      completion_tokens: body.usage?.completion_tokens,
      total_tokens: body.usage?.total_tokens,
      generated_at: new Date().toISOString(),
    };
    return { data: parsed, meta };
  } catch (err) {
    return { error: `Fetch failed: ${(err as Error).message}` };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const leadId = body.lead_id?.trim();
  if (!leadId) return json(400, { error: "Missing lead_id" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Load lead row ─────────────────────────────────────────────────
  const { data: lead, error: lookupErr } = await supabase
    .from("leads")
    .select("id, report_token, result_snapshot, ai_diagnosis, ai_diagnosis_meta")
    .eq("id", leadId)
    .maybeSingle();

  if (lookupErr) return json(500, { error: "DB lookup failed", details: lookupErr.message });
  if (!lead) return json(404, { error: "Lead not found" });
  if (!lead.result_snapshot) {
    return json(409, { error: "Lead has no result_snapshot yet — run finalize-diagnostic first" });
  }
  if (body.report_token && lead.report_token && body.report_token !== lead.report_token) {
    return json(403, { error: "report_token mismatch" });
  }

  // ── Idempotency ───────────────────────────────────────────────────
  if (lead.ai_diagnosis && !body.force_refresh) {
    return json(200, {
      ai_diagnosis: lead.ai_diagnosis,
      meta: lead.ai_diagnosis_meta,
      cached: true,
    });
  }

  // ── Generate ──────────────────────────────────────────────────────
  const userPrompt = buildUserPrompt(lead.result_snapshot as Record<string, unknown>);
  const result = await callOpenRouter(SYSTEM_PROMPT, userPrompt);

  if ("error" in result) {
    console.error("[generate-ai-diagnosis] OpenRouter call failed", result.error);
    // Don't break the user-visible flow — return 200 with null diagnosis.
    // The client gracefully omits AI sections.
    return json(200, { ai_diagnosis: null, error: result.error });
  }

  // ── Persist ───────────────────────────────────────────────────────
  const { error: updateErr } = await supabase
    .from("leads")
    .update({
      ai_diagnosis: result.data,
      ai_diagnosis_meta: result.meta,
    })
    .eq("id", leadId);

  if (updateErr) {
    console.error("[generate-ai-diagnosis] DB update failed", updateErr);
    // We still return the diagnosis to the caller — the in-memory copy is fine
    // for this session even if the DB write failed. Next request will retry.
  }

  return json(200, {
    ai_diagnosis: result.data,
    meta: result.meta,
    cached: false,
  });
});
