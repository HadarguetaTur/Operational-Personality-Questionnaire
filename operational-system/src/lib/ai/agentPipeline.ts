/**
 * agentPipeline.ts — orchestrates the new 3-stage pipeline (P4)
 *
 * Stage 1: Classifier (gpt-4.1-mini) — intent, facts, flags
 * Stage 2: State Machine (deterministic) — next state, forced action
 * Stage 3: Anti-Loop Guard (deterministic) — override if loop detected
 * Stage 4: Response Writer (gpt-4.1-mini) — writes the actual reply
 *
 * Returns AgentOutput — same interface as the legacy runSalesAgent.
 */

import { runClassifier } from './classifier';
import { runStateMachine } from '@/lib/agents/stateMachine';
import {
  runAntiLoopGuard,
  buildDiscoveryNudge,
  updateAntiLoopCounters,
  type LoopContext,
} from '@/lib/agents/antiLoopGuard';
import {
  computeFitScore,
  computeClarityScore,
  getRecommendedNextStep,
} from '@/lib/agents/understandingEngine';
import { runResponseWriter } from './responseWriter';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ConversationMessage } from '@/lib/db/conversationMessages';
import type { AgentOutput, AgentAction } from './salesAgent';

// Backward-compat: map removed states to their replacements
const LEGACY_STATE_MAP: Record<string, string> = {
  qualifying: 'diagnostic',
  pitching: 'vision',
};

export interface PipelineInput {
  history: ConversationMessage[];
  newMessage: string;
  currentState: string;
  conversationContext: Record<string, unknown>;
  userMsgCount: number;
  leadUuid: string;
  subscriberId?: string;
}

async function recordAiRun(params: {
  leadUuid: string;
  task: 'classify' | 'write';
  model: string;
  stateIn?: string;
  stateOut?: string;
  intent?: string;
  action?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost_usd: number };
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from('ai_runs').insert({
      lead_uuid: params.leadUuid,
      task: params.task,
      model: params.model,
      state_in: params.stateIn ?? null,
      state_out: params.stateOut ?? null,
      intent: params.intent ?? null,
      action: params.action ?? null,
      prompt_tokens: params.usage?.prompt_tokens ?? null,
      completion_tokens: params.usage?.completion_tokens ?? null,
      total_tokens: params.usage?.total_tokens ?? null,
      cost_usd: params.usage?.cost_usd ?? null,
    });
  } catch (err) {
    console.warn('[agentPipeline] recordAiRun failed (non-fatal):', err);
  }
}

