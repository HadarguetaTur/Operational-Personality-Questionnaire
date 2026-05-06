import { UserState } from '@/types';
import { diagnosticConfig } from '@/config/diagnosticConfig';
import { normalizeScores, getRiskScore } from './scoring';

export const calculateBranches = (state: UserState): string[] => {
  const normalized = normalizeScores(state);

  const sortedMetrics = [...diagnosticConfig.metadata.metrics].sort((a, b) => {
    const riskA = getRiskScore(a, normalized[a]);
    const riskB = getRiskScore(b, normalized[b]);
    return riskB - riskA;
  });

  const newQuestions: string[] = [];

  const topMetric = sortedMetrics[0];
  const topBranch = diagnosticConfig.branchQuestions[topMetric];

  if (topBranch && topBranch.length > 0) {
    topBranch.forEach((q) => newQuestions.push(q.id));

    const secondMetric = sortedMetrics[1];
    const secondRisk = getRiskScore(secondMetric, normalized[secondMetric]);
    if (secondRisk >= 0.5) {
      const secondBranch = diagnosticConfig.branchQuestions[secondMetric];
      if (secondBranch && secondBranch.length > 0) {
        const firstId = secondBranch[0].id;
        if (!newQuestions.includes(firstId)) {
          newQuestions.push(firstId);
        }
      }
    }
  } else {
    const secondMetric = sortedMetrics[1];
    const secondBranch = diagnosticConfig.branchQuestions[secondMetric];
    if (secondBranch && secondBranch.length > 0) {
      secondBranch.forEach((q) => newQuestions.push(q.id));
    }
  }

  return newQuestions;
};
