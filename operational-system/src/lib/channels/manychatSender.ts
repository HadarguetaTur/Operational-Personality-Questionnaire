import { pushManyChatReply } from '@/lib/manychat/sendApi';
import {
  CHANNEL_CAPABILITIES,
  type Channel,
  type ChannelSender,
} from '@/lib/channels/types';

/**
 * ChannelSender for ManyChat-backed channels (WhatsApp / Instagram / Facebook).
 * Delivery goes through the per-channel "Bot Reply Sender" flow; sendApi picks
 * the flow NS by channel.
 */
export function createManyChatSender(channel: Channel): ChannelSender {
  if (channel === 'web') {
    throw new Error('[manychatSender] web is not a ManyChat channel');
  }
  return {
    channel,
    capabilities: CHANNEL_CAPABILITIES[channel],
    async send({ leadUuid, subscriberId, messages }) {
      if (!subscriberId) {
        console.warn('[manychatSender] no subscriberId — cannot push reply', { leadUuid, channel });
        return { success: false, error: 'no_subscriber_id' };
      }
      return pushManyChatReply(subscriberId, messages, leadUuid, channel);
    },
  };
}
