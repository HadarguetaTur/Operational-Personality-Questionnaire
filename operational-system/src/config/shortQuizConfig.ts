import type { ResultType, ResponseSpeed } from '@/lib/calculator/types';

export interface ShortQuizOption {
  id: string;
  text: string;
  /** Qualitative narrative tag (Q1/Q3/Q4/Q5/Q6/Q7/Q8) used to build the result copy */
  tag?: string;
  /** Response speed (Q9) */
  responseSpeed?: ResponseSpeed;
  /** Primary pain / result archetype (Q10) */
  resultType?: ResultType;
}

export interface ShortQuestion {
  id: string;
  text: string;
  /** One-line "why we ask this" shown above the question */
  context?: string;
  microCopy?: string;
  phase: 1 | 2 | 3 | 4;
  phaseName: string;
  options: ShortQuizOption[];
}

export const PHASE_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: 'פניות ומכירות',
  2: 'הזמן שלך',
  3: 'גבייה ומעקב',
  4: 'התמונה',
};

export const SHORT_QUIZ_QUESTIONS: ShortQuestion[] = [
  // ── Phase 1: פניות ומכירות ────────────────────────────────────────────────
  {
    id: 'Q1',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    context: 'כדי להבין כמה הזדמנויות עוברות דרכך',
    text: 'כמה מתעניינות מגיעות אלייך בחודש, בערך?',
    microCopy: 'כולל וואטסאפ, אינסטגרם, טפסים, הכול',
    options: [
      { id: 'Q1_1', text: 'טפטוף, כמה בחודש',          tag: 'LOW'   },
      { id: 'Q1_2', text: 'זרם יציב לאורך החודש',       tag: 'MID'   },
      { id: 'Q1_3', text: 'הרבה, כמעט כל יום משהו',     tag: 'HIGH'  },
      { id: 'Q1_4', text: 'מוצפת, יותר ממה שאני מספיקה', tag: 'FLOOD' },
    ],
  },
  {
    id: 'Q2',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    context: 'כי בדיוק שם הכסף בורח בשקט',
    text: 'כל כמה זמן את פותחת את הוואטסאפ ומגלה הודעה טובה מלפני כמה ימים שלא חזרת אליה?',
    options: [
      { id: 'Q2_1', text: 'קורה לי, וזה תמיד דוקר',       tag: 'OFTEN'     },
      { id: 'Q2_2', text: 'פה ושם, כשאני עמוסה',          tag: 'SOMETIMES' },
      { id: 'Q2_3', text: 'כמעט אף פעם, אני על זה',       tag: 'RARE'      },
      { id: 'Q2_4', text: 'עדיף לי לא לחשוב על זה',        tag: 'UNKNOWN'   },
    ],
  },
  {
    id: 'Q3',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    context: 'כדי לראות איפה התהליך דולף',
    text: 'מהפניות שבאמת מתעניינות, כמה נופלות לך בדרך לסגירה?',
    options: [
      { id: 'Q3_1', text: 'רובן נשארות, אני סוגרת יפה',  tag: 'FEW'     },
      { id: 'Q3_2', text: 'חלק נסגרות, חלק מתפוגגות',    tag: 'SOME'    },
      { id: 'Q3_3', text: 'הרבה נופלות בדרך',            tag: 'MANY'    },
      { id: 'Q3_4', text: 'אין לי מושג, אני לא עוקבת',   tag: 'UNKNOWN' },
    ],
  },
  {
    id: 'Q4',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    context: 'כי כאן נופל חלק גדול מהכסף, בשקט',
    text: 'מה קורה אצלך אחרי שמתעניינת פנתה ולא סגרה מיד?',
    options: [
      { id: 'Q4_1', text: 'יש לי פולואפ קבוע שרץ מעצמו',        tag: 'STRUCTURED'   },
      { id: 'Q4_2', text: 'חוזרת לרובן, אבל הכל ידני ועליי',    tag: 'MANUAL'       },
      { id: 'Q4_3', text: 'חוזרת כשאני נזכרת או כשיש רגע',      tag: 'INCONSISTENT' },
      { id: 'Q4_4', text: 'לרוב אין המשך מסודר',               tag: 'NONE'         },
      { id: 'Q4_5', text: 'אין לי דרך לדעת מה קרה איתן',       tag: 'UNKNOWN'      },
    ],
  },

  // ── Phase 2: הזמן שלך ──────────────────────────────────────────────────────
  {
    id: 'Q5',
    phase: 2,
    phaseName: PHASE_NAMES[2],
    context: 'כדי לראות אם יש מקום אחד שמרכז הכל',
    text: 'איפה חיות הפניות והשיחות עם לקוחות פוטנציאליות?',
    options: [
      { id: 'Q5_1', text: 'בראש שלי ובוואטסאפ',           tag: 'HEAD'      },
      { id: 'Q5_2', text: 'באקסל או גוגל שיטס',           tag: 'SHEET'     },
      { id: 'Q5_3', text: 'בכמה כלים שלא מדברים ביניהם',  tag: 'SCATTERED' },
      { id: 'Q5_4', text: 'במערכת מסודרת אחת',            tag: 'SYSTEM'    },
    ],
  },
  {
    id: 'Q6',
    phase: 2,
    phaseName: PHASE_NAMES[2],
    context: 'כדי להבין כמה מהזמן שלך הולך על תפעול',
    text: 'כמה מהיום שלך נבלע בהודעות, תיאומים ותזכורות?',
    microCopy: 'כולל מה שקורה בערב ובין פגישות',
    options: [
      { id: 'Q6_1', text: 'כמעט כלום, זה זורם',        tag: 'LOW'  },
      { id: 'Q6_2', text: 'נתח קטן מהיום',             tag: 'SOME' },
      { id: 'Q6_3', text: 'בערך חצי מהיום',            tag: 'HALF' },
      { id: 'Q6_4', text: 'רוב היום שלי הולך על זה',   tag: 'MOST' },
    ],
  },

  // ── Phase 3: גבייה ומעקב ──────────────────────────────────────────────────
  {
    id: 'Q7',
    phase: 3,
    phaseName: PHASE_NAMES[3],
    context: 'כי כסף שכבר הרווחת לפעמים תקוע בדרך אלייך',
    text: 'גבייה, חשבוניות ותזכורות תשלום, כמה זה מעיק עלייך?',
    options: [
      { id: 'Q7_1', text: 'זורם, כמעט לא מרגישה',     tag: 'LOW'   },
      { id: 'Q7_2', text: 'בסדר, אבל לוקח לי זמן',    tag: 'SOME'  },
      { id: 'Q7_3', text: 'מתיש, אני דוחה את זה',     tag: 'HEAVY' },
      { id: 'Q7_4', text: 'נמנעת מזה, וזה נערם',      tag: 'AVOID' },
    ],
  },
  {
    id: 'Q8',
    phase: 3,
    phaseName: PHASE_NAMES[3],
    context: 'כי בלי לדעת מאיפה מגיע הכסף, קשה לדעת איפה הוא נוזל',
    text: 'אם אשאל אותך עכשיו מאיפה הגיעו שלוש הלקוחות האחרונות שסגרת, תדעי להגיד?',
    options: [
      { id: 'Q8_1', text: 'בטוח, אני יודעת בדיוק',      tag: 'YES'   },
      { id: 'Q8_2', text: 'בערך, אזכר אם אחשוב',        tag: 'ROUGH' },
      { id: 'Q8_3', text: 'האמת שלא, זה מתערבב לי',     tag: 'NO'    },
      { id: 'Q8_4', text: 'אין לי שום מעקב כזה',        tag: 'NONE'  },
    ],
  },
  {
    id: 'Q9',
    phase: 3,
    phaseName: PHASE_NAMES[3],
    context: 'כי מהירות המענה היא לפעמים ההבדל בין סגירה לפספוס',
    text: 'כמה זמן עובר מרגע שמתעניינת פונה ועד שהיא מקבלת ממך תשובה?',
    options: [
      { id: 'Q9_1', text: 'באותו יום',                responseSpeed: 'FAST'      },
      { id: 'Q9_2', text: 'יום, יומיים',              responseSpeed: 'MODERATE'  },
      { id: 'Q9_3', text: 'כמה ימים, כשמתפנה לי',     responseSpeed: 'SLOW'      },
      { id: 'Q9_4', text: 'לפעמים עובר שבוע ויותר',   responseSpeed: 'VERY_SLOW' },
    ],
  },

  // ── Phase 4: התמונה ───────────────────────────────────────────────────────
  {
    id: 'Q10',
    phase: 4,
    phaseName: PHASE_NAMES[4],
    context: 'כדי לכוון את התמונה בול לאן שהכי כואב',
    text: 'מה הכי נכון לגבייך עכשיו?',
    options: [
      { id: 'Q10_1', text: 'פניות ופולואפים נופלים לי בין הסדקים',     resultType: 'FOLLOWUP'   },
      { id: 'Q10_2', text: 'יותר מדי מהזמן שלי הולך על תפעול ידני',    resultType: 'TIME'        },
      { id: 'Q10_3', text: 'הגבייה לוקחת לי המון אנרגיה',             resultType: 'COLLECTION'  },
      { id: 'Q10_4', text: 'הכל עובר דרכי ואני לא מצליחה לצאת מזה',   resultType: 'CENTRALIZED' },
    ],
  },
];

