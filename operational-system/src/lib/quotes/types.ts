import { z } from 'zod';

/** One deliverable / scope bullet printed on the quote. */
export const scopeItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
});

/** One priced row. `total` is always derived (qty * unit_price). */
export const lineItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  qty: z.number().min(0).max(10000).default(1),
  unit: z.string().max(40).optional().default('project'),
  unit_price: z.number().min(0).max(10_000_000),
});

/** Editable quote body — what the admin edits and the AI drafts. */
export const quoteDraftSchema = z.object({
  title: z.string().min(1).max(200),
  client_name: z.string().max(200).nullable().optional(),
  client_business: z.string().max(200).nullable().optional(),
  client_email: z.string().email().max(320).nullable().optional().or(z.literal('')),
  client_phone: z.string().max(50).nullable().optional(),
  intro: z.string().max(4000).nullable().optional(),
  scope_items: z.array(scopeItemSchema).max(40).default([]),
  line_items: z.array(lineItemSchema).max(40).default([]),
  discount_amount: z.number().min(0).max(10_000_000).default(0),
  vat_rate: z.number().min(0).max(100).default(18),
  payment_terms: z.string().max(4000).nullable().optional(),
  timeline: z.string().max(4000).nullable().optional(),
  terms: z.string().max(8000).nullable().optional(),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  ai_summary: z.string().max(4000).nullable().optional(),
});

export type ScopeItem = z.infer<typeof scopeItemSchema>;
export type LineItem = z.infer<typeof lineItemSchema>;
export type QuoteDraft = z.infer<typeof quoteDraftSchema>;

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'paid' | 'declined' | 'expired';

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'טיוטה',
  sent: 'נשלחה',
  viewed: 'נצפתה',
  signed: 'נחתמה',
  paid: 'שולמה',
  declined: 'נדחתה',
  expired: 'פג תוקף',
};

/** Full DB row (subset used by the UI + renderer). */
export interface QuoteRow extends QuoteDraft {
  id: string;
  lead_id: string;
  quote_number: number;
  status: QuoteStatus;
  subtotal: number;
  vat_amount: number;
  total: number;
  currency: string;
  access_token: string | null;
  pdf_storage_path: string | null;
  signed_pdf_storage_path: string | null;
  document_sha256: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  interview_transcript: Array<{ role: 'user' | 'assistant'; content: string }> | null;
  collected_facts: Record<string, unknown> | null;
}

/** Business details printed on every quote (system_settings.quote_settings). */
export interface QuoteSettings {
  business_name: string;
  business_id: string;
  business_id_label: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  vat_rate: number;
  validity_days: number;
  default_payment_terms: string;
  default_terms: string;
  signature_consent: string;
}

export const DEFAULT_QUOTE_SETTINGS: QuoteSettings = {
  business_name: 'הדר תורג׳מן — אוטומציות לעסקים',
  business_id: '',
  business_id_label: 'עוסק מורשה',
  address: '',
  phone: '',
  email: '',
  logo_url: '',
  vat_rate: 18,
  validity_days: 14,
  default_payment_terms: '50% מקדמה עם החתימה, 50% עם המסירה.',
  default_terms:
    'ההצעה כוללת את ההיקף המפורט בלבד. שינויים והרחבות מעבר להיקף יתומחרו בנפרד לאחר תיאום. ' +
    'זמני הביצוע מותנים בקבלת כל החומרים והגישות הנדרשים מהלקוח/ה. ' +
    'התשלום באמצעות העברה בנקאית או כרטיס אשראי דרך קישור מאובטח.',
  signature_consent:
    'אני מאשר/ת כי קראתי את הצעת המחיר על כל סעיפיה, ומסכים/ה לתנאיה. חתימתי האלקטרונית מהווה הסכמה מחייבת.',
};

export const quoteSettingsSchema = z.object({
  business_name: z.string().max(200),
  business_id: z.string().max(50),
  business_id_label: z.string().max(50),
  address: z.string().max(300),
  phone: z.string().max(50),
  email: z.string().max(320),
  logo_url: z.string().max(1000),
  vat_rate: z.number().min(0).max(100),
  validity_days: z.number().int().min(1).max(365),
  default_payment_terms: z.string().max(4000),
  default_terms: z.string().max(8000),
  signature_consent: z.string().max(1000),
});

/** Signature record as returned to the admin / printed on the signed PDF. */
export interface QuoteSignature {
  id: string;
  quote_id: string;
  signer_name: string;
  signer_email: string | null;
  signer_id_number: string | null;
  signature_image_path: string;
  consent_text: string;
  ip: string | null;
  user_agent: string | null;
  document_sha256: string | null;
  signed_at: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  default_price: number;
  min_price: number | null;
  max_price: number | null;
  active: boolean;
  sort_order: number;
}

export const catalogItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  unit: z.enum(['project', 'hour', 'month', 'item']).default('project'),
  default_price: z.number().min(0).max(10_000_000),
  min_price: z.number().min(0).max(10_000_000).nullable().optional(),
  max_price: z.number().min(0).max(10_000_000).nullable().optional(),
  active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(100000).default(0),
});

export const UNIT_LABELS: Record<string, string> = {
  project: 'פרויקט',
  hour: 'שעה',
  month: 'חודש',
  item: 'יח׳',
};
