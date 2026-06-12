/**
 * detectGender.ts — deterministic lead-gender detection from first-person Hebrew.
 *
 * The bot addresses leads in gender-neutral Hebrew until the lead's gender is
 * known with confidence. The strongest signal is how the lead speaks about
 * themselves: "אני צריך" (male) vs "אני צריכה" (female). Only unambiguous
 * first-person verb/adjective pairs are matched, anchored to "אני" so we don't
 * pick up the lead describing someone else ("העובדת שלי...").
 *
 * NOTE: JS \b is ASCII-based and never matches at a Hebrew letter boundary, so
 * word ends are matched with explicit lookaheads (space/punctuation/end), and
 * masculine forms exclude the feminine ה/ת suffix explicitly.
 */

export type LeadGender = 'male' | 'female';

// Unambiguous stems: feminine = stem + ה (or ת), masculine = bare stem.
// Each entry: [masculine, feminine].
const PAIRS: Array<[string, string]> = [
  ['צריך', 'צריכה'],
  ['יכול', 'יכולה'],
  ['מעוניין', 'מעוניינת'],
  ['חושב', 'חושבת'],
  ['מרגיש', 'מרגישה'],
  ['עובד', 'עובדת'],
  ['מחפש', 'מחפשת'],
  ['מבין', 'מבינה'],
  ['יודע', 'יודעת'],
  ['מנהל', 'מנהלת'],
  ['עצמאי', 'עצמאית'],
  ['בטוח', 'בטוחה'],
];

const END = '(?=[\\s.,!?;:()"\']|$)';
// "אני" (optionally "אני לא/גם/רק/כבר/עדיין") right before the form.
const ANI = '(?:^|[\\s.,!?;:()"\'])אני\\s+(?:לא\\s+|גם\\s+|רק\\s+|כבר\\s+|עדיין\\s+)?';

const FEMALE_RE = new RegExp(`${ANI}(?:${PAIRS.map(([, f]) => f).join('|')})${END}`);
const MALE_RE = new RegExp(`${ANI}(?:${PAIRS.map(([m]) => m).join('|')})${END}`);

/**
 * Returns the lead's gender when the message carries an unambiguous
 * first-person signal, otherwise null. If a message somehow matches both
 * (quoting someone, typo), returns null rather than guessing.
 */
export function detectGenderSignal(message: string): LeadGender | null {
  const msg = message.trim();
  if (!msg) return null;
  const female = FEMALE_RE.test(msg);
  const male = MALE_RE.test(msg);
  if (female && !male) return 'female';
  if (male && !female) return 'male';
  return null;
}