export const TOTAL_QUESTIONS = SHORT_QUIZ_QUESTIONS.length;

/** Build a Record<questionId, option> from an ordered answers array */
export function buildAnswerMap(
  answers: string[],
): Record<string, ShortQuizOption | undefined> {
  const result: Record<string, ShortQuizOption | undefined> = {};
  SHORT_QUIZ_QUESTIONS.forEach((q, idx) => {
    const optId = answers[idx];
    if (optId) result[q.id] = q.options.find((o) => o.id === optId);
  });
  return result;
}

/** Build a Record<questionId, option> from a stored { questionId: optionId } map */
export function buildAnswerMapFromInputs(
  inputs: Record<string, string> | null | undefined,
): Record<string, ShortQuizOption | undefined> {
  const result: Record<string, ShortQuizOption | undefined> = {};
  if (!inputs) return result;
  SHORT_QUIZ_QUESTIONS.forEach((q) => {
    const optId = inputs[q.id];
    if (optId) result[q.id] = q.options.find((o) => o.id === optId);
  });
  return result;
}

/** The result archetype is chosen directly by the Q10 answer. */
export function resolveResultType(
  map: Record<string, ShortQuizOption | undefined>,
): ResultType {
  return map['Q10']?.resultType ?? 'CENTRALIZED';
}
