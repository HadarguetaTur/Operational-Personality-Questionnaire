import { UserState, ScaleStage } from '../types';

/**
 * Scale from Q1 (scaleContext) when present; otherwise defaults to small_team.
 */
export function inferScale(state: UserState): ScaleStage {
  if (state.scaleContext) {
    return state.scaleContext;
  }
  // Fallback: if no Q1 context (shouldn't happen in normal flow), default to small_team
  return 'small_team';
}

export const SCALE_LABELS: Record<ScaleStage, string> = {
  solo: 'פעילות סולו',
  small_team: 'צוות קטן',
  growing_team: 'צוות צומח'
};
