/**
 * Channel abstraction — one AI engine, swappable delivery per channel.
 *
 * The pipeline (classifier → specialists → writer) is channel-agnostic; only
 * inbound webhooks and outbound sends differ. A ChannelSender encapsulates the
 * outbound side; ChannelCapabilities stops code from assuming every channel
 * behaves like WhatsApp (e.g. web has no proactive follow-up at all).
 */

export type Channel = 'whatsapp' | 'instagram' | 'facebook' | 'web';

export interface ChannelCapabilities {
  /** Can the daily cron proactively message this lead after they go quiet? */
  supportsOutboundFollowup: boolean;
  /**
   * Subject to Meta's 24h messaging window? WhatsApp bypasses it via a
   * template flow; Instagram/Facebook have NO bypass — proactive sends outside
   * the window are forbidden and must be skipped, never worked around.
   */
  requiresMessagingWindow: boolean;
  /** Without a phone there is no way to rescue this lead after abandonment. */
  requiresPhoneForFollowup: boolean;
}

export const CHANNEL_CAPABILITIES: Record<Channel, ChannelCapabilities> = {
  whatsapp:  { supportsOutboundFollowup: true,  requiresMessagingWindow: true,  requiresPhoneForFollowup: false },
  instagram: { supportsOutboundFollowup: true,  requiresMessagingWindow: true,  requiresPhoneForFollowup: false },
  facebook:  { supportsOutboundFollowup: true,  requiresMessagingWindow: true,  requiresPhoneForFollowup: false },
  web:       { supportsOutboundFollowup: false, requiresMessagingWindow: false, requiresPhoneForFollowup: true  },
};

export interface OutboundMessage {
  type: 'text';
  text: string;
}

export interface ChannelSender {
  readonly channel: Channel;
  readonly capabilities: ChannelCapabilities;
  send(args: {
    leadUuid: string;
    subscriberId?: string;
    messages: OutboundMessage[];
  }): Promise<{ success: boolean; error?: string }>;
}

const CHANNELS: readonly Channel[] = ['whatsapp', 'instagram', 'facebook', 'web'];

/** Parses an untrusted channel value; anything unknown falls back to whatsapp. */
export function parseChannel(raw: unknown): Channel {
  return CHANNELS.includes(raw as Channel) ? (raw as Channel) : 'whatsapp';
}
