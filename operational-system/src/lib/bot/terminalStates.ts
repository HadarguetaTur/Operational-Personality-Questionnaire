/**
 * The single source of truth for conversation states where the bot must never
 * initiate contact again (follow-ups, nudges) — shared by every channel.
 *
 * Note: opt-out is a context flag (`context.opt_out === true`) on top of the
 * `irrelevant` state, so callers should check it separately where relevant.
 */
export const TERMINAL_STATES = [
  'booking',
  'closed',
  'escalated',
  'spam',
  'irrelevant',
] as const;

const TERMINAL_SET: ReadonlySet<string> = new Set(TERMINAL_STATES);

export function isTerminalState(state: string): boolean {
  return TERMINAL_SET.has(state);
}
