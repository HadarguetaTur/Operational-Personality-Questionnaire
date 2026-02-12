import { Config, ScaleContext } from '../types';

// ────────────────────────────────────────────────────────────
// Queue builders
// ────────────────────────────────────────────────────────────

const SOLO_QUESTIONS = ['S2', 'S8', 'S1', 'S5', 'S4', 'S6', 'S3', 'S7'];
const SMALL_TEAM_QUESTIONS = ['T1', 'T2', 'T4', 'T3', 'T8', 'T5', 'T6', 'T7', 'T9'];
const GROWING_TEAM_QUESTIONS = ['G1', 'G2', 'G4', 'G3', 'G8', 'G5', 'G6', 'G7', 'G9'];
const SHARED_STRATEGIC = ['ST1', 'ST2', 'ST3'];

/** ID of the last question before adaptive branching kicks in. */
export const LAST_STRATEGIC_ID = 'ST3';

/** Returns question IDs to show after Q1 based on scale. */
export function getQuestionQueueAfterContext(scaleContext: ScaleContext): string[] {
  let scaleQuestions: string[];
  switch (scaleContext) {
    case 'solo':
      scaleQuestions = SOLO_QUESTIONS;
      break;
    case 'small_team':
      scaleQuestions = SMALL_TEAM_QUESTIONS;
      break;
    case 'growing_team':
      scaleQuestions = GROWING_TEAM_QUESTIONS;
      break;
  }
  return [...scaleQuestions, ...SHARED_STRATEGIC];
}

/** Methodology metadata for report block */
export const METHODOLOGY = {
  questionCount: "14 עד 16",
  dimensionsCount: 5,
  scaleDescription: "סולם 1 עד 5 מנורמל ל 0 עד 1",
  source: "אבחון עצמי מבוסס שאלון",
  sample: "בעל/ת העסק",
} as const;

// ────────────────────────────────────────────────────────────
// Main config
// ────────────────────────────────────────────────────────────

