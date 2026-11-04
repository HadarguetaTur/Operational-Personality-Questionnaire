import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone';
import { randomUUID } from 'node:crypto';

/**
 * Lead identity & persistence for the WhatsApp bot.
 *
 * Every inquiry becomes a real `leads` row (id = lead_uuid). A returning
 * subscriber is matched back to the same lead via `subscriber_id`, so a second
 * conversation never creates a duplicate lead.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Placeholder name until the classifier extracts the real one. */
export const PLACEHOLDER_LEAD_NAME = 'ליד וואטסאפ';

/**
 * Resolves the canonical lead_uuid for an incoming message.
 *
 * Priority:
 *   (a) a valid lead_uuid echoed back by ManyChat — authoritative;
 *   (b) an existing lead/state row for this subscriber_id — reuse (dedup);
 *   (b2) an unclaimed lead with the same normalized phone (quiz lead who now
 *        messages on WhatsApp) — adopt it so payment/quiz data stays on one row;
 *   (c) brand new → fresh UUID.
 */
export async function resolveLeadIdentity(params: {
  subscriberId?: string;
  payloadLeadUuid?: string;
  phone?: string;
}): Promise<{ leadUuid: string; isNew: boolean }> {
  const payloadLeadUuid = params.payloadLeadUuid?.trim();
  const subscriberId = params.subscriberId?.trim();

  // (a) ManyChat returned a valid lead_uuid — trust it.
  if (payloadLeadUuid && UUID_REGEX.test(payloadLeadUuid)) {
    return { leadUuid: payloadLeadUuid, isNew: false };
  }

  // (b) Returning subscriber — reuse the existing lead.
  if (subscriberId) {
    const supabase = createServiceRoleClient();

    const { data: leadRow } = await supabase
      .from('leads')
      .select('id')
      .eq('subscriber_id', subscriberId)
      .maybeSingle();
    if (leadRow?.id) return { leadUuid: leadRow.id as string, isNew: false };

    const { data: stateRow } = await supabase
      .from('bot_conversation_state')
      .select('lead_uuid')
      .eq('subscriber_id', subscriberId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (stateRow?.lead_uuid) return { leadUuid: stateRow.lead_uuid as string, isNew: false };
  }

  // (b2) Same phone as an existing lead that no subscriber owns yet (typically
  // a quiz/landing lead) — adopt it. subscriber_id IS NULL guarantees we never
  // steal a lead already linked to another subscriber.
  const normalized = normalizePhone(params.phone);
  if (normalized) {
    const supabase = createServiceRoleClient();
    const { data: phoneRow } = await supabase
      .from('leads')
      .select('id')
      .eq('phone_normalized', normalized)
      .is('subscriber_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (phoneRow?.id) {
      if (subscriberId) {
        const { error } = await supabase
          .from('leads')
          .update({ subscriber_id: subscriberId })
          .eq('id', phoneRow.id)
          .is('subscriber_id', null); // conditional — defends against a concurrent adopt
        if (error) {
          // Unique violation on idx_leads_subscriber_id race — this subscriber
          // got linked elsewhere meanwhile; re-run the subscriber lookup.
          console.warn('[leadRegistry] phone-adopt update failed:', error.code, error.message);
          const { data: retryRow } = await supabase
            .from('leads')
            .select('id')
            .eq('subscriber_id', subscriberId)
            .maybeSingle();
          if (retryRow?.id) return { leadUuid: retryRow.id as string, isNew: false };
        }
      }
      return { leadUuid: phoneRow.id as string, isNew: false };
    }
  }

  // (c) Brand new inquiry.
  return { leadUuid: randomUUID(), isNew: true };
}

/**
 * Ensures a `leads` row exists for this conversation (id = leadUuid).
 * Creates it on first contact; otherwise refreshes activity and fills in
 * name/phone/subscriber_id once they become known. Never overwrites a real
 * name with the placeholder.
 */
export async function ensureLeadRow(
  leadUuid: string,
  opts: { subscriberId?: string; phone?: string; name?: string; source?: string } = {},
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { subscriberId, phone, source = 'whatsapp' } = opts;
  const name = opts.name?.trim();
  const nowIso = new Date().toISOString();

  const { data: existing } = await supabase
    .from('leads')
    .select('id, name, subscriber_id')
    .eq('id', leadUuid)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from('leads').insert({
      id: leadUuid,
      name: name || PLACEHOLDER_LEAD_NAME,
      email: null,
      phone: normalizePhone(phone) ?? phone ?? null,
      subscriber_id: subscriberId ?? null,
      lead_source: source,
      lead_status: 'in_progress',
      last_active_at: nowIso,
    });
    if (error) {
      // e.g. unique violation on subscriber_id from a race — non-fatal.
      console.warn('[leadRegistry] ensureLeadRow insert skipped:', error.code, error.message);
    }
    return;
  }

  // Existing row — refresh activity, fill gaps.
  const patch: Record<string, unknown> = { last_active_at: nowIso };
  const existingName = (existing.name as string | null)?.trim();
  if (name && (!existingName || existingName === PLACEHOLDER_LEAD_NAME)) {
    patch.name = name;
  }
  if (phone) patch.phone = normalizePhone(phone) ?? phone;
  // Fill-gap only — with phone-based adoption in play, never re-link an
  // already-owned lead to a different subscriber.
  if (subscriberId && !existing.subscriber_id) patch.subscriber_id = subscriberId;

  const { error } = await supabase.from('leads').update(patch).eq('id', leadUuid);
  if (error) {
    console.warn('[leadRegistry] ensureLeadRow update failed (non-fatal):', error.message);
  }
}

