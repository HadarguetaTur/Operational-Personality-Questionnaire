import { UserState, Flag, MetricScores } from '../types';

export const calculateFlags = (state: UserState, normalized: MetricScores): Flag[] => {
  const flags: Flag[] = [];

  // SPOF — Single Point of Failure
  if (normalized.Dependency_Index >= 0.75 && (1 - normalized.Knowledge_Asset_Value) >= 0.65) {
    flags.push({
      id: "SPOF",
      title: "נקודת כשל יחידה",
      message: "העסק כרגע תלוי בצומת אחד ברמה שמשפיעה על המשכיות. מומלץ לתעד ידע קריטי ולפזר החלטות חוזרות.",
      severity: "High"
    });
  }

  // CONTEXT_SWITCH_TAX — high cognitive load
  if (normalized.Cognitive_Load >= 0.70) {
    flags.push({
      id: "CONTEXT_SWITCH_TAX",
      title: "מס הקשב",
      message: "עומס המעבר בין משימות יוצר מגבלה על זמן וקשב לניהול יזום ולקבלת החלטות אסטרטגיות.",
      severity: "High"
    });
  }

  // SOP_GAP — Process risk high, Knowledge asset value low
  const knowRisk = 1 - normalized.Knowledge_Asset_Value;
  if (normalized.Process_Standardization >= 0.70 && knowRisk >= 0.50) {
    flags.push({
      id: "SOP_GAP",
      title: "פער נהלים",
      message: "היעדר תיעוד מסודר יוצר חוב תהליכי – כל פרויקט דורש בנייה מחדש. מומלץ לתעד את השירות המרכזי קודם.",
      severity: "High"
    });
  }

  // CAPACITY_CEILING — high dependency + low strategic maturity (solo-relevant)
  if (normalized.Dependency_Index >= 0.70 && normalized.Strategic_Maturity >= 0.60) {
    flags.push({
      id: "CAPACITY_CEILING",
      title: "תקרת קיבולת",
      message: "ההכנסה תלויה ישירות בזמן הזמין. ללא שינוי מבני, הגדלת היקף מחייבת הגדלת שעות עבודה.",
      severity: "High"
    });
  }

  return flags;
};
