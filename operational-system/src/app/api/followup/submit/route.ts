import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rateLimit';
import { getRequestClientIp, isTurnstileEnabled, verifyTurnstileToken } from '@/lib/security/turnstile';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runDriveFolderForLead, runFollowupNotifications } from '@/lib/followup/sideEffects';
import { followupSubmitFormSchema } from '@/lib/validation/schemas';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
]);

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-א-ת]/g, '_').slice(0, 180) || 'file';
}

async function authorizeLeadAccess(
  supabase: ReturnType<typeof createServiceRoleClient>,
  leadId: string,
  token: string | undefined,
): Promise<
  | { ok: true }
  | { ok: false; status: number; message: string }
> {
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, followup_access_token, followup_submitted_at, payment_status')
    .eq('id', leadId)
    .maybeSingle();

  if (error || !lead) return { ok: false, status: 404, message: 'לא נמצא' };

  if (lead.followup_submitted_at) {
    return { ok: false, status: 409, message: 'הטופס כבר נשלח' };
  }

  if (lead.followup_access_token) {
    if (!token || token !== lead.followup_access_token) {
      return { ok: false, status: 403, message: 'לא מורשה' };
    }
  } else if (lead.payment_status !== 'paid') {
    return { ok: false, status: 403, message: 'לא מורשה' };
  }

  return { ok: true };
}

const uuid = z.string().uuid();

export async function POST(request: NextRequest) {
  try {
    if (!checkRateLimit(request, 'followup-submit', 10, 300_000)) {
      return NextResponse.json(
        { error: 'יותר מדי ניסיונות שליחה. נסי שוב בעוד כמה דקות.' },
        { status: 429 },
      );
    }

    const formData = await request.formData();

    const rawTurnstile = formData.get('turnstileToken');
    const turnstileToken =
      typeof rawTurnstile === 'string' && rawTurnstile.trim() !== ''
        ? rawTurnstile.trim()
        : undefined;

    if (isTurnstileEnabled()) {
      if (!turnstileToken) {
        return NextResponse.json({ error: 'נא לאמת שאינך רובוט' }, { status: 400 });
      }
      const tsOk = await verifyTurnstileToken(turnstileToken, getRequestClientIp(request));
      if (!tsOk) {
        return NextResponse.json(
          { error: 'אימות אבטחה נכשל. נסי שוב.' },
          { status: 400 },
        );
      }
    }

    const leadParsed = uuid.safeParse(formData.get('leadId'));

    const rawToken = formData.get('token');
    const tokenStr =
      typeof rawToken === 'string' && rawToken.trim() !== ''
        ? rawToken.trim()
        : undefined;
    if (tokenStr && tokenStr.length > 256) {
      return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
    }

    if (!leadParsed.success) {
      return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
    }

    const rawForm = formData.get('formData');
    if (typeof rawForm !== 'string') {
      return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
    }

    let formPayloadParsed: Record<string, string | boolean>;
    try {
      const parsed = JSON.parse(rawForm) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return NextResponse.json({ error: 'formData לא תקין' }, { status: 400 });
      }
      const validated = followupSubmitFormSchema.safeParse(parsed);
      if (!validated.success) {
        const first = validated.error.issues[0]?.message ?? 'formData לא תקין';
        return NextResponse.json({ error: first }, { status: 400 });
      }
      formPayloadParsed = validated.data;
    } catch {
      return NextResponse.json({ error: 'formData JSON לא תקין' }, { status: 400 });
    }

    const leadId = leadParsed.data;
    const supabase = createServiceRoleClient();
    const auth = await authorizeLeadAccess(supabase, leadId, tokenStr);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const uploadedFiles: File[] = [];
    for (const [, value] of formData.entries()) {
      if (value instanceof File && value.size > 0) {
        uploadedFiles.push(value);
      }
    }
    if (uploadedFiles.length > MAX_FILES) {
      return NextResponse.json(
        { error: `מרבית ${MAX_FILES} קבצים` },
        { status: 400 },
      );
    }

    const uploadedMeta: Array<{
      fileName: string;
      mimeType: string;
      fileSize: number;
      storagePath: string;
    }> = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) {
        return NextResponse.json({ error: 'קובץ חורג מ-5MB' }, { status: 400 });
      }

      let mime = file.type || '';
      if (!mime || !ALLOWED_TYPES.has(mime)) {
        const ext = (file.name.split('.').pop() ?? '').toLowerCase();
        const guess = EXT_MIME[ext];
        if (!guess || !ALLOWED_TYPES.has(guess)) {
          return NextResponse.json(
            { error: `סוג קובץ לא מותר: ${file.name}` },
            { status: 400 },
          );
        }
        mime = guess;
      }

      const safeName = sanitizeFileName(file.name);
      const storagePath = `followup/${leadId}/${Date.now()}_${i}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, buf, { contentType: mime, upsert: false });

      if (uploadError) {
        console.error('[followup/submit] storage upload:', uploadError);
        return NextResponse.json({ error: 'העלאה נכשלה' }, { status: 500 });
      }

      uploadedMeta.push({
        fileName: file.name.slice(0, 400),
        mimeType: mime,
        fileSize: buf.byteLength,
        storagePath,
      });
    }

    await supabase.from('followup_submissions').insert({
      lead_id: leadId,
      form_data: formPayloadParsed as Record<string, unknown>,
    });

    for (const doc of uploadedMeta) {
      await supabase.from('documents').insert({
        lead_id: leadId,
        file_name: doc.fileName,
        file_url: '',
        mime_type: doc.mimeType,
        file_size: doc.fileSize,
        storage_path: doc.storagePath,
      });
    }

    await supabase
      .from('leads')
      .update({ followup_submitted_at: new Date().toISOString(), lead_status: 'completed' })
      .eq('id', leadId);

    await runDriveFolderForLead(leadId);
    await runFollowupNotifications(leadId);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[followup/submit]', e);
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 });
  }
}
