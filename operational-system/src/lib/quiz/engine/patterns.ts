import { ManagementPattern, MetricScores, ScaleStage } from '@/lib/quiz/types';
import { getRiskScore } from '@/lib/quiz/engine/scoring';

/**
 * Management patterns describe how the business is currently structured and managed.
 * Not personality or identity – contextual and changeable.
 */
export const MANAGEMENT_PATTERNS: Record<string, ManagementPattern> = {
  CENTRALIZED: {
    id: "CENTRALIZED",
    name: "ניהול ריכוזי",
    description: "כל זרימת הערך, ידע, החלטות וביצוע, עוברת דרך נקודה מרכזית אחת.",
    oneLiner: "העסק בנוי כך שהכל עובר דרכך: ההחלטות, הידע, הקשר עם הלקוחות. התוצאות מעולות, אבל יש תקרה שלא נפתרת בעבודה קשה יותר.",
    diagram: "     [את/ה]\n      /|\\    \n  [ידע][החלטות][ביצוע]"
  },
  FRAGILE_TEAM: {
    id: "FRAGILE_TEAM",
    name: "תלות תפעולית",
    description: "יש כוח ביצוע, אבל כשלא מוגדרת תשתית ברורה, האחריות חוזרת דרך שאלות, אישורים ותיקונים לבעל העסק.",
    oneLiner:
      'יש מי שמבצע, אבל בלי סטנדרטים, בעלות ומקור אמת, ההאצלה חוזרת כהדרכה ותיקון. מה שנראה כמו "לא מצליחים בלי הבוס" הוא לעיתים חוסר מנגנון, לא חוסר כישרון.',
    diagram: "  [את/ה] ..?..> [צוות]\n    |              |\n    +----<---------+"
  },
  REACTIVE: {
    id: "REACTIVE",
    name: "ניהול תגובתי",
    description: "הרבה עשייה, מעט תכנון. כיבוי שריפות במקום בנייה.",
    oneLiner: "העסק בתנועה מתמדת, אבל בכיוון של \"מה דחוף עכשיו\" במקום \"מה חשוב באמת\". אין רגע לנשום, וזה בדיוק הבעיה.",
    diagram: "  [את/ה]  \n  / | \\ |\n [A][B][C]..."
  },
  PROCESS_BASED: {
    id: "PROCESS_BASED",
    name: "ניהול מבוסס תהליך",
    description: "יש מערכת שעובדת, עכשיו צריך לגדול.",
    oneLiner: "יש כאן בסיס אמיתי: תהליכים, בעלי תפקידים, ידע מתועד. העסק לא נופל כשאתם לא שם. האתגר הבא הוא לא יציבות, אלא האצה.",
    diagram: "[תהליכים] -> [צוות] -> [ערך]\n      ^       \n  [את/ה] (חזון)"
  }
};

export interface PatternResult {
  pattern: ManagementPattern;
  secondaryPattern: ManagementPattern | null;
  uncertainty: boolean;
}

/**
 * Determines dominant management pattern from aggregate signals.
 * Multiple patterns may partially apply; we choose dominant + note secondary.
 * If data is ambiguous, we reflect uncertainty.
 */
export function determinePattern(
  normalized: MetricScores,
  scale?: ScaleStage
): PatternResult {
  const depRisk = getRiskScore("Dependency_Index", normalized.Dependency_Index);
  const procRisk = getRiskScore("Process_Standardization", normalized.Process_Standardization);
  const cogRisk = getRiskScore("Cognitive_Load", normalized.Cognitive_Load);
  const knowRisk = getRiskScore("Knowledge_Asset_Value", normalized.Knowledge_Asset_Value);
  const stratRisk = getRiskScore("Strategic_Maturity", normalized.Strategic_Maturity);

  const HIGH = 0.60;
  const MED = 0.35;

  // Reactive: tools chaos OR cognitive overload , unified "firefighting" pattern
  const reactiveTechScore = procRisk * (0.5 + stratRisk * 0.5);
  const reactiveScore = Math.max(reactiveTechScore, cogRisk);

  // Solo businesses cannot have FRAGILE_TEAM (cannot score operational-team dependency pattern).
  // Growing teams weight CENTRALIZED slightly lower (some centralization is expected).
  const fragileTeamScore = scale === 'solo'
    ? 0
    : (depRisk < 0.75 ? procRisk * Math.max(0, 1 - depRisk * 0.5) : 0);

  const centralizedScore = scale === 'growing_team'
    ? depRisk * 0.85
    : depRisk;

  const scores: Record<string, number> = {
    CENTRALIZED: centralizedScore,
    FRAGILE_TEAM: fragileTeamScore,
    REACTIVE: reactiveScore,
    PROCESS_BASED: (1 - depRisk) * (1 - procRisk) * (1 - cogRisk) * (1 - stratRisk) * 2
  };

  const sorted = (Object.entries(scores) as [string, number][])
    .sort(([, a], [, b]) => b - a);
  const [topId, topScore] = sorted[0];
  const [secondId, secondScore] = sorted[1];

  if (!MANAGEMENT_PATTERNS[topId]) {
    console.error('[determinePattern] Unknown pattern id, falling back to REACTIVE', { topId, scores });
  }
  const dominant = MANAGEMENT_PATTERNS[topId] ?? MANAGEMENT_PATTERNS.REACTIVE;
  const secondary = secondScore >= MED && secondId !== topId
    ? MANAGEMENT_PATTERNS[secondId] ?? null
    : null;
  const uncertainty = topScore < 0.5 || (secondScore > 0.4 && Math.abs(topScore - secondScore) < 0.15);

  return {
    pattern: dominant,
    secondaryPattern: secondary,
    uncertainty
  };
}
