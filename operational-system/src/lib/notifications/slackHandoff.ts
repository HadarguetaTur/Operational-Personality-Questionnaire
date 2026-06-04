export async function notifySlackHandoff(input: {
  leadUuid: string;
  headline: string;
  summary: string;
  keyFacts: string[];
}): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.warn('[slackHandoff] SLACK_WEBHOOK_URL not configured — skipping');
    return;
  }

  const adminBase = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? '';
  const leadLink = adminBase
    ? `${adminBase}/admin/leads/${input.leadUuid}`
    : input.leadUuid;

  const text = [
    `*${input.headline}*`,
    input.summary,
    input.keyFacts.length > 0 ? `*עובדות:* ${input.keyFacts.join(' | ')}` : '',
    `<${leadLink}|פתיחת ליד>`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.error('[slackHandoff] POST failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('[slackHandoff] Error:', err);
  }
}
