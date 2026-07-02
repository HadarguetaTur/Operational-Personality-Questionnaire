import type { ResultType } from '@/lib/calculator/types';
import type { ShortQuizOption, DomainKey } from '@/config/shortQuizConfig';

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
  /** The opening paragraph that frames the pattern, before the personalized lines. */
  opening: string;
  /** Fallback "where you are" line when no answers are available. */
  whereYouAreFallback: string;
  /** The "how much it costs you" pain paragraph. Vivid, no numbers. */
  whatItCosts: string;
  /** Identity-level relief: "it's not you, it's the missing process." No numbers. */
  reframe: string;
  fixSteps: FixStep[];
  ctaSoft: string;
  whatsappText: string;
}

export const SHORT_QUIZ_RESULTS: Record<ResultType, ShortResultContent> = {
  FOLLOWUP: {
    id: 'FOLLOWUP',
    headline: 'הפניות מגיעות. אבל אין תהליך שמחזיק אותן עד הסגירה.',
    tagline: 'פניות ופולואפ',
    opening:
      'הבעיה אצלך אינה בהכרח שאין עניין. יש פניות, יש שיחות, ויש נשים שבודקות אפשרות לעבוד איתך. אבל מהרגע שהן לא סוגרות מיד, יותר מדי מהתהליך נשען על זה שתזכרי, תתפני ותחזרי בזמן. וכשזה תלוי בזיכרון שלך, חלק מהפניות פשוט מתקררות בדרך.',
    whereYouAreFallback:
      'מתעניינות מגיעות אלייך, אבל בלי תהליך שמחזיק אותן עד הסגירה, חלק מהן מתפוגגות בדרך.',
    whatItCosts:
      'הכסף לא הולך לאיבוד ברגע דרמטי. הוא נעלם בפנייה שנשארה בלי תשובה, בשיחה שלא קיבלה המשך, ובמתעניינת שהתכוונה לחזור אבל המשיכה לעסק הבא. אלה לא תמיד לידים לא טובים. לעיתים אלה לקוחות שהיו צריכות עוד הודעה אחת, תזכורת אחת או תהליך ברור יותר.',
    reframe:
      'זה לא אומר שאת לא טובה במכירות. זה אומר שאין כרגע מערכת שממשיכה להחזיק את ההזדמנות גם כשאת עסוקה בעבודה עצמה. הפתרון אינו לזכור טוב יותר, אלא לבנות תהליך שלא תלוי בזיכרון.',
    fixSteps: [
      { label: 'היום:', text: 'בחרי פנייה אחת שתקועה אצלך כבר כמה ימים, ושלחי לה הודעה עכשיו. רק אחת. תרגישי כמה קל היה להחזיר אותה.' },
      { label: 'השבוע:', text: 'כתבי תסריט פולואפ קצר, שתי הודעות, שתמיד יהיו מוכנות לך לכל פנייה שלא ענתה.' },
      { label: 'עד סוף החודש:', text: 'רכזי את כל הפניות למקום אחד. לא צריך מערכת מסובכת, גם גיליון פשוט עדיף על הפיזור שגוזל לך אותן.' },
    ],
    ctaSoft:
      'קל להגיד לעצמך "אני אסדר את הפולואפ באחד הימים", אבל אותו יום לא מגיע, כי הוא דורש בדיוק את הזמן שאין לך. במקום עוד משימה שמחכה לך, בואי נבדוק יחד בשיחה קצרה מה הצעד הראשון, ומה לא שווה לבנות לפניו.',
    whatsappText:
      'היי הדר, עשיתי את הבדיקה והבנתי שהפולואפ אצלי לא מסודר ופניות נושרות לי. אשמח לבדוק איתך מה אפשר לעשות עם זה.',
  },

  TIME: {
    id: 'TIME',
    headline: 'הבעיה היא לא שאין לך זמן. יותר מדי מהעסק עדיין דורש אותך ידנית.',
    tagline: 'זמן ותפעול ידני',
    opening:
      'היום שלך מתמלא בפעולות קטנות שנראות הכרחיות: לענות, לתאם, להזכיר, לבדוק, להעביר מידע ולעדכן. כל פעולה בפני עצמה לוקחת כמה דקות. ביחד הן אוכלות את השעות שבהן היית יכולה למכור, לפתח, ליצור או פשוט לסיים את היום בלי שהעסק ימשיך איתך לערב.',
    whereYouAreFallback:
      'הרבה מהיום שלך הולך על הודעות, תיאומים ותזכורות שחוזרים על עצמם וקורים דרכך, ידנית.',
    whatItCosts:
      'העלות אינה רק מספר השעות. העלות היא הקטיעות, המעבר המתמיד בין משימות, והתחושה שאת עובדת כל היום בלי להגיע לדברים שבאמת מקדמים את העסק. כשהתפעול נכנס לכל מרווח פנוי, אין כמעט מקום לחשיבה, שיווק, מכירה או מנוחה.',
    reframe:
      'את לא צריכה להיות יעילה יותר בתוך עומס לא יעיל. את צריכה לבדוק אילו פעולות בכלל לא אמורות להמשיך לעבור דרכך. לא כל משימה צריכה אוטומציה, אבל משימה שחוזרת שוב ושוב באותו מבנה היא סימן שצריך לבנות לה תהליך.',
    fixSteps: [
      { label: 'היום:', text: 'רשמי את שלוש הפעולות שחוזרות אצלך הכי הרבה בשבוע. הן לא יפתיעו אותך, וזו בדיוק הנקודה.' },
      { label: 'השבוע:', text: 'קחי אחת מהן וכתבי אותה כהוראות פשוטות, עשר דקות. זה מה שיאפשר להוציא אותה ממך.' },
      { label: 'עד סוף החודש:', text: 'קבעי לעצמך חלון קבוע ביומן לכל התפעול, במקום שהוא יזלוג לך על כל היום.' },
    ],
    ctaSoft:
      'את אולי אומרת לעצמך "אני פשוט צריכה יום אחד לשבת על זה", אבל היום הזה לא מגיע, כי הוא נבלע באותו תפעול בדיוק. בשיחה קצרה נבדוק יחד מה הדבר הראשון שכדאי להוציא ממך, בלי שזה יהפוך לעוד פרויקט שלך.',
    whatsappText:
      'היי הדר, עשיתי את הבדיקה וראיתי שרוב הזמן שלי הולך על תפעול ידני. אשמח לבדוק איתך מה אפשר להוציא ממני.',
  },

  COLLECTION: {
    id: 'COLLECTION',
    headline: 'הכסף כבר הושג. אבל הדרך שלו אלייך עדיין תלויה ביותר מדי מאמץ.',
    tagline: 'גבייה ותזכורות תשלום',
    opening:
      'עשית את העבודה. סיפקת את השירות. מגיע לך לקבל את התשלום. אבל כשהמעקב אחר חשבוניות ותשלומים נשען עלייך, הגבייה הופכת לעוד משימה שצריך לזכור ולעוד שיחה שלא תמיד נעים לפתוח. וככל שדוחים אותה, הכסף נשאר אצל הלקוחה במקום להגיע לעסק.',
    whereYouAreFallback:
      'יש כסף שכבר הרווחת, אבל לגבות אותו לוקח לך זמן ואנרגיה, ולפעמים את פשוט דוחה את זה.',
    whatItCosts:
      'כסף פתוח אינו רק בעיית תזרים. הוא תופס מקום בראש, מייצר אי־נעימות ופוגע ביכולת שלך לדעת מה באמת נכנס לעסק בכל חודש. כשהגבייה אינה שיטתית, קשה להבדיל בין הכנסה שהרווחת לבין כסף שבאמת זמין לך.',
    reframe:
      'גבייה מסודרת אינה אגרסיבית. להפך, תהליך ברור, עקבי וצפוי מוריד את המבוכה גם ממך וגם מהלקוחה. את לא צריכה לרדוף, את צריכה מערכת שיודעת להזכיר בזמן, להציג סטטוס ולהעלות אלייך רק את המקרים שבאמת דורשים טיפול.',
    fixSteps: [
      { label: 'היום:', text: 'ספרי כמה חשבוניות פתוחות יש לך עכשיו. זה הכסף שכבר הרווחת ועוד לא נכנס.' },
      { label: 'מחר:', text: 'שלחי תזכורת תשלום אחת, לחשבונית הכי ישנה. רק אחת, בלי להעמיס על עצמך.' },
      { label: 'השבוע:', text: 'כתבי הודעת גבייה אחת מנוסחת יפה, שתשמשי בה שוב ושוב בלי להתלבט כל פעם מחדש.' },
    ],
    ctaSoft:
      'קל לדחות את הגבייה ליום שבו יהיה ראש שקט, אבל הראש הזה לא מתפנה לבד. בשיחה קצרה נבדוק יחד אם זה התהליך הנכון לסדר ראשון, ואיך עושים את זה בלי שזה ייפול שוב עלייך.',
    whatsappText:
      'היי הדר, עשיתי את הבדיקה והבנתי שהגבייה גוזלת לי זמן ואנרגיה. אשמח לבדוק איתך מה אפשר לעשות.',
  },

  CENTRALIZED: {
    id: 'CENTRALIZED',
    headline: 'העסק עובד, אבל יותר מדי ממנו עדיין מוחזק על ידך.',
    tagline: 'תלות יתר בך',
    opening:
      'את יודעת מה קורה עם הלקוחות. את זוכרת למי צריך לחזור. את יודעת איפה נמצא כל פרט ומה הצעד הבא. וזו בדיוק הבעיה. כל עוד התמונה קיימת בעיקר אצלך, העסק יכול לעבוד רק בקצב שבו את מסוגלת לזכור, לבדוק ולהחזיק הכול.',
    whereYouAreFallback:
      'הזמן, הפניות והגבייה, הכל עובר דרכך. זה לא חוסר מיומנות, זה מבנה שנבנה תוך כדי תנועה.',
    whatItCosts:
      'המחיר אינו רק עומס, זו תקרת צמיחה. כל לקוחה חדשה מוסיפה עוד מעקב, עוד מידע ועוד החלטות שאת צריכה להחזיק. לכן גם כשהעסק גדל, את לא בהכרח מרגישה שהוא נעשה יציב יותר. לפעמים ההפך קורה: יותר הכנסה מייצרת יותר תלות בך.',
    reframe:
      'הבעיה אינה שאת ריכוזית או מתקשה לשחרר. ברוב העסקים המבנה הזה נוצר בהדרגה, כל פעם עוד לקוחה, עוד כלי ועוד פתרון זמני. עכשיו צריך להפוך את הידע שנמצא אצלך לתהליך שהעסק יכול להחזיק. המטרה אינה להוציא אותך מהעסק, אלא שאת תנהלי אותו במקום להחזיק אותו בידיים כל היום.',
    fixSteps: [
      { label: 'היום:', text: 'חשבי מה עשית אתמול שחוזר אצלך הכי הרבה. כתבי אותה. זו הפעולה שמתחילים ממנה.' },
      { label: 'מחר:', text: 'כתבי לאותה פעולה הוראות פשוטות, עשר דקות. זה מה שמאפשר להסיר אותה ממך.' },
      { label: 'השבוע:', text: 'בחרי פעולה אחת והחליטי לגביה: להאציל, לתבנת, או לוותר. רק אחת, השבוע.' },
    ],
    ctaSoft:
      'את אולי חושבת "כשיהיה לי רגע, אני אתחיל להאציל", אבל הרגע הזה לא מגיע, כי הכל עובר דרכך בדיוק. בשיחה קצרה נבדוק יחד מה הדבר הראשון שצריך לעבור ממך הלאה, ומאיפה הכי בטוח להתחיל.',
    whatsappText:
      'היי הדר, עשיתי את הבדיקה והבנתי שהכל עובר דרכי ואני לא מצליחה לצאת מזה. אשמח לבדוק איתך מאיפה מתחילים.',
  },
};

