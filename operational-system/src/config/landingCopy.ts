/**
 * קופי לדפי נחיתה , 70% אחיד, 30% מותאם לדפוס.
 * מבנה אחיד לשפה עקבית, תוכן מותאם לזיהוי עצמי והמרות.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ProcessStep {
  title: string;
  description: string;
}

/** ארבעה רכיבים לסקריפט הקלטה (בעיה → העמקה → פתרון → חיזוק חברתי) */
export interface VideoScript {
  problem: string;
  deepening: string;
  solution: string;
  socialProof: string;
}

/** פרוסה ל־FAQAccordion (דף נחיתה / דף בית) */
export interface FaqAccordionCopy {
  faq: FaqItem[];
  intro?: string;
}

/** פרוסה ל־WhyMeSection (דף נחיתה / דף בית) */
export interface WhyMeSectionCopy {
  whyMeHeadline: string;
  whyMeIntro: string;
  whyMeProofs: string[];
  whyMeClose: string;
}

export interface LandingCopy {
  patternId: string;
  /** כותרת Hero , כאב חד */
  headline: string;
  /** תת כותרת / הזדהות */
  subheadline: string;

  /** מיקרו אבחון: "אם 2 מתוך 3 נכון , זה את" */
  microDiagnosisHeadline: string;
  microDiagnosisBullets: string[];

  /** מה הכאב עולה לך , תוצאה קונקרטית */
  painCostHeadline: string;
  painCostBullets: string[];

  /** התהליך שעוברים איתי , 4 שלבים */
  processHeadline: string;
  processSteps: ProcessStep[];

  /** מה קורה בשיחה , 3 שלבים */
  callStepsHeadline: string;
  callSteps: string[];

  /** Deliverables , מה מקבלים מהתהליך (קונקרטי!) */
  deliverablesHeadline: string;
  deliverables: string[];

  /** בלוק "למה איתי" , עם הוכחות */
  whyMeHeadline: string;
  whyMeIntro: string;
  whyMeProofs: string[];
  whyMeClose: string;

  /** FAQ , טיפול בהתנגדויות */
  faq: FaqItem[];

  /** CTA + דחיפה עדינה */
  ctaText: string;
  /** טקסט קצר מעל הכפתור בבלוק ה-CTA התחתון (טיפול בהתנגדות) */
  ctaSubtext: string;
  ctaMicrocopy: string;
  /** כותרת ה-bloc הקטן לפני ה-CTA הסופי (שונה מ-Hero) */
  finalCtaHeadline: string;
  urgencyText: string;
  paymentUrl: string;
  /** לשימוש מפיקי וידאו / קידום — ארבעה רכיבי נרטיב */
  videoScript: VideoScript;
}

const PAYMENT_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_PAYMENT_URL?.trim())
    ? process.env.NEXT_PUBLIC_PAYMENT_URL.trim()
    : "#";

/** מחזיר URL לתשלום עם param patternId לטראקינג */
export function getPaymentUrl(patternId: string): string {
  if (PAYMENT_BASE === "#") return "#";
  const slug = patternId.toLowerCase().replace(/_/g, "-");
  const sep = PAYMENT_BASE.includes("?") ? "&" : "?";
  return `${PAYMENT_BASE}${sep}p=${slug}`;
}

const CTA_MICROCOPY = "30 דק׳ | תוצר כתוב | בלי התחייבות להמשך";
export const DELIVERABLES_MICROCOPY = "יוצאים עם בהירות, מפת פעולות מיידית, לא ניירת.";
export const FAQ_INTRO = "שאלות שנשאלו הרבה, תשובות ישירות.";
/** פתיח FAQ בדף הבית — מבקר ראשון, דגש על מחשבון חינם */
export const HOME_FAQ_INTRO = "תשובות קצרות על הבדיקה, על מה שמקבלים, ועל מה שקורה אחרי.";
export const FINAL_CTA_MICROCOPY = "ביטול עד 24 שעות לפני, החזר מלא.";