export async function runAgentPipeline(input: PipelineInput): Promise<{
  output: AgentOutput;
  contextPatch: Record<string, unknown>;
}> {
  const { history, newMessage, userMsgCount, leadUuid } = input;
  let { currentState, conversationContext } = input;

  // Backward-compat: remap removed states
  if (LEGACY_STATE_MAP[currentState]) {
    console.log(`[agentPipeline] Remapping legacy state ${currentState} → ${LEGACY_STATE_MAP[currentState]}`);
    currentState = LEGACY_STATE_MAP[currentState];
  }

  // ── Stage 1: Classify ──────────────────────────────────────────────────────

  const recentHistory = history.slice(-6);
  const classifierResult = await runClassifier({
    userMessage: newMessage,
    state: currentState,
    context: conversationContext,
    recentHistory,
  });
  const classifierOutput = classifierResult.output;

  await recordAiRun({
    leadUuid,
    task: 'classify',
    model: 'openai/gpt-4.1-mini',
    stateIn: currentState,
    intent: classifierOutput.intent,
    usage: classifierResult.usage,
  });

  // ── Stage 1b: Apply new_facts from classifier + run Understanding Engine ───

  // Merge classifier new_facts into a temporary context for understandingEngine scoring
  const facts = classifierOutput.new_facts;
  const enrichedForScoring: Record<string, unknown> = { ...conversationContext };
  if (facts.reason_for_reaching_out)  enrichedForScoring.reason_for_reaching_out = facts.reason_for_reaching_out;
  if (facts.business_type)            enrichedForScoring.business_type = facts.business_type;
  if (facts.main_challenge)           enrichedForScoring.main_challenge = facts.main_challenge;
  if (facts.active_business != null)  enrichedForScoring.active_business = facts.active_business;
  if (facts.problem_in_hadar_domain != null) enrichedForScoring.problem_in_hadar_domain = facts.problem_in_hadar_domain;
  if (facts.process_exists != null)   enrichedForScoring.process_exists = facts.process_exists;
  if (facts.has_repeatability != null) enrichedForScoring.has_repeatability = facts.has_repeatability;
  if (facts.open_to_guidance != null) enrichedForScoring.open_to_guidance = facts.open_to_guidance;
  if (facts.bottleneck_identified)    enrichedForScoring.bottleneck_identified = facts.bottleneck_identified;
  if (facts.process_flow_known != null) enrichedForScoring.process_flow_known = facts.process_flow_known;
  if (facts.gap_identified != null)   enrichedForScoring.gap_identified = facts.gap_identified;

  const fitScore = computeFitScore(enrichedForScoring as Parameters<typeof computeFitScore>[0]);
  const clarityScore = computeClarityScore(enrichedForScoring as Parameters<typeof computeClarityScore>[0]);
  const recommendedNextStep = getRecommendedNextStep(enrichedForScoring as Parameters<typeof getRecommendedNextStep>[0]);

  enrichedForScoring.fit_score = fitScore;
  enrichedForScoring.clarity_score = clarityScore;
  enrichedForScoring.recommended_next_step = recommendedNextStep;

  console.log(`[agentPipeline] fit=${fitScore} clarity=${clarityScore} next=${recommendedNextStep}`);

  // ── Stage 2: State Machine ─────────────────────────────────────────────────

  const smOutput = runStateMachine({
    currentState,
    intent: classifierOutput.intent,
    shouldOfferBooking: false, // understandingEngine drives booking, not classifier
    shouldHandoff: classifierOutput.should_handoff,
    isOptOut: classifierOutput.is_opt_out,
    context: enrichedForScoring,
  });

  let nextState = smOutput.nextState;
  let forcedAction: AgentAction | undefined = smOutput.forcedAction;

  // ── Stage 3: Anti-Loop Guard ───────────────────────────────────────────────

  const recentUserMessages = history
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .slice(-3)
    .concat(newMessage);

  const loopCtx: LoopContext = {
    state: currentState,
    userMsgCount,
    context: enrichedForScoring,
    recentUserMessages,
  };

  const antiLoopOverride = runAntiLoopGuard(loopCtx);
  if (antiLoopOverride) {
    console.log(`[agentPipeline] AntiLoop override: ${antiLoopOverride.reason}`);
    const overrideAction = antiLoopOverride.forced_action;
    const overrideState =
      overrideAction === 'book_diagnostic_call' || overrideAction === 'book_intro_call'
        ? 'booking'
        : overrideAction === 'human_handoff'
          ? 'escalated'
          : overrideAction === 'assign_homework'
            ? 'homework'
            : overrideAction === 'mark_irrelevant'
              ? 'irrelevant'
              : overrideAction === 'request_followup'
                ? currentState
                : 'irrelevant';

    const overriddenOutput: AgentOutput = {
      reply: antiLoopOverride.forced_reply,
      action: overrideAction,
      state: overrideState,
      extracted_facts: {},
      known_facts: [],
    };

    const contextPatch = updateAntiLoopCounters(
      enrichedForScoring,
      overriddenOutput.action,
      overriddenOutput.state,
      overriddenOutput.reply,
    );

    return { output: overriddenOutput, contextPatch };
  }

  // Inject discovery nudge into enriched context if applicable
  const nudge = buildDiscoveryNudge(userMsgCount, currentState, enrichedForScoring);
  if (nudge) enrichedForScoring.nudge = nudge;

  // ── Stage 4: Response Writer ───────────────────────────────────────────────

  const writerOutput = await runResponseWriter({
    history,
    newMessage,
    nextState,
    forcedAction,
    classifierOutput,
    context: enrichedForScoring,
  });

  await recordAiRun({
    leadUuid,
    task: 'write',
    model: 'openai/gpt-4.1-mini',
    stateIn: currentState,
    stateOut: writerOutput.state,
    intent: classifierOutput.intent,
    action: writerOutput.action,
    usage: writerOutput.usage,
  });

  // ── Build context patch ────────────────────────────────────────────────────

  const antiLoopCounterPatch = updateAntiLoopCounters(
    enrichedForScoring,
    writerOutput.action,
    writerOutput.state,
    writerOutput.reply,
  );

  const newFactsPatch: Record<string, unknown> = {};

  // Standard facts
  if (facts.business_type)   newFactsPatch.business_type = facts.business_type;
  if (facts.main_challenge)  newFactsPatch.main_challenge = facts.main_challenge;
  if (facts.pain_category)   newFactsPatch.pain_category = facts.pain_category;
  if (facts.temperature)     newFactsPatch.temperature = facts.temperature;

  // Fit signals
  if (facts.reason_for_reaching_out)        newFactsPatch.reason_for_reaching_out = facts.reason_for_reaching_out;
  if (facts.active_business != null)        newFactsPatch.active_business = facts.active_business;
  if (facts.problem_in_hadar_domain != null) newFactsPatch.problem_in_hadar_domain = facts.problem_in_hadar_domain;
  if (facts.process_exists != null)         newFactsPatch.process_exists = facts.process_exists;
  if (facts.has_repeatability != null)      newFactsPatch.has_repeatability = facts.has_repeatability;
  if (facts.open_to_guidance != null)       newFactsPatch.open_to_guidance = facts.open_to_guidance;
  if (facts.bottleneck_identified)          newFactsPatch.bottleneck_identified = facts.bottleneck_identified;

  // Clarity signals
  if (facts.process_flow_known != null)     newFactsPatch.process_flow_known = facts.process_flow_known;
  if (facts.gap_identified != null)         newFactsPatch.gap_identified = facts.gap_identified;
  if (facts.feelings_only != null)          newFactsPatch.feelings_only = facts.feelings_only;

  // Understanding engine scores (always update)
  newFactsPatch.fit_score = fitScore;
  newFactsPatch.clarity_score = clarityScore;
  newFactsPatch.recommended_next_step = recommendedNextStep;

  // Increment diagnostic turn count when in diagnostic state
  if (currentState === 'diagnostic') {
    const prev = typeof conversationContext.diagnostic_turn_count === 'number'
      ? conversationContext.diagnostic_turn_count : 0;
    newFactsPatch.diagnostic_turn_count = prev + 1;
  }

  // Writer-extracted facts
  if (Object.keys(writerOutput.extracted_facts).length > 0) {
    Object.assign(newFactsPatch, writerOutput.extracted_facts);
  }

  // Merge known_facts from writer output
  if (writerOutput.known_facts.length > 0) {
    const prevFacts = Array.isArray(conversationContext.known_facts)
      ? (conversationContext.known_facts as string[])
      : [];
    const merged = [...prevFacts, ...writerOutput.known_facts.filter((f) => !prevFacts.includes(f))];
    newFactsPatch.known_facts = merged;
  }

  newFactsPatch.last_intent = classifierOutput.intent;

  // Persist communication_style — update only when classifier detected a non-null value
  if (classifierOutput.communication_style != null) {
    newFactsPatch.communication_style = classifierOutput.communication_style;
  }

  const contextPatch = { ...newFactsPatch, ...antiLoopCounterPatch };

  return { output: writerOutput, contextPatch };
}
