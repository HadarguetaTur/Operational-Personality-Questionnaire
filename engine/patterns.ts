import { ManagementPattern, MetricScores, ScaleStage } from '../types';
import { getRiskScore } from './scoring';

/**
 * Management patterns describe how the business is currently structured and managed.
 * Not personality or identity – contextual and changeable.
 */
export const MANAGEMENT_PATTERNS: Record<string, ManagementPattern> = {
  CENTRALIZED: {
    id: "CENTRALIZED",
    name: "ניהול ריכוזי",
    description: "כל זרימת הערך — ידע, החלטות וביצוע — עוברת דרך נקודה מרכזית אחת.",
    oneLiner: "העסק בנוי כך שהכל עובר דרכך: ההחלטות, הידע, הקשר עם הלקוחות. התוצאות מעולות — אבל יש תקרה שלא נפתרת בעבודה קשה יותר.",
    diagram: "     [את/ה]\n      /|\\    \n  [ידע][החלטות][ביצוע]"
  },
  FRAGILE_TEAM: {
    id: "FRAGILE_TEAM",
    name: "צוות ללא תשתית",
    description: "יש אנשים שמבצעים, אבל אין מערכת שמנחה אותם.",
    oneLiner: "יש צוות, יש נכונות להאציל — אבל בלי תהליכים ובעלות ברורה, הניהול נשאב למיקרו-ניהול ותיקון טעויות. \"עדיף שאעשה בעצמי\" הופך למשפט קבוע.",
    diagram: "  [את/ה] --?--> [צוות]\n    |              |\n    +----<---------+"
  },
  REACTIVE: {
    id: "REACTIVE",
    name: "ניהול תגובתי",
    description: "הרבה עשייה, מעט תכנון. כיבוי שריפות במקום בנייה.",
    oneLiner: "העסק בתנועה מתמדת — אבל בכיוון של \"מה דחוף עכשיו\" במקום \"מה חשוב באמת\". אין רגע לנשום, וזה בדיוק הבעיה.",
    diagram: "  [את/ה]  \n  / | \\ |\n [A][B][C]..."
  },
  PROCESS_BASED: {
    id: "PROCESS_BASED",
    name: "ניהול מבוסס תהליך",
    description: "יש מערכת שעובדת — עכשיו צריך לגדול.",
    oneLiner: "יש כאן בסיס אמיתי: תהליכים, בעלי תפקידים, ידע מתועד. העסק לא נופל כשאתם לא שם. האתגר הבא הוא לא יציבות — אלא האצה.",
    diagram: "[תהליכים] -> [צוות] -> [ערך]\n      ^       \n  [את/ה] (חזון)"
  }
};

/** Legacy id mapping for backward compatibility with existing UI/copy */
export const ARCHETYPES = {
  SOLO_EXPERT: MANAGEMENT_PATTERNS.CENTRALIZED,
  FRAGILE_TEAM: MANAGEMENT_PATTERNS.FRAGILE_TEAM,
  FIREFIGHTER: MANAGEMENT_PATTERNS.REACTIVE,
  ARCHITECT: MANAGEMENT_PATTERNS.PROCESS_BASED
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

  // Solo businesses cannot have FRAGILE_TEAM (no team to be fragile).
  // Growing teams weight CENTRALIZED slightly lower (some centralization is expected).
  const fragileTeamScore = scale === 'solo'
    ? 0
    : (depRisk < HIGH ? procRisk : 0);

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

/** Legacy: single pattern for backward compatibility */
export function determineArchetype(normalized: MetricScores): ManagementPattern {
  return determinePattern(normalized).pattern;
}
