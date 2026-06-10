/**
 * calcom/scheduling.ts — pure helpers for the in-chat scheduling turn:
 * building the numbered slot list, and parsing the lead's choice.
 * No I/O — keeps the webhook orchestration testable and deterministic.
 */

import type { BookingType, CalSlot, Daypart } from './api';

export const DAYPART_HE: Record<Daypart, string> = {
  morning: 'בוקר',
  noon: 'צהריים',
  evening: 'ערב',
};

// "Doesn't matter / flexible" → show times across the whole day.
const ANY_DAYPART_RE = /(לא משנה|לא חשוב|הכל טוב|הכול טוב|גמיש|גמישה|מתי שיש|אין לי העדפה|כל שעה|מה שיש|מה שנוח לה)/;

/** Detects the lead's preferred part of the day from free text. */
export function parseDaypart(userMessage: string): Daypart | null {
  const msg = userMessage.trim();
  if (/בוקר/.test(msg)) return 'morning';
  // "צהריים" and "אחר הצהריים" both fall in the noon range (12–17).
  if (/צהר/.test(msg)) return 'noon';
  if (/ערב|לילה/.test(msg)) return 'evening';
  return null;
}

/** True when the lead is flexible about the time of day. */
export function isAnyDaypart(userMessage: string): boolean {
  return ANY_DAYPART_RE.test(userMessage.trim());
}

const NUMBER_EMOJI: Record<string, number> = {
  '1️⃣': 1,
  '2️⃣': 2,
  '3️⃣': 3,
  '4️⃣': 4,
};

const ORDINAL_HE: Array<[RegExp, number]> = [
  [/\bהראשון|הראשונה\b/, 1],
  [/\bהשני|השנייה|השניה\b/, 2],
  [/\bהשלישי|השלישית\b/, 3],
  [/\bהרביעי|הרביעית\b/, 4],
];

// Wants different / later times → re-fetch and show more.
const OTHER_RE =
  /(זמן אחר|אופציה אחרת|אפשרות אחרת|יום אחר|שבוע הבא|בשבוע הבא|מאוחר יותר|לא מתאים|אחרת|עוד אפשרויות|עוד זמנים|בוקר|בערב|ערב|צהריי?ם|אחר הצהריי?ם)/;

// Wants to stop scheduling for now.
const CANCEL_RE =
  /(ביטול|לבטל|בטלי|לא עכשיו|לא רוצה|נדבר אחר כך|נדבר בהמשך|בהמשך|תודה לא|עזבי|לא כרגע)/;

const BOOKING_LABELS: Record<BookingType, string> = {
  diagnostic: 'שיחת האפיון',
  intro: 'שיחת ההיכרות',
};

const NUM_PREFIX = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

/** Builds the numbered slot list message shown in WhatsApp. */
export function buildSlotsMessage(bookingType: BookingType, slots: CalSlot[]): string {
  const label = BOOKING_LABELS[bookingType];
  const lines = slots.map((s, i) => `${NUM_PREFIX[i] ?? `${i + 1}.`} ${s.label}`);
  return (
    `מעולה 🙏 הנה הזמנים הקרובים של הדר ל${label}:\n` +
    `${lines.join('\n')}\n` +
    `איזה זמן מתאים לך? אפשר לבחור מספר, או לכתוב לי "זמן אחר" ואביא עוד אפשרויות.`
  );
}

export type SlotChoice =
  | { kind: 'select'; index: number; slot: CalSlot }
  | { kind: 'other' }
  | { kind: 'cancel' }
  | { kind: 'unknown' };

/** Interprets the lead's reply against the slots we offered. */
export function parseSlotChoice(userMessage: string, offered: CalSlot[]): SlotChoice {
  const msg = userMessage.trim();

  if (CANCEL_RE.test(msg)) return { kind: 'cancel' };

  // Emoji number.
  for (const [emoji, n] of Object.entries(NUMBER_EMOJI)) {
    if (msg.includes(emoji)) {
      const idx = n - 1;
      if (offered[idx]) return { kind: 'select', index: idx, slot: offered[idx] };
    }
  }

  // Definite Hebrew ordinal ("השני").
  for (const [re, n] of ORDINAL_HE) {
    if (re.test(msg)) {
      const idx = n - 1;
      if (offered[idx]) return { kind: 'select', index: idx, slot: offered[idx] };
    }
  }

  // Bare digit 1–4 (as a standalone token, not part of a date/time).
  const digitMatch = msg.match(/(?:^|[\s.)א-ת])([1-4])(?=$|[\s.)!])/);
  if (digitMatch) {
    const idx = parseInt(digitMatch[1], 10) - 1;
    if (offered[idx]) return { kind: 'select', index: idx, slot: offered[idx] };
  }

  if (OTHER_RE.test(msg)) return { kind: 'other' };

  return { kind: 'unknown' };
}

/**
 * For an "other" request: the ISO date to start the next availability window
 * from — the day after the last slot we already offered (so we show fresh days).
 */
export function nextWindowFromISO(offered: CalSlot[]): string | undefined {
  if (!offered.length) return undefined;
  const lastDay = offered[offered.length - 1].startISO.slice(0, 10);
  const next = new Date(`${lastDay}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}
