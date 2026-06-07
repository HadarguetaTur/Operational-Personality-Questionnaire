const BLOCKLIST_PHRASES = [
  'אני העוזרת הדיגיטלית',
  'אני המערכת האוטומטית',
  'אני הבוט',
  'שמחה שפנית',
  'תודה ששיתפת',
  'כל ליד עולה',
  'תקבלי',
  'עבדנו עם',
  'לא ראיתי תשובה',
  'נהדר שפנית',
  'כמובן!',
  'אלינו היום',
  '--',
];

const MAX_REPLY_LENGTH = 400;

export interface ReplyValidationResult {
  valid: boolean;
  reason?: 'blocklist' | 'multiple_questions' | 'too_long' | 'too_similar';
}

function countQuestionMarks(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

function similarityRatio(a: string, b: string): number {
  const na = normalizeForComparison(a);
  const nb = normalizeForComparison(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length >= nb.length ? na : nb;
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }

  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function validateReply(
  reply: string,
  recentBotReplies?: string[],
): ReplyValidationResult {
  const trimmed = reply.trim();
  if (!trimmed) {
    return { valid: false, reason: 'blocklist' };
  }

  for (const phrase of BLOCKLIST_PHRASES) {
    if (trimmed.includes(phrase)) {
      return { valid: false, reason: 'blocklist' };
    }
  }

  if (countQuestionMarks(trimmed) > 1) {
    return { valid: false, reason: 'multiple_questions' };
  }

  if (trimmed.length > MAX_REPLY_LENGTH) {
    return { valid: false, reason: 'too_long' };
  }

  if (recentBotReplies && recentBotReplies.length > 0) {
    for (const prev of recentBotReplies) {
      if (similarityRatio(trimmed, prev) >= 0.8) {
        return { valid: false, reason: 'too_similar' };
      }
    }
  }

  return { valid: true };
}
