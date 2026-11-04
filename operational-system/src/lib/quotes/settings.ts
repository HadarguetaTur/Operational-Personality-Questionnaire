import { createServiceRoleClient } from '@/lib/supabase/server';
import { DEFAULT_QUOTE_SETTINGS, type CatalogItem, type QuoteSettings } from './types';

/** Business details printed on quotes. Falls back to defaults field-by-field. */
export async function getQuoteSettings(): Promise<QuoteSettings> {
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'quote_settings')
      .maybeSingle();
    const raw = (data?.value ?? {}) as Partial<QuoteSettings>;
    return {
      ...DEFAULT_QUOTE_SETTINGS,
      ...raw,
      vat_rate: typeof raw.vat_rate === 'number' ? raw.vat_rate : DEFAULT_QUOTE_SETTINGS.vat_rate,
      validity_days:
        typeof raw.validity_days === 'number' ? raw.validity_days : DEFAULT_QUOTE_SETTINGS.validity_days,
    };
  } catch (err) {
    console.warn('[quotes/settings] falling back to defaults:', err);
    return DEFAULT_QUOTE_SETTINGS;
  }
}

/** Active price-list items, ordered for display and for the generator prompt. */
export async function getActiveCatalog(): Promise<CatalogItem[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('quote_catalog_items')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) {
    console.warn('[quotes/settings] catalog load failed:', error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    ...row,
    default_price: Number(row.default_price),
    min_price: row.min_price == null ? null : Number(row.min_price),
    max_price: row.max_price == null ? null : Number(row.max_price),
  })) as CatalogItem[];
}

export function catalogToPromptText(items: CatalogItem[]): string {
  if (items.length === 0) return '(אין קטלוג מוגדר — תמחרי לפי הטווחים שבהקשר העסקי)';
  return items
    .map((it) => {
      const range =
        it.min_price != null && it.max_price != null
          ? ` (טווח: ${it.min_price}–${it.max_price}₪)`
          : '';
      return `- ${it.name} | יחידה: ${it.unit} | מחיר ברירת מחדל: ${it.default_price}₪${range}${
        it.description ? ` | ${it.description}` : ''
      }`;
    })
    .join('\n');
}
