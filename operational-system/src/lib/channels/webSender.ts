import { CHANNEL_CAPABILITIES, type ChannelSender } from '@/lib/channels/types';

/**
 * ChannelSender for the on-site chat widget.
 *
 * There is no push transport: by the time send() runs, the assistant message is
 * already persisted in conversation_messages, and the browser polls
 * GET /api/webchat/messages to pick it up. So delivery here is a successful
 * no-op. Proactive follow-up is impossible (supportsOutboundFollowup: false) —
 * abandoned web leads are surfaced to Hadar instead.
 */
export const webSender: ChannelSender = {
  channel: 'web',
  capabilities: CHANNEL_CAPABILITIES.web,
  async send() {
    return { success: true };
  },
};
