/**
 * stateMachine.ts — deterministic state transition engine (P4)
 *
 * Given the current state and the classifier's intent, returns the next state
 * and (optionally) a forced action. The LLM response writer then uses this
 * output to craft the actual reply — it does NOT decide the transition.
 */

import type { AgentAction, ConversationState, VALID_STATES } from '@/lib/ai/salesAgent';
import type { ClassifierIntent } from '@/lib/ai/classifier';

export interface StateMachineInput {
  currentState: string;
  intent: ClassifierIntent;
  shouldOfferBooking: boolean;
  shouldHandoff: boolean;
  isOptOut: boolean;
  context: Record<string, unknown>;
}

export interface StateMachineOutput {
  nextState: string;
  forcedAction?: AgentAction;
  reason: string;
}

const TERMINAL_STATES = new Set(['booking', 'closed', 'escalated', 'irrelevant', 'spam']);

/**
 * State transition table.
 * Priority (highest first):
 *   1. opt_out → irrelevant
 *   2. spam → spam
 *   3. shouldHandoff → escalated
 *   4. meeting_request / shouldOfferBooking → booking
 *   5. not_relevant → irrelevant
 *   6. Intent-based transitions per current state
 */
export function runStateMachine(input: StateMachineInput): StateMachineOutput {
  const { currentState, intent, shouldOfferBooking, shouldHandoff, isOptOut, context } = input;

  // ── Global overrides (highest priority) ─────────────────────────────────────

  if (isOptOut) {
    return { nextState: 'irrelevant', forcedAction: 'mark_irrelevant', reason: 'opt_out detected' };
  }
  if (intent === 'spam') {
    return { nextState: 'spam', forcedAction: 'mark_spam', reason: 'spam intent' };
  }
  if (shouldHandoff || intent === 'frustration') {
    return { nextState: 'escalated', forcedAction: 'human_handoff', reason: `shouldHandoff=${shouldHandoff}, intent=${intent}` };
  }
  if (intent === 'meeting_request' || shouldOfferBooking) {
    return { nextState: 'booking', forcedAction: 'book_meeting', reason: `intent=${intent}, shouldOfferBooking=${shouldOfferBooking}` };
  }
  if (intent === 'not_relevant') {
    return { nextState: 'irrelevant', forcedAction: 'mark_irrelevant', reason: 'not_relevant intent' };
  }

  // Don't transition out of terminal states
  if (TERMINAL_STATES.has(currentState)) {
    return { nextState: currentState, reason: 'terminal state — no transition' };
  }

  // ── Intent-based transitions per current state ───────────────────────────────

  switch (currentState) {
    case 'initial':
    case 'discovery':
    case 'qualifying': {
      if (intent === 'discovery_answer') {
        // Any answer to a discovery question → move toward pitching
        const hasChallenge = Boolean(context.main_challenge);
        return {
          nextState: hasChallenge ? 'pitching' : 'qualifying',
          reason: `discovery_answer, main_challenge=${hasChallenge}`,
        };
      }
      if (intent === 'price_inquiry') {
        // Price question in early stage → answer and move to pitching
        return { nextState: 'pitching', reason: 'price_inquiry in discovery → pitch with pricing context' };
      }
      if (intent === 'objection') {
        return { nextState: 'objection', reason: 'objection in discovery' };
      }
      if (intent === 'affirmative') {
        return { nextState: 'pitching', reason: 'affirmative in discovery → advance' };
      }
      if (intent === 'info_request') {
        return { nextState: 'discovery', reason: 'info_request → brief answer + discovery question' };
      }
      return { nextState: currentState === 'initial' ? 'discovery' : currentState, reason: 'other intent — stay in discovery' };
    }

    case 'pitching': {
      if (intent === 'affirmative') {
        return { nextState: 'booking', forcedAction: 'book_meeting', reason: 'affirmative to pitch → book' };
      }
      if (intent === 'objection' || intent === 'price_inquiry') {
        return { nextState: 'objection', reason: `${intent} during pitching` };
      }
      if (intent === 'info_request') {
        return { nextState: 'pitching', reason: 'info during pitching → answer and re-offer' };
      }
      if (intent === 'other' || intent === 'discovery_answer') {
        // Treat as soft interest — stay in pitching and re-offer
        return { nextState: 'pitching', reason: 'ambiguous during pitching — re-offer' };
      }
      return { nextState: 'pitching', reason: 'unhandled intent during pitching' };
    }

    case 'objection': {
      if (intent === 'affirmative') {
        return { nextState: 'booking', forcedAction: 'book_meeting', reason: 'affirmative after objection → book' };
      }
      if (intent === 'objection' || intent === 'price_inquiry') {
        // Still objecting — stay in objection (AL-4 in antiLoopGuard will catch repeated loops)
        return { nextState: 'objection', reason: 'continued objection' };
      }
      if (intent === 'other') {
        return { nextState: 'pitching', reason: 'ambiguous after objection — try pitch again' };
      }
      return { nextState: 'objection', reason: 'unresolved objection' };
    }

    case 'booking': {
      return { nextState: 'closed', reason: 'post-booking → closed' };
    }

    case 'closed': {
      return { nextState: 'closed', reason: 'already closed' };
    }

    case 'escalated': {
      return { nextState: 'escalated', reason: 'escalated — human handles it' };
    }

    default:
      return { nextState: 'discovery', reason: `unknown state '${currentState}' — reset to discovery` };
  }
}