// ── "Where you are" — the data lines, built from the actual answers ───────────
// Two to three lines, chosen by the headline domain. Each branch reads the real
// answer ids, so the lines reflect what she actually said. No numbers.

function optId(map: Record<string, ShortQuizOption | undefined>, q: string): string | undefined {
  return map[q]?.id;
}

function followupLines(map: Record<string, ShortQuizOption | undefined>): string[] {
  const lines: string[] = [];
  const q1 = optId(map, 'Q1');
  const q2 = optId(map, 'Q2');
  const q4 = optId(map, 'Q4');
  const q5 = optId(map, 'Q5');

  if (q2 === 'Q2_3' || q2 === 'Q2_4' || q2 === 'Q2_5') {
    lines.push('חלק מהמתעניינות מחכות יותר מיום לתשובה, ובזמן הזה רמת העניין שלהן יכולה לרדת.');
  }
  if (q4 === 'Q4_2' || q4 === 'Q4_3') {
    lines.push('הפולואפ אצלך נעשה ידנית, ולכן הוא נדחק הצידה דווקא בשבועות שבהם את הכי עמוסה.');
  }
  if (q4 === 'Q4_4' || q4 === 'Q4_5' || q5 === 'Q5_4' || q5 === 'Q5_5') {
    lines.push('אין לך כרגע דרך ברורה לראות כמה פניות נשארו פתוחות וכמה נעלמו בדרך.');
  }
  // She answers fast, but nothing continues the conversation if it doesn't close.
  if (q2 === 'Q2_1' && (q4 === 'Q4_3' || q4 === 'Q4_4' || q4 === 'Q4_5')) {
    lines.push('את מגיבה מהר לפנייה הראשונה, אבל אין תהליך קבוע שממשיך את השיחה אם היא לא נסגרת מיד.');
  }
  if ((q1 === 'Q1_3' || q1 === 'Q1_4') && lines.length < 3) {
    lines.push('מגיעות אלייך מספיק פניות כדי שגם דליפה קטנה בתהליך תהפוך לאובדן הכנסה משמעותי.');
  }
  return lines.slice(0, 3);
}

