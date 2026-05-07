export const designTokens = {
  colors: {
    background: '#F7F8FA',
    surface: '#FFFFFF',
    textPrimary: '#1A1A1A',
    textSecondary: '#5F6368',
    border: '#E2E5E9',
    accent: '#3A5A6B',
    accentSoft: 'rgba(58, 90, 107, 0.05)'
  },
  typography: {
    questionTitle: 'text-[20px] md:text-[22px] font-medium md:font-semibold',
    answerText: 'text-[16px] md:text-[17px] font-normal',
    metaText: 'text-[13px] md:text-[14px] font-normal text-[var(--qa-text-secondary)]'
  },
  spacing: {
    mobilePadding: 'px-6',
    desktopPadding: 'md:px-8'
  },
  motion: {
    questionTransitionMs: 180
  }
} as const;

const STAGE_BY_CLUSTER: Record<string, number> = {
  context: 1,
  dependency: 2,
  operations: 3,
  knowledge: 4,
  strategic: 5,
  deepening: 6
};

const CLUSTER_LABELS: Record<string, string> = {
  context: 'תמונת מצב ארגונית',
  dependency: 'תלות תפעולית ומותג',
  operations: 'תפעול, עומס ותהליכים',
  knowledge: 'ידע וניהול מידע',
  strategic: 'בשלות אסטרטגית',
  deepening: 'חידוד ופיענוח'
};

/** Progress bar smart label */
export const PROGRESS_SMART_LABELS: Record<string, string> = {
  context: 'אנחנו בודקים את מבנה העסק וההקשר',
  dependency: 'אנחנו בודקים כמה העסק תלוי בך',
  operations: 'אנחנו בודקים איך נראה יום העבודה בפועל',
  knowledge: 'אנחנו בודקים איפה נמצא הידע של העסק',
  strategic: 'אנחנו בודקים את ההסתכלות קדימה',
  deepening: 'עוד כמה שאלות ממוקדות לחידוד'
};

/** משפט מעבר לשאלות — מוצג בתחילת האבחון */
export const OPENING_TRANSITION = 'נתחיל בהבנת ההקשר שבו העסק פועל כיום.';

/** משפטי מעבר בין אשכולות */
export const CLUSTER_TRANSITIONS: Record<string, string> = {
  dependency: 'בואו נבין כמה העסק תלוי בך ובזמן שלך.',
  operations: 'עכשיו נבדוק איך נראה יום העבודה בפועל.',
  knowledge: 'נבחן איפה נמצא הידע של העסק ואיך הוא מנוהל.',
  strategic: 'לסיום, נסתכל קדימה, על תכנון, חוסן ומוכנות לצמיחה.',
  deepening: 'עוד כמה שאלות ממוקדות בנושאים שעלו כמשמעותיים.'
};

export function getQuestionMeta(cluster?: string) {
  const key = cluster ?? 'context';
  return {
    stage: STAGE_BY_CLUSTER[key] ?? 1,
    totalStages: 6,
    clusterLabel: CLUSTER_LABELS[key] ?? CLUSTER_LABELS.context,
    progressSmartLabel: PROGRESS_SMART_LABELS[key] ?? PROGRESS_SMART_LABELS.context,
    transitionText: key === 'context' ? OPENING_TRANSITION : CLUSTER_TRANSITIONS[key]
  };
}
