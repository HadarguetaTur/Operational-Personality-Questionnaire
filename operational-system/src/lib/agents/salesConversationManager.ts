/**
 * salesConversationManager.ts — hybrid conversation orchestrator
 *
 * Replaces stateMachine.ts. Deterministic routing (same transition logic)
 * + decides which specialist agents to run per conversation state.
 *
 * The manager NEVER calls an LLM itself — it selects which specialists to run
 * and computes the next state. All LLM work is delegated to specialist agents
 * and the Hebrew Writer.
 */

import type { AgentAction } from '@/lib/ai/salesAgent';
import type { ClassifierIntent } from '@/lib/ai/classifier';
import type { ClassifierOutput } from '@/lib/ai/classifier';
import type { SpecialistContext } from './specialists/types';
import { runPainMapper } from './specialists/painMapperAgent';
import { runDiagnosticFit } from './specialists/diagnosticFitAgent';
import { runOfferFraming } from './specialists/offerFramingAgent';
import { runObjectionAgent } from './specialists/objectionAgent';
import type { RecommendedNextStep } from './understandingEngine';
import type { ConversationMessage } from '@/lib/db/conversationMessages';

export interface ManagerInput {
  currentState: string;
  classifierOutput: ClassifierOutput;
  context: Record<string, unknown>;
  history: ConversationMessage[];
  newMessage: string;
}

export interface ManagerOutput {
  nextState: string;
  forcedAction?: AgentAction;
  reason: string;
  specialistContext: SpecialistContext;
}

const TERMINAL_STATES = new Set(['booking', 'closed', 'escalated', 'irrelevant', 'spam', 'homework']);

function getRecommendedStep(context: Record<string, unknown>): RecommendedNextStep | null {
  const v = context.recommended_next_step;
  return typeof v === 'string' ? (v as RecommendedNextStep) : null;
}

function getPendingBookingType(context: Record<string, unknown>): 'diagnostic' | 'intro' {
  return context.pending_booking_type === 'intro' ? 'intro' : 'diagnostic';
}

// Determines next state — identical logic to old stateMachine.ts
function computeNextState(
  currentState: string,
  intent: ClassifierIntent,
  shouldHandoff: boolean,
  isOptOut: boolean,
  shouldOfferBooking: boolean,
  context: Record<string, unknown>,
): { nextState: string; forcedAction?: AgentAction; reason: string } {
  // Global overrides
  if (isOptOut) {
    return { nextState: 'irrelevant', forcedAction: 'mark_irrelevant', reason: 'opt_out' };
  }
  if (intent === 'spam') {
    return { nextState: 'spam', forcedAction: 'mark_spam', reason: 'spam intent' };
  }
  if (shouldHandoff || intent === 'frustration') {
    return { nextState: 'escalated', forcedAction: 'human_handoff', reason: 'frustration/handoff' };
  }
  if (intent === 'not_relevant') {
    return { nextState: 'irrelevant', forcedAction: 'mark_irrelevant', reason: 'not_relevant intent' };
  }
  if (TERMINAL_STATES.has(currentState)) {
    return { nextState: currentState, reason: 'terminal state — no transition' };
  }

  // ── Buying-signal fast lane ────────────────────────────────────────────────
  // A clear readiness/interest signal (or explicit meeting request), once we
  // already know the pain, jumps straight to offering the free intro — no need
  // to grind through summary/vision. Stops the bot from over-interrogating a
  // lead who is already sold.
  const knowsChallenge =
    typeof context.main_challenge === 'string' && context.main_challenge.length > 0;
  const notDisqualified =
    context.problem_in_hadar_domain !== false && context.active_business !== false;
  if (
    (shouldOfferBooking || intent === 'meeting_request') &&
    knowsChallenge &&
    notDisqualified &&
    currentState !== 'awaiting_confirmation'
  ) {
    return {
      nextState: 'awaiting_confirmation',
      forcedAction: 'propose_intro_call',
      reason: 'buying signal + pain known → propose intro',
    };
  }

  switch (currentState) {
    case 'initial':
      return { nextState: 'discovery', reason: 'initial → discovery' };

    case 'discovery': {
      const feelingsOnly = context.feelings_only === true;
      if (feelingsOnly) return { nextState: 'discovery', reason: 'feelings_only — stay' };
      if (context.problem_in_hadar_domain === false) {
        return { nextState: 'irrelevant', forcedAction: 'mark_irrelevant', reason: 'not in domain' };
      }
      if (intent === 'process_described' || intent === 'discovery_answer' || intent === 'chaos_detected') {
        return { nextState: 'diagnostic', reason: 'process/discovery data → diagnostic' };
      }
      return { nextState: 'discovery', reason: 'stay in discovery' };
    }

    case 'diagnostic': {
      const recommended = getRecommendedStep(context);
      if (recommended && recommended !== 'continue_diagnostic') {
        if (recommended === 'D_NOT_RELEVANT') {
          return { nextState: 'irrelevant', forcedAction: 'mark_irrelevant', reason: 'D_NOT_RELEVANT' };
        }
        return { nextState: 'summary', reason: `clarity >= 80 → summary (${recommended})` };
      }
      return { nextState: 'diagnostic', reason: 'continue_diagnostic' };
    }

    case 'summary': {
      if (intent === 'affirmative') return { nextState: 'vision', reason: 'summary confirmed' };
      if (intent === 'chaos_detected') return { nextState: 'diagnostic', reason: 'major correction' };
      return { nextState: 'summary', reason: 'awaiting confirmation' };
    }

    case 'vision': {
      const recommended = getRecommendedStep(context);
      if (recommended === 'A_DIAGNOSTIC') {
        return { nextState: 'awaiting_confirmation', forcedAction: 'propose_diagnostic_call', reason: 'A_DIAGNOSTIC' };
      }
      if (recommended === 'B_INTRO_CALL') {
        return { nextState: 'awaiting_confirmation', forcedAction: 'propose_intro_call', reason: 'B_INTRO_CALL' };
      }
      if (recommended === 'C_HOMEWORK') {
        return { nextState: 'homework', forcedAction: 'assign_homework', reason: 'C_HOMEWORK' };
      }
      if (recommended === 'D_NOT_RELEVANT') {
        return { nextState: 'irrelevant', forcedAction: 'mark_irrelevant', reason: 'D_NOT_RELEVANT' };
      }
      if (intent === 'affirmative') {
        return { nextState: 'awaiting_confirmation', forcedAction: 'propose_intro_call', reason: 'affirmative → default intro' };
      }
      return { nextState: 'vision', reason: 'waiting engagement' };
    }

    case 'awaiting_confirmation': {
      if (intent === 'affirmative' || intent === 'meeting_request') {
        const bookingType = getPendingBookingType(context);
        const bookingAction: AgentAction = bookingType === 'diagnostic' ? 'book_diagnostic_call' : 'book_intro_call';
        return { nextState: 'booking', forcedAction: bookingAction, reason: `confirmed → ${bookingAction}` };
      }
      if (intent === 'objection' || intent === 'price_inquiry') {
        return { nextState: 'objection', reason: 'objection at confirmation' };
      }
      return { nextState: 'awaiting_confirmation', reason: 'awaiting confirmation' };
    }

    case 'objection': {
      if (intent === 'affirmative') return { nextState: 'awaiting_confirmation', reason: 'objection resolved' };
      if (intent === 'objection' || intent === 'price_inquiry') {
        return { nextState: 'objection', reason: 'continued objection' };
      }
      return { nextState: 'awaiting_confirmation', reason: 'ambiguous → back to confirmation' };
    }

    case 'booking':
      return { nextState: 'closed', reason: 'post-booking → closed' };

    default:
      return { nextState: 'discovery', reason: `unknown state → reset` };
  }
}

