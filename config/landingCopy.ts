/**
 * קופי לדפי נחיתה , 70% אחיד, 30% מותאם לדפוס.
 * מבנה אחיד לשפה עקבית, תוכן מותאם לזיהוי עצמי והמרות.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface LandingCopy {
  patternId: string;
  /** כותרת Hero , כאב חד */
  headline: string;
  /** תת־כותרת / הזדהות */
  subheadline: string;

  /** מיקרו־אבחון: "אם 2 מתוך 3 נכון , זה את" */
  microDiagnosisHeadline: string;
  microDiagnosisBullets: string[];

  /** מה הכאב עולה לך , תוצאה קונקרטית */
  painCostHeadline: string;
  painCostBullets: string[];

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
  ctaSubtext: string;
  ctaMicrocopy: string;
  urgencyText: string;
  paymentUrl: string;
}

const PAYMENT_BASE = (import.meta.env?.VITE_PAYMENT_URL as string | undefined) ?? "#";

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
    answer: "מערכת בלי תהליך היא פשוט בית קברות יקר לנתונים. רוב העסקים שאני פוגשת משתמשים ב-20% מהיכולת של הכלים שלהם ומשלמים 100% מחיר בגלל סרבול. האבחון יגיד לך אם הכלי משרת אותך, או שאת עובדת אצלו."
  },
  {
    question: "כמה זמן זה דורש ממני?",
    answer: "השאלון הראשוני לוקח 5–7 דקות. אחריו נעשה תהליך איסוף מידע מסודר – שאלון ארוך, מיפוי כלים – שדורש השקעת זמן מצדך. הסשן עצמו לוקח 30 דקות. היישום? הוא ייקח פחות זמן ממה שלוקח לך היום לנסות להבין למה עובד X לא ביצע את משימה Y."
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
const WHY_ME_INTRO = "יש הרבה אנשים שיכולים לצייר לך תרשימי זרימה יפים במצגת, ויש הרבה 'אנשי טכני' שיבנו אוטומציות שסבכו אותך יותר. אני הגשר ביניהם. אני מגיעה מהשטח, מהטמעות של מערכות מורכבות בעסקים חיים. אני לא בונה תהליכים 'לפי הספר', אלא Architecture of Scale – תשתית שנועדה להחזיק כשאת לא בחדר, כשעובד עוזב, או כשהביקוש קופץ פי 3. אני לא נותנת לך דגים, אני בונה לך את הצי המכני שדג עבורך.";
const WHY_ME_PROOFS: string[] = [
  "עובדת עם תהליכים ומערכות ביום־יום , לא רק מציירת מצגות.",
  "הייתי בצד שמבצע. מביאה פתרון שמחזיק גם כשאת לא במשרד.",
  "ניסיון בבניית תשתיות , מהתהליך על הנייר ועד למערכת שעובדת."
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
  "מפת הדרכים ל-Scale , איך להעביר את הידע מהראש שלך למנגנון שעובד",
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

    painCostHeadline: "כמה זה עולה לך? כל יום שעובר – המחיר עולה.",
    painCostBullets: [
      "תקרת קיבולת , יש ביקוש, אבל אין יכולת להרחיב",
      "שחיקה , ריבוי החלטות קטנות מייצר עומס מצטבר",
      "פגיעה בחוויית לקוח , זמינות מוגבלת"
    ],

    callStepsHeadline: CALL_STEPS_HEADLINE,
    callSteps: CALL_STEPS,

    deliverablesHeadline: "מה מקבלים מהתהליך",
    deliverables: DELIVERABLES,

    whyMeHeadline: WHY_ME_HEADLINE,
    whyMeIntro: WHY_ME_INTRO,
    whyMeProofs: WHY_ME_PROOFS,
    whyMeClose: "אני עוזרת לבעלי עסקים שכל החלטה עוברת דרכם להפוך את הידע לנכס, כדי שיוכלו להאציל סמכויות בלי לפחד.",

    faq: SHARED_FAQ,
    ctaText: "נמאס לי לכבות שריפות – אני רוצה תהליכים",
    ctaSubtext: "סשן אפיון תפעולית 30 דקות, עם מפת פעולות ברורה",
    ctaMicrocopy: CTA_MICROCOPY,
    urgencyText: "נותרו 2 מקומות לשבוע הקרוב , מומלץ להזמין מראש",
    paymentUrl: PAYMENT_BASE
  },

  FRAGILE_TEAM: {
    patternId: "FRAGILE_TEAM",
    headline: "יש צוות, אבל אתה עדיין צוואר הבקבוק. בוא נשנה את זה.",
    subheadline: "צוות ללא תשתית , אנשים יכולים לבצע, אבל הכללים לא נגישים. אתה מזהה?",

    microDiagnosisHeadline: "נשמע מוכר?",
    microDiagnosisBullets: [
      "יש לך צוות או ספקים, אבל הם חוזרים אליך לכל שאלה",
      "טעויות קורות כי אין \"מקום אחד\" לכללים",
      "מיקרו־ניהול מרגיש בלתי נמנע"
    ],

    painCostHeadline: "כמה זה עולה לך? כל יום שעובר – המחיר עולה.",
    painCostBullets: [
      "זמן שחוזר לתיקון טעויות במקום לבנות",
      "חוסר אמון , האצלה נראית מסוכנת",
      "צוואר בקבוק , הגדילה נעצרת כי אין תשתית"
    ],

    callStepsHeadline: CALL_STEPS_HEADLINE,
    callSteps: CALL_STEPS,

    deliverablesHeadline: "מה מקבלים מהתהליך",
    deliverables: DELIVERABLES,

    whyMeHeadline: WHY_ME_HEADLINE,
    whyMeIntro: WHY_ME_INTRO,
    whyMeProofs: WHY_ME_PROOFS,
    whyMeClose: "בניתי צוותים ותשתיות מאפס. יודעת איך להעביר מידע מבראש לנייר ומהנייר למערכת.",

    faq: SHARED_FAQ,
    ctaText: "נמאס לי לכבות שריפות – אני רוצה תהליכים",
    ctaSubtext: "סשן אפיון תפעולית 30 דקות, עם מפת פעולות ברורה",
    ctaMicrocopy: CTA_MICROCOPY,
    urgencyText: "נותרו 2 מקומות לשבוע הקרוב , מומלץ להזמין מראש",
    paymentUrl: PAYMENT_BASE
  },

  REACTIVE: {
    patternId: "REACTIVE",
    headline: "כיבוי שריפות , זה לא אסטרטגיה.",
    subheadline: "אני יודעת איך נראה ניהול בהפרעת קשב, המון כלים, בלי תהליך, עומס קוגניטיבי, מה שבטוח - אין רגע לנשום.",

    microDiagnosisHeadline: "נשמע מוכר?",
    microDiagnosisBullets: [
      "משימות נפתחות ונגמרות במקביל , קשה לעקוב",
      "הרבה כלים או הרבה פניות , שניהם מרגישים כמו כיבוי שריפות",
      "\"אין רגע לנשום\" , ועוד פחות לעבוד על העסק"
    ],

    painCostHeadline: "כמה זה עולה לך? כל יום שעובר – המחיר עולה.",
    painCostBullets: [
      "שחיקה שמייצרת טעויות וכיבוי שריפות",
      "ירידה באיכות שירות או מוצר, תקרת קיבולת",
      "קיפאון אסטרטגי: הרבה עשייה, מעט תכנון"
    ],

    callStepsHeadline: CALL_STEPS_HEADLINE,
    callSteps: CALL_STEPS,

    deliverablesHeadline: "מה מקבלים מהתהליך",
    deliverables: DELIVERABLES,

    whyMeHeadline: WHY_ME_HEADLINE,
    whyMeIntro: WHY_ME_INTRO,
    whyMeProofs: WHY_ME_PROOFS,
    whyMeClose: "עבדתי עם מנהלים שמכבים שריפות כל יום. אני יודעת איך ליצור מסגרות שמרווחות את הראש , ולחבר כלים לתהליך.",

    faq: SHARED_FAQ,
    ctaText: "נמאס לי לכבות שריפות – אני רוצה תהליכים",
    ctaSubtext: "סשן אפיון תפעולית 30 דקות, עם מפת פעולות ברורה",
    ctaMicrocopy: CTA_MICROCOPY,
    urgencyText: "נותרו 2 מקומות לשבוע הקרוב , מומלץ להזמין מראש",
    paymentUrl: PAYMENT_BASE
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

    painCostHeadline: "כמה זה עולה לך? כל יום שעובר – המחיר עולה.",
    painCostBullets: [
      "האטה לא הכרחית , העסק \"טוב\" אבל לא מזנק",
      "עייפות של שכבת ניהול",
      "מיצוי חלקי של פוטנציאל העסק"
    ],

    callStepsHeadline: CALL_STEPS_HEADLINE,
    callSteps: CALL_STEPS,

    deliverablesHeadline: "מה מקבלים מהתהליך",
    deliverables: DELIVERABLES,

    whyMeHeadline: WHY_ME_HEADLINE,
    whyMeIntro: WHY_ME_INTRO,
    whyMeProofs: WHY_ME_PROOFS,
    whyMeClose: "המערכת שלך טובה , אני כאן כדי לזהות איפה מאיצים בלי לשבור.",

    faq: SHARED_FAQ,
    ctaText: "נמאס לי לכבות שריפות – אני רוצה תהליכים",
    ctaSubtext: "סשן אפיון תפעולית 30 דקות, עם מפת פעולות ברורה",
    ctaMicrocopy: CTA_MICROCOPY,
    urgencyText: "נותרו 2 מקומות לשבוע הקרוב , מומלץ להזמין מראש",
    paymentUrl: PAYMENT_BASE
  }
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
