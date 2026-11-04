/**
 * Canonical Israeli phone normalization.
 *
 * Canonical form: local digits-only with leading 0, e.g. "0501234567".
 * Used for identity matching across the funnel (quiz lead ↔ WhatsApp lead ↔ Sumit payment).
 *
 * IMPORTANT: must stay in exact sync with the SQL function `normalize_il_phone`
 * in supabase/migrations/029_leads_phone_normalized.sql (drives leads.phone_normalized).
 * Shared test vectors:
 *   '050-1234567'      → '0501234567'
 *   '+972 50-123 4567' → '0501234567'
 *   '972501234567'     → '0501234567'
 *   '501234567'        → '0501234567'
 *   'abc'              → null
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) return null;
  if (digits.startsWith('972')) return '0' + digits.slice(3);
  if (digits.startsWith('0')) return digits;
  return '0' + digits;
}
