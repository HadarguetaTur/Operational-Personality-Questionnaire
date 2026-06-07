/**
 * understandingEngine.ts
 *
 * Core Doctrine: תחושות אינן עובדות. פתרונות אינם אבחנה.
 * לא עוברים לשלב הבא לפני שיש מספיק הבנה.
 *
 * Computes two independent scores per conversation turn:
 *   fit_score    — is this lead a good match for Hadar?
 *   clarity_score — does the bot understand enough to summarize and recommend?
 *
 * The stateMachine does NOT decide when to advance —
 * it reads recommended_next_step from the context (set here) and acts on it.
 */

export type RecommendedNextStep =
  | 'A_DIAGNOSTIC'   // paid 60-min diagnostic session (350₪)
  | 'B_INTRO_CALL'   // free 20-min zoom intro
  | 'C_HOMEWORK'     // chaos journal assignment
  | 'D_NOT_RELEVANT' // outside Hadar's domain or no active business
  | 'E_BLOCK'        // spam / aggressive / dismissive
  | 'continue_diagnostic'; // not enough understanding yet — keep asking

export interface UnderstandingContext {
  // fit signals
  active_business?: boolean | null;
  problem_in_hadar_domain?: boolean | null;
  process_exists?: boolean | null;
  open_to_guidance?: boolean | null;
  // clarity signals
  reason_for_reaching_out?: string | null;
  business_type?: string | null;
  main_challenge?: string | null;
  process_flow_known?: boolean | null;
  gap_identified?: boolean | null;
  // additional diagnostic signals
  bottleneck_identified?: string | null;
  has_repeatability?: boolean | null;
}

/**
 * fit_score (0–100): Is this lead a good match for Hadar?
 * 4 criteria × 25 points each.
 */
export function computeFitScore(ctx: UnderstandingContext): number {
  let score = 0;
  if (ctx.active_business === true)         score += 25;
  if (ctx.problem_in_hadar_domain === true) score += 25;
  if (ctx.process_exists === true)          score += 25;
  if (ctx.open_to_guidance === true)        score += 25;
  return score;
}

/**
 * clarity_score (0–100): Does the bot understand enough to summarize and recommend?
 * 5 criteria × 20 points each.
 */
export function computeClarityScore(ctx: UnderstandingContext): number {
  let score = 0;
  if (ctx.reason_for_reaching_out != null && ctx.reason_for_reaching_out !== '')  score += 20;
  if (ctx.business_type != null && ctx.business_type !== '')                       score += 20;
  if (ctx.main_challenge != null && ctx.main_challenge !== '')                     score += 20;
  if (ctx.process_flow_known === true)                                             score += 20;
  if (ctx.gap_identified === true)                                                 score += 20;
  return score;
}

/**
 * Returns true when the bot has enough clarity AND a specific bottleneck/process
 * to justify moving to the summary stage.
 *
 * Rule: clarity_score >= 80 AND (bottleneck OR process OR repeatability known)
 */
export function isReadyToSummarize(ctx: UnderstandingContext): boolean {
  const clarity = computeClarityScore(ctx);
  if (clarity < 80) return false;
  return (
    (ctx.bottleneck_identified != null && ctx.bottleneck_identified !== '') ||
    ctx.process_exists === true ||
    ctx.has_repeatability === true
  );
}

/**
 * Determines the recommended next step based on both scores.
 * Called after every classifier run; result stored in context.recommended_next_step.
 */
export function getRecommendedNextStep(ctx: UnderstandingContext): RecommendedNextStep {
  if (!isReadyToSummarize(ctx)) return 'continue_diagnostic';

  // Hard disqualifiers first
  if (ctx.problem_in_hadar_domain === false || ctx.active_business === false) {
    return 'D_NOT_RELEVANT';
  }

  const fit = computeFitScore(ctx);
  const clarity = computeClarityScore(ctx);

  if (fit >= 75 && clarity >= 80 && ctx.open_to_guidance === true) return 'A_DIAGNOSTIC';
  if (fit >= 50 && clarity >= 60) return 'B_INTRO_CALL';
  return 'C_HOMEWORK';
}
