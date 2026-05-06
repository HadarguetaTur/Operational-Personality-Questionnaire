import { UserState, ScaleStage } from '@/types';

export function inferScale(state: UserState): ScaleStage {
  if (state.scaleContext) {
    return state.scaleContext;
  }
  return 'small_team';
}

export const SCALE_LABELS: Record<ScaleStage, string> = {
  solo: 'פעילות סולו',
  small_team: 'צוות קטן',
  growing_team: 'צוות צומח',
};
