const STAGE_BY_CLUSTER: Record<string, number> = {
  context: 1,
  dependency: 2,
  operations: 3,
  knowledge: 4,
  strategic: 5,
  deepening: 6,
};

const CLUSTER_LABELS: Record<string, string> = {
  context: 'תמונת מצב ארגונית',
  dependency: 'תלות תפעולית ומותג',
  operations: 'תפעול, עומס ותהליכים',
  knowledge: 'ידע וניהול מידע',
  strategic: 'בשלות אסטרטגית',
  deepening: 'חידוד ופיענוח',
};

export const PROGRESS_SMART_LABELS: Record<string, string> = {
  context: 'אנחנו בודקים את מבנה העסק וההקשר',
  dependency: 'אנחנו בודקים כמה העסק תלוי בך',
  operations: 'אנחנו בודקים איך נראה יום העבודה בפועל',
  knowledge: 'אנחנו בודקים איפה נמצא הידע של העסק',
  strategic: 'אנחנו בודקים את ההסתכלות קדימה',
  deepening: 'עוד כמה שאלות ממוקדות לחידוד',
};

export const OPENING_TRANSITION = 'נתחיל בהבנת ההקשר שבו העסק פועל כיום.';

export const CLUSTER_TRANSITIONS: Record<string, string> = {
  dependency: 'בואו נבין כמה העסק תלוי בך ובזמן שלך.',
  operations: 'עכשיו נבדוק איך נראה יום העבודה בפועל.',
  knowledge: 'נבחן איפה נמצא הידע של העסק ואיך הוא מנוהל.',
  strategic: 'לסיום, נסתכל קדימה, על תכנון, חוסן ומוכנות לצמיחה.',
  deepening: 'עוד כמה שאלות ממוקדות בנושאים שעלו כמשמעותיים.',
};

export function getQuestionMeta(cluster?: string) {
  const key = cluster ?? 'context';
  return {
    stage: STAGE_BY_CLUSTER[key] ?? 1,
    totalStages: 6,
    clusterLabel: CLUSTER_LABELS[key] ?? CLUSTER_LABELS.context,
    progressSmartLabel: PROGRESS_SMART_LABELS[key] ?? PROGRESS_SMART_LABELS.context,
    transitionText: key === 'context' ? OPENING_TRANSITION : CLUSTER_TRANSITIONS[key],
  };
}
