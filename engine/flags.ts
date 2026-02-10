import { UserState, Flag, MetricScores } from '../types';

export const calculateFlags = (state: UserState, normalized: MetricScores): Flag[] => {
  const flags: Flag[] = [];
  const answers = state.answers;

  // SPOF
  if (normalized.Dependency_Index >= 0.75 && normalized.Knowledge_Asset_Value <= 0.35) {
    flags.push({
      id: "SPOF",
      title: "נקודת כשל יחידה",
      message: "העסק תלוי בך ברמה שמסכנת את ההמשכיות שלו.",
      severity: "High"
    });
  }

  // TOOL_FIRST_TRAP
  // A4_2: "חיפוש כלי (App)..."
  // B_STR_1_2: "חיפוש כלי שיפתור את הסימפטום."
  const hasToolAnswer = Object.values(answers).some(aId => aId === "A4_2" || aId === "B_STR_1_2");
  if (hasToolAnswer) {
    flags.push({
      id: "TOOL_FIRST_TRAP",
      title: "מלכודת ה-'כלי קודם'",
      message: "נטייה לחפש פתרונות טכנולוגיים לפני הגדרת תהליכים, מה שמוביל לרוב לעומס כלי מיותר.",
      severity: "Medium"
    });
  }

  // CONTEXT_SWITCH_TAX
  if (normalized.Cognitive_Load >= 0.70) {
    flags.push({
      id: "CONTEXT_SWITCH_TAX",
      title: "מס הקשב",
      message: "הזגזוג בין משימות שוחק את היכולת שלך לקבל החלטות אסטרטגיות.",
      severity: "High"
    });
  }

  // SOP_GAP (Process High (Bad), Knowledge Low (Bad score? Wait. Knowledge <= 0.5 means Low Value/Risk High?))
  // Re-eval Knowledge: High Score = Good. 
  // Requirement: Knowledge <= 0.5 (Low Goodness) AND Process >= 0.7 (High Chaos).
  if (normalized.Process_Standardization >= 0.70 && normalized.Knowledge_Asset_Value <= 0.50) {
    flags.push({
      id: "SOP_GAP",
      title: "פער נהלים",
      message: "היעדר תיעוד מסודר מחייב אותך להמציא את הגלגל מחדש בכל פרויקט.",
      severity: "High"
    });
  }

  return flags;
};