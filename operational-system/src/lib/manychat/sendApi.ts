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

  // #region agent log — H-C: fetch subscriber channel info to see which channels are active
  try {
    const infoRes = await fetch(`${MANYCHAT_API_BASE}/fb/subscriber/getInfo?subscriber_id=${subscriberId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const infoText = await infoRes.text().catch(() => '(unreadable)');
    fetch('http://127.0.0.1:7859/ingest/eaae9886-8d8c-42ff-b024-50d1c3875c50',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ca65b'},body:JSON.stringify({sessionId:'0ca65b',location:'sendApi.ts:getInfo',message:'subscriber channel info',data:{httpStatus:infoRes.status,infoText:infoText.slice(0,600)},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
    console.log('[ManyChatSendApi] subscriber getInfo:', infoRes.status, infoText.slice(0, 400));
  } catch(e) { console.warn('[ManyChatSendApi] getInfo failed', e); }
  // #endregion

  // Step 3: send the message(s) to WhatsApp.
  // No message_tag: within the 24h window (user just messaged) WhatsApp does not
  // require a tag, and ACCOUNT_UPDATE is a Messenger-only tag that WhatsApp rejects.
  const body = {
    subscriber_id: subscriberId,
    data: {
      version: 'v2',
      content: {
        messages: filtered,
      },
    },
  };

  // #region agent log
  fetch('http://127.0.0.1:7859/ingest/eaae9886-8d8c-42ff-b024-50d1c3875c50',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ca65b'},body:JSON.stringify({sessionId:'0ca65b',location:'sendApi.ts:pushManyChatReply-beforeSend',message:'sendContent request body',data:{subscriberId,subscriberIdType:typeof subscriberId,subscriberIdLen:String(subscriberId).length,bodyJson:JSON.stringify(body)},timestamp:Date.now(),hypothesisId:'H-A,H-B'})}).catch(()=>{});
  // #endregion

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
    console.error('[ManyChatSendApi] pushManyChatReply sendContent fetch failed:', msg);
    return { success: false, error: msg };
  }

  const responseText = await response.text().catch(() => '(unreadable)');

  // #region agent log
  fetch('http://127.0.0.1:7859/ingest/eaae9886-8d8c-42ff-b024-50d1c3875c50',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ca65b'},body:JSON.stringify({sessionId:'0ca65b',location:'sendApi.ts:pushManyChatReply-afterSend',message:'sendContent response',data:{httpStatus:response.status,responseText:responseText.slice(0,300),subscriberId},timestamp:Date.now(),hypothesisId:'H-B,H-C,H-E'})}).catch(()=>{});
  // #endregion

  if (!response.ok) {
    console.error('[ManyChatSendApi] pushManyChatReply sendContent HTTP error:', response.status, responseText);
    // Include channel info in error so it surfaces in manychat_events.process_error via finalize().
    let channelHint = '';
    try {
      const infoRes2 = await fetch(`${MANYCHAT_API_BASE}/fb/subscriber/getInfo?subscriber_id=${subscriberId}`, { headers: { Authorization: `Bearer ${token}` } });
      const infoJson = await infoRes2.json().catch(() => null);
      const channels = infoJson?.data?.channels_info ?? infoJson?.data ?? null;
      channelHint = ` | channels:${JSON.stringify(channels).slice(0, 200)}`;
    } catch { /* non-fatal */ }
    return { success: false, error: `HTTP ${response.status}: ${responseText}${channelHint}` };
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
