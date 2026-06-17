import type { ResultType } from '@/lib/calculator/types';
import type { ShortQuizOption } from '@/config/shortQuizConfig';

export type { ResultType };

export interface FixStep {
  label: string;
  text: string;
}

export interface ShortResultContent {
  id: ResultType;
  /** Headline. No dash, no numbers. */
  headline: string;
  tagline: string;
  /** Fallback "where you are" line when no answers are available. */
  whereYouAreFallback: string;
  /** The "how much it costs you" pain paragraph. Vivid, no numbers. */
  whatItCosts: string;
  fixSteps: FixStep[];
  ctaSoft: string;
  whatsappText: string;
}

export const SHORT_QUIZ_RESULTS: Record<ResultType, ShortResultContent> = {
  FOLLOWUP: {
    id: 'FOLLOWUP',
    headline: 'יש פניות. אין פולואפ. הכסף נשאר על השולחן.',
    tagline: 'לידים ופולואפים',
    whereYouAreFallback:
      'מתעניינות מגיעות אלייך, אבל בלי מעקב מסודר חלק מהן פשוט מתפוגגות בדרך.',
    whatItCosts:
      'תחשבי על הפנייה הטובה שכתבה לך, קיבלה "אחזור אלייך", ואז נבלעה. לא כי לא רצתה, אלא כי החיים זזו והיא כבר סגרה עם מישהי אחרת. זה לא קורה פעם אחת. זה קורה בשקט, שוב ושוב, וזה הכסף שהכי כואב כי הוא היה ממש ביד.',
    fixSteps: [
      { label: 'היום:', text: 'בחרי פנייה אחת שתקועה אצלך כבר כמה ימים, ושלחי לה הודעה עכשיו. רק אחת. תרגישי כמה קל היה להחזיר אותה.' },
      { label: 'השבוע:', text: 'כתבי תסריט פולואפ קצר, שתי הודעות, שתמיד יהיו מוכנות לך לכל פנייה שלא ענתה.' },
      { label: 'עד סוף החודש:', text: 'רכזי את כל הפניות למקום אחד. לא צריך מערכת מסובכת, גם גיליון פשוט עדיף על הפיזור שגוזל לך אותן.' },
    ],
    ctaSoft:
      'את רואה עכשיו איפה הפניות נושרות בדרך. בואי נבדוק יחד אם זה משהו שכדאי לסדר עכשיו, ומה הצעד הנכון לפני שמשקיעים בבנייה.',
    whatsappText:
      'היי הדר, עשיתי את הבדיקה והבנתי שהפולואפ אצלי לא מסודר ופניות נושרות לי. אשמח לבדוק איתך מה אפשר לעשות עם זה.',
  },

  TIME: {
    id: 'TIME',
    headline: 'את לא חסרת שעות. את חסרת מערכת.',
    tagline: 'זמן ניהול ידני',
    whereYouAreFallback:
      'הרבה מהיום שלך הולך על הודעות, תיאומים ותזכורות שחוזרים על עצמם וקורים דרכך, ידנית.',
    whatItCosts:
      'זה לא רק הזמן. זה שבסוף היום את מרוקנת, בלי כוח לחשוב על העסק עצמו, רק לרוץ בתוכו. השעות האלה לא נעלמות, הן באות במקום הדברים שבאמת מקדמים אותך, ובמקום הערב שלך עם עצמך.',
    fixSteps: [
      { label: 'היום:', text: 'רשמי את שלוש הפעולות שחוזרות אצלך הכי הרבה בשבוע. הן לא יפתיעו אותך, וזו בדיוק הנקודה.' },
      { label: 'השבוע:', text: 'קחי אחת מהן וכתבי אותה כהוראות פשוטות, עשר דקות. זה מה שיאפשר להוציא אותה ממך.' },
      { label: 'עד סוף החודש:', text: 'קבעי לעצמך חלון קבוע ביומן לכל התפעול, במקום שהוא יזלוג לך על כל היום.' },
    ],
    ctaSoft:
      'את רואה עכשיו כמה מהיום שלך נבלע בתפעול ידני. בואי נבדוק יחד מה הדבר הראשון שכדאי להוציא ממך.',
    whatsappText:
      'היי הדר, עשיתי את הבדיקה וראיתי שרוב הזמן שלי הולך על תפעול ידני. אשמח לבדוק איתך מה אפשר להוציא ממני.',
  },

  COLLECTION: {
    id: 'COLLECTION',
    headline: 'הכסף שלך כבר שם. הוא פשוט עוד לא הגיע אלייך.',
    tagline: 'גבייה ותזכורות תשלום',
    whereYouAreFallback:
      'יש כסף שכבר הרווחת, אבל לגבות אותו לוקח לך זמן ואנרגיה, ולפעמים את פשוט דוחה את זה.',
    whatItCosts:
      'זה כסף שכבר עבדת בשבילו, שיושב ומחכה אצל מישהו אחר, בזמן שאת מתלבטת אם להזכיר. כל חשבונית פתוחה היא לא רק סכום, היא עוד דבר שרץ לך בראש בלילה. וזה מצטבר, גם רגשית וגם בעובר ושב.',
    fixSteps: [
      { label: 'היום:', text: 'ספרי כמה חשבוניות פתוחות יש לך עכשיו. זה הכסף שכבר הרווחת ועוד לא נכנס.' },
      { label: 'מחר:', text: 'שלחי תזכורת תשלום אחת, לחשבונית הכי ישנה. רק אחת, בלי להעמיס על עצמך.' },
      { label: 'השבוע:', text: 'כתבי הודעת גבייה אחת מנוסחת יפה, שתשמשי בה שוב ושוב בלי להתלבט כל פעם מחדש.' },
    ],
    ctaSoft:
      'את רואה עכשיו כמה אנרגיה הגבייה גוזלת ממך. בואי נבדוק יחד אם זה התהליך הנכון לסדר ראשון.',
    whatsappText:
      'היי הדר, עשיתי את הבדיקה והבנתי שהגבייה גוזלת לי זמן ואנרגיה. אשמח לבדוק איתך מה אפשר לעשות.',
  },

  CENTRALIZED: {
    id: 'CENTRALIZED',
    headline: 'הכל עובר דרכך. זה לא חוסר יכולת, זה מבנה.',
    tagline: 'תלות יתר בך',
    whereYouAreFallback:
      'הזמן, הפניות והגבייה, הכל עובר דרכך. זה לא חוסר מיומנות, זה מבנה שנבנה תוך כדי תנועה.',
    whatItCosts:
      'המחיר הוא שאת לא באמת יכולה לעצור. לא לחלות, לא לקחת אוויר, כי כשאת לא שם, הכל מחכה לך. העסק גדל, אבל הוא נשען עלייך בדיוק כמו ביום הראשון, והתקרה הזאת לא נפתחת בעוד מאמץ שלך. היא נפתחת רק כשמשהו עובר ממך החוצה.',
    fixSteps: [
      { label: 'היום:', text: 'חשבי מה עשית אתמול שחוזר אצלך הכי הרבה. כתבי אותה. זו הפעולה שמתחילים ממנה.' },
      { label: 'מחר:', text: 'כתבי לאותה פעולה הוראות פשוטות, עשר דקות. זה מה שמאפשר להסיר אותה ממך.' },
      { label: 'השבוע:', text: 'בחרי פעולה אחת והחליטי לגביה: להאציל, לתבנת, או לוותר. רק אחת, השבוע.' },
    ],
    ctaSoft:
      'את רואה עכשיו כמה מהעסק נשען עלייך אישית. בואי נבדוק יחד מה הדבר הראשון שצריך לעבור ממך הלאה.',
    whatsappText:
      'היי הדר, עשיתי את הבדיקה והבנתי שהכל עובר דרכי ואני לא מצליחה לצאת מזה. אשמח לבדוק איתך מאיפה מתחילים.',
  },
};

