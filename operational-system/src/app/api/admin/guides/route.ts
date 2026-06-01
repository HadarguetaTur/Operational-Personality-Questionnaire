import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'ה-slug חייב להיות באותיות לטיניות קטנות ומקפים בלבד');

const createSchema = z.object({
  slug:     slugSchema,
  name:     z.string().min(1).max(200),
  file_url: z.string().url('כתובת URL לא תקינה').max(2000),
});

const updateSchema = z.object({
  id:        z.string().uuid(),
  name:      z.string().min(1).max(200).optional(),
  file_url:  z.string().url('כתובת URL לא תקינה').max(2000).optional(),
  is_active: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('guide_download_stats')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ guides: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'שגיאת אימות' },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('guides')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation (slug already exists)
    const status = error.code === '23505' ? 409 : 500;
    const message = error.code === '23505'
      ? `הכתובת הקצרה "${parsed.data.slug}" כבר קיימת`
      : error.message;
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ guide: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'שגיאת אימות' },
      { status: 400 }
    );
  }

  const { id, ...updates } = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'אין שדות לעדכון' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('guides')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ guide: data });
}