/** תמונת פרופיל בעיגול (קובץ מרובע עם פינות לבנות מחוץ למעגל) — חיתוך עגול ב־CSS */
export const PROFILE_PHOTO_CIRCLE_URL =
  "https://res.cloudinary.com/wecare-img/image/upload/v1778173214/%D7%A4%D7%A8%D7%95%D7%A4%D7%99%D7%9C_%D7%9E%D7%90%D7%99_qmp4dr.jpg";

/** שאלות FAQ משותפות — הבדיקה "איפה הכסף?" */
export const SHARED_FAQ: FaqItem[] = [
  {
    question: "האם הבדיקה באמת חינמית?",
    answer:
      "כן. עונים על כמה שאלות קצרות ומקבלים תמונה אישית לפי התחומים המרכזיים בעסק. לא צריך כרטיס אשראי.",
  },
  {
    question: "צריך להכין משהו לפני?",
    answer:
      "לא. עונים על מה שמרגישים, גם אם לא הכל מסודר. הבדיקה מאירה את הדפוס לפי התשובות שלך.",
  },
  {
    question: "האם זו הבטחה לתוצאה?",
    answer:
      "לא. זו תמונה ראשונית בלבד, לא בדיקה מלאה של התהליך. המטרה היא להבין איפה כדאי להתחיל לעשות סדר.",
  },
  {
    question: "מה מקבלים בסוף?",
    answer:
      "תמונה של איפה הכסף והזמן נוזלים אצלך בדרך, התחום שכדאי לסדר ראשון, וצעד ראשון מוגדר.",
  },
  {
    question: "אוטומציה לא תהפוך את השירות שלי לקר ומנותק?",
    answer:
      "להפך. מה שעובר לאוטומציה זה הדברים שלא דורשים קשר אישי אמיתי: תזכורות, תיאומים, עדכוני סטטוס ופולואפים בסיסיים. ההקשבה, האבחון וההחלטות נשארים אצלך. שירות קר לא נוצר מאוטומציה, אלא כשבונים אותה בלי להבין את הלקוח. אפשר לנסח כל הודעה בטון של העסק שלך, ולתכנן בדיוק באיזה שלב אדם נכנס לתמונה.",
  },
  {
    question: "למה צריך להשאיר פרטים?",
    answer:
      "כדי לשלוח את הסיכום המותאם לפי התוצאה שלך. הבדיקה עצמה קצרה, והסיכום עוזר להבין מה לעשות עם מה שעלה.",
  },
  {
    question: "מה קורה אחרי זה?",
    answer:
      "אפשר ליישם לבד את הצעדים הראשונים, או לקבוע שיחה ממוקדת כדי להבין איזה תהליך הכי נכון לבנות קודם.",
  },
  {
    question: "למי זה מתאים?",
    answer:
      "לעצמאיות ובעלות עסקים שיש להן פניות, לקוחות, תיאומים, גבייה ופולואפים, אבל הרבה מהניהול עדיין עובר דרכן.",
  },
  {
    question: "למי זה פחות מתאים?",
    answer:
      "אם אין לך עדיין פניות או לקוחות פעילים, הבדיקה כנראה פחות רלוונטית כרגע. היא מיועדת לעסק שכבר זז, אבל רוצה להבין איפה הזמן והכסף נתקעים.",
  },
];

const WHY_ME_HEADLINE = "אני רואה תהליכים. אני בונה מה שמחזיק.";
const WHY_ME_INTRO = "אחרי עבודה עם ארגונים, עצמאיות ומערכות מורכבות, ראיתי שוב ושוב: הבעיה היא לא שחסר עוד כלי. הבעיה היא שלא תמיד ברור איזה תהליך הכי יקר להשאיר ידני.";
const WHY_ME_PROOFS: string[] = [
  "אני מתחילה ממיפוי התהליך, לא מכלי.",
  "אני בודקת איפה הדברים עוברים דרכך במקום דרך מערכת.",
  "הפתרון מגיע רק אחרי שמבינים מה הכי יקר להשאיר ידני.",
];

