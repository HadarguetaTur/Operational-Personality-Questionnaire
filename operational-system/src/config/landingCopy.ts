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
/** פתיח FAQ בדף הבית — מבקר ראשון, דגש על אבחון חינם */
export const HOME_FAQ_INTRO = "תשובות קצרות על האבחון החינמי, על הזמן, ועל מה שקורה אחרי.";
export const FINAL_CTA_MICROCOPY = "ביטול עד 24 שעות לפני, החזר מלא.";

/** תמונת פרופיל בעיגול (קובץ מרובע עם פינות לבנות מחוץ למעגל) — חיתוך עגול ב־CSS */
export const PROFILE_PHOTO_CIRCLE_URL =
  "https://res.cloudinary.com/wecare-img/image/upload/v1778173214/%D7%A4%D7%A8%D7%95%D7%A4%D7%99%D7%9C_%D7%9E%D7%90%D7%99_qmp4dr.jpg";

/** שאלות FAQ משותפות — התנגדויות, כולל הקשר לאבחון חינם ולסשן בתשלום */
export const SHARED_FAQ: FaqItem[] = [
  {
    question: "האם האבחון באמת חינמי?",
    answer:
      "לחלוטין. לא צריך כרטיס אשראי ולא שום פרטי תשלום. ממלאים, מקבלים תוצאה למייל. זהו.",
  },
  {
    question: "מה מקבלים אחרי האבחון?",
    answer:
      "דוח מסודר שמראה מה הדפוס שמנהל את העסק שלך, איפה הוא נשען עלייך יותר מדי, ומה כדאי לטפל בו קודם. תוצאה ספציפית לעסק שלך, לא עצות כלליות.",
  },
  {
    question: "כמה זמן זה לוקח?",
    answer:
      "בערך 5 דקות. ממלאים ומקבלים תוצאה למייל. אם תרצי להמשיך לסשן ממוקד יש אפשרות כזאת, אבל גם זה לא מחייב שום דבר.",
  },
  {
    question: "מה קורה אם אני לא יודעת להסביר מה הבעיה?",
    answer:
      "זה בדיוק בשביל מה האבחון קיים. לא צריך להגיע עם הגדרה מסודרת. השאלות מובנות כך שהן מוציאות את התמונה מתוכך. את עונה, האבחון מפרש.",
  },
  {
    question: "האם זה מתאים לעסק קטן?",
    answer:
      "כן, ובמיוחד כשבעלת העסק היא גם המוצר, גם הניהול וגם שירות הלקוחות. ככל שהעסק יותר תלוי בך, ככה האבחון יהיה יותר רלוונטי.",
  },
  {
    question: "האם זה מתאים גם אם אין לי כלים או מערכות?",
    answer:
      "כן. האבחון בודק תהליכים, לא כלים. לפעמים עסקים שאין להם מערכות בכלל יוצאים עם התמונה הכי ברורה.",
  },
  {
    question: "יש לי כבר מאנדיי, נושן או CRM. מה האבחון יחדש לי?",
    answer:
      "כלים בלי תהליך מסודר לרוב מסבכים. האבחון בודק אם הכלים שיש לך משרתים אותך, או שאת עובדת בשבילם.",
  },
  {
    question: "חייבת להמשיך לסשן בתשלום?",
    answer:
      "לא. האבחון החינמי עומד בפני עצמו. אם תרצי להמשיך לסשן אפיון ממוקד יש אפשרות כזאת. אם לא, יוצאות עם מפה ואת מיישמת לבד.",
  },
];

const WHY_ME_HEADLINE = "אני רואה תהליכים. אני בונה מה שמחזיק.";
const WHY_ME_INTRO = "רוב הבעיות שרואים בעסקים לא מגיעות מחוסר כלים. הן מגיעות מתהליכים שנבנו בדרך, בלי שמישהי הסתכלה על הכול יחד. עבדתי עם עסקים, ארגונים ומשרדים ממשלתיים על בניית תהליכים, נהלי עבודה ואוטומציות. ומה שלמדתי הוא שהשלב הכי חשוב הוא לא הבנייה. הוא מה שבא לפניה.";
const WHY_ME_PROOFS: string[] = [
  "אני מגיעה עם עיניים על כל התהליך, לא רק על הנקודה שכואבת.",
  "אני יודעת לראות איפה זמן נוזל ואיפה עסק נשען יותר מדי על אדם אחד.",
  "הפתרון שאני בונה מגיע רק אחרי שאני מבינה מה באמת קורה.",
];

/** קופי סקשן \"קצת עליי\" בדף הבית — מבקר חדש + משפך אבחון חינם */
export const HOME_ABOUT_SECTION: WhyMeSectionCopy = {
  whyMeHeadline: WHY_ME_HEADLINE,
  whyMeIntro: WHY_ME_INTRO,
  whyMeProofs: WHY_ME_PROOFS,
  whyMeClose:
    "אם את מרגישה שהעסק לא ממש עובד בלעדייך, האבחון החינמי יראה לך בדיוק איפה זה קורה ומה כדאי לשנות קודם. בלי התחייבות.",
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
