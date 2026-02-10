import { ArchetypeResult, MetricScores } from '../types';
import { getRiskScore } from './scoring';

export const ARCHETYPES: Record<string, ArchetypeResult> = {
  SOLO_EXPERT: {
    id: "SOLO_EXPERT",
    name: "המומחה הסולו",
    description: "מומחיות גבוהה, מינוף נמוך.",
    oneLiner: "העסק הוא שיקוף ישיר של הכישרון שלך, אבל הוא לא יכול לגדול מעבר לשעות העבודה שלך. את/ה צוואר הבקבוק המרכזי.",
    diagram: " [YOU] \n  /|\\  \n (Tasks)"
  },
  FRAGILE_TEAM: {
    id: "FRAGILE_TEAM",
    name: "הצוות השביר",
    description: "יש אנשים, אבל אין סיסטם.",
    oneLiner: "גייסת אנשים כדי להוריד עומס, אבל בהיעדר תהליכים סדורים, את/ה עדיין נשאב/ת לניהול מיקרו ותיקון טעויות.",
    diagram: "[YOU] --?--> [TEAM]\n  |           |\n  +---<-------+"
  },
  FIREFIGHTER: {
    id: "FIREFIGHTER",
    name: "מכבה השריפות",
    description: "פעילות גבוהה, יעילות נמוכה.",
    oneLiner: "העסק מתנהל בקצב מסחרר של תגובה לאירועים. העומס הקוגניטיבי מונע חשיבה אסטרטגית ובניית תשתיות צמיחה.",
    diagram: "🔥 [YOU] 🔥\n   / | \\   \n  ⚡ ⚡ ⚡"
  },
  ARCHITECT: {
    id: "ARCHITECT",
    name: "הארכיטקט",
    description: "בשלות לסקייל.",
    oneLiner: "הצלחת לבנות מכונה עסקית שפועלת גם בלעדייך. האתגר הבא הוא אופטימיזציה וצמיחה אגרסיבית.",
    diagram: "[SYSTEMS] -> [TEAM] -> [VALUE]\n      ^       \n    [YOU] (Vision)"
  }
};

export const determineArchetype = (normalized: MetricScores): ArchetypeResult => {
  // Logic based on Risk Scores (0 = Good, 1 = Bad/Risk)
  const depRisk = getRiskScore("Dependency_Index", normalized.Dependency_Index);
  const procRisk = getRiskScore("Process_Standardization", normalized.Process_Standardization);
  const cogRisk = getRiskScore("Cognitive_Load", normalized.Cognitive_Load);
  
  // Thresholds
  const HIGH_RISK = 0.60;
  
  // 1. Solo Expert: High Dependency (Doing it all)
  if (depRisk > HIGH_RISK) {
    return ARCHETYPES.SOLO_EXPERT;
  }

  // 2. Firefighter: High Cognitive Load (Chaos) regardless of team size
  if (cogRisk > HIGH_RISK) {
    return ARCHETYPES.FIREFIGHTER;
  }

  // 3. Fragile Team: Dependency is managed (Lower risk), but Process is bad (High risk)
  // Meaning: I have people (Low Dep), but they don't have systems (High Process Risk)
  if (depRisk <= HIGH_RISK && procRisk > HIGH_RISK) {
    return ARCHETYPES.FRAGILE_TEAM;
  }

  // 4. Architect: Generally low risks across board
  if (depRisk <= HIGH_RISK && procRisk <= HIGH_RISK && cogRisk <= HIGH_RISK) {
    return ARCHETYPES.ARCHITECT;
  }

  // Fallback -> Default to Firefighter if mixed signals imply chaos
  return ARCHETYPES.FIREFIGHTER;
};