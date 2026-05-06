import { UserState, MetricScores, MetricID, ReportContent, MaturityLevel, ScaleStage, ActionItem, ManagementPattern } from '@/types';
import { getRiskScore } from './scoring';
import { PATTERN_COPY, REPORT_CLOSING_SENTENCE, REPORT_EXECUTIVE_INTRO } from '@/config/patternCopy';
import { SCALE_LABELS } from './scale';

const METRIC_LABELS: Record<MetricID, string> = {
  Dependency_Index: 'עצמאות ניהולית',
  Cognitive_Load: 'פניות קוגניטיבית',
  Process_Standardization: 'שיטתיות תפעולית',
  Knowledge_Asset_Value: 'נכסי ידע',
  Strategic_Maturity: 'בשלות אסטרטגית',
};

const getMaturityLevel = (riskScore: number): MaturityLevel => {
  if (riskScore < 0.33) return 'High';
  if (riskScore < 0.66) return 'Medium';
  return 'Low';
};

function toActionItem(
  raw: string | ActionItem,
  defaults: { owner: string; deadline: string; kpi?: string; deliverable?: string; effort?: string }
): ActionItem {
  if (typeof raw === 'string') {
    return { what: raw, owner: defaults.owner, deadline: defaults.deadline, kpi: defaults.kpi, deliverable: defaults.deliverable, effort: defaults.effort };
  }
  return { ...defaults, ...raw, what: raw.what };
}

