import { UserState, MetricScores, MetricID, ReportContent, MaturityLevel, ScaleStage, ActionItem } from '../types';
import { getRiskScore } from './scoring';
import type { DiagnosticResult, ManagementPattern } from '../types';
import { PATTERN_COPY, REPORT_CLOSING_SENTENCE, REPORT_EXECUTIVE_INTRO } from '../config/patternCopy';
import { SCALE_LABELS } from './scale';

const METRIC_LABELS: Record<MetricID, string> = {
  Dependency_Index: 'עצמאות ניהולית',
  Cognitive_Load: 'פניות קוגניטיבית',
  Process_Standardization: 'שיטתיות תפעולית',
  Knowledge_Asset_Value: 'נכסי ידע',
  Strategic_Maturity: 'בשלות אסטרטגית'
};

const MATURITY_LABELS: Record<string, string> = {
  Low: 'נמוכה',
  Medium: 'בינונית',
  High: 'גבוהה'
};

const getMaturityLevel = (riskScore: number): MaturityLevel => {
  if (riskScore < 0.33) return "High";
  if (riskScore < 0.66) return "Medium";
  return "Low";
};

/** Question ID -> metric & short context for evidence sentences */
const QUESTION_EVIDENCE: Record<string, { metric: MetricID; context: string; conclusion: string }> = {
  // Solo path
  S1: { metric: "Dependency_Index", context: "תקרת קיבולת", conclusion: "מגבלת צמיחה" },
  S2: { metric: "Dependency_Index", context: "תפיסת המותג", conclusion: "תלות אישית" },
  S3: { metric: "Knowledge_Asset_Value", context: "ניהול ידע אישי", conclusion: "סיכון נכסי ידע" },
  S4: { metric: "Process_Standardization", context: "שכפול הצלחה", conclusion: "חוסר סטנדרטיזציה" },
  S5: { metric: "Cognitive_Load", context: "עומס כובעים", conclusion: "עומס קוגניטיבי" },
  S6: { metric: "Process_Standardization", context: "אוטומציה ומערכות", conclusion: "חוב תהליכי" },
  S7: { metric: "Strategic_Maturity", context: "ריכוז הכנסה", conclusion: "סיכון אסטרטגי" },
  S8: { metric: "Dependency_Index", context: "מבחן ההיעדרות", conclusion: "ריכוזיות" },
  // Small team path
  T1: { metric: "Dependency_Index", context: "מבחן החופשה", conclusion: "ריכוזיות" },
  T2: { metric: "Dependency_Index", context: "מותג מנוהל", conclusion: "תלות אישית" },
  T3: { metric: "Cognitive_Load", context: "רצף עבודה", conclusion: "עומס קוגניטיבי" },
  T4: { metric: "Dependency_Index", context: "האצלה וביצוע", conclusion: "ריכוזיות בביצוע" },
  T5: { metric: "Process_Standardization", context: "תהליכי עבודה", conclusion: "חוב תהליכי" },
  T6: { metric: "Knowledge_Asset_Value", context: "ידע ארגוני", conclusion: "סיכון נכסי ידע" },
  T7: { metric: "Knowledge_Asset_Value", context: "קליטת עובד", conclusion: "ידע לא מתועד" },
  T8: { metric: "Cognitive_Load", context: "פרויקט דחוף", conclusion: "עומס החלטות" },
  T9: { metric: "Knowledge_Asset_Value", context: "ניהול מידע לקוחות", conclusion: "ידע מפוזר" },
  // Growing team path
  G1: { metric: "Dependency_Index", context: "ריכוזיות בהחלטות", conclusion: "ריכוזיות" },
  G2: { metric: "Dependency_Index", context: "זיהוי חריגות", conclusion: "ריכוזיות בניהול" },
  G3: { metric: "Process_Standardization", context: "בקרת איכות", conclusion: "תלות בסטנדרט" },
  G4: { metric: "Dependency_Index", context: "מבנה ארגוני", conclusion: "ריכוזיות מבנית" },
  G5: { metric: "Process_Standardization", context: "תהליכי עבודה", conclusion: "חוב תהליכי" },
  G6: { metric: "Knowledge_Asset_Value", context: "ניהול ידע", conclusion: "סיכון נכסי ידע" },
  G7: { metric: "Knowledge_Asset_Value", context: "קליטה וחניכה", conclusion: "ידע לא מתועד" },
  G8: { metric: "Dependency_Index", context: "צוואר בקבוק", conclusion: "תלות בצומת מרכזי" },
  G9: { metric: "Strategic_Maturity", context: "נתונים ומדדים", conclusion: "חוסר נתונים" },
  // Shared strategic
  ST1: { metric: "Strategic_Maturity", context: "תכנון לרבעון", conclusion: "חוסר תכנון" },
  ST2: { metric: "Strategic_Maturity", context: "חוסן עסקי", conclusion: "תגובתיות" },
  ST3: { metric: "Strategic_Maturity", context: "השקעה בתשתיות", conclusion: "עומס תפעולי" },
  // Branch deepening
  BD1: { metric: "Dependency_Index", context: "מעבר לעבודה על העסק", conclusion: "ריכוזיות" },
  BD2: { metric: "Dependency_Index", context: "סמכויות כספיות", conclusion: "ריכוזיות בהחלטות" },
  BC1: { metric: "Cognitive_Load", context: "סוף יום עבודה", conclusion: "עומס קוגניטיבי" },
  BC2: { metric: "Cognitive_Load", context: "תעדוף בלחץ", conclusion: "עומס החלטות" },
  BP1: { metric: "Process_Standardization", context: "משימות חוזרות", conclusion: "חוסר סטנדרטיזציה" },
  BP2: { metric: "Process_Standardization", context: "תיאור העסק", conclusion: "חוב תהליכי" },
  BK1: { metric: "Knowledge_Asset_Value", context: "העברת ידע", conclusion: "ידע לא מתועד" },
  BK2: { metric: "Knowledge_Asset_Value", context: "שחזור משימה", conclusion: "סיכון נכסי ידע" },
  BS1: { metric: "Strategic_Maturity", context: "הגדרת יעדים", conclusion: "חוסר תכנון" },
  BS2: { metric: "Strategic_Maturity", context: "מדדי הצלחה חודשיים", conclusion: "חוסר נתונים" }
};

