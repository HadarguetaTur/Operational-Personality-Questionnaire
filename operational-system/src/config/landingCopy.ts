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
export const FAQ_INTRO = "שאלות שנשאלו הרבה , תשובות ישירות.";
export const FINAL_CTA_MICROCOPY = "ביטול עד 24 שעות לפני , החזר מלא.";

/** שאלות FAQ משותפות , סגנון "בלי לרחם" */
const SHARED_FAQ: FaqItem[] = [
  {
    question: "למי זה בטוח לא מתאים?",
    answer: "לעסקים שעדיין מחפשים 'קסמים'. אם את לא מוכנה להשקיע זמן בלבנות תשתית עכשיו כדי לקבל חופש אחר כך , חבל על הזמן של שתינו. אני עובדת עם עסקים שרוצים לגדול, לא עם כאלו שרוצים להמשיך לכבות שריפות וליהנות מהדרמה."
  },
  {
    question: "יש לי כבר מאנדיי, נושן או CRM. מה האבחון יחדש לי?",
    answer: "מערכת בלי תהליך היא פשוט בית קברות יקר לנתונים. רוב העסקים שאני פוגשת משתמשים ב 20% מהיכולת של הכלים שלהם ומשלמים 100% מחיר בגלל סרבול. האבחון יגיד לך אם הכלי משרת אותך, או שאת עובדת אצלו."
  },
  {
    question: "כמה זמן זה דורש ממני?",
    answer: "השאלון הראשוני לוקח 5 עד 7 דקות. אחריו נעשה תהליך איסוף מידע מסודר, שאלון ארוך, מיפוי כלים, שדורש השקעת זמן מצדך. הסשן עצמו לוקח 30 דקות. היישום? הוא ייקח פחות זמן ממה שלוקח לך היום לנסות להבין למה עובד X לא ביצע את משימה Y."
  },
  {
    question: "זה מחייב אותי לתהליך ליווי ארוך?",
    answer: "ממש לא. המטרה של סשן האפיון היא לתת לך ערך מיידי. אם תחליטי שאת רוצה שאני אבנה לך את המערכת , נדבר על זה. אם תרצי ליישם לבד , הנה המפה, צאי לדרך."
  },
  {
    question: "איך קובעים? מה מדיניות ביטול?",
    answer: "קובעים דרך הלינק , תשלום מראש. ביטול עד 24 שעות לפני , החזר מלא."
  }
];

const WHY_ME_HEADLINE = "את לא צריכה עוד יועצת. את צריכה אדריכלית.";
const WHY_ME_INTRO = "יש הרבה אנשים שיכולים לצייר לך תרשימי זרימה יפים במצגת, ויש הרבה 'אנשי טכני' שיבנו אוטומציות שסבכו אותך יותר. אני הגשר ביניהם. אני מגיעה מהשטח, מהטמעות של מערכות מורכבות בעסקים חיים. אני לא בונה תהליכים 'לפי הספר', אלא Architecture of Scale, תשתית שנועדה להחזיק כשאת לא בחדר, כשעובד עוזב, או כשהביקוש קופץ פי 3. אני לא נותנת לך דגים, אני בונה לך את הצי המכני שדג עבורך.";
const WHY_ME_PROOFS: string[] = [
  "עובדת עם תהליכים ומערכות ביום יום , לא רק מציירת מצגות.",
  "הייתי בצד שמבצע. מביאה פתרון שמחזיק גם כשאת לא במשרד.",
  "ניסיון בבניית תשתיות , מהתהליך על הנייר ועד למערכת שעובדת."
];

const PROCESS_HEADLINE = "ככה התהליך עובד";
const PROCESS_STEPS: ProcessStep[] = [
  {
    title: "ממלאים שאלון מפורט",
    description: "שאלון מקיף שנותן לי תמונה מלאה של העסק, התהליכים והאתגרים שלך."
  },
  {
    title: "מקבלים לינק לקביעת פגישה",
    description: "ברגע שהשאלון מוגש, מקבלים לינק לבחור מועד שנוח."
  },
  {
    title: "אני מכינה הכל מראש",
    description: "עוד לפני שנפגשים, אני מעבדת את התשובות, ממפה את המצב ומכינה את החומרים."
  },
  {
    title: "בפגישה עוברים על הכל ביחד",
    description: "30 דקות ממוקדות עם חומר מוכן. בלי בזבוז זמן על ״ספרי לי על העסק״."
  }
];

