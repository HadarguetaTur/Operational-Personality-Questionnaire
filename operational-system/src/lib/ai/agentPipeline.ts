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
import { runResponseWriter } from './responseWriter';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ConversationMessage } from '@/lib/db/conversationMessages';
import type { AgentOutput, AgentAction } from './salesAgent';

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
  const { history, newMessage, currentState, conversationContext, userMsgCount, leadUuid } = input;

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

  // ── Stage 2: State Machine ─────────────────────────────────────────────────

  const smOutput = runStateMachine({
    currentState,
    intent: classifierOutput.intent,
    shouldOfferBooking: classifierOutput.should_offer_booking,
    shouldHandoff: classifierOutput.should_handoff,
    isOptOut: classifierOutput.is_opt_out,
    context: conversationContext,
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
    context: conversationContext,
    recentUserMessages,
  };

  const antiLoopOverride = runAntiLoopGuard(loopCtx);
  if (antiLoopOverride) {
    console.log(`[agentPipeline] AntiLoop override: ${antiLoopOverride.reason}`);
    const overriddenOutput: AgentOutput = {
      reply: antiLoopOverride.forced_reply,
      action: antiLoopOverride.forced_action,
      state: antiLoopOverride.forced_action === 'book_meeting'
        ? 'booking'
        : antiLoopOverride.forced_action === 'human_handoff'
          ? 'escalated'
          : antiLoopOverride.forced_action === 'request_followup'
            ? 'irrelevant'
            : 'irrelevant',
      extracted_facts: {},
      known_facts: [],
    };

    const contextPatch = updateAntiLoopCounters(
      conversationContext,
      overriddenOutput.action,
      overriddenOutput.state,
      overriddenOutput.reply,
    );

    return { output: overriddenOutput, contextPatch };
  }

  // Inject discovery nudge into context if applicable
  const nudge = buildDiscoveryNudge(userMsgCount, currentState, conversationContext);
  const enrichedContext: Record<string, unknown> = {
    ...conversationContext,
    ...(nudge ? { nudge } : {}),
  };

  // ── Stage 4: Response Writer ───────────────────────────────────────────────

  const writerOutput = await runResponseWriter({
    history,
    newMessage,
    nextState,
    forcedAction,
    classifierOutput,
    context: enrichedContext,
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
    conversationContext,
    writerOutput.action,
    writerOutput.state,
    writerOutput.reply,
  );

  const newFactsPatch: Record<string, unknown> = {};
  if (classifierOutput.new_facts.business_type) {
    newFactsPatch.business_type = classifierOutput.new_facts.business_type;
  }
  if (classifierOutput.new_facts.main_challenge) {
    newFactsPatch.main_challenge = classifierOutput.new_facts.main_challenge;
  }
  if (classifierOutput.new_facts.pain_category) {
    newFactsPatch.pain_category = classifierOutput.new_facts.pain_category;
  }
  if (classifierOutput.new_facts.temperature) {
    newFactsPatch.temperature = classifierOutput.new_facts.temperature;
  }
  if (Object.keys(writerOutput.extracted_facts).length > 0) {
    Object.assign(newFactsPatch, writerOutput.extracted_facts);
  }

  // Merge known_facts from writer output into context
  if (writerOutput.known_facts.length > 0) {
    const prevFacts = Array.isArray(conversationContext.known_facts)
      ? (conversationContext.known_facts as string[])
      : [];
    const merged = [...prevFacts, ...writerOutput.known_facts.filter((f) => !prevFacts.includes(f))];
    newFactsPatch.known_facts = merged;
  }

  // Track last intent
  newFactsPatch.last_intent = classifierOutput.intent;

  const contextPatch = { ...newFactsPatch, ...antiLoopCounterPatch };

  return { output: writerOutput, contextPatch };
}
