import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Creates Google Drive folder for a lead (idempotent) and notifies admin.
 * Server-only; uses service role.
 */
export async function runDriveFolderForLead(leadId: string): Promise<{
  success: boolean;
  folderUrl?: string;
  alreadyExists?: boolean;
  skipped?: boolean;
}> {
  const supabase = createServiceRoleClient();

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, name, email, drive_folder_url')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    return { success: false };
  }

  if (lead.drive_folder_url) {
    return { success: true, alreadyExists: true, folderUrl: lead.drive_folder_url };
  }

  const hasGoogleCreds =
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN;

  if (!hasGoogleCreds) {
    console.log(`[Drive] Google not configured. Folder creation for lead ${leadId} skipped.`);
    return { success: false, skipped: true };
  }

  try {
    const { createLeadFolder } = await import('@/lib/google/drive');
    const { folderUrl } = await createLeadFolder(lead.name, lead.email);
    await supabase.from('leads').update({ drive_folder_url: folderUrl }).eq('id', leadId);

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) {
      try {
        const { sendEmail } = await import('@/lib/google/gmail');
        await sendEmail({
          to: adminEmail,
          subject: `ליד חדש: ${lead.name} - תיקיה נוצרה`,
          htmlBody: `
            <div dir="rtl" style="font-family: Arial, sans-serif;">
              <h2>ליד חדש הגיש טופס המשך</h2>
              <p><strong>שם:</strong> ${lead.name}</p>
              <p><strong>אימייל:</strong> ${lead.email}</p>
              <p><strong>תיקיית דרייב:</strong> <a href="${folderUrl}">${folderUrl}</a></p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('[Drive] Failed to send admin notification:', emailErr);
      }
    }

    return { success: true, folderUrl };
  } catch (e) {
    console.error('[Drive] create-folder error:', e);
    return { success: false };
  }
}

/** Meeting email + WhatsApp after follow-up submission. */
export async function runFollowupNotifications(leadId: string): Promise<{
  email: boolean;
  whatsapp: boolean;
}> {
  const supabase = createServiceRoleClient();
  const calComUrl = process.env.NEXT_PUBLIC_CALCOM_URL || process.env.CALCOM_URL;
  const results = { email: false, whatsapp: false };

  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, email, phone, funnel_id')
    .eq('id', leadId)
    .single();

  if (!lead) return results;

  const hasGmail =
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN;

  if (hasGmail && calComUrl && lead.email) {
    try {
      const { sendEmail, injectTemplateVariables } = await import('@/lib/google/gmail');
      const { data: template } = await supabase
        .from('email_templates')
        .select('html_content, subject')
        .eq('name', 'קביעת פגישה')
        .limit(1)
        .maybeSingle();

      const defaultHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="font-family: 'Heebo', Arial, sans-serif; background: #f8fafc; padding: 40px 20px; direction: rtl;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #1e293b; font-size: 24px; margin-bottom: 16px;">שלום {{name}},</h1>
    <p style="color: #475569; font-size: 16px; line-height: 1.7;">
      תודה שמילאת את כל הפרטים! קיבלתי הכל ואני מתחילה להתכונן.
    </p>
    <p style="color: #475569; font-size: 16px; line-height: 1.7;">
      השלב הבא: בואי נקבע את הפגישה שלנו.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{meeting_url}}" style="background: #14b8a6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        קבעי פגישה עכשיו
      </a>
    </div>
    <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-top: 32px;">
      ארכיטקטורת סקייל
    </p>
  </div>
</body>
</html>`;

      const htmlTemplate = template?.html_content || defaultHtml;
      const subjectTemplate = template?.subject || 'הכל מוכן — נקבע פגישה? 📅';

      const variables: Record<string, string> = {
        name: lead.name || '',
        email: lead.email || '',
        meeting_url: calComUrl || '',
      };

      await sendEmail({
        to: lead.email,
        subject: injectTemplateVariables(subjectTemplate, variables),
        htmlBody: injectTemplateVariables(htmlTemplate, variables),
      });

      await supabase.from('email_logs').insert({
        lead_id: leadId,
        funnel_id: lead.funnel_id,
        template_id: null,
        subject: subjectTemplate,
        recipient_email: lead.email,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      results.email = true;
    } catch (emailErr) {
      console.error('[Notification] Email failed:', emailErr);
    }
  }

  if (lead.phone) {
    try {
      const { sendWhatsAppMessage } = await import('@/lib/notifications/whatsapp');
      const msg = `שלום ${lead.name ?? ''}, תודה שמילאת את הטופס! לקביעת פגישה: ${calComUrl ?? '(קישור יישלח במייל)'}`;
      const wa = await sendWhatsAppMessage(lead.phone, msg);
      await supabase.from('notification_logs').insert({
        lead_id: leadId,
        channel: 'whatsapp',
        recipient_phone: lead.phone,
        message_body: msg,
        template_name: 'followup_complete',
        status: wa.success ? 'sent' : 'failed',
        provider_message_id: wa.messageId || null,
        error: wa.error || null,
        sent_at: wa.success ? new Date().toISOString() : null,
      });
      results.whatsapp = wa.success;
    } catch (waErr) {
      console.error('[Notification] WhatsApp failed:', waErr);
    }
  }

  return results;
}