const CALL_STEPS_HEADLINE = "30 דקות של בהירות אכזרית.";
const CALL_STEPS = [
  "מיפוי 'חורים בסכר' , נבין בדיוק איפה הכסף והזמן שלך נשפכים בגלל תהליכים ידניים או החלטות חוזרות.",
  "זיהוי צוואר הבקבוק הראשי , לא עשרה, אחד. זה שמשחרר את כל השאר.",
  "תוכנית קרב , את לא יוצאת עם 'סיכום פגישה', אלא עם מפת פעולות מיידית לשבוע הקרוב."
];

const DELIVERABLES: string[] = [
  "זיהוי החסם הראשי , מה הדבר האחד שאם נזיז, יפנה לך 10 שעות בשבוע",
  "ארכיטקטורת כלים , אילו מערכות באמת דרושות לך (ואילו כדאי למחוק היום)",
  "מפת הדרכים ל Scale , איך להעביר את הידע מהראש שלך למנגנון שעובד",
  "מפת פעולות לשבוע הקרוב , בהירות, לא ניירת"
];

export const LANDING_COPY: Record<string, LandingCopy> = {
  CENTRALIZED: {
    patternId: "CENTRALIZED",
    headline: "כל החלטה עוברת דרכך. הגיע הזמן לפרוץ את תקרת הזכוכית.",
    subheadline: "ניהול ריכוזי עובד , עד שזה לא. אם אתה מזהה את עצמך, יש מה לעשות.",

    microDiagnosisHeadline: "נשמע מוכר?",
    microDiagnosisBullets: [
      "רוב ההחלטות , גם הקטנות , עוברות דרכך",
      "ידע קריטי נמצא \"בראש\" או בוואטסאפ, לא במערכת",
      "האצלה ניסית , וחזרת כי \"קל יותר לעשות בעצמי\""
    ],

    painCostHeadline: "כמה זה עולה לך? כל יום שעובר, המחיר עולה.",
    painCostBullets: [
      "תקרת קיבולת , יש ביקוש, אבל אין יכולת להרחיב",
      "שחיקה , ריבוי החלטות קטנות מייצר עומס מצטבר",
      "פגיעה בחוויית לקוח , זמינות מוגבלת"
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
    whyMeClose: "אני עוזרת לבעלי עסקים שכל החלטה עוברת דרכם להפוך את הידע לנכס, כדי שיוכלו להאציל סמכויות בלי לפחד.",

    faq: SHARED_FAQ,
    ctaText: "אני רוצה להאציל בלי לאבד שליטה",
    ctaSubtext:
      "30 דקות של אפיון תפעולי עם חומר מוכן מראש — יוצאים עם מפת פעולות מיידית, בלי התחייבות להמשך.",
    ctaMicrocopy: CTA_MICROCOPY,
    finalCtaHeadline: "מוכנים להפוך את הידע לנכס?",
    urgencyText: "נותרו 2 מקומות לשבוע הקרוב , מומלץ להזמין מראש",
    paymentUrl: PAYMENT_BASE,
    videoScript: {
      problem:
        "אם אתה בעל עסק שכל החלטה — גם הקטנה — חוזרת אליך, זה לא 'חוסר סדר'. זה מבנה שהעסק נשען עליך במקום על תהליך ברור.",
      deepening:
        "המחיר הוא לא רק עומס. זה החלטות שנדחות, אנשים שמחכים לאישור, ולקוחות שמקבלים תגובה מאוחרת — וזמן שנעלם על דברים שלא אמורים לעבור דרך הראש שלך כל פעם מחדש.",
      solution:
        "בסשן האפיון אנחנו מוצאים את צוואר הבקבוק הראשי של הריכוזיות: מה חייב להישאר אצלך, ומה אפשר למסגר כך שהעסק ממשיך לזוז גם כשאתה עסוק בתפקיד הניהול שלך — ולא בשטף ההחלטות הקטנות.",
      socialProof:
        "עסקים במצב דומה יצאו עם מפת צעדים לשבוע הקרוב — לא 'נייר עבודה' אלא סדר פעולות שאפשר ליישם בלי הרגשת בגידה בשליטה.",
    },
  },

  FRAGILE_TEAM: {
    patternId: "FRAGILE_TEAM",
    headline: "העבודה כבר יצאה ממך. האחריות עדיין חוזרת אלייך.",
    subheadline:
      "זה דפוס תלות תפעולית: יש צוות, ספקים או עזרה, אבל בלי תשתית ברורה כל שאלה, טעות ואישור חוזרים אלייך.",

    microDiagnosisHeadline: "זה נראה כמו צוות שצריך אותך, אבל בפועל זו תלות תפעולית.",
    microDiagnosisBullets: [
      "יש אנשים שמבצעים, אבל הם חוזרים אליך כדי לדעת מה נכון",
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
      "עבדתי עם בעלי עסקים שמתקשים לשחרר גם כשהעבודה כבר אצל אנשים אחרים. אני בונה תשתית שמחזיקה האצלה: ברירות מחדל, בעלות, מקור אמת — כדי שמשימות לא יחזרו אליך בלולאת תיקונים.",

    faq: SHARED_FAQ,
    ctaText: "אני רוצה לשבור את התלות התפעולית",
    ctaSubtext:
      "נזהה איפה האחריות חוזרת אלייך, מה חסר במקור האמת, ואיזה צעד תשתיתי ראשון יחזק את ההעברה לצוות.",
    ctaMicrocopy: CTA_MICROCOPY,
    finalCtaHeadline: "בואי נהפוך האצלה לתשתית שמחזיקה",
    urgencyText: "נותרו 2 מקומות לשבוע הקרוב , מומלץ להזמין מראש",
    paymentUrl: PAYMENT_BASE,
    videoScript: {
      problem:
        "יש מי שמבצע, אבל כל מה שלא מתועד או לא מוגדר נגמר בשאלה אלייך. זה מתחיל ב'בואי רק שניה', ונגמר בזה שהאחריות עדיין אצלך.",
      deepening:
        "זה לא בהכרח בגלל האנשים — זו תלות תפעולית. בלי מקור אמת אחד ובלי סטנדרט לביצוע נכון, ההאצלה חוזרת כטעות, הסבר או תיקון.",
      solution:
        "בסשן עומק אנחנו מאתרים את נקודת החיכוך שמחזירה אותך לניהול הקטן, ובונים צעד תשתית ראשון: מקור אמת, ברירות מחדל ובעלות ברורה — כדי שהביצוע לא יחזור אליך בלולאת הסבר ותיקון.",
      socialProof:
        "מה שמשחרר בתלות התפעולית זה לא 'עוד אדם טוב יותר' — זה מנגנון: כללים ברורים ומערכות שמתאימות לתפקיד הביצוע והבעלות.",
    },
  },

  REACTIVE: {
    patternId: "REACTIVE",
    headline: "כיבוי שריפות , זה לא אסטרטגיה.",
    subheadline: "אני יודעת איך נראה ניהול בהפרעת קשב, המון כלים, בלי תהליך, עומס קוגניטיבי, מה שבטוח, אין רגע לנשום.",

    microDiagnosisHeadline: "נשמע מוכר?",
    microDiagnosisBullets: [
      "משימות נפתחות ונגמרות במקביל , קשה לעקוב",
      "הרבה כלים או הרבה פניות , שניהם מרגישים כמו כיבוי שריפות",
      "\"אין רגע לנשום\" , ועוד פחות לעבוד על העסק"
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
    whyMeClose: "עבדתי עם מנהלים שמכבים שריפות כל יום. אני יודעת איך ליצור מסגרות שמרווחות את הראש , ולחבר כלים לתהליך.",

    faq: SHARED_FAQ,
    ctaText: "אני רוצה מסגרת, לא עוד ריצה אינסופית בין משימות",
    ctaSubtext:
      "מתרגמים את הכיבויים למנגנון: מה נכנס בתור, מה דחיף באמת — ומה עוצר צמיחה לפני שנוסיף כלי נוסף.",
    ctaMicrocopy: CTA_MICROCOPY,
    finalCtaHeadline: "מספיק לרוץ בין משימות — בואי נצמצם למה שמשנה",
    urgencyText: "נותרו 2 מקומות לשבוע הקרוב , מומלץ להזמין מראש",
    paymentUrl: PAYMENT_BASE,
    videoScript: {
      problem:
        "כשכל הזמן יש משימות פתוחות מכל הכיוונים והקשב תמיד 'בטרוף', את יודעת שכיבוי שריפות זה לא אסטרטגיה אלא הרגל שגוזל את מקום הצמיחה.",
      deepening:
        "המחיר הוא לא סתם עייפות: זה איכות שיורדת, החלטות שנדחות, וההרגשה שכלים לא משחררים אותך כי מאחוריהם עדיין אין תור קבלה, סדר ברור והרגל עליה אפשר להחזיק.",
      solution:
        "בפגישה בונים מסגרת מעוצבת למציאות שלך: איך נעשה סדר בדחיפויות, מה דחוף באמת ואיך מעבירים את שאר הפתוח מתוך ההמולה היומיומית לקו תהליך שמתקדם גם כשלא את עומדת מעל כל פריט.",
      socialProof:
        "עסקים ריאקטיביים שעברו את הבהירות הזו רואים איפה זמן מתבזבז בריצה בין משימות — ולא רק 'עוד פרויקט' שנכנס מתחת לרדאר.",
    },
  },

  PROCESS_BASED: {
    patternId: "PROCESS_BASED",
    headline: "המערכת עובדת. השאלה , איך מאיצים בלי לשבור.",
    subheadline: "ניהול מבוסס תהליך: יש בסיס טוב. האתגר הבא הוא האצה. מזהה?",

    microDiagnosisHeadline: "נשמע מוכר?",
    microDiagnosisBullets: [
      "יש תהליכים , אבל הפוטנציאל לא ממומש",
      "צווארי בקבוק ברורים , רוצים לזהות איפה מאיצים",
      "עומס חוזר על מנהלים מרכזיים , רוצים להקל"
    ],

    painCostHeadline: "כמה זה עולה לך? כל יום שעובר, המחיר עולה.",
    painCostBullets: [
      "האטה לא הכרחית , העסק \"טוב\" אבל לא מזנק",
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
    whyMeClose: "המערכת שלך טובה , אני כאן כדי לזהות איפה מאיצים בלי לשבור.",

    faq: SHARED_FAQ,
    ctaText: "אני רוצה לזהות איפה מאיצים בלי לשבור את מה שעובד",
    ctaSubtext:
      "מיפוי ההאצה הבטוח: איפה המערכת כבר בשלה, מה עומס באמצע, ומה צעד אחד שמשחרר את השכבה הניהולית.",
    ctaMicrocopy: CTA_MICROCOPY,
    finalCtaHeadline: "המערכת טובה — עכשיו בואו נמצא את מנוע הצמיחה",
    urgencyText: "נותרו 2 מקומות לשבוע הקרוב , מומלץ להזמין מראש",
    paymentUrl: PAYMENT_BASE,
    videoScript: {
      problem:
        "כשיש תהליכים בסיסיים אבל ההרגשה היא שהעסק 'טוב' ולא מתקדם, לעיתים מה שחסר זו האצה שמבוססת על המגבלה האמיתית — לא על עוד פרויקט שמתגלגל על שולחן הניהול במקום להניע תוצאות.",
      deepening:
        "מנהלים שכבר בנו שכבה מסודרת מרגישים שהעיכוב הוא כבידות או אחריות שנצברת במקום לא נכון — וזה הופך למתח ניהולי בלי קפיצה בשורה העסקית.",
      solution:
        "סשן האפיון מחדד איפה אפשר למשוך יותר בלי הריסה — אילו מאיצים פרקטיים, איזה צוואר בקבוק אחד שכדאי לפתוח הפעם, ואיפה ההשקעה עוד לא משרתת Scale.",
      socialProof:
        "עסקים עם תשתית קיימת יצאו עם ודאות: מה לגעת בה עכשיו, מה להשאיר ללא שינוי, ואיך לשלב את זה בשבוע הבא במקום 'תוכנית אסטרטגית שנשארת על לוח ההדבקות'.",
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
