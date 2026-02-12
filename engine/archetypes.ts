/**
 * Legacy facade: Management patterns are defined in patterns.ts.
 * This file re-exports for backward compatibility.
 */
import type { ManagementPattern, MetricScores } from '../types';
import { ARCHETYPES, MANAGEMENT_PATTERNS, determineArchetype as getPattern, determinePattern } from './patterns';

export { ARCHETYPES, MANAGEMENT_PATTERNS };

export function determineArchetype(normalized: MetricScores): ManagementPattern {
  return getPattern(normalized);
}

export { determinePattern };