function timeLines(map: Record<string, ShortQuizOption | undefined>): string[] {
  const lines: string[] = [];
  const q6 = optId(map, 'Q6');
  const q7 = optId(map, 'Q7');
  const q8 = optId(map, 'Q8');
  const q9 = optId(map, 'Q9');

  if (q7 === 'Q7_3' || q7 === 'Q7_4' || q7 === 'Q7_5') {
    lines.push('חלק לא קטן מהיום שלך הולך על משימות שחוזרות על עצמן.');
  }
  if (q6 === 'Q6_4' || q9 === 'Q9_2' || q9 === 'Q9_3') {
    lines.push('המידע קיים, אבל הוא מפוזר ודורש ממך לעבור בין כמה מקומות כדי להבין מה קורה.');
  }
  if (q6 === 'Q6_3' || q6 === 'Q6_5') {
    lines.push('חלק גדול מהעבודה מתבצע דרך וואטסאפ, רשימות וזיכרון.');
  }
  if (q8 === 'Q8_3' || q8 === 'Q8_4') {
    lines.push('כשאת לא זמינה, משימות מתחילות לחכות ולהיערם.');
  }
  // Has a system, but still feeds it by hand.
  if (q6 === 'Q6_1' && (q7 === 'Q7_4' || q7 === 'Q7_5') && lines.length < 3) {
    lines.push('יש לך מערכת מסוימת, אבל עדיין נדרשת ממך הרבה עבודה ידנית כדי להחזיק אותה מעודכנת.');
  }
  return lines.slice(0, 3);
}

