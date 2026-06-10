/**
 * calcom/api.ts — Cal.com API v2 client for in-chat scheduling.
 *
 * Lets the WhatsApp bot pull real availability and book a meeting directly,
 * so the lead never leaves the chat. Static booking links remain a fallback
 * (buildBookingMessages) only when CALCOM_API_KEY is absent.
 */

const CAL_API_BASE = 'https://api.cal.com/v2';
const TZ = 'Asia/Jerusalem';

export type BookingType = 'diagnostic' | 'intro';

/** Part of the day the lead prefers. */
export type Daypart = 'morning' | 'noon' | 'evening';

// Hour ranges (local Israel time) per daypart: [from inclusive, to exclusive].
const DAYPART_HOURS: Record<Daypart, [number, number]> = {
  morning: [6, 12],
  noon: [12, 17],
  evening: [17, 22],
};

export interface CalSlot {
  startISO: string;
  label: string;
}

function getKey(): string | null {
  return process.env.CALCOM_API_KEY?.trim() || null;
}

export function isCalcomConfigured(bookingType: BookingType): boolean {
  return !!getKey() && getEventTypeId(bookingType) != null;
}

export function getEventTypeId(bookingType: BookingType): number | null {
  const raw =
    bookingType === 'diagnostic'
      ? process.env.CALCOM_EVENT_TYPE_DIAGNOSTIC
      : process.env.CALCOM_EVENT_TYPE_INTRO;
  const id = raw ? parseInt(raw.trim(), 10) : NaN;
  return Number.isFinite(id) ? id : null;
}

const HE_WEEKDAYS: Record<string, string> = {
  Sun: 'ראשון',
  Mon: 'שני',
  Tue: 'שלישי',
  Wed: 'רביעי',
  Thu: 'חמישי',
  Fri: 'שישי',
  Sat: 'שבת',
};

/** Hebrew short label in Israel time, e.g. "חמישי 11.6, 09:00". */
export function formatSlotLabel(startISO: string): string {
  const d = new Date(startISO);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const wd = HE_WEEKDAYS[get('weekday')] ?? get('weekday');
  return `${wd} ${get('day')}.${get('month')} ב־${get('hour')}:${get('minute')}`;
}

/** Picks up to `max` slots spread across distinct days (variety over consecutive times). */
function pickSpread(slots: CalSlot[], max: number): CalSlot[] {
  const byDay = new Map<string, CalSlot[]>();
  for (const s of slots) {
    const day = s.startISO.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(s);
  }
  const result: CalSlot[] = [];
  for (const arr of byDay.values()) {
    result.push(arr[0]);
    if (result.length >= max) break;
  }
  if (result.length < max) {
    for (const arr of byDay.values()) {
      if (arr[1]) {
        result.push(arr[1]);
        if (result.length >= max) break;
      }
    }
  }
  return result.sort((a, b) => a.startISO.localeCompare(b.startISO)).slice(0, max);
}

/**
 * Returns up to `max` upcoming available slots for an event type, spread across
 * days. Empty array means no availability (or Cal.com not configured / error).
 */
export async function getAvailableSlots(
  bookingType: BookingType,
  opts: { fromISO?: string; days?: number; max?: number; daypart?: Daypart | null } = {},
): Promise<CalSlot[]> {
  const key = getKey();
  const eventTypeId = getEventTypeId(bookingType);
  if (!key || !eventTypeId) return [];

  const from = opts.fromISO ? new Date(opts.fromISO) : new Date();
  const days = opts.days ?? 7;
  const end = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  const startStr = from.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const url =
    `${CAL_API_BASE}/slots?eventTypeId=${eventTypeId}` +
    `&start=${startStr}&end=${endStr}&timeZone=${encodeURIComponent(TZ)}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, 'cal-api-version': '2024-09-04' },
    });
    if (!res.ok) {
      console.warn('[calcom] getAvailableSlots error', res.status);
      return [];
    }
    const json = await res.json();
    const byDay = (json?.data ?? {}) as Record<string, Array<{ start?: string }>>;
    const nowMs = Date.now();
    const range = opts.daypart ? DAYPART_HOURS[opts.daypart] : null;
    const all: CalSlot[] = [];
    for (const day of Object.keys(byDay).sort()) {
      for (const s of byDay[day]) {
        if (!s.start) continue;
        if (new Date(s.start).getTime() < nowMs) continue;
        if (range) {
          // Slots are returned in Asia/Jerusalem, so the hour is right in the string.
          const hour = parseInt(s.start.slice(11, 13), 10);
          if (!(hour >= range[0] && hour < range[1])) continue;
        }
        all.push({ startISO: s.start, label: formatSlotLabel(s.start) });
      }
    }
    return pickSpread(all, opts.max ?? 3);
  } catch (err) {
    console.warn('[calcom] getAvailableSlots fetch error:', err);
    return [];
  }
}

export interface CreateBookingResult {
  ok: boolean;
  bookingUid?: string;
  conflict?: boolean;
  error?: string;
}

/**
 * Books a meeting on the given slot. Returns `conflict: true` when the slot was
 * just taken (caller should re-offer), or `ok: false` on other failures.
 */
export async function createBooking(input: {
  bookingType: BookingType;
  startISO: string;
  name: string;
  email: string;
  phone?: string;
  leadUuid: string;
}): Promise<CreateBookingResult> {
  const key = getKey();
  const eventTypeId = getEventTypeId(input.bookingType);
  if (!key || !eventTypeId) return { ok: false, error: 'calcom_not_configured' };

  const metadata: Record<string, string> = { leadUuid: input.leadUuid };
  if (input.phone) metadata.phone = input.phone;

  const body = {
    start: input.startISO,
    eventTypeId,
    attendee: {
      name: input.name,
      email: input.email,
      timeZone: TZ,
      language: 'he',
    },
    metadata,
  };

  try {
    const res = await fetch(`${CAL_API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13',
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const conflict = res.status === 409 || res.status === 422;
      console.warn('[calcom] createBooking error', res.status, JSON.stringify(json)?.slice(0, 300));
      return { ok: false, conflict, error: `HTTP ${res.status}` };
    }
    const uid = json?.data?.uid ?? json?.data?.id;
    return { ok: true, bookingUid: uid != null ? String(uid) : undefined };
  } catch (err) {
    console.warn('[calcom] createBooking fetch error:', err);
    return { ok: false, error: String(err) };
  }
}
