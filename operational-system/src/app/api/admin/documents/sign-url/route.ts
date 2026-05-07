import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  storagePath: z.string().min(1).max(500),
});

/** Returns a short-lived signed URL for a private Storage object. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid body' },
      { status: 400 },
    );
  }

  const { storagePath } = parsed.data;

  if (storagePath.includes('..') || storagePath.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? 'Could not sign URL' },
      { status: 404 },
    );
  }

  return NextResponse.json({ url: data.signedUrl });
}
