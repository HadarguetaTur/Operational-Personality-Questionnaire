import type { ResultType } from '@/lib/calculator/types';

/** The four domains the quiz scores. They map 1:1 onto ResultType. */
export type DomainKey = ResultType;
export const DOMAINS: DomainKey[] = ['FOLLOWUP', 'TIME', 'COLLECTION', 'CENTRALIZED'];

export interface ShortQuizOption {
  id: string;
  text: string;
  /**
   * Severity points (0 = healthy … 3 = severe) this answer contributes to one
   * or more domains. The result headline is the highest-scoring domain.
   */
  scores?: Partial<Record<DomainKey, number>>;
  /**
   * Q1 only: a multiplier applied to the FOLLOWUP score. More inbound volume
   * amplifies an existing follow-up leak, but never manufactures one.
   */
  volumeAmp?: number;
  /** Q12 only: the pain the user *feels* most. null = "everything is connected". */
  feltPain?: DomainKey | null;
}

export interface ShortQuestion {
  id: string;
  text: string;
  /** One-line "why we ask this" shown above the question. */
  context?: string;
  microCopy?: string;
  phase: 1 | 2 | 3 | 4;
  phaseName: string;
  options: ShortQuizOption[];
}

export const PHASE_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: 'פניות ופולואפ',
  2: 'זמן ותלות',
  3: 'גבייה',
  4: 'התמונה',
};

