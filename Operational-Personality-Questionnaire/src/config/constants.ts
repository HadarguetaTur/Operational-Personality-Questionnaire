import type { MetricID } from '../types';

/** Canonical Hebrew labels for each metric. Import from here – do not duplicate. */
export const METRIC_LABELS: Record<MetricID, string> = {
  Dependency_Index: 'עצמאות ניהולית',
  Cognitive_Load: 'עומס קוגניטיבי',
  Process_Standardization: 'שיטתיות תפעולית',
  Knowledge_Asset_Value: 'נכסי ידע',
  Strategic_Maturity: 'בשלות אסטרטגית'
};

/** Short labels for charts and compact UI */
export const METRIC_SHORT_LABELS: Record<MetricID, string> = {
  Dependency_Index: 'תלות',
  Cognitive_Load: 'עומס',
  Process_Standardization: 'תהליכים',
  Knowledge_Asset_Value: 'ידע',
  Strategic_Maturity: 'אסטרטגיה'
};

export const MATURITY_LABELS: Record<string, string> = {
  Low: 'נמוכה',
  Medium: 'בינונית',
  High: 'גבוהה'
};
