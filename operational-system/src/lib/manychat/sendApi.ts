/**
 * ManyChat Send API client — Phase 0 (text messages only).
 *
 * All functions use MANYCHAT_API_TOKEN from environment variables.
 * This file is server-only — never import it in client components.
 *
 * IMPORTANT — REQUIRES MANUAL VALIDATION:
 * The /fb/sending/sendContent endpoint is documented primarily for Messenger.
 * For WhatsApp channels, the `content.type` and message structure may differ.
 * Before enabling test_send_message in production, verify the exact payload
 * format in the ManyChat API docs under "WhatsApp" or "Dynamic Messages".
 * @see https://api.manychat.com
 */

const MANYCHAT_API_BASE = 'https://api.manychat.com';

function getApiToken(): string {
  const token = process.env.MANYCHAT_API_TOKEN?.trim();
  if (!token) throw new Error('[ManyChatSendApi] MANYCHAT_API_TOKEN is not configured');
  return token;
}

/**
 * Sends a plain-text message to a ManyChat subscriber via the Send API.
 *
 * REQUIRES MANUAL VALIDATION:
 * Confirm the `data.content` structure matches WhatsApp channel requirements.
 * ManyChat may require `"type": "whatsapp"` or additional channel-specific fields.
 */
export async function sendManyChatText(
  subscriberId: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  const token = getApiToken();

  const body = {
    subscriber_id: subscriberId,
    data: {
      version: 'v2',
      content: {
        messages: [{ type: 'text', text }],
      },
    },
  };

  let response: Response;
  try {
    response = await fetch(`${MANYCHAT_API_BASE}/fb/sending/sendContent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    console.error('[ManyChatSendApi] sendManyChatText fetch failed:', msg);
    return { success: false, error: msg };
  }

  if (!response.ok) {
    const responseText = await response.text().catch(() => '(unreadable)');
    console.error('[ManyChatSendApi] sendManyChatText HTTP error:', response.status, responseText);
    return { success: false, error: `HTTP ${response.status}: ${responseText}` };
  }

  const json = await response.json().catch(() => null);
  if (json?.status !== 'success') {
    console.error('[ManyChatSendApi] sendManyChatText non-success response:', json);
    return { success: false, error: `ManyChat status: ${json?.status ?? 'unknown'}` };
  }

  return { success: true };
}

/**
 * Sets a custom field value on a ManyChat subscriber by field name.
 * Phase 0: defined for completeness — not yet called by the webhook route.
 *
 * REQUIRES MANUAL VALIDATION: confirm endpoint and field_name vs field_id behavior.
 */
export async function setManyChatCustomField(
  subscriberId: string,
  fieldName: string,
  value: string,
): Promise<{ success: boolean; error?: string }> {
  const token = getApiToken();

  let response: Response;
  try {
    response = await fetch(`${MANYCHAT_API_BASE}/fb/subscriber/setCustomFieldByName`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriber_id: subscriberId, field_name: fieldName, field_value: value }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    console.error('[ManyChatSendApi] setCustomField fetch failed:', msg);
    return { success: false, error: msg };
  }

  if (!response.ok) {
    const responseText = await response.text().catch(() => '(unreadable)');
    return { success: false, error: `HTTP ${response.status}: ${responseText}` };
  }

  return { success: true };
}

/**
 * Adds a tag to a ManyChat subscriber by tag name.
 * Phase 0: defined for completeness — not yet called by the webhook route.
 *
 * REQUIRES MANUAL VALIDATION: confirm endpoint and tag_name vs tag_id behavior.
 */
export async function addManyChatTag(
  subscriberId: string,
  tagName: string,
): Promise<{ success: boolean; error?: string }> {
  const token = getApiToken();

  let response: Response;
  try {
    response = await fetch(`${MANYCHAT_API_BASE}/fb/subscriber/addTag`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriber_id: subscriberId, tag_name: tagName }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    console.error('[ManyChatSendApi] addTag fetch failed:', msg);
    return { success: false, error: msg };
  }

  if (!response.ok) {
    const responseText = await response.text().catch(() => '(unreadable)');
    return { success: false, error: `HTTP ${response.status}: ${responseText}` };
  }

  return { success: true };
}