export const diagnosticConfig: Config = {
  metadata: {
    version: "6.0",
    name: "Architecture of Scale | אבחון דפוסי ניהול ותשתית תפעולית",
    metrics: [
      "Dependency_Index",
      "Cognitive_Load",
      "Process_Standardization",
      "Knowledge_Asset_Value",
      "Strategic_Maturity"
    ]
  },

  // ──────────────────────────────────────────────
  // Main questions (Q1 + scale-specific + shared)
  // ──────────────────────────────────────────────
  questions: [

    // ═══════ Phase 1: Context ═══════
    {
      id: "Q1",
      layer: "A",
      text: "מה הכי מתאר את האופן שבו העסק שלך פועל היום?",
      cluster: "context",
      answers: [
        {
          id: "Q1_A",
          text: "אני העסק. אני עושה את עיקר העבודה בעצמי. אם יש לי עזרה, היא נקודתית (פרילנסרים, VA).",
          score: {}
        },
        {
          id: "Q1_B",
          text: "יש לי צוות קטן, 2 עד 6 אנשים שעובדים לצידי באופן קבוע, אבל אני עדיין מעורב/ת ברוב הדברים.",
          score: {}
        },
        {
          id: "Q1_C",
          text: "אני מנהל/ת צוות, 7+ אנשים, עם אחראים על תחומים. אני מנהל/ת מנהלים, לא רק מבצעים.",
          score: {}
        }
      ]
    },

    // ═══════ Phase 2a: Solo Path (S1-S8) ═══════

    // S1 — תקרת הקיבולת
    {
      id: "S1",
      layer: "A",
      text: "אם מחר היו מגיעים 3 לקוחות חדשים במכה, מה היה קורה?",
      cluster: "dependency",
      showForScale: ["solo"],
      answers: [
        {
          id: "S1_A",
          text: "הייתי מסרב/ת או דוחה. אין לי מקום פיזית ביומן.",
          score: { Dependency_Index: 4, Strategic_Maturity: 3 }
        },
        {
          id: "S1_B",
          text: "הייתי מקבל/ת ומרגיש/ה שאני טובע/ת תוך שבועיים.",
          score: { Cognitive_Load: 5, Process_Standardization: 3 }
        },
        {
          id: "S1_C",
          text: "הייתי מפעיל/ת תהליך קבוע של קליטה שמאפשר לי לגדול בלי להתפוצץ.",
          score: { Process_Standardization: 0, Strategic_Maturity: 0 }
        }
      ]
    },

    // S2 — מותג אישי או שיטה
    {
      id: "S2",
      layer: "A",
      text: "כשלקוח ממליץ עליך, מה הוא אומר?",
      cluster: "dependency",
      showForScale: ["solo"],
      answers: [
        {
          id: "S2_A",
          text: "\"תדברו עם [השם שלך], הוא/היא פשוט הכי טוב/ה.\"",
          score: { Dependency_Index: 5 }
        },
        {
          id: "S2_B",
          text: "\"יש לו/ה שיטה מסודרת, מקבלים שירות מדויק.\"",
          score: { Dependency_Index: 2, Process_Standardization: 0 }
        },
        {
          id: "S2_C",
          text: "\"לא יודע מי עושה את העבודה שם, אבל התוצאה תמיד מעולה.\"",
          score: { Dependency_Index: 0, Knowledge_Asset_Value: 5 }
        }
      ]
    },

    // S3 — ניהול ידע אישי
    {
      id: "S3",
      layer: "A",
      text: "איפה נמצא הידע שאת/ה צריך/ה כדי לעבוד? (תבניות, תהליכים, מידע על לקוחות)",
      cluster: "knowledge",
      showForScale: ["solo"],
      answers: [
        {
          id: "S3_A",
          text: "בראש שלי בעיקר. אני יודע/ת מה לעשות כי אני עושה את זה כבר שנים.",
          score: { Knowledge_Asset_Value: 1, Dependency_Index: 4 }
        },
        {
          id: "S3_B",
          text: "פרוס בין מיילים, קבצים וכלים שונים. אם אחפש, אמצא.",
          score: { Knowledge_Asset_Value: 2, Process_Standardization: 3 }
        },
        {
          id: "S3_C",
          text: "מרוכז במערכת אחת עם תבניות שאני משתמש/ת בהן באופן קבוע.",
          score: { Knowledge_Asset_Value: 5, Process_Standardization: 0 }
        }
      ]
    },

    // S4 — שכפול הצלחה (סולו)
    {
      id: "S4",
      layer: "A",
      text: "לקוח אחד קיבל שירות מעולה. מה הסיכוי שהבא יקבל בדיוק את אותו דבר?",
      cluster: "operations",
      showForScale: ["solo"],
      answers: [
        {
          id: "S4_A",
          text: "תלוי ביום. יש ימים שאני בשיא ויש ימים שפחות.",
          score: { Process_Standardization: 5, Knowledge_Asset_Value: 2 }
        },
        {
          id: "S4_B",
          text: "סיכוי טוב, כי אני מקפיד/ה, אבל אין לי רשימת תיוג. זה יוצא מהראש.",
          score: { Process_Standardization: 3 }
        },
        {
          id: "S4_C",
          text: "גבוה. יש לי תהליך מסודר שמבטיח אחידות.",
          score: { Process_Standardization: 0, Knowledge_Asset_Value: 5 }
        }
      ]
    },

    // S5 — עומס קוגניטיבי (סולו)
    {
      id: "S5",
      layer: "A",
      text: "כמה \"כובעים\" את/ה לובש/ת ביום ממוצע? (מקצועי, שיווקי, פיננסי, שירות לקוחות...)",
      cluster: "operations",
      showForScale: ["solo"],
      answers: [
        {
          id: "S5_A",
          text: "הכל. אני עובר/ת בין 4 עד 5 תחומים ביום בלי הפסקה.",
          score: { Cognitive_Load: 5, Strategic_Maturity: 3 }
        },
        {
          id: "S5_B",
          text: "יש דברים שהוצאתי החוצה (הנהלת חשבונות, עיצוב), אבל רוב הליבה עליי.",
          score: { Cognitive_Load: 3 }
        },
        {
          id: "S5_C",
          text: "מגדיר/ה מראש אילו כובעים לאיזה יום, ודברים שלא בליבה, מיקור חוץ.",
          score: { Cognitive_Load: 0, Strategic_Maturity: 0 }
        }
      ]
    },

    // S6 — אוטומציה ומערכות
    {
      id: "S6",
      layer: "A",
      text: "מה התפקיד של כלים דיגיטליים בעבודה שלך?",
      cluster: "operations",
      showForScale: ["solo"],
      answers: [
        {
          id: "S6_A",
          text: "כלים בסיסיים (מייל, וואטסאפ, אקסל). לא הגעתי לסדר את זה.",
          score: { Process_Standardization: 4, Knowledge_Asset_Value: 1 }
        },
        {
          id: "S6_B",
          text: "יש כלים, אבל כל אחד עובד בנפרד. אני מרגיש/ה שאני \"מדביק\" מערכות.",
          score: { Process_Standardization: 3, Cognitive_Load: 2 }
        },
        {
          id: "S6_C",
          text: "יש לי סט כלים שעובד ביחד ומייתר חלק מהעבודה הידנית שלי.",
          score: { Process_Standardization: 0, Knowledge_Asset_Value: 4 }
        }
      ]
    },

    // S7 — ריכוז הכנסה
    {
      id: "S7",
      layer: "A",
      text: "מה מרגיש כשאני חושב/ת על מקורות ההכנסה של העסק?",
      cluster: "knowledge",
      showForScale: ["solo"],
      answers: [
        {
          id: "S7_A",
          text: "אם לקוח גדול אחד עוזב, אני בבעיה אמיתית.",
          score: { Strategic_Maturity: 5, Dependency_Index: 3 }
        },
        {
          id: "S7_B",
          text: "יש פיזור סביר, אבל אין לי שום מנגנון שיוצר הכנסה שלא תלויה בזמן שלי.",
          score: { Strategic_Maturity: 3, Dependency_Index: 2 }
        },
        {
          id: "S7_C",
          text: "יש לי ערוצי הכנסה מגוונים, חלקם לא תלויים בזמן ישיר שלי.",
          score: { Strategic_Maturity: 0 }
        }
      ]
    },

    // S8 — מבחן ההיעדרות (סולו)
    {
      id: "S8",
      layer: "A",
      text: "אם הייתי צריך/ה לקחת חודש חופש ביום שלישי, מה היה קורה עם ההכנסות?",
      cluster: "dependency",
      showForScale: ["solo"],
      answers: [
        {
          id: "S8_A",
          text: "ההכנסה הייתה נעצרת לגמרי.",
          score: { Dependency_Index: 5, Process_Standardization: 4 }
        },
        {
          id: "S8_B",
          text: "חלק מהדברים היו ממשיכים (מוצר דיגיטלי, ריטיינר), אבל רוב ההכנסה תלויה בנוכחות שלי.",
          score: { Dependency_Index: 3 }
        },
        {
          id: "S8_C",
          text: "רוב ההכנסה הייתה ממשיכה. יש מערכת שפועלת.",
          score: { Dependency_Index: 0, Process_Standardization: 0 }
        }
      ]
    },

    // ═══════ Phase 2b: Small Team Path (T1-T9) ═══════

    // T1 — מבחן החופשה
    {
      id: "T1",
      layer: "A",
      text: "שבועיים חופש. מה באמת יקרה?",
      cluster: "dependency",
      showForScale: ["small_team"],
      answers: [
        {
          id: "T1_A",
          text: "אצטרך לבדוק הודעות כל יום. בלי זה, החלטות תתקענה.",
          score: { Dependency_Index: 5, Process_Standardization: 3 }
        },
        {
          id: "T1_B",
          text: "הצוות ידע לטפל בשגרה, אבל כל חריג ינתב אליי.",
          score: { Dependency_Index: 3, Cognitive_Load: 2 }
        },
        {
          id: "T1_C",
          text: "הדברים ימשיכו. יש הנחיות ברורות ואנשים עם סמכות לפעול.",
          score: { Dependency_Index: 0 }
        }
      ]
    },

    // T2 — מותג מנוהל
    {
      id: "T2",
      layer: "A",
      text: "כשלקוח מתקשר, את/ה חייב/ת להיות מי שעונה?",
      cluster: "dependency",
      showForScale: ["small_team"],
      answers: [
        {
          id: "T2_A",
          text: "כן. הלקוח בא בשבילי. אם מישהו אחר עונה, הוא מרגיש שקיבל \"פחות\".",
          score: { Dependency_Index: 5 }
        },
        {
          id: "T2_B",
          text: "לא תמיד, אבל הלקוח מצפה לדעת שאני מעורב/ת ברקע.",
          score: { Dependency_Index: 3 }
        },
        {
          id: "T2_C",
          text: "הלקוח מזהה את המותג, לא אותי אישית. הצוות הוא הפנים של השירות.",
          score: { Dependency_Index: 0, Knowledge_Asset_Value: 4 }
        }
      ]
    },

    // T3 — רצף עבודה
    {
      id: "T3",
      layer: "A",
      text: "איך נראה יום טיפוסי מבחינת ניהול?",
      cluster: "operations",
      showForScale: ["small_team"],
      answers: [
        {
          id: "T3_A",
          text: "קופצים מדבר לדבר. כל 20 דקות מישהו צריך משהו.",
          score: { Cognitive_Load: 5 }
        },
        {
          id: "T3_B",
          text: "מנסה לשמור בלוקים, אבל לרוב נשבר.",
          score: { Cognitive_Load: 3 }
        },
        {
          id: "T3_C",
          text: "יש לי \"שעות ניהול\" מוגדרות, והשאר עבודת עומק.",
          score: { Cognitive_Load: 0 }
        }
      ]
    },

    // T4 — האצלה וביצוע
    {
      id: "T4",
      layer: "A",
      text: "כשאת/ה נותן/ת משימה לאחד מהצוות, מה קורה?",
      cluster: "dependency",
      showForScale: ["small_team"],
      answers: [
        {
          id: "T4_A",
          text: "בדרך כלל אני צריך/ה לחזור ולתקן. קל לי יותר לעשות בעצמי.",
          score: { Dependency_Index: 5, Process_Standardization: 4 }
        },
        {
          id: "T4_B",
          text: "עושים סבבה, אבל צריכים הרבה הכוונה ממני בדרך.",
          score: { Dependency_Index: 3, Process_Standardization: 2 }
        },
        {
          id: "T4_C",
          text: "מבצעים באופן עצמאי לפי הנחיות מוגדרות, ומדווחים בסוף.",
          score: { Dependency_Index: 0, Process_Standardization: 0 }
        }
      ]
    },

    // T5 — תקינה ותהליכים
    {
      id: "T5",
      layer: "A",
      text: "כשנכנס לקוח/פרויקט חדש, עד כמה הצעדים ברורים?",
      cluster: "operations",
      showForScale: ["small_team"],
      answers: [
        {
          id: "T5_A",
          text: "כל מקרה הוא ייחודי. אני בונה את הדרך תוך כדי תנועה.",
          score: { Process_Standardization: 5, Knowledge_Asset_Value: 1 }
        },
        {
          id: "T5_B",
          text: "יש כיוון כללי, אבל כל פעם צריך להחליט מחדש מי עושה מה.",
          score: { Process_Standardization: 3 }
        },
        {
          id: "T5_C",
          text: "יש תהליך מובנה עם שלבים, אחראים ולוחות זמנים שמופעל מיד.",
          score: { Process_Standardization: 0, Knowledge_Asset_Value: 5 }
        }
      ]
    },

    // T6 — ידע ארגוני
    {
      id: "T6",
      layer: "A",
      text: "איפה \"גר\" הידע של העסק?",
      cluster: "knowledge",
      showForScale: ["small_team"],
      answers: [
        {
          id: "T6_A",
          text: "בראש שלי. אם אני לא שם, אין למי לשאול.",
          score: { Knowledge_Asset_Value: 1, Dependency_Index: 4 }
        },
        {
          id: "T6_B",
          text: "מפוזר. בוואטסאפים, מיילים, מסמכים. קיים, אבל לא נגיש.",
          score: { Knowledge_Asset_Value: 2, Process_Standardization: 3 }
        },
        {
          id: "T6_C",
          text: "במקום מרכזי אחד שכולם יודעים לגשת אליו ולפעול לפיו.",
          score: { Knowledge_Asset_Value: 5 }
        }
      ]
    },

    // T7 — קליטת עובד
    {
      id: "T7",
      layer: "A",
      text: "עובד/ת חדש/ה מצטרף/ת. מה מחכה לו/ה?",
      cluster: "knowledge",
      showForScale: ["small_team"],
      answers: [
        {
          id: "T7_A",
          text: "שבועיים של \"ללכת לידי\" ולספוג. לוקח זמן עד שמבינים איך עובדים פה.",
          score: { Knowledge_Asset_Value: 1, Dependency_Index: 4 }
        },
        {
          id: "T7_B",
          text: "יש הדרכה, אבל היא תלויה בזמינות שלי ובזיכרון שלי.",
          score: { Knowledge_Asset_Value: 2, Dependency_Index: 3 }
        },
        {
          id: "T7_C",
          text: "תוכנית חניכה מובנית עם חומרים כתובים שמאפשרת עצמאות מהירה.",
          score: { Knowledge_Asset_Value: 5, Dependency_Index: 0 }
        }
      ]
    },

    // T8 — פרויקט דחוף
    {
      id: "T8",
      layer: "A",
      text: "פרויקט דחוף נוחת. מה קורה עם שאר העבודה?",
      cluster: "operations",
      showForScale: ["small_team"],
      answers: [
        {
          id: "T8_A",
          text: "הכל מתערבב. אני מנהל/ת ומבצע/ת במקביל.",
          score: { Cognitive_Load: 5, Dependency_Index: 4 }
        },
        {
          id: "T8_B",
          text: "אני קובע/ת מה דוחים, אבל זה דורש ממני תיאום אינטנסיבי.",
          score: { Cognitive_Load: 3, Dependency_Index: 2 }
        },
        {
          id: "T8_C",
          text: "יש כלל תעדוף ברור. הצוות יודע לפעול לפיו בלי לחכות להוראה.",
          score: { Cognitive_Load: 0, Process_Standardization: 0 }
        }
      ]
    },

    // T9 — ניהול מידע לקוחות
    {
      id: "T9",
      layer: "A",
      text: "מה קורה כשצריך לדעת מה סוכם עם לקוח לפני 3 חודשים?",
      cluster: "knowledge",
      showForScale: ["small_team"],
      answers: [
        {
          id: "T9_A",
          text: "צריך לשאול אותי. אני זוכר/ת את רוב הדברים.",
          score: { Knowledge_Asset_Value: 1, Dependency_Index: 4 }
        },
        {
          id: "T9_B",
          text: "מחפשים במיילים ובוואטסאפ. לוקח זמן אבל מוצאים.",
          score: { Knowledge_Asset_Value: 2 }
        },
        {
          id: "T9_C",
          text: "הכל מתועד במערכת אחת. כל אחד בצוות יכול לגשת ולראות.",
          score: { Knowledge_Asset_Value: 5 }
        }
      ]
    },

    // ═══════ Phase 2c: Growing Team Path (G1-G9) ═══════

    // G1 — ריכוזיות בהחלטות
    {
      id: "G1",
      layer: "A",
      text: "כמה החלטות \"עוברות דרכך\" ביום רגיל?",
      cluster: "dependency",
      showForScale: ["growing_team"],
      answers: [
        {
          id: "G1_A",
          text: "עשרות. מרגיש/ה כאילו כל דבר דורש את האישור שלי.",
          score: { Dependency_Index: 5, Cognitive_Load: 4 }
        },
        {
          id: "G1_B",
          text: "יש ניסיון להאציל, אבל בפועל כולם חוזרים אליי ל\"רגע אחד\".",
          score: { Dependency_Index: 3, Cognitive_Load: 3 }
        },
        {
          id: "G1_C",
          text: "מעט. הגדרנו סמכויות ברורות, והצוות פועל בתוכן.",
          score: { Dependency_Index: 0 }
        }
      ]
    },

    // G2 — זיהוי חריגות
    {
      id: "G2",
      layer: "A",
      text: "מי הראשון לזהות שמשהו לא עובד?",
      cluster: "dependency",
      showForScale: ["growing_team"],
      answers: [
        {
          id: "G2_A",
          text: "בדרך כלל אני. אני רואה את זה לפני כולם.",
          score: { Dependency_Index: 5, Process_Standardization: 3 }
        },
        {
          id: "G2_B",
          text: "יש מעקב, אבל אני צריך/ה לשאול \"מה קורה עם X?\" כדי לקבל סטטוס.",
          score: { Dependency_Index: 3, Process_Standardization: 2 }
        },
        {
          id: "G2_C",
          text: "בעלי התחומים מדווחים על חריגות באופן פרואקטיבי.",
          score: { Dependency_Index: 0, Process_Standardization: 0 }
        }
      ]
    },

    // G3 — בקרת איכות
    {
      id: "G3",
      layer: "A",
      text: "איך נשמרת רמת האיכות כשאת/ה לא שם?",
      cluster: "operations",
      showForScale: ["growing_team"],
      answers: [
        {
          id: "G3_A",
          text: "יורדת. האיכות תלויה בנוכחות שלי.",
          score: { Dependency_Index: 5, Process_Standardization: 4 }
        },
        {
          id: "G3_B",
          text: "נשמרת בזכות אנשים טובים, אבל כל אחד בדרך שלו.",
          score: { Process_Standardization: 3, Dependency_Index: 1 }
        },
        {
          id: "G3_C",
          text: "יש סטנדרטים, בקרות ורשימות תיוג שמחזיקים את הרמה.",
          score: { Process_Standardization: 0, Dependency_Index: 0 }
        }
      ]
    },

    // G4 — מבנה ארגוני
    {
      id: "G4",
      layer: "A",
      text: "איך נראה מבנה האחריות בעסק?",
      cluster: "dependency",
      showForScale: ["growing_team"],
      answers: [
        {
          id: "G4_A",
          text: "שטוח. כולם מדווחים ישירות אליי.",
          score: { Dependency_Index: 5, Cognitive_Load: 3 }
        },
        {
          id: "G4_B",
          text: "יש ראשי צוותים, אבל בפועל הם לא מקבלים החלטות בלעדיי.",
          score: { Dependency_Index: 3 }
        },
        {
          id: "G4_C",
          text: "יש בעלי תפקידים עם סמכות מוגדרת שמנהלים את התחום שלהם.",
          score: { Dependency_Index: 0, Strategic_Maturity: 0 }
        }
      ]
    },

    // G5 — תהליכי עבודה
    {
      id: "G5",
      layer: "A",
      text: "כשצריך לצרף לקוח חדש, מה קורה?",
      cluster: "operations",
      showForScale: ["growing_team"],
      answers: [
        {
          id: "G5_A",
          text: "תלוי מי פנוי ומה המצב. כל מקרה שונה.",
          score: { Process_Standardization: 5 }
        },
        {
          id: "G5_B",
          text: "יש שלבים מוכרים, אבל הביצוע משתנה בין אנשים ותקופות.",
          score: { Process_Standardization: 3 }
        },
        {
          id: "G5_C",
          text: "תהליך אחיד עם checklist שמופעל באופן אוטומטי.",
          score: { Process_Standardization: 0, Knowledge_Asset_Value: 5 }
        }
      ]
    },

    // G6 — ניהול ידע
    {
      id: "G6",
      layer: "A",
      text: "איפה מתועד הידע של הארגון?",
      cluster: "knowledge",
      showForScale: ["growing_team"],
      answers: [
        {
          id: "G6_A",
          text: "בעיקר בראש של אנשי מפתח. אם מישהו עוזב, הידע הולך איתו.",
          score: { Knowledge_Asset_Value: 1, Dependency_Index: 3 }
        },
        {
          id: "G6_B",
          text: "יש מסמכים, אבל לא מעודכנים ולא תמיד נגישים.",
          score: { Knowledge_Asset_Value: 2, Process_Standardization: 2, Dependency_Index: 1 }
        },
        {
          id: "G6_C",
          text: "במקור אמת מרכזי שכולם משתמשים בו ומעדכנים אותו.",
          score: { Knowledge_Asset_Value: 5, Dependency_Index: 0 }
        }
      ]
    },

    // G7 — קליטה וחניכה
    {
      id: "G7",
      layer: "A",
      text: "עובד/ת חדש/ה נכנס/ת לתפקיד. תוך כמה זמן הוא/היא עצמאי/ת?",
      cluster: "knowledge",
      showForScale: ["growing_team"],
      answers: [
        {
          id: "G7_A",
          text: "חודשיים+. תהליך הלמידה ארוך כי הוא תלוי בזמינות שלי ושל אנשי מפתח.",
          score: { Knowledge_Asset_Value: 1, Dependency_Index: 4 }
        },
        {
          id: "G7_B",
          text: "חודש. יש הדרכות, אבל עדיין הרבה \"תשאל/י את [שם]\".",
          score: { Knowledge_Asset_Value: 3, Dependency_Index: 1 }
        },
        {
          id: "G7_C",
          text: "שבועיים עד שלושה. יש תוכנית חניכה מובנית עם חומרים מוכנים.",
          score: { Knowledge_Asset_Value: 5, Dependency_Index: 0 }
        }
      ]
    },

    // G8 — צווארי בקבוק
    {
      id: "G8",
      layer: "A",
      text: "כשנוצר צוואר בקבוק, מה קורה?",
      cluster: "operations",
      showForScale: ["growing_team"],
      answers: [
        {
          id: "G8_A",
          text: "בדרך כלל אני צוואר הבקבוק. אישורים וביצוע עוברים דרכי.",
          score: { Dependency_Index: 5, Cognitive_Load: 3 }
        },
        {
          id: "G8_B",
          text: "צווארי בקבוק נוצרים מחוסר כלים או כוח אדם. מזהים מאוחר מדי.",
          score: { Process_Standardization: 4, Dependency_Index: 1 }
        },
        {
          id: "G8_C",
          text: "יש מנגנון שמזהה צווארי בקבוק ומפנה משאבים לפני שזה נהיה בעיה.",
          score: { Strategic_Maturity: 0, Process_Standardization: 0, Dependency_Index: 0 }
        }
      ]
    },

    // G9 — נתונים ומדדים
    {
      id: "G9",
      layer: "A",
      text: "כמה \"שקוף\" מבחינתך הביצוע של הצוות?",
      cluster: "knowledge",
      showForScale: ["growing_team"],
      answers: [
        {
          id: "G9_A",
          text: "אין לי תמונה ברורה. אני הולך/ת לפי תחושה ומה שקולט/ת בשטח.",
          score: { Strategic_Maturity: 5 }
        },
        {
          id: "G9_B",
          text: "יש מעקב חלקי (מכירות, משימות), אבל חסרה תמונה תפעולית מלאה.",
          score: { Strategic_Maturity: 3 }
        },
        {
          id: "G9_C",
          text: "יש דשבורד עדכני שמראה ביצוע, עומסים ומדדי איכות.",
          score: { Strategic_Maturity: 0 }
        }
      ]
    },

    // ═══════ Phase 3: Shared Strategic Layer ═══════

    // ST1 — אופק תכנון
    {
      id: "ST1",
      layer: "A",
      text: "מה קורה כשאת/ה מנסה לתכנן את הרבעון הקרוב?",
      cluster: "strategic",
      answers: [
        {
          id: "ST1_A",
          text: "לא באמת מתכנן/ת. מגיב/ה למה שמגיע.",
          score: { Strategic_Maturity: 5 }
        },
        {
          id: "ST1_B",
          text: "יש כיוון כללי בראש, אבל אין תוכנית כתובה עם יעדים ולוחות זמנים.",
          score: { Strategic_Maturity: 3 }
        },
        {
          id: "ST1_C",
          text: "יש תוכנית עם יעדים מדידים שמתורגמת למשימות קונקרטיות.",
          score: { Strategic_Maturity: 0 }
        }
      ]
    },

    // ST2 — חוסן עסקי
    {
      id: "ST2",
      layer: "A",
      text: "מה קורה כשיש ירידה פתאומית בביקוש?",
      cluster: "strategic",
      answers: [
        {
          id: "ST2_A",
          text: "פאניקה. מרגיש/ה את זה בבטן ומתחיל/ה לרוץ למכירות.",
          score: { Strategic_Maturity: 5 }
        },
        {
          id: "ST2_B",
          text: "מזהה את הצורך בשינוי, אבל לוקח זמן להתארגן.",
          score: { Strategic_Maturity: 3 }
        },
        {
          id: "ST2_C",
          text: "יש תכנית מגירה ומדדים שמתריעים מוקדם. זזים לפני שהמשבר מכה.",
          score: { Strategic_Maturity: 0 }
        }
      ]
    },

    // ST3 — השקעה בתשתיות
    {
      id: "ST3",
      layer: "A",
      text: "מתי בפעם האחרונה השקעת זמן ממוקד בשיפור הדרך שבה העסק עובד (לא בעבודה עצמה)?",
      cluster: "strategic",
      answers: [
        {
          id: "ST3_A",
          text: "לא זוכר/ת. כל הזמן נשאב לשוטף.",
          score: { Strategic_Maturity: 5, Cognitive_Load: 3 }
        },
        {
          id: "ST3_B",
          text: "רק כשמשהו נשבר ואין ברירה.",
          score: { Strategic_Maturity: 4 }
        },
        {
          id: "ST3_C",
          text: "באופן קבוע. יש זמן מוגדר בלוח שמוקדש לשיפור תשתיות.",
          score: { Strategic_Maturity: 0 }
        }
      ]
    }
  ],

  // ──────────────────────────────────────────────
  // Branch questions (Phase 4: Adaptive Deepening)
  // ──────────────────────────────────────────────
  branchQuestions: {

    // ── Dependency deep-dive ──
    Dependency_Index: [
      {
        id: "BD1",
        layer: "B",
        text: "מה היה קורה אם מחר היית צריך/ה להפסיק לטפל בלקוחות ולהתמקד רק בבניית העסק?",
        cluster: "deepening",
        answers: [
          {
            id: "BD1_A",
            text: "הלקוחות היו עוזבים. אני השירות.",
            score: { Dependency_Index: 5, Knowledge_Asset_Value: 1 }
          },
          {
            id: "BD1_B",
            text: "חלק היו נשארים, אבל האיכות הייתה יורדת בלעדיי.",
            score: { Dependency_Index: 3 }
          },
          {
            id: "BD1_C",
            text: "השירות היה ממשיך. הצוות/המערכת יודעים לספק את הערך.",
            score: { Dependency_Index: 0, Knowledge_Asset_Value: 4 }
          }
        ]
      },
      {
        id: "BD2",
        layer: "B",
        text: "מי יכול לקבל החלטה של 5,000 ש\"ח בלי לשאול אותך?",
        cluster: "deepening",
        answers: [
          {
            id: "BD2_A",
            text: "אף אחד. כל הוצאה עוברת דרכי.",
            score: { Dependency_Index: 5 }
          },
          {
            id: "BD2_B",
            text: "יש מישהו/י, אבל מרגיש/ה צורך לבדוק אחר כך.",
            score: { Dependency_Index: 3 }
          },
          {
            id: "BD2_C",
            text: "יש מסגרת סמכויות ברורה. כל בעל תפקיד יודע מה הגבול שלו.",
            score: { Dependency_Index: 0, Process_Standardization: 0 }
          }
        ]
      }
    ],

    // ── Cognitive deep-dive ──
    Cognitive_Load: [
      {
        id: "BC1",
        layer: "B",
        text: "בסוף יום עבודה, מה המצב?",
        cluster: "deepening",
        answers: [
          {
            id: "BC1_A",
            text: "מרוקן/ת. לא נשאר אנרגיה לחשוב על העסק, רק על עבודה בתוכו.",
            score: { Cognitive_Load: 5, Strategic_Maturity: 4 }
          },
          {
            id: "BC1_B",
            text: "עייף/ה, אבל יש ימים שמצליח/ה לעשות דברים אסטרטגיים.",
            score: { Cognitive_Load: 3 }
          },
          {
            id: "BC1_C",
            text: "יש לי אנרגיה. ימי העבודה מובנים כך שנשמר מרחב מנטלי.",
            score: { Cognitive_Load: 0 }
          }
        ]
      },
      {
        id: "BC2",
        layer: "B",
        text: "כשיש 5 דברים דחופים במקביל, איך את/ה מחליט/ה מה קודם?",
        cluster: "deepening",
        answers: [
          {
            id: "BC2_A",
            text: "מה שצועק הכי חזק. אין כלל.",
            score: { Cognitive_Load: 5 }
          },
          {
            id: "BC2_B",
            text: "יש אינטואיציה, אבל לפעמים מרגיש/ה שעשיתי את הסדר הלא נכון.",
            score: { Cognitive_Load: 3 }
          },
          {
            id: "BC2_C",
            text: "יש מטריצת תעדוף ברורה (דחוף/חשוב) שמנחה אותי.",
            score: { Cognitive_Load: 0, Process_Standardization: 0 }
          }
        ]
      }
    ],

    // ── Process deep-dive ──
    Process_Standardization: [
      {
        id: "BP1",
        layer: "B",
        text: "כשאותה משימה חוזרת על עצמה (הצעת מחיר, onboarding), מה קורה?",
        cluster: "deepening",
        answers: [
          {
            id: "BP1_A",
            text: "כל פעם מחדש. אין תבנית אחידה.",
            score: { Process_Standardization: 5 }
          },
          {
            id: "BP1_B",
            text: "יש משהו, אבל כל אחד עושה וריאציה שלו.",
            score: { Process_Standardization: 3 }
          },
          {
            id: "BP1_C",
            text: "יש תהליך מתועד עם תבנית שמופעל באותו אופן כל פעם.",
            score: { Process_Standardization: 0, Knowledge_Asset_Value: 5 }
          }
        ]
      },
      {
        id: "BP2",
        layer: "B",
        text: "אם היית צריך/ה להסביר למישהו חיצוני \"איך העסק עובד\", כמה זמן היה לוקח?",
        cluster: "deepening",
        answers: [
          {
            id: "BP2_A",
            text: "ימים. זה הכל בראש שלי ואין מסמך אחד שמסביר את זה.",
            score: { Process_Standardization: 5, Knowledge_Asset_Value: 1 }
          },
          {
            id: "BP2_B",
            text: "שעות. יש חלקים מתועדים, אבל חסרה תמונה שלמה.",
            score: { Process_Standardization: 3, Knowledge_Asset_Value: 2 }
          },
          {
            id: "BP2_C",
            text: "שעה. יש מפת תהליכים ברורה שאפשר פשוט להראות.",
            score: { Process_Standardization: 0, Knowledge_Asset_Value: 5 }
          }
        ]
      }
    ],

    // ── Knowledge deep-dive ──
    Knowledge_Asset_Value: [
      {
        id: "BK1",
        layer: "B",
        text: "אם היית צריך/ה להעביר את כל הידע שלך למישהו אחר, כמה מזה כתוב?",
        cluster: "deepening",
        answers: [
          {
            id: "BK1_A",
            text: "כמעט כלום. הכל בראש.",
            score: { Knowledge_Asset_Value: 1, Dependency_Index: 4 }
          },
          {
            id: "BK1_B",
            text: "יש חלקים, אבל חסר הרבה.",
            score: { Knowledge_Asset_Value: 2 }
          },
          {
            id: "BK1_C",
            text: "רובו מתועד ונגיש.",
            score: { Knowledge_Asset_Value: 5 }
          }
        ]
      },
      {
        id: "BK2",
        layer: "B",
        text: "מה קורה כשאת/ה צריך/ה לעשות משימה שעשית לפני שנה ולא זוכר/ת את הפרטים?",
        cluster: "deepening",
        answers: [
          {
            id: "BK2_A",
            text: "מתחיל/ה מאפס. אין תיעוד.",
            score: { Knowledge_Asset_Value: 1, Process_Standardization: 4 }
          },
          {
            id: "BK2_B",
            text: "מחפש/ת בהתכתבויות ומסמכים ישנים.",
            score: { Knowledge_Asset_Value: 2 }
          },
          {
            id: "BK2_C",
            text: "נכנס/ת למערכת ומוצא/ת הכל מסודר.",
            score: { Knowledge_Asset_Value: 5 }
          }
        ]
      }
    ],

    // ── Strategic deep-dive ──
    Strategic_Maturity: [
      {
        id: "BS1",
        layer: "B",
        text: "מתי בפעם האחרונה ישבת להגדיר מה העסק צריך להשיג ברבעון הבא?",
        cluster: "deepening",
        answers: [
          {
            id: "BS1_A",
            text: "לא זוכר/ת. אני בתוך הדברים ואין לי ראש לזה.",
            score: { Strategic_Maturity: 5 }
          },
          {
            id: "BS1_B",
            text: "ניסיתי, אבל זה לא הפך לתוכנית אמיתית.",
            score: { Strategic_Maturity: 3 }
          },
          {
            id: "BS1_C",
            text: "לפני פחות מחודש. יש לי מסגרת תכנון קבועה.",
            score: { Strategic_Maturity: 0 }
          }
        ]
      },
      {
        id: "BS2",
        layer: "B",
        text: "איך את/ה יודע/ת אם החודש היה חודש טוב או רע?",
        cluster: "deepening",
        answers: [
          {
            id: "BS2_A",
            text: "לפי תחושת בטן ויתרה בבנק.",
            score: { Strategic_Maturity: 5 }
          },
          {
            id: "BS2_B",
            text: "לפי מכירות, אבל בלי מבט תפעולי.",
            score: { Strategic_Maturity: 3 }
          },
          {
            id: "BS2_C",
            text: "לפי מדדים ברורים שאני עוקב/ת אחריהם.",
            score: { Strategic_Maturity: 0 }
          }
        ]
      }
    ]
  }
};
