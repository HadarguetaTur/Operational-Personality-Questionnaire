import { z } from 'zod';

const uuid = z.string().uuid('מזהה לא תקין');

export const bulkEmailSchema = z.object({
  template_id: uuid,
  lead_ids: z.array(uuid).min(1, 'נדרש לפחות ליד אחד'),
});

export const bulkEmailV2Schema = z.object({
  templateId: uuid,
  leadIds: z.array(uuid).optional(),
  funnelId: uuid.optional(),
  filters: z
    .object({
      payment_status: z.string().optional(),
      result_pattern: z.string().optional(),
      has_email: z.boolean().optional(),
    })
    .optional(),
}).refine(
  (data) => {
    const hasLeads = !!(data.leadIds && data.leadIds.length > 0);
    const hasFunnel = !!data.funnelId;
    const hasFilters =
      data.filters !== undefined &&
      typeof data.filters === 'object' &&
      data.filters !== null &&
      Object.keys(data.filters).length > 0;
    return hasLeads || hasFunnel || hasFilters;
  },
  { message: 'נדרש leadIds או funnelId או filters' },
);

export const sendTestEmailSchema = z.object({
  template_id: uuid,
  to_email: z.string().email('כתובת אימייל לא תקינה').max(320),
});

export const contactFormSchema = z.object({
  name: z.string().min(1, 'נא למלא שם').max(200).trim(),
  email: z.string().email('כתובת אימייל לא תקינה').max(320),
  phone: z
    .string()
    .max(50)
    .optional()
    .transform((s) => (s == null || s.trim() === '' ? undefined : s.trim())),
  message: z.string().min(1, 'נא למלא הודעה').max(5000).trim(),
});

/** Body for POST /api/contact — includes optional Turnstile token. */
export const contactPostBodySchema = contactFormSchema.extend({
  turnstileToken: z
    .string()
    .max(5000)
    .trim()
    .optional()
    .transform((s) => (s === '' || s == null ? undefined : s)),
});

export const adminInviteSchema = z.object({
  email: z.string().email('אימייל לא תקין').max(320).trim().transform((s) => s.toLowerCase()),
  full_name: z.string().min(1, 'יש להזין שם מלא').max(200).trim(),
});

export const adminInvitationIdBodySchema = z.object({
  invitation_id: uuid,
});

export const adminUserIdBodySchema = z.object({
  user_id: uuid,
});

export const adminSettingsUpsertSchema = z.record(z.string(), z.unknown()).refine(
  (obj) =>
    typeof obj === 'object' &&
    obj !== null &&
    !Array.isArray(obj),
  'גוף JSON חייב להיות אובייקט',
);

export const sendReportEmailSchema = z.object({
  leadId: uuid,
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  reportToken: z.string().min(10).max(200),
  pattern: z.string().max(200).optional(),
});

/** Public quiz completion email: capability is the report token (same as report URL). */
export const quizCompletionEmailSchema = z.object({
  reportToken: z.string().min(10).max(200).trim(),
});

export const driveCreateFolderSchema = z.object({
  leadId: uuid,
});

export const whatsappNotifySchema = z.object({
  leadId: uuid.optional(),
  phone: z.string().min(5).max(50),
  message: z.string().max(5000).optional(),
  templateName: z.string().max(100).optional(),
  variables: z.record(z.string(), z.string()).optional(),
}).refine(
  (data) =>
    (typeof data.message === 'string' && data.message.trim().length > 0) ||
    (typeof data.templateName === 'string' && data.templateName.trim().length > 0),
  { message: 'נדרש message או templateName' },
);

