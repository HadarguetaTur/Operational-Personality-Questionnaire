/**
 * agentPipeline.ts — multi-agent orchestrator (P4 refactor)
 *
 * New flow:
 *   Stage 1: Classifier (gpt-4.1-mini) — intent, facts, DISC
 *   Stage 1b: Enrich context + compute fit/clarity scores (deterministic)
 *   Stage 2: Sales Conversation Manager (deterministic routing + specialist agents)
 *              ├── Pain Mapper Agent (LLM, discovery/diagnostic)
 *              ├── Diagnostic Fit Agent (LLM, diagnostic/summary)
 *              ├── Offer Framing Agent (LLM, vision/awaiting_confirmation)
 *              └── Objection Agent (LLM, objection)
 *   Stage 3: Strategic Guardrails — pre-writer loop detection (deterministic)
 *   Stage 4: Hebrew Writer Agent (claude-sonnet-4-6) — crafts the actual reply
 *   Stage 5: Strategic Guardrails — post-writer counter updates (deterministic)
 */

import { runClassifier } from './classifier';
import { runSalesConversationManager } from '@/lib/agents/salesConversationManager';
import {
  runGuardrailsCheck,
  buildDiscoveryNudge,
  updateGuardrailCounters,
  type GuardrailsContext,
} from '@/lib/agents/strategicGuardrails';
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
  task: string;
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

  // ── Stage 1b: Enrich context + compute understanding scores ───────────────

  const facts = classifierOutput.new_facts;
  const enrichedContext: Record<string, unknown> = { ...conversationContext };
  if (facts.reason_for_reaching_out)         enrichedContext.reason_for_reaching_out = facts.reason_for_reaching_out;
  if (facts.business_type)                   enrichedContext.business_type = facts.business_type;
  if (facts.main_challenge)                  enrichedContext.main_challenge = facts.main_challenge;
  if (facts.active_business != null)         enrichedContext.active_business = facts.active_business;
  if (facts.problem_in_hadar_domain != null) enrichedContext.problem_in_hadar_domain = facts.problem_in_hadar_domain;
  if (facts.process_exists != null)          enrichedContext.process_exists = facts.process_exists;
  if (facts.has_repeatability != null)       enrichedContext.has_repeatability = facts.has_repeatability;
  if (facts.open_to_guidance != null)        enrichedContext.open_to_guidance = facts.open_to_guidance;
  if (facts.bottleneck_identified)           enrichedContext.bottleneck_identified = facts.bottleneck_identified;
  if (facts.process_flow_known != null)      enrichedContext.process_flow_known = facts.process_flow_known;
  if (facts.gap_identified != null)          enrichedContext.gap_identified = facts.gap_identified;

  type ScoringCtx = Parameters<typeof computeFitScore>[0];
  const fitScore = computeFitScore(enrichedContext as ScoringCtx);
  const clarityScore = computeClarityScore(enrichedContext as ScoringCtx);
  const recommendedNextStep = getRecommendedNextStep(enrichedContext as ScoringCtx);

  enrichedContext.fit_score = fitScore;
  enrichedContext.clarity_score = clarityScore;
  enrichedContext.recommended_next_step = recommendedNextStep;

  console.log(`[agentPipeline] fit=${fitScore} clarity=${clarityScore} next=${recommendedNextStep}`);

  // ── Stage 2: Sales Conversation Manager + Specialists ─────────────────────

  const managerOutput = await runSalesConversationManager({
    currentState,
    classifierOutput,
    context: enrichedContext,
    history,
    newMessage,
  });

  let nextState = managerOutput.nextState;
  let forcedAction: AgentAction | undefined = managerOutput.forcedAction;
  const specialistContext = managerOutput.specialistContext;

  // ── Stage 3: Strategic Guardrails (pre-writer loop detection) ─────────────

  const recentUserMessages = history
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .slice(-3)
    .concat(newMessage);

  const guardrailsCtx: GuardrailsContext = {
    state: currentState,
    userMsgCount,
    context: enrichedContext,
    recentUserMessages,
  };

  const guardrailsOverride = runGuardrailsCheck(guardrailsCtx);
  if (guardrailsOverride) {
    console.log(`[agentPipeline] Guardrails override: ${guardrailsOverride.reason}`);
    const overrideAction = guardrailsOverride.forced_action;
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
      reply: guardrailsOverride.forced_reply,
      action: overrideAction,
      state: overrideState,
      extracted_facts: {},
      known_facts: [],
    };

    const contextPatch = updateGuardrailCounters(
      enrichedContext,
      overriddenOutput.action,
      overriddenOutput.state,
      overriddenOutput.reply,
    );

    return { output: overriddenOutput, contextPatch };
  }

  // Inject discovery nudge if applicable (AL-5)
  const nudge = buildDiscoveryNudge(userMsgCount, currentState, enrichedContext);
  if (nudge) enrichedContext.nudge = nudge;

  // ── Stage 4: Hebrew Writer Agent ──────────────────────────────────────────

  const writerOutput = await runResponseWriter({
    history,
    newMessage,
    nextState,
    forcedAction,
    classifierOutput,
    context: enrichedContext,
    specialistContext,
  });

  await recordAiRun({
    leadUuid,
    task: 'write',
    model: 'anthropic/claude-sonnet-4-6',
    stateIn: currentState,
    stateOut: writerOutput.state,
    intent: classifierOutput.intent,
    action: writerOutput.action,
    usage: writerOutput.usage,
  });

  // ── Stage 5: Build context patch ──────────────────────────────────────────

  const guardrailCounterPatch = updateGuardrailCounters(
    enrichedContext,
    writerOutput.action,
    writerOutput.state,
    writerOutput.reply,
  );

  const newFactsPatch: Record<string, unknown> = {};

  // Standard facts
  if (facts.business_type)  newFactsPatch.business_type = facts.business_type;
  if (facts.main_challenge) newFactsPatch.main_challenge = facts.main_challenge;
  if (facts.pain_category)  newFactsPatch.pain_category = facts.pain_category;
  if (facts.temperature)    newFactsPatch.temperature = facts.temperature;

  // Fit signals
  if (facts.reason_for_reaching_out)         newFactsPatch.reason_for_reaching_out = facts.reason_for_reaching_out;
  if (facts.active_business != null)         newFactsPatch.active_business = facts.active_business;
  if (facts.problem_in_hadar_domain != null) newFactsPatch.problem_in_hadar_domain = facts.problem_in_hadar_domain;
  if (facts.process_exists != null)          newFactsPatch.process_exists = facts.process_exists;
  if (facts.has_repeatability != null)       newFactsPatch.has_repeatability = facts.has_repeatability;
  if (facts.open_to_guidance != null)        newFactsPatch.open_to_guidance = facts.open_to_guidance;
  if (facts.bottleneck_identified)           newFactsPatch.bottleneck_identified = facts.bottleneck_identified;

  // Clarity signals
  if (facts.process_flow_known != null) newFactsPatch.process_flow_known = facts.process_flow_known;
  if (facts.gap_identified != null)     newFactsPatch.gap_identified = facts.gap_identified;
  if (facts.feelings_only != null)      newFactsPatch.feelings_only = facts.feelings_only;

  // Understanding engine scores
  newFactsPatch.fit_score = fitScore;
  newFactsPatch.clarity_score = clarityScore;
  newFactsPatch.recommended_next_step = recommendedNextStep;

  // Increment diagnostic turn count
  if (currentState === 'diagnostic') {
    const prev = typeof conversationContext.diagnostic_turn_count === 'number'
      ? conversationContext.diagnostic_turn_count : 0;
    newFactsPatch.diagnostic_turn_count = prev + 1;
  }

  // Writer-extracted facts
  if (Object.keys(writerOutput.extracted_facts).length > 0) {
    Object.assign(newFactsPatch, writerOutput.extracted_facts);
  }

  // Merge known_facts
  if (writerOutput.known_facts.length > 0) {
    const prevFacts = Array.isArray(conversationContext.known_facts)
      ? (conversationContext.known_facts as string[]) : [];
    const merged = [...prevFacts, ...writerOutput.known_facts.filter((f) => !prevFacts.includes(f))];
    newFactsPatch.known_facts = merged;
  }

  newFactsPatch.last_intent = classifierOutput.intent;

  if (classifierOutput.communication_style != null) {
    newFactsPatch.communication_style = classifierOutput.communication_style;
  }

  const contextPatch = { ...newFactsPatch, ...guardrailCounterPatch };

  return { output: writerOutput, contextPatch };
}
