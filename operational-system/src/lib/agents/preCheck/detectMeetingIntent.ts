const MEETING_PATTERNS = [
  /אשמח\s+לקבוע/,
  /יכול[הי]?\s+לקבוע/,
  /אפשר\s+לקבוע/,
  /רוצ[הי]\s+(לקבוע|פגישה)/,
  /בואי?\s+נקבע/,
  /ביקשתי\s+פגישה/,
  /תשלחי?\s+קישור/,
  /תקבעו?\s+לי/,
  /מתי\s+אפשר\s+להיפגש/,
  /שלחי?\s+לינק/,
  /^פגישה$/,
  /גישת?\s+אפיון/,
  /רוצה\s+להתקדם/,
  /נקבע\s+פגישה/,
  /קישור\s+לפגישה/,
  /לקבוע\s+זמן/,
  /אני\s+רוצה\s+לקבוע/,
  /ניתן\s+לקבוע/,
];

export function detectMeetingIntent(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;
  return MEETING_PATTERNS.some((pattern) => pattern.test(normalized));
}

// Specifically asking for the self-service link (vs. asking us to book for her).
// After the proposal bubble the link was already sent — resend it instead of
// dragging her into the in-chat flow she didn't ask for.
const LINK_REQUEST_PATTERNS = [
  /תשלחי?\s+(לי\s+)?(את\s+ה)?(קישור|לינק)/,
  /שלחי?\s+(לי\s+)?(את\s+ה)?(קישור|לינק)/,
  /אפשר\s+(את\s+ה)?(קישור|לינק)/,
  /קישור\s+לפגישה/,
  /לינק\s+לפגישה/,
];

export function detectLinkRequest(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;
  return LINK_REQUEST_PATTERNS.some((pattern) => pattern.test(normalized));
}

export const MEETING_BOOKING_REPLY = 'מעולה! שולחת לך עכשיו את הקישור לשיחת ההיכרות עם הדר 🗓️';