function buildEvidence(state: UserState, topMetric: MetricID): string[] {
  const history = state.history ?? [];
  const evidence: string[] = [];
  const relevant = history.filter((h) => {
    const meta = QUESTION_EVIDENCE[h.questionId];
    return meta && meta.metric === topMetric;
  });
  for (let i = 0; i < Math.min(3, relevant.length); i++) {
    const h = relevant[i];
    const meta = QUESTION_EVIDENCE[h.questionId];
    if (meta && h.answerText) {
      evidence.push(`בשאלה על ${meta.context}, נענה: "${h.answerText}" , מה שמאשר ${meta.conclusion}.`);
    }
  }
  return evidence;
}

function buildCurrentState(risks: Record<MetricID, number>, pattern: ManagementPattern, scale?: ScaleStage): string {
  const parts: string[] = [];
  parts.push(`העסק כרגע מתנהל בדפוס של ${pattern.name}. `);
  if (scale) {
    if (scale === 'solo') parts.push('הפעילות בנויה כיום על אדם אחד, וזה אומר שהקיבולת, הידע וההכנסה תלויים ישירות בזמינות שלך. ');
    else if (scale === 'small_team') parts.push('יש צוות שמבצע, אבל הזרימה עדיין עוברת דרכך ברוב הצמתים. ');
    else parts.push('יש מבנה ארגוני, אך רמת העצמאות של הצוות עדיין דורשת חיזוק. ');
  }
  if (risks.Dependency_Index > 0.5) {
    parts.push('זרימת ההחלטות מרוכזת בנקודה אחת, וזה יוצר תקרת צמיחה שלא נפתרת בעבודה קשה יותר. ');
  }
  if (risks.Process_Standardization > 0.5) {
    parts.push('אין עקביות מספקת בתהליכים. התוצאה תלויה ב"מי מבצע" ולא ב"איך מבצעים". ');
  }
  if (risks.Cognitive_Load > 0.5) {
    parts.push('יש עומס קשב גבוה. מעבר בין משימות שלא משאיר מרחב לבנייה אסטרטגית. ');
  }
  if (risks.Strategic_Maturity > 0.5) {
    parts.push('רוב הזמן נשאב לתפעול שוטף, ונשאר מעט מקום לעבודה על העסק. ');
  }
  return parts.join('').trim() || 'העסק בתנועה. יש עשייה ומחויבות, אך אילוצים מבניים מגבילים את הצמיחה.';
}

