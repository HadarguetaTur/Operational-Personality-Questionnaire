/**
 * stateMachine.ts — deterministic state transition engine (v4)
 *
 * Core Doctrine: states track WHERE we are. The understandingEngine decides
 * WHEN to advance (via recommended_next_step in context).
 *
 * The stateMachine does NOT decide when the bot has understood enough —
 * it reads context.recommended_next_step (set by understandingEngine) and acts on it.
 */

import type { AgentAction } from '@/lib/ai/salesAgent';
import type { ClassifierIntent } from '@/lib/ai/classifier';
import type { RecommendedNextStep } from './understandingEngine';

export interface StateMachineInput {
  currentState: string;
  intent: ClassifierIntent;
  shouldOfferBooking: boolean; // always false from pipeline (understandingEngine drives booking)
  shouldHandoff: boolean;
  isOptOut: boolean;
  context: Record<string, unknown>;
}

export interface StateMachineOutput {
  nextState: string;
  forcedAction?: AgentAction;
  reason: string;
}

const TERMINAL_STATES = new Set(['booking', 'closed', 'escalated', 'irrelevant', 'spam', 'homework']);

function getRecommendedStep(context: Record<string, unknown>): RecommendedNextStep | null {
  const v = context.recommended_next_step;
  return typeof v === 'string' ? (v as RecommendedNextStep) : null;
}

function getPendingBookingType(context: Record<string, unknown>): 'diagnostic' | 'intro' {
  return context.pending_booking_type === 'intro' ? 'intro' : 'diagnostic';
}