// ── "Where you are" narrative, built from the qualitative answer tags ──────────

const Q9_LINES: Record<string, string> = {
  FAST: 'את מגיבה מהר למתעניינות, וזה נכס אמיתי. עכשיו צריך לוודא שזה נשמר גם כשעמוס.',
  MODERATE: 'את חוזרת, אבל לא תמיד מיד, ויש פניות שמתקררות בינתיים.',
  SLOW: 'לפעמים עוברים ימים עד שמתעניינת מקבלת ממך תשובה, וחלק כבר לא שם כשחזרת.',
  VERY_SLOW: 'קורה שעובר שבוע ויותר עד שאת חוזרת, ואז רוב הסיכוי לסגור כבר עבר.',
};

const Q4_LINES: Record<string, string> = {
  STRUCTURED: 'הפולואפ אצלך מסודר, וזה בדיוק מה שמחזיק את הסגירות.',
  MANUAL: 'את חוזרת לרוב המתעניינות, אבל הכל ידני ויושב עלייך.',
  INCONSISTENT: 'הפולואפ קורה כשאת נזכרת, לא כשיטה, אז חלק מהפניות פשוט נשמטות.',
  NONE: 'אחרי הפנייה הראשונה לרוב אין המשך מסודר, וכאן נושר הכי הרבה.',
  UNKNOWN: 'אין לך כרגע דרך לדעת מה קרה עם פניות שלא סגרו, וזה כשלעצמו אומר משהו.',
};

