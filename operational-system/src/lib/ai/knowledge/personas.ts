export interface BusinessPersona {
  id: string;
  keywords: string[];
  typicalPain: string;
  discoveryQuestion: string;
}

export const BUSINESS_PERSONAS: BusinessPersona[] = [
  {
    id: 'therapist',
    keywords: ['טיפול', 'מטפלת', 'פסיכולוג', 'קליניקה', 'רפואה משלימה'],
    typicalPain: 'מעקב אחרי לקוחות אחרי הטיפול',
    discoveryQuestion: 'מה קורה אחרי הטיפול — את עוקבת אחרי הלקוחות?',
  },
  {
    id: 'designer',
    keywords: ['עיצוב', 'מעצבת', 'גרפיקה', 'ברנדינג'],
    typicalPain: 'ניהול briefs ואישורים',
    discoveryQuestion: 'איך את מנהלת briefs ואישורים עם לקוחות?',
  },
  {
    id: 'coach',
    keywords: ['אימון', 'מאמנת', 'קואצ\'', 'הדרכה'],
    typicalPain: 'לידים חדשים שלא מגיעים לסגירה',
    discoveryQuestion: 'איך מתעניינות חדשות מגיעות אלייך?',
  },
  {
    id: 'consultant',
    keywords: ['ייעוץ', 'יועצת', 'ליווי'],
    typicalPain: 'תיאום פגישות ומעקב',
    discoveryQuestion: 'איך את מנהלת את תיאום הפגישות והמעקב?',
  },
];

export function matchPersona(businessType?: string): BusinessPersona | null {
  if (!businessType) return null;
  const lower = businessType.toLowerCase();
  return (
    BUSINESS_PERSONAS.find((p) =>
      p.keywords.some((k) => lower.includes(k)),
    ) ?? null
  );
}
