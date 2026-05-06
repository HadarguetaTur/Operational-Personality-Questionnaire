import { UserState } from '../types';
import { diagnosticConfig } from '../config/diagnosticConfig';
import { normalizeScores, getRiskScore } from './scoring';

/**
 * Calculate adaptive branch questions based on current risk profile.
 * Returns 2-3 question IDs from the top-risk metric(s).
 *
 * Logic:
 * 1. Always add 2 questions from the highest-risk metric (if branch exists).
 * 2. If the second-highest risk >= 0.50 and has a branch, add 1 more question.
 * 3. If the top metric has no branch, fall through to the second metric.
 */
export const calculateBranches = (state: UserState): string[] => {
  const normalized = normalizeScores(state);

  // Sort metrics by RISK score descending (copy array to avoid mutating config)
  const sortedMetrics = [...diagnosticConfig.metadata.metrics].sort((a, b) => {
    const riskA = getRiskScore(a, normalized[a]);
    const riskB = getRiskScore(b, normalized[b]);
    return riskB - riskA;
  });

  const newQuestions: string[] = [];

  // Try top metric first
  const topMetric = sortedMetrics[0];
  const topBranch = diagnosticConfig.branchQuestions[topMetric];

  if (topBranch && topBranch.length > 0) {
    topBranch.forEach(q => newQuestions.push(q.id));

    // Optionally add 1 from second metric if risk is high
    const secondMetric = sortedMetrics[1];
    const secondRisk = getRiskScore(secondMetric, normalized[secondMetric]);
    if (secondRisk >= 0.50) {
      const secondBranch = diagnosticConfig.branchQuestions[secondMetric];
      if (secondBranch && secondBranch.length > 0) {
        const firstId = secondBranch[0].id;
        if (!newQuestions.includes(firstId)) {
          newQuestions.push(firstId);
        }
      }
    }
  } else {
    // Fallback: if top metric has no branch, use second metric's full branch
    const secondMetric = sortedMetrics[1];
    const secondBranch = diagnosticConfig.branchQuestions[secondMetric];
    if (secondBranch && secondBranch.length > 0) {
      secondBranch.forEach(q => newQuestions.push(q.id));
    }
  }

  return newQuestions;
};