function collectionLines(map: Record<string, ShortQuizOption | undefined>): string[] {
  const lines: string[] = [];
  const q10 = optId(map, 'Q10');
  const q11 = optId(map, 'Q11');

  if (q11 === 'Q11_3' || q11 === 'Q11_4' || q11 === 'Q11_5') {
    lines.push('את משקיעה בכל חודש זמן במעקב ידני אחרי תשלומים.');
  }
  if (q10 === 'Q10_3') {
    lines.push('תזכורות תשלום נדחות לפעמים כי הן דורשות ממך לעצור ולפנות ללקוחה.');
  }
  if (q10 === 'Q10_5') {
    lines.push('אין לך תמונה אחת שמראה מי שילמה, מה פתוח ומה כבר באיחור.');
  }
  if (q10 === 'Q10_4') {
    lines.push('חלק מהגבייה מתבצע רק כשאת נזכרת לבדוק.');
  }
  if ((q10 === 'Q10_1' || q10 === 'Q10_2') && lines.length < 3) {
    lines.push('תהליך הגבייה אצלך מסודר יחסית, אבל עדיין צורך ממך יותר זמן ואנרגיה ממה שהוא אמור.');
  }
  return lines.slice(0, 3);
}

function centralizedLines(map: Record<string, ShortQuizOption | undefined>): string[] {
  const lines: string[] = [];
  const q6 = optId(map, 'Q6');
  const q8 = optId(map, 'Q8');
  const q9 = optId(map, 'Q9');

  if (q8 === 'Q8_3' || q8 === 'Q8_4' || q8 === 'Q8_5') {
    lines.push('כשאת לא זמינה, חלק משמעותי מהעבודה מתחיל להמתין לך.');
  }
  if (q6 === 'Q6_3' || q6 === 'Q6_4' || q6 === 'Q6_5') {
    lines.push('מידע חשוב נמצא בכמה מקומות, ורק את יודעת לחבר ביניהם.');
  }
  if (q9 === 'Q9_3' || q9 === 'Q9_4' || q9 === 'Q9_5') {
    lines.push('קשה לך לראות את כל תמונת העסק בלי לעבור על הודעות, גיליונות ורשימות.');
  }
  // Has a system, but the processes still run only when she drives them.
  if (q6 === 'Q6_1' && (q8 === 'Q8_3' || q8 === 'Q8_4' || q8 === 'Q8_5') && lines.length < 3) {
    lines.push('יש לך מערכת מסודרת, אבל בפועל התהליכים עדיין תלויים בכך שאת תפעילי ותעדכני אותה.');
  }
  return lines.slice(0, 3);
}