/** קופי ייעודי ל"קצת עליי" בדף הבית — סמכות מבוססת יכולת, לקוחות ושיטה (לא ותק) */
const HOME_ABOUT_INTRO =
  "אני לא מגיעה רק מהצד של ייעוץ או אפיון תהליכים. אני בונה בעצמי את המערכות, החיבורים ובסיסי הנתונים שמפעילים אותן, ישירות מול הממשקים ומול ה-WhatsApp הרשמי. בפועל זה אומר שאני לא רק אומרת לך מה כדאי לשנות, אלא יודעת לבנות את המערכת שגורמת לזה לקרות, לעקוב אחרי הנתונים, ולוודא שהתהליך לא מתפרק ברגע שיש עומס.";
const HOME_ABOUT_PROOFS: string[] = [
  "מתחילה תמיד ממיפוי התהליך, ובוחרת טכנולוגיה רק אחריו. לפעמים עדיף לעבוד ישירות מול הממשק, כדי לא להעמיס עלייך עוד מערכת ועוד תשלום חודשי.",
  "בניתי מערכת תפעול שלמה לבית ספר פרטי: קביעת שיעורים, ביטולים, תזכורות, רשימות המתנה ותשלומים. אני יודעת איך נראה תהליך אמיתי מקצה לקצה, לא רק אוטומציה בודדת.",
  "בניתי תהליכי פולואפ ב-WhatsApp הרשמי, עם תבניות מאושרות, תזמון חכם וכללים שלא שולחים בשבתות ובחגים. ההמשך קורה גם כשאת לא זוכרת לחזור לכל אחד.",
];

/** קופי סקשן "קצת עליי" בדף הבית — מבקר חדש + משפך מחשבון */
export const HOME_ABOUT_SECTION: WhyMeSectionCopy = {
  whyMeHeadline: WHY_ME_HEADLINE,
  whyMeIntro: HOME_ABOUT_INTRO,
  whyMeProofs: HOME_ABOUT_PROOFS,
  whyMeClose:
    "אני מטפלת גם בחלקים שפחות רואים מבחוץ: שמירת מצב השיחה, מניעת כפילויות, טיפול בתקלות והעברה לאדם כשצריך. כי אוטומציה טובה לא הופכת את השירות לקר, היא לוקחת ממך את מה שלא דורש שיקול דעת, תזכורות, תיאומים ופולואפים, ומשאירה לך זמן וראש להיות נוכחת מול הלקוחה דווקא איפה שזה חשוב. הבדיקה 'איפה הכסף?' נבנתה בדיוק בשביל זה: לראות איפה הניהול הידני עולה לך, לפני שבונים. המטרה היא לא עוד אוטומציה, אלא סדר שמחזיק.",
};

const PROCESS_HEADLINE = "ככה התהליך עובד";
const PROCESS_STEPS: ProcessStep[] = [
  {
    title: "ממלאים שאלון מפורט",
    description: "שאלון שנותן לי תמונה אמיתית של העסק, התהליכים והחיכוכים שלך."
  },
  {
    title: "מקבלות לינק לקביעת פגישה",
    description: "ברגע שהשאלון מוגש, מקבלות לינק לבחור מועד שנוח."
  },
  {
    title: "אני מכינה הכל מראש",
    description: "עוד לפני שנפגשים, אני מעבדת את התשובות, ממפה את המצב ומכינה את החומרים."
  },
  {
    title: "בפגישה עוברות על הכל ביחד",
    description: "30 דקות ממוקדות עם חומר מוכן. בלי בזבוז זמן על ״ספרי לי על העסק״."
  }
];

