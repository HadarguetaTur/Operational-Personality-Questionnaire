import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLeadSchema } from '@/lib/validation/schemas';
import { normalizePhone } from '@/lib/phone';

/**
 * POST /api/admin/leads/create — manual lead entry from the admin.
 * Dedupes by normalized phone, then email; returns the existing lead with
 * `existing: true` instead of creating a duplicate.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
      { status: 400 },
    );
  }

  const { name, phone, email, business_name, notes, lead_source, lead_status } = parsed.data;
  const supabase = createServiceRoleClient();

  const normalized = normalizePhone(phone);
  if (normalized) {
    const { data } = await supabase
      .from('leads')
      .select('id, name')
      .eq('phone_normalized', normalized)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      return NextResponse.json({ leadId: data.id, existing: true, matchedBy: 'phone', name: data.name });
    }
  }

  const lowerEmail = email?.toLowerCase() ?? null;
  if (lowerEmail) {
    const { data } = await supabase
      .from('leads')
      .select('id, name')
      .eq('email', lowerEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      return NextResponse.json({ leadId: data.id, existing: true, matchedBy: 'email', name: data.name });
    }
  }

  const { data: created, error } = await supabase
    .from('leads')
    .insert({
      name,
      phone: normalized ?? phone,
      email: lowerEmail,
      business_name,
      notes,
      lead_source,
      lead_status: lead_status ?? 'new',
      marketing_consent: false,
      last_active_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !created) {
    console.error('[admin/leads/create]', error);
    return NextResponse.json({ error: error?.message ?? 'יצירת הליד נכשלה' }, { status: 500 });
  }

  await supabase.from('admin_activity_log').insert({
    user_id: auth.user.id,
    action: 'lead_created_manually',
    entity_type: 'lead',
    entity_id: created.id,
    details: { lead_source },
  }).then(({ error: logErr }) => {
    if (logErr) console.warn('[admin/leads/create] activity log skipped:', logErr.message);
  });

  return NextResponse.json({ leadId: created.id, existing: false });
}
