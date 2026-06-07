import { createServiceRoleClient } from '@/lib/supabase/server';
import { DEFAULT_SECTIONS, BotPromptSections } from './botPromptDefaults';

export type { BotPromptSections } from './botPromptDefaults';
export { DEFAULT_SECTIONS } from './botPromptDefaults';

// ─── Locked section — never editable (breaks JSON output if changed) ──────────

const LOCKED_FORMAT_SECTION = `
## פורמט התשובה
ענִי תמיד ב-JSON בלבד, ללא טקסט לפני או אחרי, בפורמט הבא:
{
  "reply": "הטקסט שישלח לליד",
  "action": "continue | book_meeting | mark_irrelevant | request_followup | mark_spam | human_handoff",
  "state": "initial | discovery | qualifying | pitching | objection | booking | closed | irrelevant | spam | escalated",
  "extracted_facts": {
    "pain_category": "תיאור הכאב המרכזי אם זוהה",
    "business_type": "סוג העסק אם זוהה",
    "main_challenge": "האתגר הספציפי",
    "temperature": "cold | warm | hot"
  },
  "known_facts": ["נקודה חדשה מהתגובה הנוכחית — מה שהלקוחה אמרה עכשיו. מערך ריק [] אם לא נאמר שום דבר חדש."]
}`;

// ─── Assemble full prompt from sections ───────────────────────────────────────

function assembleSections(s: BotPromptSections): string {
  return [
    s.identity,
    s.product,
    s.target_audience,
    s.objections,
    s.testimonials,
    s.rules,
    LOCKED_FORMAT_SECTION,
  ].join('\n\n');
}

// ─── Legacy sync export (kept for backwards compat) ───────────────────────────

export function getSalesAgentSystemPrompt(): string {
  return assembleSections(DEFAULT_SECTIONS);
}

// ─── Async loader with in-memory cache (60s TTL) ─────────────────────────────

let promptCache: { text: string; at: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getSystemPrompt(): Promise<string> {
  if (promptCache && Date.now() - promptCache.at < CACHE_TTL_MS) {
    return promptCache.text;
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'bot_prompt_sections')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('[getSystemPrompt] DB error, using defaults:', error.message);
    }

    const sections: BotPromptSections =
      data?.value && typeof data.value === 'object'
        ? (data.value as BotPromptSections)
        : DEFAULT_SECTIONS;

    const source = data?.value && typeof data.value === 'object' ? 'db' : 'defaults';
    const text = assembleSections(sections);
    // #region agent log
    console.error(`[DEBUG-06149a:getSystemPrompt] source=${source} | identitySnippet=${sections.identity.slice(0,80).replace(/\n/g,' ')}`);
    // #endregion
    promptCache = { text, at: Date.now() };
    return text;
  } catch (err) {
    console.warn('[getSystemPrompt] Unexpected error, using defaults:', err);
    return assembleSections(DEFAULT_SECTIONS);
  }
}

export function invalidatePromptCache(): void {
  promptCache = null;
}
