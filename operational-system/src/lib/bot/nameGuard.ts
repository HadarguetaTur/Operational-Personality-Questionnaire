/**
 * Guards against the business owner's name ("הדר" / "הדר אוטומציות") leaking in
 * as the *lead's* name.
 *
 * The classifier was biased by a literal "אני הדר" example and would extract
 * "הדר" as the lead's name whenever the lead merely mentioned the business
 * ("שמעתי על הדר", "רוצה לעבוד עם הדר"). cleanName() then stripped the "אני "
 * prefix, leaving "הדר" — which overwrote the real quiz name and made the bot
 * greet the lead as "היי הדר". This is the single point that rejects those
 * candidates so the lead's true name (from the quiz / earlier turns) survives.
 *
 * Matching is by whole normalized *token*, never substring, so legitimate names
 * that merely contain the letters (הדס, הדרה, נהדרת) are NOT blocked.
 */

// Single-word owner/brand tokens that can never be a lead's name.
const BLOCKED_TOKENS = new Set(['הדר', 'אוטומציות']);

// Multi-word brand phrase — blocked even though each token alone is handled
// above, so future changes to BLOCKED_TOKENS can't accidentally let it through.
const BLOCKED_PHRASES = ['הדר אוטומציות'];

/** Lowercase, strip Hebrew niqqud + punctuation/quotes, collapse whitespace. */
function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '') // Hebrew niqqud / cantillation
    .replace(/["'`׳״.,!?()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True when the candidate is (or contains as a whole word) the owner/brand name
 * and therefore must not be stored as the lead's name.
 */
export function isBlockedLeadName(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  const norm = normalize(candidate);
  if (!norm) return false;

  if (BLOCKED_PHRASES.some((p) => norm.includes(p))) return true;

  const tokens = norm.split(' ');
  return tokens.some((t) => BLOCKED_TOKENS.has(t));
}

/**
 * Returns the name unchanged, or '' if it's the owner/brand name. Use at write
 * points so callers fall through to their own fallback (quiz name, channel
 * label, etc.).
 */
export function scrubLeadName(candidate: string | null | undefined): string {
  if (!candidate) return '';
  return isBlockedLeadName(candidate) ? '' : candidate;
}
