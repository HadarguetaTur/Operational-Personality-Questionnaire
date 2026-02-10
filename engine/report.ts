import { UserState, MetricScores, MetricID, ReportContent, MaturityLevel } from '../types';
import { getRiskScore } from './scoring';

const getMaturityLevel = (riskScore: number): MaturityLevel => {
  if (riskScore < 0.33) return "High";
  if (riskScore < 0.66) return "Medium";
  return "Low";
};

export const generateReportText = (
  state: UserState, 
  normalized: MetricScores, 
  topMetric: MetricID
): ReportContent => {
  
  // 1. Calculate Risk Scores
  const risks: Record<MetricID, number> = {
    Dependency_Index: getRiskScore("Dependency_Index", normalized.Dependency_Index),
    Cognitive_Load: getRiskScore("Cognitive_Load", normalized.Cognitive_Load),
    Process_Standardization: getRiskScore("Process_Standardization", normalized.Process_Standardization),
    Knowledge_Asset_Value: getRiskScore("Knowledge_Asset_Value", normalized.Knowledge_Asset_Value),
    Strategic_Maturity: getRiskScore("Strategic_Maturity", normalized.Strategic_Maturity)
  };

  // 2. Scorecard
  const scorecard: Record<MetricID, MaturityLevel> = {
    Dependency_Index: getMaturityLevel(risks.Dependency_Index),
    Cognitive_Load: getMaturityLevel(risks.Cognitive_Load),
    Process_Standardization: getMaturityLevel(risks.Process_Standardization),
    Knowledge_Asset_Value: getMaturityLevel(risks.Knowledge_Asset_Value),
    Strategic_Maturity: getMaturityLevel(risks.Strategic_Maturity)
  };

  // 3. Executive Summary Construction
  let execSummary = "ניתוח הנתונים מצביע על עסק בעל פוטנציאל, אך כזה שפועל כרגע תחת אילוצי משאבים ניהוליים משמעותיים. ";
  
  if (risks.Dependency_Index > 0.6) {
    execSummary += "הדפוס המרכזי הוא ריכוזיות יתר, שבו הידע וההחלטות תלויים בך בלעדית. ";
  } else if (risks.Process_Standardization > 0.6) {
    execSummary += "האתגר המרכזי הוא 'חוב תהליכי' – קיימים משאבי ביצוע, אך היעדר סטנדרטיזציה גורר עבודה כפולה ושחיקת רווחיות. ";
  } else if (risks.Cognitive_Load > 0.6) {
    execSummary += "ניכר עומס קוגניטיבי גבוה שמונע התמקדות בצמיחה לטובת כיבוי שריפות שוטף. ";
  } else {
    execSummary += "העסק מציג בשלות תפעולית יחסית, והחסם המרכזי לצמיחה עובר כעת למישור האסטרטגי ולפיתוח מנועי צמיחה חדשים. ";
  }
  
  execSummary += "ללא שינוי בארכיטקטורת הניהול, הגדלת המכירות תגרור בהכרח ירידה ברמת השירות או שחיקה אישית מואצת.";


  // 4. Core Bottlenecks (Top 3 based on highest risks)
  const sortedMetrics = Object.entries(risks).sort(([,a], [,b]) => b - a);
  const topRisks = sortedMetrics.slice(0, 3).map(([m]) => m as MetricID);
  
  const bottleneckDescriptions: Record<MetricID, { title: string; description: string }> = {
    Dependency_Index: {
      title: "צוואר בקבוק פרסונלי",
      description: "כל זרימת המידע וההחלטות עוברת דרכך. זהו החסם הפיזיקלי הקשיח ביותר לצמיחה כרגע."
    },
    Cognitive_Load: {
      title: "שחיקת קשב ניהולי",
      description: "עלות המעבר בין משימות גבוהה מדי, מה שמשאיר אפס זמן לניהול יזום."
    },
    Process_Standardization: {
      title: "היעדר עקביות",
      description: "התוצאה תלויה ב'מי מבצע' ולא ב'איך מבצעים'. זה מונע סקייל ושכפול הצלחות."
    },
    Knowledge_Asset_Value: {
      title: "סיכון נכסי ידע",
      description: "הידע הארגוני אינו מתועד אלא נמצא בראשים של אנשים. עזיבת איש מפתח תחזיר את העסק אחורה."
    },
    Strategic_Maturity: {
      title: "חסם תגובתיות",
      description: "העסק פועל כתגובה ללקוחות/שוק ולא יוזם מהלכים. זה מוביל לדריכה במקום למרות עבודה קשה."
    }
  };

  const bottlenecks = topRisks.map(m => bottleneckDescriptions[m]);

  // 5. Strategic Roadmap
  const roadmap: string[] = [];

  // Phase 1: Stabilization
  if (risks.Dependency_Index > 0.6) {
    roadmap.push("שלב 1: חילוץ מהתפעול - מיפוי 3 החלטות שחוזרות על עצמן והאצלתן המלאה תוך 30 יום.");
  } else if (risks.Process_Standardization > 0.6) {
    roadmap.push("שלב 1: ייצוב הליבה - כתיבת 'נוהל ברזל' לשירות המרכזי ביותר בעסק.");
  } else {
    roadmap.push("שלב 1: אופטימיזציה - ביצוע ניתוח רווחיות לכל לקוח/מוצר וניפוי ה-20% התחתונים.");
  }

  // Phase 2: Systematization
  if (risks.Knowledge_Asset_Value > 0.5) {
    roadmap.push("שלב 2: בניית נכסים - הפיכת כל הדרכה בעל-פה לסרטון/מסמך שניתן לצריכה עצמית.");
  } else {
    roadmap.push("שלב 2: אוטומציה - הטמעת כלי אחד שמחליף עבודה ידנית בשרשרת הערך המרכזית.");
  }

  // Phase 3: Growth
  roadmap.push("שלב 3: ניהול מבוסס נתונים - הגדרת דשבורד שבועי עם 3 מדדי KPI בלבד לקבלת החלטות.");
  
  if (risks.Strategic_Maturity > 0.6) {
     roadmap.push("פעולה מיידית: הקצאת 'זמן אסטרטגיה' קשיח ביומן (שעתיים בשבוע) שמוקדש לפיתוח עסקי בלבד.");
  }

  return { 
    executiveSummary: execSummary,
    bottlenecks,
    scorecard,
    roadmap
  };
};