export function parseSumitWebhook(body: unknown): {
  email: string | null;
  phone: string | null;
  externalIdentifier: string | null;
  amount?: number | null;
  transactionId: string | null;
  status: string;
  customerName?: string | null;
} | null {
  const b =
    typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  if (!b) return null;

  // Sumit may nest customer details under a Customer object.
  const customer =
    typeof b.Customer === 'object' && b.Customer !== null && !Array.isArray(b.Customer)
      ? (b.Customer as Record<string, unknown>)
      : {};

  const pickString = (source: Record<string, unknown>, keys: string[]): string | null => {
    for (const key of keys) {
      const v = source[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  };

  const emailRaw =
    pickString(b, ['email', 'CustomerEmail', 'Email']) ?? pickString(customer, ['Email', 'email']);
  const email =
    emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw.toLowerCase())
      ? emailRaw.toLowerCase()
      : null;

  // Field names below are best-effort until a real Sumit webhook is captured —
  // the route logs the raw payload keys so parsing can be calibrated.
  const phone =
    pickString(b, ['phone', 'Phone', 'CustomerPhone', 'customer_phone']) ??
    pickString(customer, ['Phone', 'phone']);

  const externalIdentifier = pickString(b, [
    'externalIdentifier',
    'ExternalIdentifier',
    'externalId',
    'ExternalId',
    'token',
  ]);

  // Reject only when no identifier of any kind is present.
  if (!email && !phone && !externalIdentifier) return null;

  const statusRaw = String(b.status ?? b.PaymentStatus ?? '').toLowerCase();

  const transactionId =
    (typeof b.transactionId === 'string' && b.transactionId) ||
    (typeof b.TransactionId === 'string' && b.TransactionId) ||
    null;

  let amountNum: number | null = null;
  if (typeof b.amount === 'number') amountNum = b.amount;
  else if (typeof b.amount === 'string' && b.amount.trim() !== '')
    amountNum = parseFloat(b.amount);

  return {
    email,
    phone,
    externalIdentifier,
    amount: amountNum,
    transactionId,
    status: statusRaw,
    customerName:
      typeof b.CustomerName === 'string' ? b.CustomerName : typeof b.customerName === 'string'
        ? b.customerName
        : null,
  };
}

export const followupSubmitFormSchema = z
  .record(z.string(), z.union([z.string(), z.boolean()]))
  .refine((obj) => Object.keys(obj).length <= 200, 'יותר מדי שדות בטופס');

export const followupMetaQuerySchema = z.object({
  leadId: uuid,
  token: z.string().min(16).max(200).optional(),
});

export const invitationAcceptQuerySchema = z.object({
  token: z.string().min(16).max(200),
});

export const invitationAcceptPostSchema = z.object({
  token: z.string().min(16).max(200),
  password: z.string().min(8).max(500),
  full_name: z.string().max(200).optional(),
});

export const passwordResetAcceptQuerySchema = z.object({
  token: z.string().min(16).max(200),
});

export const passwordResetAcceptPostSchema = z.object({
  token: z.string().min(16).max(200),
  password: z.string().min(8).max(500),
});

// ---- Manual leads + quotes ----

const optionalTrimmed = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((s) => (s == null || s.trim() === '' ? null : s.trim()));

export const createLeadSchema = z
  .object({
    name: z.string().min(1, 'נא למלא שם').max(200).trim(),
    phone: optionalTrimmed(50),
    email: optionalTrimmed(320).refine(
      (v) => v == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      'כתובת אימייל לא תקינה',
    ),
    business_name: optionalTrimmed(200),
    notes: optionalTrimmed(4000),
    lead_source: z.enum(['manual', 'instagram', 'facebook', 'landing_page', 'whatsapp']).default('manual'),
    lead_status: z.string().max(40).optional(),
  })
  .refine((d) => Boolean(d.phone) || Boolean(d.email), { message: 'נדרש טלפון או אימייל' });

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
});

export const quoteInterviewSchema = z.object({
  leadId: uuid,
  history: z.array(chatMessageSchema).max(80),
  message: z.string().max(8000).optional(),
});

export const quoteGenerateSchema = z.object({
  leadId: uuid,
  history: z.array(chatMessageSchema).min(1).max(80),
  collected_facts: z.record(z.string(), z.unknown()).optional(),
});

export const quoteSignSchema = z.object({
  signer_name: z.string().min(2, 'נא למלא שם מלא').max(200).trim(),
  signer_email: optionalTrimmed(320).refine(
    (v) => v == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'כתובת אימייל לא תקינה',
  ),
  signer_id_number: optionalTrimmed(20),
  consent: z.literal(true, { error: 'יש לאשר את תנאי ההצעה' }),
  signature_png: z
    .string()
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, 'חתימה לא תקינה')
    .max(600_000, 'החתימה גדולה מדי'),
  turnstileToken: z
    .string()
    .max(5000)
    .trim()
    .optional()
    .transform((s) => (s === '' || s == null ? undefined : s)),
});

export const quoteStatusPatchSchema = z.object({
  status: z.enum(['draft', 'declined', 'expired']),
});

// ── Quiz lead creation (server route /api/quiz/lead) ─────────────────────────
const attributionField = z.string().max(500).trim().nullable().optional();

export const quizLeadCreateSchema = z.object({
  name: z.string().min(1, 'נא להזין איך לקרוא לך.').max(200).trim(),
  phone: z
    .string()
    .max(50)
    .trim()
    .refine((v) => {
      const digits = v.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    }, 'נא להזין מספר וואטסאפ תקין.'),
  email: z
    .string()
    .max(320)
    .trim()
    .transform((s) => s.toLowerCase())
    .refine((s) => s === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), 'נא להזין כתובת אימייל תקינה.')
    .optional()
    .nullable(),
  resultType: z.string().min(1).max(40),
  answers: z.record(z.string(), z.string().max(200)).refine(
    (obj) => Object.keys(obj).length <= 50,
    'יותר מדי תשובות',
  ),
  marketingConsent: z.boolean().default(false),
  turnstileToken: z.string().max(5000).optional(),
  attribution: z
    .object({
      visitor_id: attributionField,
      session_id: attributionField,
      landing_referrer: z.string().max(2000).nullable().optional(),
      utm_source: attributionField,
      utm_medium: attributionField,
      utm_campaign: attributionField,
      utm_term: attributionField,
      utm_content: attributionField,
    })
    .optional(),
});

// ── Webchat (token-authenticated) ────────────────────────────────────────────
export const reportTokenSchema = z.string().trim().regex(/^[0-9a-f]{16,40}$/i, 'Invalid token');