const Q5_LINES: Record<string, string> = {
  HEAD: 'הפניות חיות בראש שלך ובוואטסאפ, בלי מקום אחד שמרכז הכל.',
  SHEET: 'יש לך גיליון, אבל הוא דורש ממך לזכור לעדכן ולבדוק כל הזמן.',
  SCATTERED: 'המידע מפוזר בין כמה כלים שלא מדברים, אז כל פנייה דורשת חיפוש.',
  SYSTEM: 'יש לך מערכת מסודרת, אז הבסיס לסדר כבר קיים.',
};

/**
 * Builds 1-3 personalized "where you are" lines from the answer map.
 * Falls back to the archetype's static line when nothing matched.
 */
export function buildWhereYouAre(
  map: Record<string, ShortQuizOption | undefined>,
  resultType: ResultType,
): string[] {
  const lines: string[] = [];

  const speed = map['Q9']?.responseSpeed;
  if (speed && Q9_LINES[speed]) lines.push(Q9_LINES[speed]);

  const followup = map['Q4']?.tag;
  if (followup && Q4_LINES[followup]) lines.push(Q4_LINES[followup]);

  const dispersion = map['Q5']?.tag;
  if (dispersion && Q5_LINES[dispersion]) lines.push(Q5_LINES[dispersion]);

  if (lines.length === 0) {
    lines.push(SHORT_QUIZ_RESULTS[resultType].whereYouAreFallback);
  }
  return lines;
}

export const DISCLAIMER_TEXT =
  'זוהי תמונה ראשונית בלבד, המבוססת על מה שסיפרת לי כאן. היא נועדה להאיר לך איפה כדאי להסתכל, לא להחליף בדיקה מלאה של התהליך.';

// ── Intro-call ("שיחת היכרות") shared copy ────────────────────────────────────
// Single source of truth, consumed by both the result page and the meeting page.
// The next step in the funnel is a FREE intro call; the paid scoping (350₪) is
// offered inside it, not as the up-front CTA. No dash, no "צוואר בקבוק".
// (Export names kept as SCOPING_CALL_* to avoid churn across importers.)

export const SCOPING_CALL_TITLE = 'מה קורה בשיחת ההיכרות';

/** What the free intro call actually looks like. Last bullet names the next step. */
export const SCOPING_CALL_VALUE: string[] = [
  'נדבר בכמה מילים על מה שעלה לך כאן, ועל מה שהכי בוער עכשיו.',
  'נסמן יחד איפה נראה שנושרות פניות וכסף, ומה שווה להסתכל עליו ראשון.',
  'תביני אם ואיך אני יכולה לעזור, בלי לחץ ובלי התחייבות להמשך.',
  'אם נראה שכדאי להעמיק, נדבר על הצעד הבא, פגישת אפיון אישית.',
];

/** The intro-call promise, plus what the paid next step is. */
export const SCOPING_CALL_PROMISE = {
  plan: 'שיחת ההיכרות קצרה, ללא עלות ובלי מחויבות. היא נועדה רק להבין אם יש התאמה ומה כדאי לסדר ראשון.',
  price:
    'אם נראה שכדאי להמשיך, הצעד הבא הוא פגישת אפיון בתשלום, 350₪, שמקוזזים במלואם מהפרויקט אם ממשיכות יחד. שם בונים יחד תכנית עבודה כתובה.',
};

/** Bridge line: pivots from the free steps to "let's talk, no cost". */
export const SCOPING_CALL_BRIDGE =
  'את כבר רואה איפה זה דולף. הצעד הבא הוא לא עוד טיפ כללי, אלא שיחת היכרות קצרה איתי, ללא עלות, להבין אם זה משהו שכדאי לסדר עכשיו, ומה הדבר הראשון.';
