import type { RecommendedNextStep } from '@/lib/agents/understandingEngine';

// Output of Pain Mapper Agent
export interface PainAnalysis {
  exact_words: string;                       // הכאב בלשון הלקוחה בדיוק
  business_impact: string;                   // מה עולה לה (זמן/כסף/אנרגיה)
  depth: 'surface' | 'medium' | 'deep';     // עומק ההבנה
  is_process_pain: boolean;                  // כאב תהליכי vs. רגשי
  missing_info: string[];                    // מה עוד צריך להבין
}

// Output of Diagnostic Fit Agent
export interface FitAssessment {
  fit_score: number;                         // 0-100
  clarity_score: number;                     // 0-100
  recommended_next_step: RecommendedNextStep;
  fit_reasoning: string;                     // למה כן/לא מתאים
  key_gaps: string[];                        // מה ישנה את ההערכה
}

// Output of Offer Framing Agent
export interface OfferFrame {
  pain_mirror: string;                       // שיקוף הכאב במילות הלקוחה
  transformation: string;                    // תיאור החיים אחרי הפתרון
  call_type: 'diagnostic' | 'intro' | null;
  why_now: string;                           // מדוע כדאי לה עכשיו
}

// Output of Objection Agent
export interface ObjectionResponse {
  acknowledgment: string;                    // אישור תקף של החשש
  reframe: string;                           // מסגור מחדש
  soft_close: string;                        // הצעה ללא לחץ
}

// Aggregated specialist context — passed to Hebrew Writer
export interface SpecialistContext {
  painAnalysis?: PainAnalysis;
  fitAssessment?: FitAssessment;
  offerFrame?: OfferFrame;
  objectionResponse?: ObjectionResponse;
}
