import { google } from 'googleapis';
import { getGoogleAuth } from './auth';

interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
  replyTo?: string;
}

/**
 * Sends an email via the Gmail API.
 * The sender is the authenticated Google Workspace account.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ messageId: string; threadId: string }> {
  const auth = getGoogleAuth();
  const gmail = google.gmail({ version: 'v1', auth });

  const fromAddress = options.from || process.env.GMAIL_SENDER_ADDRESS || 'me';
  const replyTo = options.replyTo || fromAddress;

  const rawMessage = createRawEmail({
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    htmlBody: options.htmlBody,
    replyTo,
  });

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: rawMessage,
    },
  });

  return {
    messageId: response.data.id ?? '',
    threadId: response.data.threadId ?? '',
  };
}

function createRawEmail(params: {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  replyTo: string;
}): string {
  const boundary = `boundary_${Date.now()}`;

  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Reply-To: ${params.replyTo}`,
    `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join('\r\n');

  const body = [
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(params.htmlBody).toString('base64'),
    `--${boundary}--`,
  ].join('\r\n');

  const email = `${headers}\r\n\r\n${body}`;

  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Injects variables into an HTML template.
 * Variables format: {{variable_name}}
 */
export function injectTemplateVariables(
  html: string,
  variables: Record<string, string>
): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}
