// Server-only helpers shared by the admin and public quote routes.
import { randomBytes } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSiteUrlString } from '@/lib/site';
import { getQuoteSettings } from './settings';
import { renderQuotePdf } from './pdf';
import { downloadQuoteFile, quotePaths, registerQuoteDocument, uploadQuoteFile } from './storage';
import type { QuoteRow, QuoteSignature } from './types';

export function normalizeQuoteRow(row: Record<string, unknown>): QuoteRow {
  const num = (v: unknown) => (v == null ? 0 : Number(v));
  return {
    ...(row as unknown as QuoteRow),
    subtotal: num(row.subtotal),
    discount_amount: num(row.discount_amount),
    vat_rate: num(row.vat_rate),
    vat_amount: num(row.vat_amount),
    total: num(row.total),
    scope_items: Array.isArray(row.scope_items) ? (row.scope_items as QuoteRow['scope_items']) : [],
    line_items: Array.isArray(row.line_items)
      ? (row.line_items as QuoteRow['line_items']).map((li) => ({
          ...li,
          qty: Number(li.qty) || 0,
          unit_price: Number(li.unit_price) || 0,
        }))
      : [],
  };
}

export async function getQuoteById(quoteId: string): Promise<QuoteRow | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from('quotes').select('*').eq('id', quoteId).maybeSingle();
  return data ? normalizeQuoteRow(data) : null;
}

export async function getQuoteByToken(token: string): Promise<QuoteRow | null> {
  if (!/^[0-9a-f]{32,96}$/i.test(token)) return null;
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from('quotes').select('*').eq('access_token', token).maybeSingle();
  return data ? normalizeQuoteRow(data) : null;
}

export async function getQuoteSignature(quoteId: string): Promise<QuoteSignature | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('quote_signatures')
    .select('*')
    .eq('quote_id', quoteId)
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as QuoteSignature | null) ?? null;
}

export function newAccessToken(): string {
  return randomBytes(24).toString('hex');
}

export function publicQuoteUrl(token: string): string {
  return `${getSiteUrlString()}/q/${token}`;
}

export function quoteFileName(quote: Pick<QuoteRow, 'quote_number'>, signed: boolean): string {
  return signed ? `הצעת-מחיר-Q-${quote.quote_number}-חתומה.pdf` : `הצעת-מחיר-Q-${quote.quote_number}.pdf`;
}

/** Renders + stores the unsigned PDF; returns the buffer and hash. */
export async function buildAndStoreDraftPdf(quote: QuoteRow): Promise<{ pdf: Buffer; sha256: string; path: string }> {
  const settings = await getQuoteSettings();
  const { pdf, sha256 } = await renderQuotePdf({ quote, settings, signature: null });
  const path = quotePaths.draftPdf(quote.id);
  await uploadQuoteFile(path, pdf, 'application/pdf');
  await registerQuoteDocument({
    leadId: quote.lead_id,
    fileName: quoteFileName(quote, false),
    storagePath: path,
    mimeType: 'application/pdf',
    fileSize: pdf.byteLength,
  });
  const supabase = createServiceRoleClient();
  await supabase.from('quotes').update({ pdf_storage_path: path, document_sha256: sha256 }).eq('id', quote.id);
  return { pdf, sha256, path };
}

/** Renders + stores the signed PDF (with the signature block + image). */
export async function buildAndStoreSignedPdf(
  quote: QuoteRow,
  signature: QuoteSignature,
): Promise<{ pdf: Buffer; sha256: string; path: string }> {
  const settings = await getQuoteSettings();
  const png = await downloadQuoteFile(signature.signature_image_path);
  const signature_data_url = png ? `data:image/png;base64,${png.toString('base64')}` : null;
  const { pdf, sha256 } = await renderQuotePdf({
    quote,
    settings,
    signature: { ...signature, signature_data_url },
  });
  const path = quotePaths.signedPdf(quote.id);
  await uploadQuoteFile(path, pdf, 'application/pdf');
  await registerQuoteDocument({
    leadId: quote.lead_id,
    fileName: quoteFileName(quote, true),
    storagePath: path,
    mimeType: 'application/pdf',
    fileSize: pdf.byteLength,
  });
  const supabase = createServiceRoleClient();
  await supabase.from('quotes').update({ signed_pdf_storage_path: path }).eq('id', quote.id);
  return { pdf, sha256, path };
}

export function isGmailConfigured(): boolean {
  return Boolean(
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) ||
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  );
}

export function adminNotificationEmail(): string | null {
  const direct = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (direct) return direct;
  const first = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim()).find(Boolean);
  return first ?? null;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/** Sumit payment link carrying the quote id so the webhook can mark it paid. */
export function quotePaymentUrl(quote: Pick<QuoteRow, 'quote_number' | 'total'>): string | null {
  const base = process.env.NEXT_PUBLIC_PAYMENT_URL?.trim();
  if (!base) return null;
  try {
    const u = new URL(base);
    u.searchParams.set('externalIdentifier', `quote:${quote.quote_number}`);
    u.searchParams.set('amount', String(quote.total));
    return u.toString();
  } catch {
    return null;
  }
}
