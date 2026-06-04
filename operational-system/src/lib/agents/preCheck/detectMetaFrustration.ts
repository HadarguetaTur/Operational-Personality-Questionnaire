const FRUSTRATION_PATTERNS = [
  /חופרת/,
  /מספיק\s+שאלות/,
  /למה\s+את\s+שואלת/,
  /את\s+לא\s+מבינה/,
  /ויתרתי/,
  /זה\s+לא\s+עוזר/,
  /רוצ[הי]\s+לדבר\s+עם\s+הדר/,
  /\?\?\?/,
  /ביקשתי\s+פגישה/,
  /עניי?\s+על\s+מה\s+ששאלתי/,
];

export type FrustrationAction = 'book_meeting' | 'human_handoff';

export function detectMetaFrustration(
  message: string,
  currentState: string,
): FrustrationAction | null {
  const normalized = message.trim();
  if (!normalized) return null;
  if (!FRUSTRATION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return null;
  }

  const activeStates = ['initial', 'discovery', 'qualifying', 'pitching', 'objection'];
  if (activeStates.includes(currentState)) {
    return 'book_meeting';
  }
  return 'human_handoff';
}
