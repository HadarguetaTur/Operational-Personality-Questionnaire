export type ResultType = 'FOLLOWUP' | 'TIME' | 'COLLECTION' | 'CENTRALIZED';
export type AccuracyLevel = 'גבוהה' | 'בינונית' | 'נמוכה';
export type ResponseSpeed = 'FAST' | 'MODERATE' | 'SLOW' | 'VERY_SLOW';

export interface BracketValues {
  low: number;
  mid: number;
  high: number;
}

export interface ROIInputs {
  monthly_inquiries: BracketValues;
  avg_customer_value: BracketValues;
  close_rate: number;
  close_rate_is_default: boolean;
  at_risk_rate: number;
  at_risk_is_default: boolean;
  dispersion_score: number;
  weekly_manual_hours: { low: number; high: number };
  weekly_collection_hours: { low: number; high: number };
  hourly_value: BracketValues;
  response_speed: ResponseSpeed;
  primary_pain: ResultType;
}

export interface ROIComponents {
  time_cost_low: number;
  time_cost_high: number;
  collection_cost_low: number;
  collection_cost_high: number;
  opportunity_low: number;
  opportunity_high: number;
  total_low: number;
  total_high: number;
  efficiency_low: number;
  efficiency_high: number;
}

export interface ROIResult {
  components: ROIComponents;
  result_type: ResultType;
  accuracy_level: AccuracyLevel;
  confidence_notes: string;
  lead_score: number;
  show_cap_message: boolean;
}
