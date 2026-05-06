import { UserState, Flag, MetricScores } from '@/types';

export const calculateFlags = (state: UserState, normalized: MetricScores): Flag[] => {
  const flags: Flag[] = [];

  if (normalized.Dependency_Index >= 0.75 && (1 - normalized.Knowledge_Asset_Value) >= 0.65) {
    flags.push({
      id: 'SPOF',
      title: 'נקודת כשל יחידה',
      message:
        'העסק כרגע תלוי בצומת אחד ברמה שמשפיעה על המשכיות. מומלץ לתעד ידע קריטי ולפזר החלטות חוזרות.',
      severity: 'High',
    });
  }

  if (normalized.Cognitive_Load >= 0.7) {
    flags.push({
      id: 'CONTEXT_SWITCH_TAX',
      title: 'מס הקשב',
      message:
        'עומס המעבר בין משימות יוצר מגבלה על זמן וקשב לניהול יזום ולקבלת החלטות אסטרטגיות.',
      severity: 'High',
    });
  }

  const knowRisk = 1 - normalized.Knowledge_Asset_Value;
  if (normalized.Process_Standardization >= 0.7 && knowRisk >= 0.5) {
    flags.push({
      id: 'SOP_GAP',
      title: 'פער נהלים',
      message:
        'היעדר תיעוד מסודר יוצר חוב תהליכי. כל פרויקט דורש בנייה מחדש. מומלץ לתעד את השירות המרכזי קודם.',
      severity: 'High',
    });
  }

  if (normalized.Dependency_Index >= 0.7 && normalized.Strategic_Maturity >= 0.6) {
    flags.push({
      id: 'CAPACITY_CEILING',
      title: 'תקרת קיבולת',
      message:
        'ההכנסה תלויה ישירות בזמן הזמין. ללא שינוי מבני, הגדלת היקף מחייבת הגדלת שעות עבודה.',
      severity: 'High',
    });
  }

  return flags;
};