function buildExistingAssets(risks: Record<MetricID, number>): string[] {
  const assets: string[] = [];
  if (risks.Dependency_Index <= 0.6) {
    assets.push('לא כל הזרימה עוברת דרך נקודה אחת. יש יכולת האצלה שאפשר לבנות עליה.');
  }
  if (risks.Process_Standardization <= 0.6) {
    assets.push('יש בסיס לתהליכים ועקביות בתוצאה. אפשר להרחיב ולחזק.');
  }
  if (risks.Cognitive_Load <= 0.6) {
    assets.push('יש מרחב מנטלי. אפשר להקדיש זמן לשיפור ולא רק לתגובה.');
  }
  if (risks.Knowledge_Asset_Value <= 0.5) {
    assets.push('חלק מהידע מתועד ונגיש. זה מפחית סיכון ומקל על קליטת אנשים.');
  }
  if (risks.Strategic_Maturity <= 0.6) {
    assets.push('יש חשיבה אסטרטגית. לא רק "עבודה בתוך העסק" אלא גם "עבודה על העסק".');
  }
  if (assets.length === 0) {
    assets.push('יש פוטנציאל לצמיחה. השלב הנוכחי מאפשר להגדיר כיוון ברור ולהתחיל לבנות.');
  }
  return assets;
}

function buildCentralGap(risks: Record<MetricID, number>, topMetric: MetricID): string {
  const gapText: Record<MetricID, string> = {
    Dependency_Index: 'הפער המרכזי הוא תלות מבנית: כל זרימת הערך עוברת דרך נקודה אחת. זה לא שאלה של מחויבות, זה חסם שלא נפתר בעבודה קשה יותר.',
    Cognitive_Load: 'הפער המרכזי הוא עומס קשב: המעבר התדיר בין משימות שואב את האנרגיה שנדרשת לבנייה אסטרטגית. אין \"רגע לנשום\" כדי לשפר.',
    Process_Standardization: 'הפער המרכזי הוא חוב תהליכי: העסק מייצר תוצאות, אבל בלי עקביות. כל פעם זה קצת אחרת, וזה עולה בזמן, בטעויות ובאיכות.',
    Knowledge_Asset_Value: 'הפער המרכזי הוא ידע שלא מתועד: מה שנמצא בראש או בהתכתבויות לא נגיש לאחרים. כל עזיבה או שינוי יוצרים משבר ידע.',
    Strategic_Maturity: 'הפער המרכזי הוא היעדר אופק: העסק מגיב למה שקורה במקום ליזום. בלי תכנון, צמיחה היא עניין של מזל, לא של בחירה.'
  };
  return gapText[topMetric] ?? gapText.Dependency_Index;
}

function buildDirectionOfBuild(risks: Record<MetricID, number>, topMetric: MetricID): string {
  const dir: Record<MetricID, string> = {
    Dependency_Index: 'הכיוון: להפריד ידע, החלטה וביצוע. למפות את ההחלטות שחוזרות, לתעד אותן כברירות מחדל, ולאפשר לאחרים לפעול בלי לשאול.',
    Cognitive_Load: 'הכיוון: לבנות מסגרות שמגנות על הקשב. חלוקת יום לבלוקים, צמצום ערוצי פניות, ומערכת מעקב שמחליפה את \"הכל בראש\".',
    Process_Standardization: 'הכיוון: לייצב תהליך אחד מרכזי. לכתוב אותו, לתקף אותו, ואז להרחיב. קודם סדר, אחר כך כלי.',
    Knowledge_Asset_Value: 'הכיוון: להפוך ידע שבראש לנכס כתוב ונגיש. לתעד תהליכים, לבנות הדרכות לצריכה עצמית, ולרכז מידע במקום אחד.',
    Strategic_Maturity: 'הכיוון: להקצות זמן קבוע ל\"עבודה על העסק\", אפילו שעתיים בשבוע. להגדיר מדדים שמנחים החלטות, לא רק תחושת בטן.'
  };
  return dir[topMetric] ?? dir.Dependency_Index;
}