export const SHORT_QUIZ_QUESTIONS: ShortQuestion[] = [
  // ── חלק 1: מה קורה מרגע שמישהי מתעניינת ────────────────────────────────────
  {
    id: 'Q1',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    context: 'כדי להבין כמה הזדמנויות עוברות דרכך',
    text: 'בערך כמה פניות חדשות מגיעות אלייך בחודש?',
    microCopy: 'כולל וואטסאפ, אינסטגרם, טפסים, המלצות וכל מקום אחר',
    options: [
      { id: 'Q1_1', text: 'עד 5 פניות בחודש',        volumeAmp: 0.85 },
      { id: 'Q1_2', text: 'בין 6 ל־15 פניות',         volumeAmp: 1.0  },
      { id: 'Q1_3', text: 'בין 16 ל־40 פניות',        volumeAmp: 1.1  },
      { id: 'Q1_4', text: 'יותר מ־40 פניות',          volumeAmp: 1.15 },
      { id: 'Q1_5', text: 'אני לא באמת יודעת',         volumeAmp: 1.05 },
    ],
  },
  {
    id: 'Q2',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    context: 'כי מהירות המענה היא לעיתים ההבדל בין סגירה לפספוס',
    text: 'כשמישהי פונה אלייך, תוך כמה זמן היא בדרך כלל מקבלת תשובה?',
    microCopy: 'לא ביום רגוע. בשבוע אמיתי, עם לקוחות, משימות והחיים עצמם',
    options: [
      { id: 'Q2_1', text: 'בדרך כלל בתוך כמה שעות',                  scores: { FOLLOWUP: 0 } },
      { id: 'Q2_2', text: 'באותו יום',                              scores: { FOLLOWUP: 1 } },
      { id: 'Q2_3', text: 'בתוך יום או יומיים',                     scores: { FOLLOWUP: 2 } },
      { id: 'Q2_4', text: 'לפעמים רק אחרי כמה ימים',                scores: { FOLLOWUP: 3 } },
      { id: 'Q2_5', text: 'קורה שעובר שבוע או שההודעה נשכחת',       scores: { FOLLOWUP: 3 } },
    ],
  },
  {
    id: 'Q3',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    context: 'כדי לראות כמה פניות טובות נושרות בשקט',
    text: 'כמה פעמים קורה לך שאת מגלה בדיעבד פנייה טובה שלא חזרת אליה בזמן?',
    options: [
      { id: 'Q3_1', text: 'כמעט אף פעם',            scores: { FOLLOWUP: 0 } },
      { id: 'Q3_2', text: 'פעם בכמה שבועות',        scores: { FOLLOWUP: 1 } },
      { id: 'Q3_3', text: 'כמה פעמים בחודש',        scores: { FOLLOWUP: 2 } },
      { id: 'Q3_4', text: 'כמעט כל שבוע',           scores: { FOLLOWUP: 3 } },
      { id: 'Q3_5', text: 'אני מעדיפה לא לבדוק',    scores: { FOLLOWUP: 3 } },
    ],
  },
  {
    id: 'Q4',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    context: 'כי כאן נופל חלק גדול מהכסף, בשקט',
    text: 'מה קורה אחרי שמתעניינת דיברה איתך, אבל לא סגרה מיד?',
    options: [
      { id: 'Q4_1', text: 'היא נכנסת לתהליך פולואפ מסודר שקורה גם בלעדיי', scores: { FOLLOWUP: 0 } },
      { id: 'Q4_2', text: 'אני רושמת לעצמי וחוזרת אליה ידנית',           scores: { FOLLOWUP: 1 } },
      { id: 'Q4_3', text: 'אני משתדלת לחזור, אבל זה תלוי בעומס',          scores: { FOLLOWUP: 2 } },
      { id: 'Q4_4', text: 'לרוב אין המשך מסודר',                         scores: { FOLLOWUP: 3 } },
      { id: 'Q4_5', text: 'אין לי דרך לדעת מה קרה איתה אחרי השיחה',       scores: { FOLLOWUP: 3 } },
    ],
  },
  {
    id: 'Q5',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    context: 'כי בלי לדעת כמה נסגרות, קשה לראות איפה זה דולף',
    text: 'מתוך הפניות הרציניות שמגיעות אלייך, את יודעת כמה הופכות ללקוחות?',
    options: [
      { id: 'Q5_1', text: 'כן, אני יודעת את הנתון',                scores: { FOLLOWUP: 0 } },
      { id: 'Q5_2', text: 'יש לי הערכה די טובה',                   scores: { FOLLOWUP: 1 } },
      { id: 'Q5_3', text: 'בערך, אבל אני לא עוקבת באופן קבוע',     scores: { FOLLOWUP: 2 } },
      { id: 'Q5_4', text: 'לא באמת',                              scores: { FOLLOWUP: 3 } },
      { id: 'Q5_5', text: 'אין לי דרך למדוד את זה',                scores: { FOLLOWUP: 3 } },
    ],
  },

  // ── חלק 2: כמה מהעסק עדיין יושב עלייך ───────────────────────────────────────
  {
    id: 'Q6',
    phase: 2,
    phaseName: PHASE_NAMES[2],
    context: 'כדי לראות אם יש מקום אחד שמרכז הכל',
    text: 'איפה מרוכז המידע על פניות ולקוחות פוטנציאליים?',
    options: [
      { id: 'Q6_1', text: 'במערכת אחת מסודרת',              scores: { TIME: 0, CENTRALIZED: 0 } },
      { id: 'Q6_2', text: 'בגיליון שאני מעדכנת',            scores: { TIME: 1, CENTRALIZED: 1 } },
      { id: 'Q6_3', text: 'בוואטסאפ ובכמה רשימות',          scores: { TIME: 2, CENTRALIZED: 2 } },
      { id: 'Q6_4', text: 'בכמה כלים שלא מחוברים זה לזה',   scores: { TIME: 3, CENTRALIZED: 2 } },
      { id: 'Q6_5', text: 'בעיקר בראש שלי',                 scores: { TIME: 2, CENTRALIZED: 3 } },
    ],
  },
  {
    id: 'Q7',
    phase: 2,
    phaseName: PHASE_NAMES[2],
    context: 'כדי להבין כמה מהיום שלך הולך על תפעול',
    text: 'כמה מהיום שלך הולך על פעולות שחוזרות על עצמן?',
    microCopy: 'לענות על אותן שאלות, לתאם, להזכיר, לעדכן, להעביר מידע ולבדוק סטטוס',
    options: [
      { id: 'Q7_1', text: 'כמעט כלום',               scores: { TIME: 0 } },
      { id: 'Q7_2', text: 'עד שעה ביום',             scores: { TIME: 1 } },
      { id: 'Q7_3', text: 'בין שעה לשעתיים ביום',    scores: { TIME: 2 } },
      { id: 'Q7_4', text: 'כמה שעות ביום',           scores: { TIME: 3 } },
      { id: 'Q7_5', text: 'רוב היום שלי בנוי מזה',   scores: { TIME: 3 } },
    ],
  },
  {
    id: 'Q8',
    phase: 2,
    phaseName: PHASE_NAMES[2],
    context: 'כי כך רואים כמה מהעסק נשען עלייך אישית',
    text: 'מה קורה בעסק כשאת לא זמינה ליום או יומיים?',
    options: [
      { id: 'Q8_1', text: 'רוב הדברים ממשיכים לעבוד',                scores: { CENTRALIZED: 0 } },
      { id: 'Q8_2', text: 'חלק מהדברים מחכים לי',                    scores: { CENTRALIZED: 1 } },
      { id: 'Q8_3', text: 'פניות ומשימות מתחילות להיערם',            scores: { CENTRALIZED: 2 } },
      { id: 'Q8_4', text: 'כמעט הכול נעצר',                          scores: { CENTRALIZED: 3 } },
      { id: 'Q8_5', text: 'אני כמעט לא מאפשרת לעצמי לא להיות זמינה',  scores: { CENTRALIZED: 3 } },
    ],
  },
  {
    id: 'Q9',
    phase: 2,
    phaseName: PHASE_NAMES[2],
    context: 'כדי לראות כמה קל לך לראות את התמונה בכל רגע',
    text: 'כשאת צריכה להבין מה קורה בעסק עכשיו, כמה קל לך לראות את התמונה?',
    microCopy: 'למי צריך לחזור, מה עדיין פתוח, מי שילמה ומה דורש טיפול',
    options: [
      { id: 'Q9_1', text: 'אני רואה הכול במקום אחד',                       scores: { TIME: 0, CENTRALIZED: 0 } },
      { id: 'Q9_2', text: 'יש לי מידע, אבל צריך לעבור בין כמה מקומות',     scores: { TIME: 1, CENTRALIZED: 1 } },
      { id: 'Q9_3', text: 'אני צריכה לבדוק הודעות, רשימות וגיליונות',      scores: { TIME: 2, CENTRALIZED: 2 } },
      { id: 'Q9_4', text: 'אני בעיקר מנסה לזכור',                          scores: { TIME: 2, CENTRALIZED: 3 } },
      { id: 'Q9_5', text: 'אני מגלה דברים רק כשהם כבר דחופים',             scores: { TIME: 2, CENTRALIZED: 3 } },
    ],
  },

  // ── חלק 3: כסף שכבר היה אמור להיכנס ─────────────────────────────────────────
  {
    id: 'Q10',
    phase: 3,
    phaseName: PHASE_NAMES[3],
    context: 'כי כסף שכבר הרווחת לפעמים תקוע בדרך אלייך',
    text: 'מה הכי קרוב למה שקורה אצלך סביב גבייה?',
    options: [
      { id: 'Q10_1', text: 'התשלום והתזכורות מתנהלים בצורה מסודרת',          scores: { COLLECTION: 0 } },
      { id: 'Q10_2', text: 'אני עוקבת, אבל הכול נעשה ידנית',                 scores: { COLLECTION: 1 } },
      { id: 'Q10_3', text: 'אני דוחה לפעמים תזכורות לא נעימות',              scores: { COLLECTION: 2 } },
      { id: 'Q10_4', text: 'יש תשלומים שמתעכבים כי לא חזרתי אליהם',          scores: { COLLECTION: 3 } },
      { id: 'Q10_5', text: 'יש לי כסף פתוח, אבל אין לי תמונה כמה וממי',      scores: { COLLECTION: 3 } },
    ],
  },
  {
    id: 'Q11',
    phase: 3,
    phaseName: PHASE_NAMES[3],
    context: 'כדי לראות כמה אנרגיה הגבייה גוזלת ממך',
    text: 'כמה זמן בחודש את משקיעה בבדיקת תשלומים, תזכורות ומעקב אחרי גבייה?',
    options: [
      { id: 'Q11_1', text: 'כמעט בכלל לא',                       scores: { COLLECTION: 0 } },
      { id: 'Q11_2', text: 'עד שעה בחודש',                       scores: { COLLECTION: 1 } },
      { id: 'Q11_3', text: 'כמה שעות בחודש',                     scores: { COLLECTION: 2 } },
      { id: 'Q11_4', text: 'כמה שעות בכל שבוע',                  scores: { COLLECTION: 3 } },
      { id: 'Q11_5', text: 'אני לא יודעת, אבל זה מעסיק אותי הרבה', scores: { COLLECTION: 3 } },
    ],
  },

  // ── חלק 4: מה הכי מעסיק אותך כרגע ───────────────────────────────────────────
  {
    id: 'Q12',
    phase: 4,
    phaseName: PHASE_NAMES[4],
    context: 'אין כאן תשובה נכונה. רוצים להבין גם מה הנתונים מראים וגם מה את מרגישה',
    text: 'כשאת חושבת על העסק שלך עכשיו, מה הכי מתיש אותך?',
    options: [
      { id: 'Q12_1', text: 'פניות טובות שלא הופכות ללקוחות',          feltPain: 'FOLLOWUP'    },
      { id: 'Q12_2', text: 'יותר מדי זמן שמתבזבז על תפעול',           feltPain: 'TIME'        },
      { id: 'Q12_3', text: 'הצורך לרדוף אחרי תשלומים',                feltPain: 'COLLECTION'  },
      { id: 'Q12_4', text: 'התחושה שהכול תלוי בי',                    feltPain: 'CENTRALIZED' },
      { id: 'Q12_5', text: 'קשה לי לבחור, הכול מרגיש מחובר',          feltPain: null          },
    ],
  },
];

