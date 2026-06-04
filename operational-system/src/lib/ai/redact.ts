const PHONE_PATTERN = /(?:\+?972|0)[\s.-]?(?:5[0-9]|[2-9])[0-9]{1}[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function redactPii(text: string): string {
  return text
    .replace(PHONE_PATTERN, '[טלפון]')
    .replace(EMAIL_PATTERN, '[אימייל]');
}

export function redactHistory<T extends { role: string; content: string }>(
  messages: T[],
): T[] {
  return messages.map((m) => ({
    ...m,
    content: redactPii(m.content),
  }));
}