function buildConstraints(risks: Record<MetricID, number>, scale?: ScaleStage): string[] {
  const constraints: string[] = [];
  if (scale === 'solo') {
    constraints.push('בעסק סולו, לבחור מוקד שינוי אחד בלבד. לא להעמיס שיפורים על עומס קיים.');
  } else if (scale === 'small_team') {
    constraints.push('בצוות קטן, לייצב תהליך אחד לפני שמוסיפים אנשים או לקוחות.');
  }
  if (risks.Dependency_Index > 0.6) {
    constraints.push('לא להגדיל התחייבויות לפני שמפחיתים תלות. אחרת העומס רק יגדל.');
  }
  if (risks.Process_Standardization > 0.6) {
    constraints.push('לא להכניס כלי חדש לפני שמגדירים תהליך. כלי בלי נוהל רק מגדיל בלבול.');
  }
  if (risks.Cognitive_Load > 0.6) {
    constraints.push('לא לפתוח יותר ממוקד שינוי אחד במקביל. עדיף לסיים דבר אחד לפני שמתחילים הבא.');
  }
  if (constraints.length === 0) {
    constraints.push('להתקדם בצעדים מדודים. כל שלב עם מדד הצלחה ברור לפני שעוברים הלאה.');
  }
  return constraints;
}

function buildRisksIfUnchanged(risks: Record<MetricID, number>): string[] {
  const r: string[] = [];
  if (risks.Dependency_Index > 0.5) {
    r.push('תקרת הכנסה שצמודה לזמינות. אי אפשר לגדול בלי לעבוד יותר שעות.');
  }
  if (risks.Process_Standardization > 0.5) {
    r.push('שונות באיכות. שכפול הצלחה וקליטת אנשים חדשים יישארו קשים ויקרים.');
  }
  if (risks.Cognitive_Load > 0.5) {
    r.push('שחיקה מצטברת. ירידה באיכות החלטות ודחייה של בניית תשתיות עד למשבר.');
  }
  if (risks.Knowledge_Asset_Value > 0.5) {
    r.push('סיכון המשכיות. עזיבה, מחלה או שינוי בכוח אדם יוצרים משבר ידע.');
  }
  if (risks.Strategic_Maturity > 0.5) {
    r.push('עסק שדורך במקום. הרבה עשייה, מעט התקדמות. תגובתיות במקום יוזמה.');
  }
  if (r.length === 0) {
    r.push('הפוטנציאל קיים. בלי צעד מכוון הוא ימומש רק חלקית.');
  }
  return r;
}

function toActionItem(
  raw: string | ActionItem,
  defaults: { owner: string; deadline: string; kpi?: string; deliverable?: string; effort?: string }
): ActionItem {
  if (typeof raw === 'string') {
    return {
      what: raw,
      owner: defaults.owner,
      deadline: defaults.deadline,
      kpi: defaults.kpi,
      deliverable: defaults.deliverable,
      effort: defaults.effort
    };
  }
  return {
    ...defaults,
    ...raw,
    what: raw.what
  };
}

