const MEETING_PATTERNS = [
  /אשמח\s+לקבוע/,
  /רוצ[הי]\s+פגישה/,
  /בואי?\s+נקבע/,
  /ביקשתי\s+פגישה/,
  /תשלחי?\s+קישור/,
  /תקבעו?\s+לי/,
  /מתי\s+אפשר\s+להיפגש/,
  /שלחי?\s+לינק/,
  /^פגישה$/,
  /גישת\s+אפיון/,
  /רוצה\s+להתקדם/,
  /נקבע\s+פגישה/,
  /קישור\s+לפגישה/,
  /לקבוע\s+זמן/,
];

export function detectMeetingIntent(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;
  return MEETING_PATTERNS.some((pattern) => pattern.test(normalized));
}

export const MEETING_BOOKING_REPLY = 'מעולה! שולחת לך עכשיו את הקישור לשיחת ההיכרות עם הדר 🗓️';
