import { createServiceRoleClient } from '@/lib/supabase/server';
import { injectTemplateVariables } from '@/lib/google/gmail';
import { buildReportLink } from '@/lib/quiz/buildReportLink';

interface MailingContext {
  leadId: string;
  name: string;
  email: string;
  phone?: string;
  funnelId?: string;
  stageId?: string;
  pattern?: string;
  reportToken?: string;
  customVariables?: Record<string, string>;
}

/**
 * Sends a stage-triggered email to a lead.
 * Finds the appropriate email template for the stage and sends it.
 */
export async function sendStageEmail(context: MailingContext): Promise<{ sent: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  // Find the email template for this stage
  let templateQuery = supabase.from('email_templates').select('*');

  if (context.stageId) {
    templateQuery = templateQuery.eq('stage_trigger', context.stageId);
  } else if (context.funnelId) {
    templateQuery = templateQuery.eq('funnel_id', context.funnelId);
  }

  const { data: templates } = await templateQuery.limit(1);
  const template = templates?.[0];

  if (!template) {
    return { sent: false, error: 'No template found for this stage' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const calComUrl = process.env.NEXT_PUBLIC_CALCOM_URL || '';

  const variables: Record<string, string> = {
    name: context.name || '',
    email: context.email || '',
    pattern: context.pattern || '',
    report_url: context.reportToken ? buildReportLink(context.reportToken) : '',
    form_url: `${appUrl}/followup/${context.leadId}`,
    meeting_url: calComUrl,
    ...context.customVariables,
  };

  const htmlBody = injectTemplateVariables(template.html_content, variables);
  const subject = injectTemplateVariables(template.subject, variables);

  const hasGmail = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN;

  if (!hasGmail) {
    // Log the email as pending
    await supabase.from('email_logs').insert({
      lead_id: context.leadId,
      template_id: template.id,
      funnel_id: context.funnelId || null,
      stage_id: context.stageId || null,
      subject,
      recipient_email: context.email,
      status: 'pending',
    });
    return { sent: false, error: 'Gmail not configured' };
  }

  try {
    const { sendEmail } = await import('@/lib/google/gmail');

    await sendEmail({
      to: context.email,
      subject,
      htmlBody,
    });

    await supabase.from('email_logs').insert({
      lead_id: context.leadId,
      template_id: template.id,
      funnel_id: context.funnelId || null,
      stage_id: context.stageId || null,
      subject,
      recipient_email: context.email,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return { sent: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';

    await supabase.from('email_logs').insert({
      lead_id: context.leadId,
      template_id: template.id,
      funnel_id: context.funnelId || null,
      stage_id: context.stageId || null,
      subject,
      recipient_email: context.email,
      status: 'failed',
      error: errorMsg,
    });

    return { sent: false, error: errorMsg };
  }
}

/**
 * Advances a lead to the next stage in their funnel.
 * Triggers the associated email and/or notifications.
 */
export async function advanceLeadToNextStage(leadId: string): Promise<{ nextStageId: string | null }> {
  const supabase = createServiceRoleClient();

  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, email, phone, funnel_id, current_stage_id, report_token, result_pattern')
    .eq('id', leadId)
    .single();

  if (!lead || !lead.funnel_id) {
    return { nextStageId: null };
  }

  // Get current stage order
  let currentOrder = -1;
  if (lead.current_stage_id) {
    const { data: currentStage } = await supabase
      .from('funnel_stages')
      .select('order')
      .eq('id', lead.current_stage_id)
      .single();
    currentOrder = currentStage?.order ?? -1;
  }

  // Find next active stage
  const { data: nextStage } = await supabase
    .from('funnel_stages')
    .select('id, type, email_template_id')
    .eq('funnel_id', lead.funnel_id)
    .eq('is_active', true)
    .gt('order', currentOrder)
    .order('order', { ascending: true })
    .limit(1)
    .single();

  if (!nextStage) {
    return { nextStageId: null };
  }

  // Update lead's current stage
  await supabase
    .from('leads')
    .update({ current_stage_id: nextStage.id })
    .eq('id', leadId);

  // Send stage email if configured
  if (nextStage.email_template_id) {
    await sendStageEmail({
      leadId: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? undefined,
      funnelId: lead.funnel_id ?? undefined,
      stageId: nextStage.id,
      pattern: lead.result_pattern ?? undefined,
      reportToken: lead.report_token ?? undefined,
    });
  }

  return { nextStageId: nextStage.id };
}
