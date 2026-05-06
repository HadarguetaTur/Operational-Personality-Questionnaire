import { MetricScores, MetricID, AnswerOption, UserState } from '../types';
import { diagnosticConfig } from '../config/diagnosticConfig';

export const initialScores: MetricScores = {
  Dependency_Index: 0,
  Cognitive_Load: 0,
  Process_Standardization: 0,
  Knowledge_Asset_Value: 0,
  Strategic_Maturity: 0
};

export const updateScores = (
  currentScores: MetricScores,
  currentMaxScores: MetricScores,
  answer: AnswerOption
): { scores: MetricScores; maxScores: MetricScores } => {
  const newScores = { ...currentScores };
  const newMaxScores = { ...currentMaxScores };

  diagnosticConfig.metadata.metrics.forEach((metric) => {
    const increment = answer.score[metric];
    if (increment !== undefined) {
      newScores[metric] += increment;
      // We assume max possible score per metric per question interaction is 5
      newMaxScores[metric] += 5; 
    }
  });

  return { scores: newScores, maxScores: newMaxScores };
};

export const normalizeScores = (state: UserState): MetricScores => {
  const normalized: MetricScores = { ...initialScores };
  
  diagnosticConfig.metadata.metrics.forEach((metric) => {
    const max = state.maxScores[metric];
    if (max > 0) {
      normalized[metric] = state.scores[metric] / max;
    } else {
      normalized[metric] = 0;
    }
  });
  
  return normalized;
};

// Helper to determine Risk Level (because Knowledge_Asset_Value High Score = Good, others High Score = Bad)
export const getRiskScore = (metric: MetricID, normalizedValue: number): number => {
  if (metric === "Knowledge_Asset_Value") {
    return 1 - normalizedValue;
  }
  return normalizedValue;
};