export const TOTAL_QUESTIONS = SHORT_QUIZ_QUESTIONS.length;

/** Build a Record<questionId, option> from an ordered answers array. */
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

/** Build a Record<questionId, option> from a stored { questionId: optionId } map. */
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

// ── Scoring ────────────────────────────────────────────────────────────────

export interface QuizScore {
  /** The headline domain — the highest-scoring of the four. */
  resultType: DomainKey;
  /** The pain the user feels most (Q12). null when "everything is connected". */
  feltPain: DomainKey | null;
  /** Normalized 0..1 severity per domain. */
  normalized: Record<DomainKey, number>;
  /** Felt pain differs from, and is structurally fed by, the data's top domain. */
  isGap: boolean;
  /** Every domain is healthy — present the "your base is solid" framing instead. */
  isStrong: boolean;
}

/** Below this normalized max, the picture is healthy across the board. */
const STRONG_THRESHOLD = 0.3;
/** The data top must clear the felt domain by this much to call it a gap. */
const GAP_DELTA = 0.12;
/** Tie-break order when two domains score equally (money-leak first). */
const PRIORITY: DomainKey[] = ['FOLLOWUP', 'COLLECTION', 'CENTRALIZED', 'TIME'];

/** How many questions feed each domain — the divisor for normalization. */
function domainMax(domain: DomainKey): number {
  const count = SHORT_QUIZ_QUESTIONS.filter((q) =>
    q.options.some((o) => o.scores?.[domain] !== undefined),
  ).length;
  return count * 3;
}

