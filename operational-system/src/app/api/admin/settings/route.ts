import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from('system_settings').select('key, value');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings: Record<string, unknown> = {};
    (data ?? []).forEach((row: { key: string; value: unknown }) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServiceRoleClient();

    const entries = Object.entries(body);
    for (const [key, value] of entries) {
      await supabase
        .from('system_settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
