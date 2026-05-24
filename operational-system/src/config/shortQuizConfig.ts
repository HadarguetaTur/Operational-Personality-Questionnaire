import type { ResultType, ResponseSpeed } from '@/lib/calculator/types';

export interface ShortQuizOption {
  id: string;
  text: string;
  // Bracket values (Q1, Q2, Q6, Q7, Q8)
  low?: number;
  mid?: number;
  high?: number;
  // Rate value (Q3, Q4)
  rate?: number;
  isDefault?: boolean;
  // Dispersion score (Q5)
  dispersionScore?: number;
  // Response speed (Q9)
  responseSpeed?: ResponseSpeed;
  // Primary pain / result type (Q10)
  resultType?: ResultType;
}

export interface ShortQuestion {
  id: string;
  text: string;
  microCopy?: string;
  phase: 1 | 2 | 3 | 4;
  phaseName: string;
  options: ShortQuizOption[];
}

export const PHASE_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: 'פניות ומכירות',
  2: 'זמן ידני',
  3: 'גבייה ותפעול',
  4: 'תוצאה',
};

export const SHORT_QUIZ_QUESTIONS: ShortQuestion[] = [
  // ── Phase 1: פניות ומכירות ────────────────────────────────────────────────
  {
    id: 'Q1',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    text: 'כמה פניות / מתעניינות מגיעות אליך בחודש ממוצע?',
    microCopy: 'כולל וואטסאפ, אינסטגרם, טפסים, הכול',
    options: [
      { id: 'Q1_1', text: 'עד 10', low: 5,  mid: 7,  high: 10 },
      { id: 'Q1_2', text: '11–30', low: 11, mid: 20, high: 30 },
      { id: 'Q1_3', text: '31–60', low: 31, mid: 45, high: 60 },
      { id: 'Q1_4', text: 'מעל 60', low: 61, mid: 75, high: 90 },
    ],
  },
  {
    id: 'Q2',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    text: 'מה שווי לקוחה ממוצעת? (סך התשלום הכולל לעסקה / פרויקט)',
    microCopy: 'הערכה בסדר גמור, לא צריך מספר מדויק',
    options: [
      { id: 'Q2_1', text: 'עד ₪500',          low: 200,   mid: 300,   high: 500   },
      { id: 'Q2_2', text: '₪500–₪1,500',       low: 500,   mid: 1000,  high: 1500  },
      { id: 'Q2_3', text: '₪1,500–₪4,000',     low: 1500,  mid: 2500,  high: 4000  },
      { id: 'Q2_4', text: '₪4,000–₪10,000',    low: 4000,  mid: 7000,  high: 10000 },
      { id: 'Q2_5', text: 'מעל ₪10,000',       low: 10000, mid: 15000, high: 20000 },
    ],
  },
  {
    id: 'Q3',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    text: 'מתוך 10 פניות רלוונטיות, כמה בדרך כלל הופכות ללקוחות?',
    microCopy: "אם בחרת 'אין לי מושג', המחשבון ישתמש ב-7% ויציג זאת בפירוט",
    options: [
      { id: 'Q3_0', text: 'אין לי מושג', rate: 0.07, isDefault: true },
      { id: 'Q3_1', text: '0–1',          rate: 0.05 },
      { id: 'Q3_2', text: '2–3',          rate: 0.20 },
      { id: 'Q3_3', text: '4–5',          rate: 0.35 },
      { id: 'Q3_4', text: 'יותר מ-5',    rate: 0.50 },
    ],
  },
  {
    id: 'Q4',
    phase: 1,
    phaseName: PHASE_NAMES[1],
    text: 'מה קורה אצלך אחרי שמתעניינת פנתה ולא סגרה מיד?',
    options: [
      { id: 'Q4_1', text: 'יש לי תהליך פולואפ קבוע',                         rate: 0.10 },
      { id: 'Q4_2', text: 'חוזרת לרוב המתעניינות, אבל ידנית',                 rate: 0.25 },
      { id: 'Q4_3', text: 'חוזרת כשאני זוכרת / כשיש זמן',                    rate: 0.50 },
      { id: 'Q4_4', text: 'לרוב אין המשך מסודר',                              rate: 0.70 },
      { id: 'Q4_5', text: 'אין לי דרך לדעת',                                  rate: 0.45, isDefault: true },
    ],
  },

  // ── Phase 2: זמן ידני ──────────────────────────────────────────────────────
  {
    id: 'Q5',
    phase: 2,
    phaseName: PHASE_NAMES[2],
    text: 'איפה מנוהלות הפניות והשיחות עם לקוחות פוטנציאליות היום?',
    options: [
      { id: 'Q5_1', text: 'בעיקר בראש + וואטסאפ',              dispersionScore: 3   },
      { id: 'Q5_2', text: 'גיליון אקסל / Google Sheets',        dispersionScore: 2   },
      { id: 'Q5_3', text: 'כמה מערכות לא מחוברות',              dispersionScore: 2.5 },
      { id: 'Q5_4', text: 'CRM / מערכת מסודרת',                 dispersionScore: 0.5 },
    ],
  },
  {
    id: 'Q6',
    phase: 2,
    phaseName: PHASE_NAMES[2],
    text: 'כמה שעות בשבוע את מקדישה להודעות, תיאומים, תזכורות ופולואפים?',
    microCopy: 'כולל גם מה שנעשה בערב ובין פגישות',
    options: [
      { id: 'Q6_1', text: 'פחות משעה',  low: 0.25, mid: 0.5, high: 1  },
      { id: 'Q6_2', text: '1–3 שעות',   low: 1,    mid: 2,   high: 3  },
      { id: 'Q6_3', text: '3–6 שעות',   low: 3,    mid: 4.5, high: 6  },
      { id: 'Q6_4', text: 'מעל 6 שעות', low: 6,    mid: 8,   high: 12 },
    ],
  },

  // ── Phase 3: גבייה ותפעול ─────────────────────────────────────────────────
  {
    id: 'Q7',
    phase: 3,
    phaseName: PHASE_NAMES[3],
    text: 'כמה זמן בשבוע עובר על שליחת חשבוניות, תזכורות תשלום ומעקב?',
    options: [
      { id: 'Q7_1', text: 'כמעט אין',       low: 0,   mid: 0.25, high: 0.5 },
      { id: 'Q7_2', text: 'כשעה',           low: 0.5, mid: 1,    high: 1.5 },
      { id: 'Q7_3', text: '2–4 שעות',       low: 2,   mid: 3,    high: 4   },
      { id: 'Q7_4', text: 'יותר מ-4 שעות', low: 4,   mid: 5,    high: 7   },
    ],
  },
  {
    id: 'Q8',
    phase: 3,
    phaseName: PHASE_NAMES[3],
    text: 'מה שווי שעת עבודה שלך, לפי תעריף שירות או לפי מה שתרצי להרוויח?',
    microCopy: 'הכניסי לפי מה שנראה הגיוני, גם הערכה בסדר',
    options: [
      { id: 'Q8_1', text: 'עד ₪100',      low: 60,  mid: 80,  high: 100 },
      { id: 'Q8_2', text: '₪100–₪200',    low: 100, mid: 150, high: 200 },
      { id: 'Q8_3', text: '₪200–₪400',    low: 200, mid: 300, high: 400 },
      { id: 'Q8_4', text: 'מעל ₪400',     low: 400, mid: 500, high: 700 },
    ],
  },
  {
    id: 'Q9',
    phase: 3,
    phaseName: PHASE_NAMES[3],
    text: 'כמה זמן עובר בדרך כלל מרגע פנייה עד שמתעניינת מקבלת תשובה / הצעת מחיר?',
    options: [
      { id: 'Q9_1', text: 'אותו יום',         responseSpeed: 'FAST'      },
      { id: 'Q9_2', text: 'יום עד יומיים',    responseSpeed: 'MODERATE'  },
      { id: 'Q9_3', text: '3–7 ימים',         responseSpeed: 'SLOW'      },
      { id: 'Q9_4', text: 'יותר מ-7 ימים',   responseSpeed: 'VERY_SLOW' },
    ],
  },

  // ── Phase 4: תוצאה ────────────────────────────────────────────────────────
  {
    id: 'Q10',
    phase: 4,
    phaseName: PHASE_NAMES[4],
    text: 'מה הכי נכון לגביך עכשיו?',
    options: [
      { id: 'Q10_1', text: 'פניות ופולואפים נתקעים',                         resultType: 'FOLLOWUP'   },
      { id: 'Q10_2', text: 'בוזבזת יותר מדי זמן על תפעול ידני',              resultType: 'TIME'        },
      { id: 'Q10_3', text: 'הגבייה לוקחת יותר מדי אנרגיה',                   resultType: 'COLLECTION'  },
      { id: 'Q10_4', text: 'הכל עובר דרכי ואני לא מצליחה לצאת מזה',         resultType: 'CENTRALIZED' },
    ],
  },
];

export const TOTAL_QUESTIONS = SHORT_QUIZ_QUESTIONS.length;

/** Build a Record<questionId, option> from answers array for easy lookup */
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
