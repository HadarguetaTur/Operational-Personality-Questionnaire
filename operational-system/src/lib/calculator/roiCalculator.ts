import type { ROIInputs, ROIResult, ROIComponents, ResultType, AccuracyLevel, ResponseSpeed } from './types';

const CAP_THRESHOLD = 500_000;

export function calcROI(inputs: ROIInputs): ROIResult {
  // 1. Time cost
  const time_cost_low = round(inputs.weekly_manual_hours.low * inputs.hourly_value.low * 52);
  const time_cost_high = round(inputs.weekly_manual_hours.high * inputs.hourly_value.high * 52);

  // 2. Collection cost
  const collection_cost_low = round(inputs.weekly_collection_hours.low * inputs.hourly_value.low * 52);
  const collection_cost_high = round(inputs.weekly_collection_hours.high * inputs.hourly_value.high * 52);

  // 3. Opportunity at risk (Q9 delay_modifier excluded from financial calc)
  let opp_low = inputs.monthly_inquiries.low * 12 * inputs.at_risk_rate * inputs.close_rate * inputs.avg_customer_value.low;
  let opp_high = inputs.monthly_inquiries.high * 12 * inputs.at_risk_rate * inputs.close_rate * inputs.avg_customer_value.high;

  // Reduce when both key inputs are defaults (conservative guard)
  if (inputs.close_rate_is_default && inputs.at_risk_is_default) {
    opp_low *= 0.60;
    opp_high *= 0.60;
  }

  // Reduce for very small business signals
  if (inputs.monthly_inquiries.mid <= 7 && inputs.avg_customer_value.mid <= 1000) {
    opp_low *= 0.50;
    opp_high *= 0.50;
  }

  const opportunity_low = round(opp_low);
  const opportunity_high = round(opp_high);

  // 4. Totals
  const total_low = time_cost_low + collection_cost_low + opportunity_low;
  const total_high = time_cost_high + collection_cost_high + opportunity_high;

  // 5. Efficiency potential (conservative range)
  const efficiency_low = round(
    time_cost_low * 0.30 + collection_cost_low * 0.30 + opportunity_low * 0.20,
  );
  const efficiency_high = round(
    time_cost_high * 0.60 + collection_cost_high * 0.50 + opportunity_high * 0.40,
  );

  const components: ROIComponents = {
    time_cost_low,
    time_cost_high,
    collection_cost_low,
    collection_cost_high,
    opportunity_low,
    opportunity_high,
    total_low,
    total_high,
    efficiency_low,
    efficiency_high,
  };

  const show_cap_message = total_high > CAP_THRESHOLD;

  const result_type = determineResultType(components, inputs.primary_pain);
  const { level: accuracy_level, notes: confidence_notes } = computeAccuracy(inputs);
  const lead_score = computeLeadScore(components, inputs);

  return {
    components,
    result_type,
    accuracy_level,
    confidence_notes,
    lead_score,
    show_cap_message,
  };
}

function determineResultType(
  c: ROIComponents,
  primaryPain: ResultType,
): ResultType {
  // Q10 answer always wins
  if (primaryPain) return primaryPain;

  const opMid = (c.opportunity_low + c.opportunity_high) / 2;
  const timeMid = (c.time_cost_low + c.time_cost_high) / 2;
  const colMid = (c.collection_cost_low + c.collection_cost_high) / 2;
  const max = Math.max(opMid, timeMid, colMid);

  if (max === opMid) return 'FOLLOWUP';
  if (max === timeMid) return 'TIME';
  if (max === colMid) return 'COLLECTION';
  return 'CENTRALIZED';
}

function computeAccuracy(inputs: ROIInputs): { level: AccuracyLevel; notes: string } {
  const parts: string[] = [];
  let defaults = 0;

  if (inputs.close_rate_is_default) {
    defaults++;
    parts.push('שיעור סגירה: ברירת מחדל שמרנית (7%), נתון לא סופק');
  }
  if (inputs.at_risk_is_default) {
    defaults++;
    parts.push('אחוז פניות בסיכון: הנחה שמרנית (45%), נתון לא סופק');
  }
  if (inputs.hourly_value.low < 150) {
    parts.push('שווי שעה: סוגר תחתון (עד ₪150), משפיע על עלות הזמן');
  }

  const level: AccuracyLevel =
    defaults === 0 ? 'גבוהה' : defaults === 1 ? 'בינונית' : 'נמוכה';

  return { level, notes: parts.join(' | ') };
}

function computeLeadScore(c: ROIComponents, inputs: ROIInputs): number {
  let score = 0;
  const totalMid = (c.total_low + c.total_high) / 2;

  if (totalMid > 40_000) score += 40;
  else if (totalMid > 20_000) score += 25;
  else if (totalMid > 10_000) score += 15;

  if (inputs.dispersion_score >= 2.5) score += 20;
  if (inputs.at_risk_rate >= 0.50) score += 20;

  const rs: ResponseSpeed = inputs.response_speed;
  if (rs === 'SLOW') score += 10;
  if (rs === 'VERY_SLOW') score += 15;

  if (inputs.hourly_value.mid >= 200) score += 10;
  if (inputs.avg_customer_value.mid >= 2500) score += 10;

  return Math.min(score, 100);
}

function round(n: number): number {
  return Math.round(n / 100) * 100;
}

/** Formats a number as Israeli shekel: ₪12,000 */
export function formatILS(n: number): string {
  return `₪${n.toLocaleString('he-IL')}`;
}