// Decides which specialist agents to run for a given state
async function runSpecialists(
  currentState: string,
  nextState: string,
  input: ManagerInput,
): Promise<SpecialistContext> {
  const ctx: SpecialistContext = {};

  // Pain Mapper: discovery and diagnostic
  const needsPainMapper = ['discovery', 'diagnostic'].includes(currentState);

  // Diagnostic Fit: diagnostic and summary
  const needsDiagnosticFit = ['diagnostic', 'summary'].includes(currentState);

  // Offer Framing: vision and awaiting_confirmation
  const needsOfferFraming = ['vision', 'awaiting_confirmation'].includes(nextState) ||
    ['vision', 'awaiting_confirmation'].includes(currentState);

  // Objection: objection state
  const needsObjection = currentState === 'objection';

  // Run Pain Mapper + Diagnostic Fit in parallel when both needed
  if (needsPainMapper && needsDiagnosticFit) {
    const [painAnalysis, fitAssessment] = await Promise.all([
      runPainMapper({ history: input.history, newMessage: input.newMessage, context: input.context }),
      runDiagnosticFit({ history: input.history, context: input.context }),
    ]);
    if (painAnalysis) ctx.painAnalysis = painAnalysis;
    if (fitAssessment) ctx.fitAssessment = fitAssessment;
  } else if (needsPainMapper) {
    const painAnalysis = await runPainMapper({
      history: input.history,
      newMessage: input.newMessage,
      context: input.context,
    });
    if (painAnalysis) ctx.painAnalysis = painAnalysis;
  } else if (needsDiagnosticFit) {
    const fitAssessment = await runDiagnosticFit({ history: input.history, context: input.context });
    if (fitAssessment) ctx.fitAssessment = fitAssessment;
  }

  if (needsOfferFraming) {
    const offerFrame = await runOfferFraming({ history: input.history, context: input.context });
    if (offerFrame) ctx.offerFrame = offerFrame;
  }

  if (needsObjection) {
    const objectionResponse = await runObjectionAgent({
      history: input.history,
      newMessage: input.newMessage,
      objectionType: input.classifierOutput.objection_type,
      context: input.context,
    });
    if (objectionResponse) ctx.objectionResponse = objectionResponse;
  }

  return ctx;
}

export async function runSalesConversationManager(input: ManagerInput): Promise<ManagerOutput> {
  const { currentState, classifierOutput, context } = input;

  const stateResult = computeNextState(
    currentState,
    classifierOutput.intent,
    classifierOutput.should_handoff,
    classifierOutput.is_opt_out,
    classifierOutput.should_offer_booking,
    context,
  );

  const { nextState, forcedAction, reason } = stateResult;

  // Only run specialists when not going to a terminal state or override
  const specialistContext =
    !forcedAction && !TERMINAL_STATES.has(nextState)
      ? await runSpecialists(currentState, nextState, input)
      : {};

  console.log(
    `[manager] ${currentState} → ${nextState}${forcedAction ? ` (${forcedAction})` : ''} | agents: ${Object.keys(specialistContext).join(',') || 'none'}`,
  );

  return { nextState, forcedAction, reason, specialistContext };
}