/**
 * Builds 2-3 personalized "where you are" lines for the headline domain.
 * Falls back to the archetype's static line when nothing matched.
 */
export function buildWhereYouAre(
  map: Record<string, ShortQuizOption | undefined>,
  resultType: ResultType,
): string[] {
  let lines: string[];
  switch (resultType) {
    case 'FOLLOWUP':
      lines = followupLines(map);
      break;
    case 'TIME':
      lines = timeLines(map);
      break;
    case 'COLLECTION':
      lines = collectionLines(map);
      break;
    case 'CENTRALIZED':
    default:
      lines = centralizedLines(map);
      break;
  }
  if (lines.length === 0) {
    lines = [SHORT_QUIZ_RESULTS[resultType].whereYouAreFallback];
  }
  return lines;
}

// ── Gap state: felt pain differs from the structural driver ───────────────────

/** Short noun-phrases that read naturally after "ש…" in the gap note. */
const GAP_LABELS: Record<DomainKey, string> = {
  FOLLOWUP: 'נושא הפניות והפולואפ',
  TIME: 'עומס התפעול',
  COLLECTION: 'נושא הגבייה',
  CENTRALIZED: 'התלות בך',
};

export function buildGapNote(felt: DomainKey, data: DomainKey): string {
  return `סימנת ש${GAP_LABELS[felt]} הוא מה שהכי מעסיק אותך כרגע, וזה הגיוני, כי זה כנראה המקום שבו את מרגישה את העומס בצורה הכי ישירה. אבל מהתשובות שלך עולה שהגורם שמזין את זה הוא דווקא ${GAP_LABELS[data]}. ייתכן ש${GAP_LABELS[felt]} הוא הסימפטום, ו${GAP_LABELS[data]} הוא המבנה שמתחתיו.`;
}

// ── Strong state: the picture is healthy across the board ─────────────────────

export const STRONG_TAGLINE = 'הבסיס שלך מסודר';
export const STRONG_HEADLINE = 'התהליך שלך עובד. האתגר הוא לשמור עליו כשהעסק גדל.';
export const STRONG_BODY =
  'מהתשובות שלך עולה שכבר בנית בסיס טוב. את מגיבה בזמן, יש המשך מסודר למתעניינות, והמידע מרוכז במקום שאת שולטת בו. ההזדמנות אצלך אינה לתקן כאוס, אלא לוודא שהמערכת ממשיכה לעבוד גם כשהיקף הפניות והלקוחות עולה, בלי שתצטרכי להחזיק יותר ויותר בראש.';

