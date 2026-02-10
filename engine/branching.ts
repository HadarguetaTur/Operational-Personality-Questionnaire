import { UserState, MetricID } from '../types';
import { diagnosticConfig } from '../config/diagnosticConfig';
import { normalizeScores, getRiskScore } from './scoring';

export const calculateBranches = (state: UserState): string[] => {
  const normalized = normalizeScores(state);
  
  // Sort metrics by RISK score descending
  const sortedMetrics = diagnosticConfig.metadata.metrics.sort((a, b) => {
    const riskA = getRiskScore(a, normalized[a]);
    const riskB = getRiskScore(b, normalized[b]);
    return riskB - riskA;
  });

  const topMetric = sortedMetrics[0];
  const secondMetric = sortedMetrics[1];
  
  const newQuestions: string[] = [];
  
  // Add top metric branch
  if (diagnosticConfig.branchQuestions[topMetric]) {
    diagnosticConfig.branchQuestions[topMetric].forEach(q => newQuestions.push(q.id));
  }
  
  // Add second metric branch if risk is significant (>= 0.20)
  const secondRisk = getRiskScore(secondMetric, normalized[secondMetric]);
  if (secondRisk >= 0.20 && diagnosticConfig.branchQuestions[secondMetric]) {
     diagnosticConfig.branchQuestions[secondMetric].forEach(q => newQuestions.push(q.id));
  }

  // Deduplicate and limit (though prompt says max 2 branches, implemented by picking top 2 metrics)
  return Array.from(new Set(newQuestions));
};