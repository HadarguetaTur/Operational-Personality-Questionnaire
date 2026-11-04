import type { LineItem } from './types';

export interface QuoteTotals {
  subtotal: number;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineTotal(item: Pick<LineItem, 'qty' | 'unit_price'>): number {
  return round2((Number(item.qty) || 0) * (Number(item.unit_price) || 0));
}

/** Single source of truth for subtotal / VAT / total, used by the editor, the API and the PDF. */
export function computeTotals(
  lineItems: Array<Pick<LineItem, 'qty' | 'unit_price'>>,
  discountAmount: number,
  vatRate: number,
): QuoteTotals {
  const subtotal = round2(lineItems.reduce((sum, li) => sum + lineTotal(li), 0));
  const discount_amount = round2(Math.min(Math.max(discountAmount || 0, 0), subtotal));
  const taxable = round2(subtotal - discount_amount);
  const vat_amount = round2((taxable * (vatRate || 0)) / 100);
  const total = round2(taxable + vat_amount);
  return { subtotal, discount_amount, vat_rate: vatRate, vat_amount, total };
}

export function formatIls(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatDateHe(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTimeHe(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jerusalem' });
}