export const DISCLAIMER_TEXT =
  'זוהי תמונה ראשונית בלבד, המבוססת על מה שסיפרת לי כאן. היא נועדה להאיר לך איפה כדאי להסתכל, לא להחליף בדיקה מלאה של התהליך.';

// ── Strategy-call ("שיחת אסטרטגיה") shared copy ───────────────────────────────
// Single source of truth, consumed by both the result page and the meeting page.
// The next step in the funnel IS the paid 350₪ strategy call, sold on a concrete
// deliverable she keeps (a written, prioritized map), full credit toward the
// project, and a full-refund promise. No dash, no "צוואר בקבוק".
// (Export names kept as SCOPING_CALL_* to avoid churn across importers.)

export const SCOPING_CALL_TITLE = 'מה את מקבלת בשיחת האסטרטגיה';

/** What the paid strategy call delivers. The deliverable-she-keeps leads. */
export const SCOPING_CALL_VALUE: string[] = [
  'שעה מלאה איתי, אחת על אחת, על התהליך שלך. עוברות על מה שעלה בבדיקה ועל איך זה קורה אצלך בפועל.',
  'מסמנות יחד איפה בדיוק נושרות אצלך פניות, זמן וכסף, ומה שווה לסדר קודם.',
  'את יוצאת עם מפת אוטומציה כתובה ומתועדפת: מה לסדר ראשון, מה אחר כך, ולמה. המסמך נשאר אצלך גם אם לא נמשיך לעבוד יחד.',
  'אם מחליטות להמשיך לפרויקט, מלוא הסכום ששילמת מקוזז מהמחיר שלו.',
];

/**
 * Trust line for the "I've been burned before" objection. Carries the refund
 * promise, so the price lands right after the distrust is named.
 */
export const SCOPING_CALL_TRUST =
  'אם כבר שילמת בעבר ליועצים או לאנשי שיווק ונשארת עם הבטחות באוויר, מובן לי לגמרי שאת זהירה. לכן ההתחייבות שלי פשוטה: אם בסוף השיחה תרגישי שלא קיבלת ערך אמיתי, את מקבלת את מלוא הסכום בחזרה. בלי שאלות ובלי ויכוח.';

/** The strategy-call terms: what it costs, what she keeps, where it leads. */
export const SCOPING_CALL_PROMISE = {
  plan: 'שיחת האסטרטגיה אורכת כשעה ועולה 350 ש"ח. בסופה נשאר אצלך מסמך עבודה כתוב, וברור לך מה הצעד הראשון, גם אם תחליטי לבצע אותו בעצמך.',
  price:
    'אם נמשיך יחד לפרויקט, ה-350 ש"ח מקוזזים ממנו במלואם. פרויקטים אצלי נעים לרוב בין 5,000 ל-15,000 ש"ח, כך שאת יודעת לאן זה הולך עוד לפני שהתחלנו.',
};

/** Bridge line: pivots from the free steps to the paid, deliverable-led call. */
export const SCOPING_CALL_BRIDGE =
  'את כבר רואה איפה זה דולף. הצעד הבא הוא לא עוד טיפ כללי, אלא שיחת אסטרטגיה ממוקדת איתי, שבסופה יש לך מפה כתובה של מה לסדר אצלך, באיזה סדר, ולמה.';

/** Refund microcopy shown right next to the payment CTA. */
export const SCOPING_CALL_GUARANTEE =
  'לא יצא לך ערך מהשיחה? החזר מלא. אפשר לבטל עד 24 שעות לפני, בהחזר מלא.';

/** Short label for the payment CTA itself. */
export const SCOPING_CALL_CTA_LABEL = 'לקביעת שיחת האסטרטגיה, 350 ש"ח';
export const SCOPING_CALL_CTA_SUB = 'מקוזז במלואו מהפרויקט אם ממשיכות יחד';