/**
 * Scores the four domains, picks the headline (highest), and detects the
 * "gap" (felt vs data) and "strong" (healthy across the board) states.
 */
export function scoreQuiz(
  map: Record<string, ShortQuizOption | undefined>,
): QuizScore {
  const raw: Record<DomainKey, number> = {
    FOLLOWUP: 0,
    TIME: 0,
    COLLECTION: 0,
    CENTRALIZED: 0,
  };

  for (const q of SHORT_QUIZ_QUESTIONS) {
    const opt = map[q.id];
    if (!opt?.scores) continue;
    for (const d of DOMAINS) {
      const pts = opt.scores[d];
      if (typeof pts === 'number') raw[d] += pts;
    }
  }

  const normalized: Record<DomainKey, number> = {
    FOLLOWUP: 0,
    TIME: 0,
    COLLECTION: 0,
    CENTRALIZED: 0,
  };
  for (const d of DOMAINS) {
    const max = domainMax(d);
    normalized[d] = max > 0 ? raw[d] / max : 0;
  }

  // Inbound volume amplifies an existing follow-up leak, capped at 1.
  const amp = map['Q1']?.volumeAmp ?? 1;
  normalized.FOLLOWUP = Math.min(1, normalized.FOLLOWUP * amp);

  const feltPain = map['Q12']?.feltPain ?? null;

  const maxVal = Math.max(...DOMAINS.map((d) => normalized[d]));
  const near = DOMAINS.filter((d) => maxVal - normalized[d] <= 0.0001);

  // When the data is tied at the top and the user named one of those domains,
  // honor what she feels. Otherwise fall back to the money-leak priority order.
  let resultType: DomainKey;
  if (feltPain && near.includes(feltPain)) {
    resultType = feltPain;
  } else {
    resultType = PRIORITY.find((d) => near.includes(d)) ?? near[0] ?? 'CENTRALIZED';
  }

  const isStrong = maxVal < STRONG_THRESHOLD;
  const isGap =
    !isStrong &&
    feltPain !== null &&
    feltPain !== resultType &&
    normalized[resultType] - normalized[feltPain] >= GAP_DELTA;

  return { resultType, feltPain, normalized, isGap, isStrong };
}

/**
 * Back-compat thin wrapper: the headline domain only.
 * The result page uses scoreQuiz() for the full picture.
 */
export function resolveResultType(
  map: Record<string, ShortQuizOption | undefined>,
): ResultType {
  return scoreQuiz(map).resultType;
}