/**
 * Marks a lead as having booked a meeting — closes the tracking loop directly
 * (no dependency on the Calendly/utm_content webhook). Meeting details are
 * stored on the lead row so the admin and the bot can track the meeting status.
 */
export async function markLeadMeetingBooked(
  leadUuid: string,
  meeting?: { meetingAt: string; meetingType: 'intro' | 'diagnostic'; calcomUid?: string | null },
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('leads')
    .update({
      meeting_booked_at: new Date().toISOString(),
      lead_status: 'meeting_booked',
      ...(meeting
        ? {
            meeting_at: meeting.meetingAt,
            meeting_type: meeting.meetingType,
            meeting_calcom_uid: meeting.calcomUid ?? null,
            meeting_status: 'scheduled',
          }
        : {}),
    })
    .eq('id', leadUuid);
  if (error) {
    console.warn('[leadRegistry] markLeadMeetingBooked failed (non-fatal):', error.message);
  }
}

export type MeetingStatus = 'scheduled' | 'completed' | 'no_show' | 'cancelled';

export interface LeadBotSnapshot {
  payment_status: string | null;
  lead_status: string | null;
  meeting_at: string | null;
  meeting_status: MeetingStatus | null;
}

/**
 * Lightweight lead-row snapshot for the bot's per-turn gates (paid-customer
 * detection). Null when the row doesn't exist yet.
 */
export async function getLeadBotSnapshot(leadUuid: string): Promise<LeadBotSnapshot | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('leads')
    .select('payment_status, lead_status, meeting_at, meeting_status')
    .eq('id', leadUuid)
    .maybeSingle();
  if (!data) return null;
  return {
    payment_status: (data.payment_status as string | null) ?? null,
    lead_status: (data.lead_status as string | null) ?? null,
    meeting_at: (data.meeting_at as string | null) ?? null,
    meeting_status: (data.meeting_status as MeetingStatus | null) ?? null,
  };
}

export interface LeadMeeting {
  meeting_at: string | null;
  meeting_type: 'intro' | 'diagnostic' | null;
  meeting_calcom_uid: string | null;
  meeting_status: MeetingStatus | null;
}

/** Reads the meeting fields off the lead row (null row → all-null meeting). */
export async function getLeadMeeting(leadUuid: string): Promise<LeadMeeting> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('leads')
    .select('meeting_at, meeting_type, meeting_calcom_uid, meeting_status')
    .eq('id', leadUuid)
    .maybeSingle();
  return {
    meeting_at: (data?.meeting_at as string | null) ?? null,
    meeting_type: (data?.meeting_type as 'intro' | 'diagnostic' | null) ?? null,
    meeting_calcom_uid: (data?.meeting_calcom_uid as string | null) ?? null,
    meeting_status: (data?.meeting_status as MeetingStatus | null) ?? null,
  };
}

/** Bot-side meeting updates (e.g. cancellation). */
export async function updateLeadMeeting(
  leadUuid: string,
  patch: { meeting_status?: MeetingStatus; lead_status?: string },
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('leads').update(patch).eq('id', leadUuid);
  if (error) {
    console.warn('[leadRegistry] updateLeadMeeting failed (non-fatal):', error.message);
  }
}
