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

export const adminSettingsUpsertSchema = z.record(z.unknown()).refine(
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
  variables: z.record(z.string()).optional(),
}).refine(
  (data) =>
    (typeof data.message === 'string' && data.message.trim().length > 0) ||
    (typeof data.templateName === 'string' && data.templateName.trim().length > 0),
  { message: 'נדרש message או templateName' },
);

export function parseSumitWebhook(body: unknown): {
  email: string;
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

  const emailRaw =
    (typeof b.email === 'string' && b.email) ||
    (typeof b.CustomerEmail === 'string' && b.CustomerEmail) ||
    (typeof (b as { Email?: unknown }).Email === 'string' && (b as { Email?: string }).Email) ||
    '';

  const email = emailRaw.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

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
