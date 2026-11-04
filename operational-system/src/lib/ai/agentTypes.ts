/**
 * Shared agent-output types for the bot pipeline
 * (classifier → manager → guardrails → writer).
 *
 * Extracted from the deleted legacy salesAgent.ts — kept as a standalone
 * types module to avoid import cycles between agentPipeline and
 * strategicGuardrails.
 */

export type AgentAction =
  | 'continue'
  | 'propose_diagnostic_call'
  | 'propose_intro_call'
  | 'book_diagnostic_call'
  | 'book_intro_call'
  | 'assign_homework'
  | 'mark_irrelevant'
  | 'request_followup'
  | 'mark_spam'
  | 'human_handoff';

export const VALID_STATES = [
  'initial',
  'discovery',
  'diagnostic',
  'summary',
  'vision',
  'awaiting_confirmation',
  'homework',
  'objection',
  'booking',
  'closed',
  'irrelevant',
  'spam',
  'escalated',
] as const;

export type ConversationState = (typeof VALID_STATES)[number];

export interface ExtractedFacts {
  pain_category?: string;
  business_type?: string;
  main_challenge?: string;
  temperature?: 'cold' | 'warm' | 'hot';
}

export interface AgentUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export interface AgentOutput {
  reply: string;
  action: AgentAction;
  state: string;
  extracted_facts: ExtractedFacts;
  known_facts: string[];
  usage?: AgentUsage;
  /** True when this is the "bot unavailable" message (AI call failed), not a real reply. */
  unavailable?: boolean;
}
