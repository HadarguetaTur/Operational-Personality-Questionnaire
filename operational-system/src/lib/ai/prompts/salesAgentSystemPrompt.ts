import { createServiceRoleClient } from '@/lib/supabase/server';
import { DEFAULT_SECTIONS, BotPromptSections } from './botPromptDefaults';

export type { BotPromptSections } from './botPromptDefaults';
export { DEFAULT_SECTIONS } from './botPromptDefaults';

// ─── Assemble full prompt from sections ───────────────────────────────────────
// Note: the FORMAT block is injected by each stage prompt (stagePrompts.ts).
// Do NOT add a second format block here — it causes JSON schema conflicts.

function assembleSections(s: BotPromptSections): string {
  return [
    s.identity,
    s.product,
    s.target_audience,
    s.objections,
    s.testimonials,
    s.rules,
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