export const generateReportText = (
  state: UserState,
  normalized: MetricScores,
  topMetric: MetricID,
  pattern: ManagementPattern,
  scale?: ScaleStage
): ReportContent => {
  const risks: Record<MetricID, number> = {
    Dependency_Index: getRiskScore("Dependency_Index", normalized.Dependency_Index),
    Cognitive_Load: getRiskScore("Cognitive_Load", normalized.Cognitive_Load),
    Process_Standardization: getRiskScore("Process_Standardization", normalized.Process_Standardization),
    Knowledge_Asset_Value: getRiskScore("Knowledge_Asset_Value", normalized.Knowledge_Asset_Value),
    Strategic_Maturity: getRiskScore("Strategic_Maturity", normalized.Strategic_Maturity)
  };

  const scorecard: Record<MetricID, MaturityLevel> = {
    Dependency_Index: getMaturityLevel(risks.Dependency_Index),
    Cognitive_Load: getMaturityLevel(risks.Cognitive_Load),
    Process_Standardization: getMaturityLevel(risks.Process_Standardization),
    Knowledge_Asset_Value: getMaturityLevel(risks.Knowledge_Asset_Value),
    Strategic_Maturity: getMaturityLevel(risks.Strategic_Maturity)
  };

  const sortedMetrics = Object.entries(risks).sort(([, a], [, b]) => b - a);
  const topRisks = sortedMetrics.slice(0, 3).map(([m]) => m as MetricID);
  const bottleneckDescriptions: Record<MetricID, { title: string; description: string }> = {
    Dependency_Index: {
      title: "צוואר בקבוק מבני",
      description: "זרימת המידע וההחלטות עוברת כיום דרך צומת אחד. זה יוצר את החסם הקשיח ביותר לצמיחה בשלב הנוכחי."
    },
    Cognitive_Load: {
      title: "עומס קשב ניהולי",
      description: "עלות המעבר בין משימות גבוהה, וזה משאיר מעט זמן לניהול יזום ולבניית תשתיות."
    },
    Process_Standardization: {
      title: "היעדר עקביות תפעולית",
      description: "התוצאה תלויה ב'מי מבצע' ולא ב'איך מבצעים'. זה מונע סקייל ושכפול הצלחות."
    },
    Knowledge_Asset_Value: {
      title: "סיכון נכסי ידע",
      description: "הידע הארגוני אינו מתועד במלואו. עזיבת איש מפתח יוצרת סיכון המשכיות."
    },
    Strategic_Maturity: {
      title: "חסם תגובתיות",
      description: "העסק פועל כיום בעיקר בתגובה לאירועים. זה מגביל יזמות וצמיחה מתוכננת."
    }
  };
  const bottlenecks = topRisks.map(m => bottleneckDescriptions[m]);

  const recommendations: string[] = [];
  if (risks.Dependency_Index > 0.6) {
    recommendations.push("מיפוי 3 החלטות שחוזרות על עצמן והאצלתן המלאה תוך 30 יום.");
  } else if (risks.Process_Standardization > 0.6) {
    recommendations.push("כתיבת 'נוהל ברזל' אחד לשירות המרכזי ביותר בעסק.");
  } else {
    recommendations.push("ניתוח רווחיות לכל לקוח או מוצר וניפוי ה 20% התחתונים.");
  }
  if (risks.Knowledge_Asset_Value > 0.5) {
    recommendations.push("הפיכת הדרכה בעל פה אחת לסרטון או מסמך שניתן לצריכה עצמית.");
  } else {
    recommendations.push("הטמעת כלי אחד שמחליף עבודה ידנית בשרשרת הערך המרכזית.");
  }
  recommendations.push("הגדרת דשבורד שבועי עם 3 מדדי KPI לקבלת החלטות.");
  if (risks.Strategic_Maturity > 0.6) {
    recommendations.push("הקצאת 'זמן אסטרטגיה' קשיח ביומן (שעתיים בשבוע) לעבודה על העסק.");
  }

  const patternKey = (pattern.id === "REACTIVE_TECHNOLOGICAL" || pattern.id === "REACTIVE_COGNITIVE") ? "REACTIVE" : pattern.id;
  const copy = PATTERN_COPY[patternKey] ?? PATTERN_COPY.CENTRALIZED;
  const kpisList = copy?.kpis ?? [];
  const quickWinsRaw = copy?.quickWins ?? [];
  const structuralStepsRaw = copy?.structuralSteps ?? [];
  const quickWinsAsItems: ActionItem[] = (quickWinsRaw as (string | ActionItem)[]).map((item, i) =>
    toActionItem(item, {
      owner: 'בעלת העסק',
      deadline: '7 עד 14 יום',
      kpi: kpisList[i],
      deliverable: 'מסמך/תוצר ממומש',
      effort: '2 עד 4 שעות'
    })
  );
  const structuralStepsAsItems: ActionItem[] = (structuralStepsRaw as (string | ActionItem)[]).map((item, i) =>
    toActionItem(item, {
      owner: 'בעלת העסק',
      deadline: '30 עד 60 יום',
      kpi: kpisList[quickWinsRaw.length + i],
      deliverable: 'מבנה מוגדר',
      effort: 'יום עבודה'
    })
  );

  const currentState = copy
    ? copy.currentStateBullets.join('\n')
    : buildCurrentState(risks, pattern, scale);
  const existingAssets = copy?.existingAssets ?? buildExistingAssets(risks);
  const centralGap = copy?.centralGap ?? buildCentralGap(risks, topMetric);
  const directionOfBuild = copy?.directionOfBuild ?? buildDirectionOfBuild(risks, topMetric);
  const recommendationsList = copy?.recommendations ?? recommendations;
  const constraintsList = copy?.constraints ?? buildConstraints(risks, scale);
  const risksList = copy?.risksIfUnchanged ?? buildRisksIfUnchanged(risks);
  const executiveSummaryText = copy?.executiveSummary ?? (
    buildCurrentState(risks, pattern, scale) + ' ' +
    buildCentralGap(risks, topMetric) + ' ' +
    'ללא שינוי בארכיטקטורת הניהול, הגדלת היקף תגרור עומס גובר או ירידה ברמת השירות.'
  );

  const decisionRequiredMap: Record<MetricID, string> = {
    Dependency_Index: 'להתחיל להפריד ידע, החלטה וביצוע, כדי שהעסק יוכל לגדול בלי שהכל יעבור דרכך.',
    Cognitive_Load: 'לבנות מסגרות שמגנות על הקשב: בלוקי זמן, צמצום הפרעות, כלל תעדוף ברור.',
    Process_Standardization: 'לייצב תהליך אחד מרכזי לפני שמרחיבים. קודם סדר, אחר כך צמיחה.',
    Knowledge_Asset_Value: 'לתעד את הידע הקריטי ולהפוך אותו לנכס נגיש, לא רק \"בראש\".',
    Strategic_Maturity: 'להקצות זמן קבוע ל\"עבודה על העסק\": מדדים, תכנון, קבלת החלטות מבוססת נתונים.'
  };
  const decisionRequired = decisionRequiredMap[topMetric] ?? decisionRequiredMap.Dependency_Index;

  const scaleLabel = scale ? SCALE_LABELS[scale] : '';
  const executiveOneLine = `דפוס ניהול: ${pattern.name}${scaleLabel ? ` (${scaleLabel})` : ''}. הפער המרכזי: ${METRIC_LABELS[topMetric]}.`;
  const executiveRiskCost = risksList[0] ?? 'ללא שינוי, הפוטנציאל לא ימומש והעסק ימשיך להתמודד עם אותם חסמים.';
  const allActions = quickWinsAsItems.length >= 3
    ? quickWinsAsItems
    : [...quickWinsAsItems, ...recommendationsList.map((r) => ({ what: r } as ActionItem))];
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
    decisionRequired,
    executiveIntro: REPORT_EXECUTIVE_INTRO,
    reportClosingSentence: REPORT_CLOSING_SENTENCE,
    operationalSymptoms: copy?.operationalSymptoms ?? [],
    quickWins: quickWinsAsItems,
    structuralSteps: structuralStepsAsItems,
    kpis: copy?.kpis ?? [],
    evidence: buildEvidence(state, topMetric),
    bottlenecks,
    scorecard,
    roadmap: recommendationsList
  };
};

