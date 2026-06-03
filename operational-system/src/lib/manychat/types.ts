/**
 * TypeScript types for ManyChat External Request payloads and Send API.
 * Phase 0: minimal proof-of-concept types — expand in Phase 1.
 */

/** Supported event types for Phase 0. Using `string` allows unknown future types without breaking parse. */
export type ManyChatEventType =
  | 'test_connection'
  | 'test_send_message'
  | (string & {});

/**
 * Shape of the JSON body ManyChat sends to POST /api/manychat/webhook.
 * All fields except event_type are optional — ManyChat may omit them.
 */
export interface ManyChatWebhookPayload {
  event_type: ManyChatEventType;
  /** ManyChat's internal subscriber ID for this contact */
  subscriber_id?: string;
  /** Vercel-side lead UUID; generated server-side if absent */
  lead_uuid?: string;
  /** Phone number in any format (e.g. "+972501234567") */
  phone?: string;
  /** Any additional fields ManyChat passes through */
  [key: string]: unknown;
}

/**
 * Simple JSON ACK response (USE_MANYCHAT_DYNAMIC_BLOCK = false).
 * This is the Phase 0 default.
 */
export interface SimpleAckResponse {
  ok: true;
  event_type: string;
  lead_uuid: string;
  received_at: string;
}

/**
 * ManyChat Dynamic Block response format (v2).
 * Returned inline in the External Request response body.
 * ManyChat routes the messages to the subscriber's channel (WhatsApp/Messenger)
 * automatically — bypasses the 24h Send API window restriction.
 *
 * Spec: https://manychat.com/help — "External Request Dynamic Block"
 */
export interface ManyChatDynamicBlockResponse {
  version: 'v2';
  content: {
    messages: Array<
      | { type: 'text'; text: string }
      | { type: 'image'; url: string }
    >;
    actions?: Array<
      | { action: 'set_field_value'; field_name: string; value: string }
      | { action: 'add_tag'; tag_name: string }
      | { action: 'remove_tag'; tag_name: string }
    >;
    quick_replies?: Array<{ type: 'node'; caption: string; target: string }>;
  };
}

/**
 * ManyChat Send API — sendContent request body.
 *
 * REQUIRES MANUAL VALIDATION:
 * WhatsApp-specific content format differs from FB Messenger.
 * Verify `content.type` and message structure against ManyChat API docs
 * before using sendManyChatText() in production.
 * @see https://api.manychat.com
 */
export interface ManyChatSendContentRequest {
  subscriber_id: string;
  data: {
    version: 'v2';
    content: {
      type: 'text';
      text: string;
    };
  };
}

/** Result returned by ManyChat Send API calls. */
export interface ManyChatSendResult {
  success: boolean;
  error?: string;
}
