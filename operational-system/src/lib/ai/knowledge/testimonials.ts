export interface Testimonial {
  name: string;
  industry: string;
  pain_category: string;
  quote: string;
  approved: boolean;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'לאה סוליטר',
    industry: 'אדריכלות',
    pain_category: 'overload',
    quote: 'הדר האירה דברים שלא שמתי אליהם לב, ובנתה אוטומציות שהקלו עליי את תהליך העבודה.',
    approved: true,
  },
  {
    name: 'נעמי',
    industry: 'מכון וולפסון',
    pain_category: 'process',
    quote: 'התמודדה עם כל האתגרים בסבלנות, בהתמדה וביצירתיות. פעלה ביושר ובהגינות מלאה.',
    approved: true,
  },
  {
    name: 'איילה עיצובים',
    industry: 'עיצוב',
    pain_category: 'trust',
    quote: 'הרגשנו שאכפת לה שהכל יעבוד. בדקה הלוך חזור עד שהכל היה בדיוק.',
    approved: true,
  },
  {
    name: 'מסד גרופ',
    industry: 'תפעול',
    pain_category: 'overload',
    quote: 'הפכת את עולמנו לאוטומטי ופחות סיזיפי.',
    approved: true,
  },
];

export function selectTestimonial(
  painCategory?: string,
  businessType?: string,
): Testimonial | null {
  const approved = TESTIMONIALS.filter((t) => t.approved);
  if (approved.length === 0) return null;

  if (painCategory) {
    const match = approved.find((t) => t.pain_category === painCategory);
    if (match) return match;
  }

  if (businessType) {
    const match = approved.find((t) =>
      businessType.includes(t.industry) || t.industry.includes(businessType),
    );
    if (match) return match;
  }

  return approved[0];
}

export function formatTestimonialForPrompt(t: Testimonial): string {
  return `"${t.quote}" (${t.name}, ${t.industry})`;
}