export const generateReportText = (
  state: UserState,
  normalized: MetricScores,
  topMetric: MetricID,
  pattern: ManagementPattern,
  scale?: ScaleStage
): ReportContent => {
  const risks: Record<MetricID, number> = {
    Dependency_Index: getRiskScore('Dependency_Index', normalized.Dependency_Index),
    Cognitive_Load: getRiskScore('Cognitive_Load', normalized.Cognitive_Load),
    Process_Standardization: getRiskScore('Process_Standardization', normalized.Process_Standardization),
    Knowledge_Asset_Value: getRiskScore('Knowledge_Asset_Value', normalized.Knowledge_Asset_Value),
    Strategic_Maturity: getRiskScore('Strategic_Maturity', normalized.Strategic_Maturity),
  };

  const scorecard: Record<MetricID, MaturityLevel> = {
    Dependency_Index: getMaturityLevel(risks.Dependency_Index),
    Cognitive_Load: getMaturityLevel(risks.Cognitive_Load),
    Process_Standardization: getMaturityLevel(risks.Process_Standardization),
    Knowledge_Asset_Value: getMaturityLevel(risks.Knowledge_Asset_Value),
    Strategic_Maturity: getMaturityLevel(risks.Strategic_Maturity),
  };

  const sortedMetrics = Object.entries(risks).sort(([, a], [, b]) => b - a);
  const topRisks = sortedMetrics.slice(0, 3).map(([m]) => m as MetricID);

  const bottleneckDescriptions: Record<MetricID, { title: string; description: string }> = {
    Dependency_Index: { title: 'צוואר בקבוק מבני', description: 'זרימת המידע וההחלטות עוברת דרך צומת אחד.' },
    Cognitive_Load: { title: 'עומס קשב ניהולי', description: 'עלות המעבר בין משימות גבוהה.' },
    Process_Standardization: { title: 'היעדר עקביות תפעולית', description: 'התוצאה תלויה ב"מי מבצע" ולא ב"איך מבצעים".' },
    Knowledge_Asset_Value: { title: 'סיכון נכסי ידע', description: 'הידע הארגוני אינו מתועד במלואו.' },
    Strategic_Maturity: { title: 'חסם תגובתיות', description: 'העסק פועל בעיקר בתגובה לאירועים.' },
  };
  const bottlenecks = topRisks.map(m => bottleneckDescriptions[m]);

  const patternKey = pattern.id === 'REACTIVE_TECHNOLOGICAL' || pattern.id === 'REACTIVE_COGNITIVE' ? 'REACTIVE' : pattern.id;
  const copy = PATTERN_COPY[patternKey] ?? PATTERN_COPY.CENTRALIZED;
  const kpisList = copy?.kpis ?? [];
  const quickWinsRaw = copy?.quickWins ?? [];
  const structuralStepsRaw = copy?.structuralSteps ?? [];

  const quickWinsAsItems: ActionItem[] = (quickWinsRaw as (string | ActionItem)[]).map((item, i) =>
    toActionItem(item, { owner: 'בעלת העסק', deadline: '7 עד 14 יום', kpi: kpisList[i], deliverable: 'מסמך/תוצר ממומש', effort: '2 עד 4 שעות' })
  );
  const structuralStepsAsItems: ActionItem[] = (structuralStepsRaw as (string | ActionItem)[]).map((item, i) =>
    toActionItem(item, { owner: 'בעלת העסק', deadline: '30 עד 60 יום', kpi: kpisList[quickWinsRaw.length + i], deliverable: 'מבנה מוגדר', effort: 'יום עבודה' })
  );

  const currentState = copy ? copy.currentStateBullets.join('\n') : 'העסק בתנועה. יש עשייה ומחויבות, אך אילוצים מבניים מגבילים את הצמיחה.';
  const existingAssets = copy?.existingAssets ?? ['יש פוטנציאל לצמיחה.'];
  const centralGap = copy?.centralGap ?? 'יש פערים מבניים שדורשים התייחסות.';
  const directionOfBuild = copy?.directionOfBuild ?? 'לבנות תשתית ניהולית.';
  const recommendationsList = copy?.recommendations ?? ['התחילו בתיעוד תהליך אחד מרכזי.'];
  const constraintsList = copy?.constraints ?? ['להתקדם בצעדים מדודים.'];
  const risksList = copy?.risksIfUnchanged ?? ['הפוטנציאל לא ימומש.'];
  const executiveSummaryText = copy?.executiveSummary ?? 'העסק פועל בדפוס ניהולי שניתן לשפר.';

  const decisionRequiredMap: Record<MetricID, string> = {
    Dependency_Index: 'להתחיל להפריד ידע, החלטה וביצוע.',
    Cognitive_Load: 'לבנות מסגרות שמגנות על הקשב.',
    Process_Standardization: 'לייצב תהליך אחד מרכזי.',
    Knowledge_Asset_Value: 'לתעד את הידע הקריטי.',
    Strategic_Maturity: 'להקצות זמן קבוע ל"עבודה על העסק".',
  };

  const scaleLabel = scale ? SCALE_LABELS[scale] : '';
  const executiveOneLine = `דפוס ניהול: ${pattern.name}${scaleLabel ? ` (${scaleLabel})` : ''}. הפער המרכזי: ${METRIC_LABELS[topMetric]}.`;
  const executiveRiskCost = risksList[0] ?? 'ללא שינוי, הפוטנציאל לא ימומש.';

  const allActions = quickWinsAsItems.length >= 3 ? quickWinsAsItems : [...quickWinsAsItems, ...recommendationsList.map((r) => ({ what: r } as ActionItem))];
  const defaultKpis = ['ירידה בנקודות אישור שבועיות', 'זמן תגובה ממוצע', 'אחוז משימות ללא מעורבות בעלות'];
  const executiveTopActions: { action: string; kpi: string }[] = [];
  for (let i = 0; i < 3 && i < allActions.length; i++) {
    const item = allActions[i];
    const action = typeof item === 'string' ? item : item.what;
    const kpi = (typeof item !== 'string' && item.kpi) ? item.kpi : (kpisList[i] ?? defaultKpis[i]);
    if (action) executiveTopActions.push({ action, kpi });
  }

  return {
    currentState,
    existingAssets,
    centralGap,
    directionOfBuild,
    recommendations: recommendationsList,
    constraints: constraintsList,
    risksIfUnchanged: risksList,
    executiveSummary: executiveSummaryText,
    executiveOneLine,
    executiveRiskCost,
    executiveTopActions,
    decisionRequired: decisionRequiredMap[topMetric] ?? decisionRequiredMap.Dependency_Index,
    executiveIntro: REPORT_EXECUTIVE_INTRO,
    reportClosingSentence: REPORT_CLOSING_SENTENCE,
    operationalSymptoms: copy?.operationalSymptoms ?? [],
    quickWins: quickWinsAsItems,
    structuralSteps: structuralStepsAsItems,
    kpis: copy?.kpis ?? [],
    evidence: [],
    bottlenecks,
    scorecard,
    roadmap: recommendationsList,
  };
};