export function runStateMachine(input: StateMachineInput): StateMachineOutput {
  const { currentState, intent, shouldHandoff, isOptOut, context } = input;

  // ── Global overrides (highest priority) ──────────────────────────────────

  if (isOptOut) {
    return { nextState: 'irrelevant', forcedAction: 'mark_irrelevant', reason: 'opt_out' };
  }
  if (intent === 'spam') {
    return { nextState: 'spam', forcedAction: 'mark_spam', reason: 'spam intent' };
  }
  if (shouldHandoff || intent === 'frustration') {
    return { nextState: 'escalated', forcedAction: 'human_handoff', reason: `frustration/handoff` };
  }
  if (intent === 'not_relevant') {
    return { nextState: 'irrelevant', forcedAction: 'mark_irrelevant', reason: 'not_relevant intent' };
  }

  // Don't transition out of terminal states
  if (TERMINAL_STATES.has(currentState)) {
    return { nextState: currentState, reason: 'terminal state — no transition' };
  }

  // ── Intent-based transitions per state ───────────────────────────────────

  switch (currentState) {
    case 'initial': {
      return { nextState: 'discovery', reason: 'initial → discovery' };
    }

    case 'discovery': {
      // Core Doctrine: don't advance on feelings alone — wait for real process data
      const feelingsOnly = context.feelings_only === true;
      if (feelingsOnly) {
        return { nextState: 'discovery', reason: 'feelings_only — stay in discovery, convert to fact' };
      }
      // Note: intent === 'not_relevant' is already caught by the global override above.
      if (context.problem_in_hadar_domain === false) {
        return { nextState: 'irrelevant', forcedAction: 'mark_irrelevant', reason: 'not in domain' };
      }
      if (intent === 'process_described' || intent === 'discovery_answer') {
        return { nextState: 'diagnostic', reason: 'process/discovery data → enter diagnostic' };
      }
      if (intent === 'chaos_detected') {
        return { nextState: 'diagnostic', reason: 'chaos detected → enter diagnostic to investigate' };
      }
      if (intent === 'info_request') {
        return { nextState: 'discovery', reason: 'info request — answer and continue discovery' };
      }
      return { nextState: 'discovery', reason: 'other intent — stay in discovery' };
    }

    case 'diagnostic': {
      const recommended = getRecommendedStep(context);
      // understandingEngine says we know enough → go to summary
      if (recommended && recommended !== 'continue_diagnostic') {
        if (recommended === 'D_NOT_RELEVANT') {
          return { nextState: 'irrelevant', forcedAction: 'mark_irrelevant', reason: 'D_NOT_RELEVANT from engine' };
        }
        return { nextState: 'summary', reason: `clarity >= 80 + bottleneck → summary (${recommended})` };
      }
      // Stay in diagnostic and keep asking
      return { nextState: 'diagnostic', reason: `continue_diagnostic — clarity not sufficient yet` };
    }

    case 'summary': {
      // Core Doctrine: must have explicit confirmation before moving to vision
      if (intent === 'affirmative') {
        return { nextState: 'vision', reason: 'summary confirmed → vision' };
      }
      if (intent === 'chaos_detected') {
        // Major correction — go back to diagnostic for one question then return
        return { nextState: 'diagnostic', reason: 'major correction in summary → back to diagnostic' };
      }
      if (intent === 'discovery_answer' || intent === 'process_described') {
        // Small correction — stay in summary, writer will revise the summary
        return { nextState: 'summary', reason: 'small correction — update context, re-summarize' };
      }
      // Any other response — keep waiting for confirmation
      return { nextState: 'summary', reason: 'awaiting explicit confirmation of summary' };
    }

    case 'vision': {
      const recommended = getRecommendedStep(context);
      if (recommended === 'A_DIAGNOSTIC') {
        return {
          nextState: 'awaiting_confirmation',
          forcedAction: 'propose_diagnostic_call',
          reason: 'A_DIAGNOSTIC → propose diagnostic call',
        };
      }
      if (recommended === 'B_INTRO_CALL') {
        return {
          nextState: 'awaiting_confirmation',
          forcedAction: 'propose_intro_call',
          reason: 'B_INTRO_CALL → propose intro zoom',
        };
      }
      if (recommended === 'C_HOMEWORK') {
        return {
          nextState: 'homework',
          forcedAction: 'assign_homework',
          reason: 'C_HOMEWORK → assign chaos journal',
        };
      }
      if (recommended === 'D_NOT_RELEVANT') {
        return { nextState: 'irrelevant', forcedAction: 'mark_irrelevant', reason: 'D_NOT_RELEVANT' };
      }
      // If affirmative to vision (engaged) but no recommendation yet — default to intro
      if (intent === 'affirmative') {
        return {
          nextState: 'awaiting_confirmation',
          forcedAction: 'propose_intro_call',
          reason: 'affirmative in vision, no recommendation → default to intro',
        };
      }
      return { nextState: 'vision', reason: 'waiting for engagement in vision' };
    }

    case 'awaiting_confirmation': {
      if (intent === 'affirmative' || intent === 'meeting_request') {
        const bookingType = getPendingBookingType(context);
        const bookingAction: AgentAction =
          bookingType === 'diagnostic' ? 'book_diagnostic_call' : 'book_intro_call';
        return {
          nextState: 'booking',
          forcedAction: bookingAction,
          reason: `confirmed → ${bookingAction}`,
        };
      }
      if (intent === 'objection' || intent === 'price_inquiry') {
        return { nextState: 'objection', reason: 'objection at confirmation → handle objection' };
      }
      // Keep waiting
      return { nextState: 'awaiting_confirmation', reason: 'awaiting explicit confirmation' };
    }

    case 'objection': {
      if (intent === 'affirmative') {
        // Restore awaiting_confirmation with same pending_booking_type
        return { nextState: 'awaiting_confirmation', reason: 'objection resolved → back to confirmation' };
      }
      if (intent === 'objection' || intent === 'price_inquiry') {
        // AL-4 in antiLoopGuard handles objection_count >= 2 → request_followup
        return { nextState: 'objection', reason: 'continued objection' };
      }
      if (intent === 'other' || intent === 'info_request') {
        return { nextState: 'awaiting_confirmation', reason: 'ambiguous after objection — back to confirmation' };
      }
      return { nextState: 'objection', reason: 'unresolved objection' };
    }

    case 'booking': {
      return { nextState: 'closed', reason: 'post-booking → closed' };
    }

    default:
      return { nextState: 'discovery', reason: `unknown state '${currentState}' — reset to discovery` };
  }
}
