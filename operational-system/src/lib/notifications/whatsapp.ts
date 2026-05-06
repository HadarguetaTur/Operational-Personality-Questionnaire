/**
 * WhatsApp/SMS notification provider abstraction.
 * Supports both Twilio and Green API providers.
 */

export type NotificationProvider = 'twilio' | 'green_api' | 'none';

interface SendMessageResult {
  success: boolean;
  provider: NotificationProvider;
  messageId?: string;
  error?: string;
}

function detectProvider(): NotificationProvider {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return 'twilio';
  }
  if (process.env.GREEN_API_INSTANCE && process.env.GREEN_API_TOKEN) {
    return 'green_api';
  }
  return 'none';
}

function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]+/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '972' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

async function sendViaTwilio(phone: string, message: string): Promise<SendMessageResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_FROM_NUMBER;

  if (!fromNumber) {
    return { success: false, provider: 'twilio', error: 'Missing TWILIO_WHATSAPP_FROM or TWILIO_FROM_NUMBER' };
  }

  const isWhatsApp = fromNumber.startsWith('whatsapp:');
  const toNumber = isWhatsApp ? `whatsapp:${formatPhoneForWhatsApp(phone)}` : formatPhoneForWhatsApp(phone);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const body = new URLSearchParams({
    From: fromNumber,
    To: toNumber,
    Body: message,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.text();
    return { success: false, provider: 'twilio', error: errorData };
  }

  const data = await response.json();
  return { success: true, provider: 'twilio', messageId: data.sid };
}

async function sendViaGreenApi(phone: string, message: string): Promise<SendMessageResult> {
  const instanceId = process.env.GREEN_API_INSTANCE!;
  const token = process.env.GREEN_API_TOKEN!;

  const chatId = formatPhoneForWhatsApp(phone).replace('+', '') + '@c.us';

  const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId,
      message,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    return { success: false, provider: 'green_api', error: errorData };
  }

  const data = await response.json();
  return { success: true, provider: 'green_api', messageId: data.idMessage };
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<SendMessageResult> {
  const provider = detectProvider();

  if (provider === 'none') {
    console.log(`[WhatsApp] No provider configured. Message not sent to ${phone}: ${message}`);
    return { success: false, provider: 'none', error: 'No WhatsApp/SMS provider configured' };
  }

  try {
    if (provider === 'twilio') {
      return await sendViaTwilio(phone, message);
    } else {
      return await sendViaGreenApi(phone, message);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[WhatsApp] ${provider} error:`, errorMsg);
    return { success: false, provider, error: errorMsg };
  }
}

/**
 * Injects variables into a message template.
 * Variables format: {{variable_name}}
 */
export function injectMessageVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}