const CALL_STEPS_HEADLINE = "30 דקות של בהירות אכזרית.";
const CALL_STEPS = [
  "מיפוי \"חורים בסכר\": נבין בדיוק איפה הכסף והזמן שלך נשפכים בגלל תהליכים ידניים או החלטות חוזרות.",
  "זיהוי צוואר הבקבוק הראשי. לא עשרה, אחד. זה שמשחרר את כל השאר.",
  "תוכנית קרב: את לא יוצאת עם \"סיכום פגישה\", אלא עם מפת פעולות מיידית לשבוע הקרוב.",
];

const DELIVERABLES: string[] = [
  "זיהוי החסם הראשי: מה הדבר האחד שאם נזיז, יפנה לך 10 שעות בשבוע",
  "ארכיטקטורת כלים: אילו מערכות באמת דרושות לך (ואילו כדאי למחוק היום)",
  "מפת הדרכים לצמיחה: איך להעביר את הידע מהראש שלך למנגנון שעובד",
  "מפת פעולות לשבוע הקרוב: בהירות, לא ניירת",
];

export const LANDING_COPY: Record<string, LandingCopy> = {
  CENTRALIZED: {
    patternId: "CENTRALIZED",
    headline: "כל החלטה עוברת דרכך. יש דרך לבנות עסק שזז גם בלעדייך.",
    subheadline: "ניהול ריכוזי עובד עד שהוא לא. אם את מזהה את עצמך בזה, יש מה לעשות.",

    microDiagnosisHeadline: "נשמע מוכר?",
    microDiagnosisBullets: [
      "רוב ההחלטות, גם הקטנות, עוברות דרכך",
      "ידע קריטי נמצא בראש או בוואטסאפ, לא במערכת",
      "ניסית להאציל וחזרת כי קל יותר לעשות לבד"
    ],

    painCostHeadline: "כמה זה עולה לך? כל יום שעובר, המחיר עולה.",
    painCostBullets: [
      "יש ביקוש אבל אין יכולת להרחיב",
      "ריבוי החלטות קטנות צובר עומס שמכלה אנרגיה",
      "הזמינות שלך מוגבלת ולקוחות מרגישות את זה"
    ],

    processHeadline: PROCESS_HEADLINE,
    processSteps: PROCESS_STEPS,

    callStepsHeadline: CALL_STEPS_HEADLINE,
    callSteps: CALL_STEPS,

    deliverablesHeadline: "מה מקבלים מהתהליך",
    deliverables: DELIVERABLES,

    whyMeHeadline: WHY_ME_HEADLINE,
    whyMeIntro: WHY_ME_INTRO,
    whyMeProofs: WHY_ME_PROOFS,
    whyMeClose: "אני עוזרת לבעלות עסקים שכל החלטה עוברת דרכן להפוך את הידע לנכס, כדי שיוכלו להאציל בלי לפחד.",

    faq: SHARED_FAQ,
    ctaText: "אני רוצה להאציל בלי לאבד שליטה",
    ctaSubtext:
      "30 דקות של אפיון תפעולי עם חומר מוכן מראש. יוצאים עם מפת פעולות מיידית, בלי התחייבות להמשך.",
    ctaMicrocopy: CTA_MICROCOPY,
    finalCtaHeadline: "מוכנה להפסיק לרכוז הכל בעצמך?",
    urgencyText: "נותרו 2 מקומות לשבוע הקרוב. מומלץ להזמין מראש.",
    paymentUrl: PAYMENT_BASE,
    videoScript: {
      problem:
        "אם את בעלת עסק שכל החלטה, גם הקטנה, חוזרת אלייך, זה לא חוסר סדר. זה מבנה שהעסק נשען עלייך במקום על תהליך ברור.",
      deepening:
        "המחיר הוא לא רק עומס. זה החלטות שנדחות, אנשים שמחכים לאישור, ולקוחות שמקבלים תגובה מאוחרת. זמן שנעלם על דברים שלא אמורים לעבור דרך הראש שלך כל פעם מחדש.",
      solution:
        "בסשן האפיון מוצאים את צוואר הבקבוק הראשי של הריכוזיות: מה חייב להישאר אצלך, ומה אפשר למסגר כך שהעסק ממשיך לזוז גם כשאת עסוקה בתפקיד הניהול שלך.",
      socialProof:
        "עסקים במצב דומה יצאו עם מפת צעדים לשבוע הקרוב, לא ניירת אלא סדר פעולות שאפשר ליישם בלי תחושת ויתור על שליטה.",
    },
  },

  FRAGILE_TEAM: {
    patternId: "FRAGILE_TEAM",
    headline: "העבודה כבר יצאה ממך. האחריות עדיין חוזרת אלייך.",
    subheadline:
      "זה דפוס תלות תפעולית: יש צוות, ספקים או עזרה, אבל בלי תשתית ברורה כל שאלה, טעות ואישור חוזרים אלייך.",

    microDiagnosisHeadline: "זה נראה כמו צוות שצריך אותך, אבל בפועל זו תלות תפעולית.",
    microDiagnosisBullets: [
      "יש אנשים שמבצעים, אבל הם חוזרים אלייך כדי לדעת מה נכון",
      "טעויות חוזרות כי אין מקור אמת אחד לכללים, החלטות וסטנדרטים",
      "האצלה קיימת, אבל היא דורשת תיקונים, אישורים ומעקב צמוד"
    ],

    painCostHeadline: "המחיר של תלות תפעולית הוא לא רק זמן. הוא חוסר יכולת להתרחב בביטחון.",
    painCostBullets: [
      "כל העברה החוצה מייצרת עבודה חוזרת פנימה",
      "הצוות נראה פחות עצמאי ממה שהוא יכול להיות",
      "קשה לשחרר כי אין מערכת שמחזיקה את השחרור"
    ],

    processHeadline: PROCESS_HEADLINE,
    processSteps: PROCESS_STEPS,

    callStepsHeadline: CALL_STEPS_HEADLINE,
    callSteps: CALL_STEPS,

    deliverablesHeadline: "מה מקבלים מהתהליך",
    deliverables: DELIVERABLES,

    whyMeHeadline: WHY_ME_HEADLINE,
    whyMeIntro: WHY_ME_INTRO,
    whyMeProofs: WHY_ME_PROOFS,
    whyMeClose:
      "עבדתי עם בעלות עסקים שמתקשות לשחרר גם כשהעבודה כבר אצל אנשים אחרים. אני בונה תשתית שמחזיקה האצלה: ברירות מחדל, בעלות, מקור אמת. כדי שמשימות לא יחזרו אלייך בלולאת תיקונים.",

    faq: SHARED_FAQ,
    ctaText: "אני רוצה לשבור את התלות התפעולית",
    ctaSubtext:
      "נזהה איפה האחריות חוזרת אלייך, מה חסר במקור האמת, ואיזה צעד תשתיתי ראשון יחזק את ההעברה לצוות.",
    ctaMicrocopy: CTA_MICROCOPY,
    finalCtaHeadline: "בואי נהפוך האצלה לתשתית שמחזיקה",
    urgencyText: "נותרו 2 מקומות לשבוע הקרוב. מומלץ להזמין מראש.",
    paymentUrl: PAYMENT_BASE,
    videoScript: {
      problem:
        "יש מי שמבצע, אבל כל מה שלא מתועד או לא מוגדר נגמר בשאלה אלייך. זה מתחיל ב'בואי רק שניה', ונגמר בזה שהאחריות עדיין אצלך.",
      deepening:
        "זה לא בהכרח בגלל האנשים. זו תלות תפעולית. בלי מקור אמת אחד ובלי סטנדרט לביצוע נכון, ההאצלה חוזרת כטעות, הסבר או תיקון.",
      solution:
        "בסשן עומק מאתרים את נקודת החיכוך שמחזירה אותך לניהול הקטן, ובונים צעד תשתית ראשון: מקור אמת, ברירות מחדל ובעלות ברורה. כדי שהביצוע לא יחזור אלייך בלולאת הסבר ותיקון.",
      socialProof:
        "מה שמשחרר בתלות התפעולית זה לא עוד אדם טוב יותר. זה מנגנון: כללים ברורים ומערכות שמתאימות לתפקיד הביצוע והבעלות.",
    },
  },

  REACTIVE: {
    patternId: "REACTIVE",
    headline: "כיבוי שריפות זה לא אסטרטגיה.",
    subheadline: "אני יודעת איך נראה הניהול הזה: המון כלים, בלי תהליך מסודר, עומס קוגניטיבי כבד, ואין רגע לנשום.",

    microDiagnosisHeadline: "נשמע מוכר?",
    microDiagnosisBullets: [
      "כמה משימות פתוחות במקביל וקשה לעקוב אחריהן",
      "הרבה כלים, הרבה פניות, ושניהם מרגישים כמו כיבוי שריפות",
      "אין רגע לנשום ועוד פחות לעבוד על העסק"
    ],

    painCostHeadline: "כמה זה עולה לך? כל יום שעובר, המחיר עולה.",
    painCostBullets: [
      "שחיקה שמייצרת טעויות וכיבוי שריפות",
      "ירידה באיכות שירות או מוצר, תקרת קיבולת",
      "קיפאון אסטרטגי: הרבה עשייה, מעט תכנון"
    ],

    processHeadline: PROCESS_HEADLINE,
    processSteps: PROCESS_STEPS,

    callStepsHeadline: CALL_STEPS_HEADLINE,
    callSteps: CALL_STEPS,

    deliverablesHeadline: "מה מקבלים מהתהליך",
    deliverables: DELIVERABLES,

    whyMeHeadline: WHY_ME_HEADLINE,
    whyMeIntro: WHY_ME_INTRO,
    whyMeProofs: WHY_ME_PROOFS,
    whyMeClose: "עבדתי עם בעלות עסקים שמכבות שריפות כל יום. אני יודעת איך ליצור מסגרות שמרווחות את הראש ולחבר כלים לתהליך.",

    faq: SHARED_FAQ,
    ctaText: "אני רוצה מסגרת, לא עוד ריצה אינסופית בין משימות",
    ctaSubtext:
      "מתרגמים את הכיבויים למנגנון: מה נכנס בתור, מה דחיף באמת, ומה עוצר צמיחה לפני שמוסיפים כלי נוסף.",
    ctaMicrocopy: CTA_MICROCOPY,
    finalCtaHeadline: "מספיק לרוץ. בואי נצמצם למה שמשנה.",
    urgencyText: "נותרו 2 מקומות לשבוע הקרוב. מומלץ להזמין מראש.",
    paymentUrl: PAYMENT_BASE,
    videoScript: {
      problem:
        "כשכל הזמן יש משימות פתוחות מכל הכיוונים והקשב תמיד טרוף, את יודעת שכיבוי שריפות זה לא אסטרטגיה אלא הרגל שגוזל את מקום הצמיחה.",
      deepening:
        "המחיר הוא לא סתם עייפות: זה איכות שיורדת, החלטות שנדחות, וההרגשה שכלים לא משחררים אותך כי מאחוריהם עדיין אין תור קבלה, סדר ברור והרגל שאפשר להחזיק.",
      solution:
        "בפגישה בונים מסגרת מעוצבת למציאות שלך: איך מסדרים את הדחיפויות, מה דחוף באמת ואיך מעבירים את שאר הפתוח מתוך ההמולה היומיומית לקו תהליך שמתקדם גם כשלא את עומדת מעל כל פריט.",
      socialProof:
        "עסקים ריאקטיביים שעברו את הבהירות הזו רואים איפה זמן מתבזבז בריצה בין משימות, ולא רק עוד פרויקט שנכנס מתחת לרדאר.",
    },
  },

  PROCESS_BASED: {
    patternId: "PROCESS_BASED",
    headline: "המערכת עובדת. השאלה היא איך מאיצים בלי לשבור.",
    subheadline: "יש בסיס טוב. השאלה היא מה מונע מהעסק לקפוץ קדימה.",

    microDiagnosisHeadline: "נשמע מוכר?",
    microDiagnosisBullets: [
      "יש תהליכים אבל הפוטנציאל לא ממומש",
      "יש צווארי בקבוק ברורים ורוצים לדעת איפה אפשר להאיץ",
      "עומס חוזר על נקודות מרכזיות ורוצים להקל"
    ],

    painCostHeadline: "כמה זה עולה לך? כל יום שעובר, המחיר עולה.",
    painCostBullets: [
      "האטה שאפשר למנוע. העסק טוב אבל לא מזנק.",
      "עייפות של שכבת ניהול",
      "מיצוי חלקי של פוטנציאל העסק"
    ],

    processHeadline: PROCESS_HEADLINE,
    processSteps: PROCESS_STEPS,

    callStepsHeadline: CALL_STEPS_HEADLINE,
    callSteps: CALL_STEPS,

    deliverablesHeadline: "מה מקבלים מהתהליך",
    deliverables: DELIVERABLES,

    whyMeHeadline: WHY_ME_HEADLINE,
    whyMeIntro: WHY_ME_INTRO,
    whyMeProofs: WHY_ME_PROOFS,
    whyMeClose: "המערכת שלך טובה. אני כאן כדי לזהות איפה אפשר להאיץ בלי לשבור מה שעובד.",

    faq: SHARED_FAQ,
    ctaText: "אני רוצה לזהות איפה מאיצים בלי לשבור את מה שעובד",
    ctaSubtext:
      "מיפוי ההאצה הבטוח: איפה המערכת כבר בשלה, מה עומס באמצע, ומה צעד אחד שמשחרר את השכבה הניהולית.",
    ctaMicrocopy: CTA_MICROCOPY,
    finalCtaHeadline: "המערכת טובה. עכשיו בואי נמצא את מנוע הצמיחה.",
    urgencyText: "נותרו 2 מקומות לשבוע הקרוב. מומלץ להזמין מראש.",
    paymentUrl: PAYMENT_BASE,
    videoScript: {
      problem:
        "כשיש תהליכים בסיסיים אבל ההרגשה היא שהעסק טוב ולא מתקדם, מה שחסר לרוב זו האצה שמבוססת על המגבלה האמיתית, לא על עוד פרויקט שמתגלגל על שולחן הניהול במקום להניע תוצאות.",
      deepening:
        "מנהלות שכבר בנו שכבה מסודרת מרגישות שהעיכוב הוא כבידות או אחריות שנצברת במקום לא נכון. וזה הופך למתח ניהולי בלי קפיצה בשורה העסקית.",
      solution:
        "סשן האפיון מחדד איפה אפשר למשוך יותר בלי הריסה: אילו מאיצים פרקטיים, איזה צוואר בקבוק אחד שכדאי לפתוח הפעם, ואיפה ההשקעה עוד לא משרתת צמיחה.",
      socialProof:
        "עסקים עם תשתית קיימת יצאו עם ודאות: מה לגעת בה עכשיו, מה להשאיר ללא שינוי, ואיך לשלב את זה בשבוע הבא במקום בתוכנית שנשארת על לוח ההדבקות.",
    },
  },
};

/** Legacy: REACTIVE_TECHNOLOGICAL and REACTIVE_COGNITIVE redirect to REACTIVE */
const LEGACY_PATTERN_MAP: Record<string, string> = {
  REACTIVE_TECHNOLOGICAL: "REACTIVE",
  REACTIVE_COGNITIVE: "REACTIVE",
};

export function getLandingCopy(patternId: string): LandingCopy | null {
  const key = patternId.toUpperCase().replace(/-/g, "_");
  const resolvedKey = LEGACY_PATTERN_MAP[key] ?? key;
  return LANDING_COPY[resolvedKey] ?? null;
}