const formatBullets = (items: string[]): string =>
  items.map((item, i) => `${i + 1}. ${item}`).join('\n');

/**
 * Generates the full report as plain text for copy/share.
 */
export function generateFullReportPlainText(
  result: DiagnosticResult,
  reportData: ReportContent
): string {
  const lines: string[] = [];

  lines.push('דוח אבחון ניהולי');
  lines.push('דפוס ניהול: ' + result.pattern.name);
  if (result.scaleStage) {
    lines.push('שלב תפעולי מוערך: ' + (SCALE_LABELS[result.scaleStage] ?? result.scaleStage));
  }
  lines.push('');

  lines.push('תקציר מנהלים');
  lines.push('─────────────────');
  if (reportData.decisionRequired) {
    lines.push('החלטה נדרשת: ' + reportData.decisionRequired);
    lines.push('');
  }
  if (reportData.executiveOneLine) {
    lines.push('מצב נוכחי: ' + reportData.executiveOneLine);
    lines.push('עלות/סיכון אם לא מטפלים: ' + reportData.executiveRiskCost);
    if (reportData.executiveTopActions?.length) {
      lines.push('3 מהלכים דחופים:');
      reportData.executiveTopActions.forEach((a, i) => {
        lines.push(`  ${i + 1}. ${a.action} | KPI: ${a.kpi}`);
      });
      lines.push('');
    }
  }
  if (reportData.executiveIntro) {
    lines.push(reportData.executiveIntro);
    lines.push('');
  }
  lines.push(reportData.executiveSummary);
  lines.push('');

  lines.push('תמונת מצב נוכחית');
  lines.push('─────────────────');
  const currentStateBullets = reportData.currentState
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  lines.push(currentStateBullets.length > 0 ? formatBullets(currentStateBullets) : reportData.currentState);
  lines.push('');

  lines.push('פרופיל תפעולי');
  lines.push('─────────────────');
  lines.push('"' + result.pattern.oneLiner + '"');
  lines.push('');
  lines.push('מבנה ניהולי נוכחי:');
  lines.push(result.pattern.diagram);
  lines.push('');

  lines.push('מפת מדדים ניהוליים');
  lines.push('─────────────────');
  for (const [metric, level] of Object.entries(reportData.scorecard)) {
    const metricID = metric as MetricID;
    lines.push('• ' + METRIC_LABELS[metricID] + ': ' + (MATURITY_LABELS[level] ?? level));
  }
  lines.push('');

  lines.push('נכסים קיימים , מה עובד');
  lines.push('─────────────────');
  lines.push(formatBullets(reportData.existingAssets));
  lines.push('');

  lines.push('הפער המרכזי');
  lines.push('─────────────────');
  lines.push(reportData.centralGap);
  lines.push('');

  if (reportData.evidence && reportData.evidence.length > 0) {
    lines.push('עדויות מהאבחון');
    lines.push('─────────────────');
    lines.push(formatBullets(reportData.evidence));
    lines.push('');
  }

  if (reportData.operationalSymptoms && reportData.operationalSymptoms.length > 0) {
    lines.push('השפעות ותסמינים תפעוליים');
    lines.push('─────────────────');
    lines.push(formatBullets(reportData.operationalSymptoms));
    lines.push('');
  }

  lines.push('סיכונים אם לא מטפלים');
  lines.push('─────────────────');
  lines.push(formatBullets(reportData.risksIfUnchanged));
  lines.push('');

  lines.push('כיוון בנייה');
  lines.push('─────────────────');
  lines.push(reportData.directionOfBuild);
  lines.push('');

  const qw = reportData.quickWins ?? [];
  const ss = reportData.structuralSteps ?? [];
  const qwStrings = qw.map((x) => (typeof x === 'string' ? x : x.what));
  const ssStrings = ss.map((x) => (typeof x === 'string' ? x : x.what));
  if (qwStrings.length || ssStrings.length) {
    lines.push('תוכנית פעולה');
    lines.push('─────────────────');
    if (qwStrings.length) {
      lines.push('ניצחונות מהירים , 7 עד 14 יום:');
      lines.push(formatBullets(qwStrings));
      lines.push('');
    }
    if (ssStrings.length) {
      lines.push('צעדים מבניים , 30 עד 60 יום:');
      lines.push(formatBullets(ssStrings));
    }
  } else {
    lines.push('מה נכון לעשות עכשיו');
    lines.push('─────────────────');
    lines.push(formatBullets(reportData.recommendations));
  }
  lines.push('');

  lines.push('מה לא לעשות (Anti-Patterns)');
  lines.push('─────────────────');
  lines.push(formatBullets(reportData.constraints));
  lines.push('');

  if (reportData.kpis?.length) {
    lines.push('מדדי הצלחה מוצעים (KPIs)');
    lines.push('─────────────────');
    lines.push(formatBullets(reportData.kpis));
    lines.push('');
  }

  if (reportData.reportClosingSentence) {
    lines.push(reportData.reportClosingSentence);
  }

  return lines.join('\n');
}
