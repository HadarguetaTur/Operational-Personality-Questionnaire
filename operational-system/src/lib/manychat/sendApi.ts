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
 * Pushes a completed reply to a ManyChat subscriber via the Send API.
 *
 * Performs three operations in sequence:
 * 1. Sets the `response` custom field (for logs / ManyChat history).
 * 2. Sets the `lead_uuid` custom field (preserves conversation continuity when
 *    the UUID was server-generated and cannot be returned via Dynamic Block).
 * 3. Sends the full messages array via sendContent with message_tag ACCOUNT_UPDATE.
 *
 * Called from the async background task after the LLM has produced its reply.
 */
export async function pushManyChatReply(
  subscriberId: string,
  messages: Array<{ type: 'text'; text: string }>,
  leadUuid: string,
): Promise<{ success: boolean; error?: string }> {
  const token = getApiToken();
  const filtered = messages.filter((m) => m.text.trim().length > 0);
  if (filtered.length === 0) {
    return { success: false, error: 'No non-empty messages to push' };
  }

  // Step 1: set `response` field to the first message text
  const fieldResult = await setManyChatCustomField(subscriberId, 'response', filtered[0].text);
  if (!fieldResult.success) {
    console.warn('[ManyChatSendApi] pushManyChatReply: setCustomField(response) failed (non-fatal):', fieldResult.error);
  }

  // Step 2: set `lead_uuid` field so ManyChat remembers the server-generated UUID
  const uuidResult = await setManyChatCustomField(subscriberId, 'lead_uuid', leadUuid);
  if (!uuidResult.success) {
    console.warn('[ManyChatSendApi] pushManyChatReply: setCustomField(lead_uuid) failed (non-fatal):', uuidResult.error);
  }

  // Step 3: trigger the "Bot Reply Sender" flow via /fb/sending/sendFlow.
  // The flow contains a single WhatsApp Send Message step with {{response}}.
  // Using sendFlow instead of sendContent bypasses the 24h window check.
  const flowNs = process.env.MANYCHAT_SEND_FLOW_NS?.trim();
  if (!flowNs) {
    return { success: false, error: 'MANYCHAT_SEND_FLOW_NS env var not set' };
  }
  const body = {
    subscriber_id: subscriberId,
    flow_ns: flowNs,
  };

  let response: Response;
  try {
    response = await fetch(`${MANYCHAT_API_BASE}/fb/sending/sendFlow`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    console.error('[ManyChatSendApi] pushManyChatReply sendFlow fetch failed:', msg);
    return { success: false, error: msg };
  }

  const responseText = await response.text().catch(() => '(unreadable)');

  if (!response.ok) {
    console.error('[ManyChatSendApi] pushManyChatReply sendFlow HTTP error:', response.status, responseText);
    return { success: false, error: `HTTP ${response.status}: ${responseText}` };
  }

  const json = (() => { try { return JSON.parse(responseText); } catch { return null; } })();
  if (json?.status !== 'success') {
    console.error('[ManyChatSendApi] pushManyChatReply sendContent non-success response:', json);
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
