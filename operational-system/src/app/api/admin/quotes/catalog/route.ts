import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { catalogItemSchema, quoteSettingsSchema } from '@/lib/quotes/types';
import { getQuoteSettings } from '@/lib/quotes/settings';

/** GET — all catalog items (incl. inactive) + quote document settings. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const supabase = createServiceRoleClient();
  const [{ data, error }, settings] = await Promise.all([
    supabase.from('quote_catalog_items').select('*').order('sort_order').order('name'),
    getQuoteSettings(),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [], settings });
}

const upsertBody = z.union([
  z.object({ item: catalogItemSchema }),
  z.object({ deleteId: z.string().uuid() }),
  z.object({ settings: quoteSettingsSchema }),
]);

/** POST — upsert one item, delete one item, or save quote settings. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  const parsed = upsertBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' }, { status: 400 });
  }
  const supabase = createServiceRoleClient();

  if ('deleteId' in parsed.data) {
    const { error } = await supabase.from('quote_catalog_items').delete().eq('id', parsed.data.deleteId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if ('settings' in parsed.data) {
    const { error } = await supabase
      .from('system_settings')
      .upsert(
        { key: 'quote_settings', value: parsed.data.settings, updated_at: new Date().toISOString(), updated_by: auth.user.id },
        { onConflict: 'key' },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { id, ...fields } = parsed.data.item;
  const query = id
    ? supabase.from('quote_catalog_items').update(fields).eq('id', id).select('*').single()
    : supabase.from('quote_catalog_items').insert(fields).select('*').single();
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
