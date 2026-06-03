import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { DEFAULT_SECTIONS, BotPromptSections } from '@/lib/ai/prompts/botPromptDefaults';
import { invalidatePromptCache } from '@/lib/ai/prompts/salesAgentSystemPrompt';

const SETTINGS_KEY = 'bot_prompt_sections';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single();

    // PGRST116 = no rows found (key doesn't exist yet) → return defaults
    // 42P01 = table doesn't exist yet → return defaults gracefully
    if (error && error.code !== 'PGRST116') {
      if (error.code === '42P01' || error.message?.includes('schema cache')) {
        console.warn('[bot-config GET] system_settings table not found — returning defaults');
        return NextResponse.json(DEFAULT_SECTIONS);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sections: BotPromptSections = (data?.value as BotPromptSections) ?? DEFAULT_SECTIONS;
    return NextResponse.json(sections);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const sections = body as Partial<BotPromptSections>;
  const requiredKeys: (keyof BotPromptSections)[] = [
    'identity', 'product', 'target_audience', 'objections', 'testimonials', 'rules',
  ];

  for (const k of requiredKeys) {
    if (typeof sections[k] !== 'string') {
      return NextResponse.json({ error: `שדה חסר: ${k}` }, { status: 400 });
    }
  }

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('system_settings')
      .upsert(
        { key: SETTINGS_KEY, value: sections, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    invalidatePromptCache();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
