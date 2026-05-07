import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { followupMetaQuerySchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadIdRaw = searchParams.get('leadId');
    const tokenRaw = searchParams.get('token') ?? searchParams.get('t') ?? undefined;
    const parsed = followupMetaQuerySchema.safeParse({
      leadId: leadIdRaw ?? '',
      token: tokenRaw ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'בקשה לא תקינה' },
        { status: 400 },
      );
    }

    const { leadId, token } = parsed.data;

    const supabase = createServiceRoleClient();
    const { data: lead, error } = await supabase
      .from('leads')
      .select(
        'id, name, email, funnel_id, current_stage_id, followup_submitted_at, payment_status, followup_access_token',
      )
      .eq('id', leadId)
      .maybeSingle();

    if (error || !lead) {
      return NextResponse.json({ error: 'לא נמצא' }, { status: 404 });
    }

    if (lead.followup_access_token) {
      if (!token || token !== lead.followup_access_token) {
        return NextResponse.json({ error: 'לא מורשה' }, { status: 403 });
      }
    } else {
      if (lead.payment_status !== 'paid' || lead.followup_submitted_at) {
        return NextResponse.json({ error: 'לא מורשה' }, { status: 403 });
      }
    }

    let fields: unknown = null;
    if (lead.current_stage_id) {
      const { data: config } = await supabase
        .from('questionnaire_configs')
        .select('questions')
        .eq('stage_id', lead.current_stage_id)
        .maybeSingle();

      if (config?.questions && Array.isArray(config.questions)) {
        fields = config.questions;
      }
    }

    return NextResponse.json({
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        followup_submitted_at: lead.followup_submitted_at,
      },
      fields,
    });
  } catch (e) {
    console.error('[followup/metadata]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
