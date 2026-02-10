import { Config } from '../types';

export const diagnosticConfig: Config = {
  metadata: {
    version: "3.0",
    name: "Architecture of Scale Audit",
    metrics: [
      "Dependency_Index",
      "Cognitive_Load",
      "Process_Standardization",
      "Knowledge_Asset_Value",
      "Strategic_Maturity"
    ]
  },
  questions: [
    // --- Layer A: Core Diagnostic (One key question from each category) ---
    {
      id: "A1",
      layer: "A",
      text: "מה קורה בעסק בזמן שבו בחרת להתנתק (חופשה, מחלה או יום סידורים)?",
      answers: [
        { id: "A1_A", text: "העבודה נעצרת כמעט לחלוטין; אני חוזר/ת לערימת מיילים.", score: { Dependency_Index: 5, Process_Standardization: 3 } },
        { id: "A1_B", text: "העסק ממשיך לתפקד ברמה הבסיסית, אבל החשובים מחכים לי.", score: { Dependency_Index: 3, Cognitive_Load: 2 } },
        { id: "A1_C", text: "יש לי 'ממלא מקום' והעסק מתקדם גם בלעדיי.", score: { Dependency_Index: 0, Strategic_Maturity: 5 } }, // Good
        { id: "A1_D", text: "אני זמין/ה בטלפון ובוואטסאפ גם 'בחופש', אחרת דברים נתקעים.", score: { Dependency_Index: 5, Cognitive_Load: 4 } }
      ]
    },
    {
      id: "A2",
      layer: "A",
      text: "כמה החלטות קטנות (Micro-decisions) את/ה נדרש/ת לקבל ביום?",
      answers: [
        { id: "A2_A", text: "המון. שואלים אותי על כל פיפס.", score: { Cognitive_Load: 5, Dependency_Index: 4 } },
        { id: "A2_B", text: "מעט מאוד. הגדרתי עקרונות והאנשים מחליטים לבד.", score: { Cognitive_Load: 0, Process_Standardization: 0 } }, // Good
        { id: "A2_C", text: "אני מקבל/ת את כולן, כי אני לא סומך/ת על אף אחד.", score: { Cognitive_Load: 5, Dependency_Index: 5 } },
        { id: "A2_D", text: "אני עובד/ת לבד, אז כל החלטה עלי (ולפעמים אני קופא/ת).", score: { Cognitive_Load: 4, Strategic_Maturity: 3 } }
      ]
    },
    {
      id: "A3",
      layer: "A",
      text: "אם הייתי מבקש/ת לראות 'איך עושים אצלכם דברים', מה היית מראה לי?",
      answers: [
        { id: "A3_A", text: "מסמכים סדורים (SOPs) או סרטוני הדרכה.", score: { Process_Standardization: 0, Knowledge_Asset_Value: 5 } }, // Good
        { id: "A3_B", text: "הכל נמצא בראש שלי, לומדים תוך כדי תנועה.", score: { Process_Standardization: 5, Knowledge_Asset_Value: 1 } },
        { id: "A3_C", text: "יש כמה רשימות (Checklists), אבל הרוב תלוי במבצע.", score: { Process_Standardization: 3, Knowledge_Asset_Value: 2 } },
        { id: "A3_D", text: "לכל פרויקט שיטה אחרת, אנחנו גמישים.", score: { Process_Standardization: 5, Strategic_Maturity: 1 } }
      ]
    },
    {
      id: "A4",
      layer: "A",
      text: "מה קורה כשעובד/ת או פרילנסר/ית עוזבים את העסק?",
      answers: [
        { id: "A4_A", text: "זו קטסטרופה; ידע הולך לאיבוד ומתחילים מאפס.", score: { Knowledge_Asset_Value: 1, Process_Standardization: 4 } }, // Bad Value
        { id: "A4_B", text: "עיכוב של כמה שבועות, אבל הכל מתועד.", score: { Knowledge_Asset_Value: 4, Strategic_Maturity: 3 } }, // Good Value
        { id: "A4_C", text: "אני לוקח/ת את התפקיד עלי עד שאמצא מחליף.", score: { Knowledge_Asset_Value: 2, Dependency_Index: 4 } },
        { id: "A4_D", text: "רוב הידע החשוב תמיד אצלי, הם רק 'ידיים'.", score: { Knowledge_Asset_Value: 2, Dependency_Index: 5 } }
      ]
    },
    {
      id: "A5",
      layer: "A",
      text: "כמה זמן בשבוע מוקדש ל'עבודה על העסק' (תכנון, שיפור תהליכים)?",
      answers: [
        { id: "A5_A", text: "כמעט אפס; אני כל היום ב'עבודה בתוך העסק'.", score: { Strategic_Maturity: 5, Cognitive_Load: 4 } },
        { id: "A5_B", text: "פעם בכמה חודשים אני לוקח/ת יום חופש לחשוב.", score: { Strategic_Maturity: 3 } },
        { id: "A5_C", text: "יש זמן קבוע ביומן לשיפור התשתית.", score: { Strategic_Maturity: 0, Process_Standardization: 0 } }, // Good
        { id: "A5_D", text: "אני חושב/ת על זה בלילות, אבל לא מיישם.", score: { Strategic_Maturity: 4, Cognitive_Load: 3 } }
      ]
    }
  ],
  branchQuestions: {
    Dependency_Index: [
      {
        id: "B_DEP_1",
        layer: "B",
        text: "מהי רמת המעורבות שלך בפרטים הקטנים של הביצוע היומיומי?",
        answers: [
          { id: "B_DEP_1_A", text: "שום דבר לא יוצא בלי בקרת איכות שלי.", score: { Dependency_Index: 5, Process_Standardization: 3 } },
          { id: "B_DEP_1_B", text: "מעורב/ת רק במקרי קצה, השאר עצמאי.", score: { Dependency_Index: 1, Strategic_Maturity: 4 } },
          { id: "B_DEP_1_C", text: "מתקן/ת טעויות כי 'יותר מהיר לעשות בעצמי'.", score: { Dependency_Index: 5, Cognitive_Load: 3 } },
          { id: "B_DEP_1_D", text: "הלקוחות קשורים אליי אישית.", score: { Dependency_Index: 5, Strategic_Maturity: 2 } }
        ]
      },
      {
        id: "B_DEP_2",
        layer: "B",
        text: "היכן נמצא 'צוואר הבקבוק' העיקרי שמונע מהעסק לקלוט עוד לקוחות?",
        answers: [
          { id: "B_DEP_2_A", text: "ביכולת שלי לייצר עוד שעות עבודה.", score: { Dependency_Index: 5 } },
          { id: "B_DEP_2_B", text: "ביכולת הצוות לעמוד בסטנדרט האיכות.", score: { Process_Standardization: 4, Dependency_Index: 2 } },
          { id: "B_DEP_2_C", text: "בשיווק – התפעול יודע לטפל בהכל.", score: { Dependency_Index: 0 } }, // Not a dep issue
          { id: "B_DEP_2_D", text: "בניהול האופרציה והתיאומים.", score: { Process_Standardization: 3, Cognitive_Load: 3 } }
        ]
      }
    ],
    Cognitive_Load: [
      {
        id: "B_COG_1",
        layer: "B",
        text: "איך נראה המעבר שלך בין משימות במהלך יום?",
        answers: [
          { id: "B_COG_1_A", text: "קופץ/ת בין עשייה, שירות וניהול כל 10 דקות.", score: { Cognitive_Load: 5 } },
          { id: "B_COG_1_B", text: "יש 'בלוקים' ביומן לניהול ולעבודה.", score: { Cognitive_Load: 1, Strategic_Maturity: 4 } },
          { id: "B_COG_1_C", text: "רוב היום כיבוי שריפות.", score: { Cognitive_Load: 5, Strategic_Maturity: 5 } },
          { id: "B_COG_1_D", text: "מנסה להתרכז אבל ההתראות לא מפסיקות.", score: { Cognitive_Load: 4 } }
        ]
      },
      {
        id: "B_COG_2",
        layer: "B",
        text: "איך מתבצע המעקב אחר ביצוע משימות בעסק?",
        answers: [
          { id: "B_COG_2_A", text: "הכל בראש שלי או במחברת.", score: { Cognitive_Load: 5, Knowledge_Asset_Value: 1 } },
          { id: "B_COG_2_B", text: "כלי ניהול, אבל צריך לרדוף לעדכונים.", score: { Cognitive_Load: 3, Process_Standardization: 2 } },
          { id: "B_COG_2_C", text: "מערכת שקופה, אני יודע/ת בלי לשאול.", score: { Cognitive_Load: 0, Process_Standardization: 0 } },
          { id: "B_COG_2_D", text: "וואטסאפ ומיילים, דברים הולכים לאיבוד.", score: { Cognitive_Load: 5, Process_Standardization: 5 } }
        ]
      }
    ],
    Process_Standardization: [
      {
        id: "B_PROC_1",
        layer: "B",
        text: "מהי רמת האחידות של התוצר שהלקוח מקבל?",
        answers: [
          { id: "B_PROC_1_A", text: "מצוינת, אבל נראית אחרת אם אני עשיתי.", score: { Process_Standardization: 4, Dependency_Index: 4 } },
          { id: "B_PROC_1_B", text: "זהה בסטנדרט גבוה, לא משנה מי עשה.", score: { Process_Standardization: 0 } },
          { id: "B_PROC_1_C", text: "משתנה בהתאם לעומס השבועי.", score: { Process_Standardization: 5, Cognitive_Load: 3 } },
          { id: "B_PROC_1_D", text: "אני היחיד/ה שיודע/ת, אז אני עושה.", score: { Process_Standardization: 3, Dependency_Index: 5 } }
        ]
      },
      {
        id: "B_PROC_2",
        layer: "B",
        text: "איך נראה תהליך הצירוף (Onboarding) של לקוח חדש?",
        answers: [
          { id: "B_PROC_2_A", text: "כל פעם הפקה מחדש ידנית.", score: { Process_Standardization: 5, Cognitive_Load: 3 } },
          { id: "B_PROC_2_B", text: "'פס ייצור' אוטומטי/חצי-אוטומטי.", score: { Process_Standardization: 0, Strategic_Maturity: 5 } },
          { id: "B_PROC_2_C", text: "ממתין עד שאתפנה לשלוח.", score: { Process_Standardization: 3, Dependency_Index: 3 } },
          { id: "B_PROC_2_D", text: "מסתמך/ת על הזיכרון שלא שכחתי כלום.", score: { Process_Standardization: 5, Cognitive_Load: 4 } }
        ]
      }
    ],
    Knowledge_Asset_Value: [
      {
        id: "B_KNOW_1",
        layer: "B",
        text: "איך נראה תהליך ההכשרה של אדם חדש?",
        answers: [
          { id: "B_KNOW_1_A", text: "יושב לידי ולומד תוך כדי תנועה.", score: { Knowledge_Asset_Value: 2, Dependency_Index: 4 } },
          { id: "B_KNOW_1_B", text: "מקבל גישה למאגר ידע ולומד עצמאית.", score: { Knowledge_Asset_Value: 5, Dependency_Index: 0 } }, // Good Value
          { id: "B_KNOW_1_C", text: "מסביר/ה לו כל פעם מחדש.", score: { Knowledge_Asset_Value: 1, Cognitive_Load: 3 } },
          { id: "B_KNOW_1_D", text: "מחפש/ת רק אנשים שיודעים הכל מראש.", score: { Knowledge_Asset_Value: 2, Strategic_Maturity: 2 } }
        ]
      },
      {
        id: "B_KNOW_2",
        layer: "B",
        text: "איפה שמור המידע האסטרטגי (סיסמאות, נהלים, חוזים)?",
        answers: [
          { id: "B_KNOW_2_A", text: "תיקיות ענן משותפות ומסודרות.", score: { Knowledge_Asset_Value: 5, Process_Standardization: 0 } }, // Good Value
          { id: "B_KNOW_2_B", text: "מפוזר בין המייל, הוואטסאפ והמחשב שלי.", score: { Knowledge_Asset_Value: 1, Process_Standardization: 4 } },
          { id: "B_KNOW_2_C", text: "בעיקר 'בראש' של אנשים ספציפיים.", score: { Knowledge_Asset_Value: 1, Dependency_Index: 4 } },
          { id: "B_KNOW_2_D", text: "אני יודע/ת, אך בלעדיי לא ימצאו כלום.", score: { Knowledge_Asset_Value: 2, Dependency_Index: 5 } }
        ]
      }
    ],
    Strategic_Maturity: [
      {
        id: "B_STRAT_1",
        layer: "B",
        text: "איך את/ה בוחר/ת טכנולוגיה או כלי עבודה חדש?",
        answers: [
          { id: "B_STRAT_1_A", text: "קונה מה שכולם ממליצים בפייסבוק.", score: { Strategic_Maturity: 4 } },
          { id: "B_STRAT_1_B", text: "מחפש/ת פתרון נקודתי לבעיה בוערת.", score: { Strategic_Maturity: 3, Cognitive_Load: 2 } },
          { id: "B_STRAT_1_C", text: "בוחן/ת השתלבות בזרימת העבודה (Workflow).", score: { Strategic_Maturity: 0, Process_Standardization: 0 } }, // Good
          { id: "B_STRAT_1_D", text: "נמנע/ת, אין לי כוח ללמוד.", score: { Strategic_Maturity: 5, Process_Standardization: 3 } }
        ]
      },
      {
        id: "B_STRAT_2",
        layer: "B",
        text: "מהו הקריטריון המרכזי שלך להצלחה של תהליך חדש?",
        answers: [
          { id: "B_STRAT_2_A", text: "אם הוא חסך לי (לבעלים) כאב ראש אישי.", score: { Strategic_Maturity: 3, Dependency_Index: 3 } },
          { id: "B_STRAT_2_B", text: "אם העובדים פחות מבולבלים.", score: { Strategic_Maturity: 2, Cognitive_Load: 2 } },
          { id: "B_STRAT_2_C", text: "מכניס יותר כסף בלי להגדיל שעות שלי.", score: { Strategic_Maturity: 0 } }, // Good
          { id: "B_STRAT_2_D", text: "העיקר שעובד ואין תלונות.", score: { Strategic_Maturity: 4 } }
        ]
      }
    ]
  }
};