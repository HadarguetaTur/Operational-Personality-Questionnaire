const NOT_FIT_KEYWORDS = [
  'סוכנות',
  'agency',
  'מנכ"ל',
  'סמנכ"ל',
  'החברה שלנו',
  'אוטומציות בעצמי',
  'פיתוח תוכנה',
  'שיווק דיגיטלי',
  'עדיין לא פתחתי',
  'עומדת להתחיל',
];

export const AUDIENCE_DISQUALIFY_REPLY =
  'תודה שפנית — נשמע שזה פחות מתאים למה שאנחנו עושות. בהצלחה עם העסק! 🙏';

export function detectNotFitAudience(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;
  return NOT_FIT_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLowerCase()),
  );
}
