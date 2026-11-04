import { google } from 'googleapis';
import { getGoogleAuth } from './auth';

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  content: Buffer;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  attachments?: EmailAttachment[];
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
    cc: options.cc,
    subject: options.subject,
    htmlBody: options.htmlBody,
    replyTo,
    attachments: options.attachments,
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

function encodeHeaderUtf8(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value).toString('base64')}?=`;
}

function base64Lines(buf: Buffer): string {
  return buf.toString('base64').replace(/(.{76})/g, '$1\r\n');
}

function createRawEmail(params: {
  from: string;
  to: string;
  cc?: string[];
  subject: string;
  htmlBody: string;
  replyTo: string;
  attachments?: EmailAttachment[];
}): string {
  const altBoundary = `alt_${Date.now()}`;
  const mixedBoundary = `mixed_${Date.now()}`;
  const attachments = params.attachments ?? [];

  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    ...(params.cc && params.cc.length ? [`Cc: ${params.cc.join(', ')}`] : []),
    `Reply-To: ${params.replyTo}`,
    `Subject: ${encodeHeaderUtf8(params.subject)}`,
    'MIME-Version: 1.0',
  ];

  const htmlPart = [
    `--${altBoundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(params.htmlBody).toString('base64'),
    `--${altBoundary}--`,
  ].join('\r\n');

  let email: string;
  if (attachments.length === 0) {
    headers.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
    email = `${headers.join('\r\n')}\r\n\r\n${htmlPart}`;
  } else {
    headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
    const parts = [
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      '',
      htmlPart,
      ...attachments.flatMap((a) => [
        `--${mixedBoundary}`,
        `Content-Type: ${a.mimeType}; name="${encodeHeaderUtf8(a.filename)}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${encodeHeaderUtf8(a.filename)}"`,
        '',
        base64Lines(a.content),
      ]),
      `--${mixedBoundary}--`,
    ];
    email = `${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}`;
  }

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
