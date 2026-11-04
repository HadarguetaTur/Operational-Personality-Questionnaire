import React from 'react';
import type { QuoteRow, QuoteSettings, QuoteSignature } from '@/lib/quotes/types';
import { UNIT_LABELS } from '@/lib/quotes/types';
import { computeTotals, formatDateHe, formatDateTimeHe, formatIls, lineTotal } from '@/lib/quotes/math';

/**
 * QuoteDocument — the designed quote. Server-safe (no hooks, no 'use client'),
 * inline-styled so the exact same markup renders in:
 *   * the admin editor preview,
 *   * the public /q/[token] page,
 *   * the PDF (renderToStaticMarkup → headless Chromium).
 */

export const QUOTE_FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&family=Assistant:wght@400;600;700&display=swap';

const BRAND = {
  ink: '#0D1B2A',
  gray: '#68707C',
  line: '#E6E2F4',
  soft: '#F3F0FB',
  brand: '#5B3FC4',
  brandDark: '#392681',
  brandLight: '#D8D0FF',
};

export interface QuoteDocumentProps {
  quote: Pick<
    QuoteRow,
    | 'quote_number'
    | 'title'
    | 'client_name'
    | 'client_business'
    | 'client_email'
    | 'client_phone'
    | 'intro'
    | 'scope_items'
    | 'line_items'
    | 'discount_amount'
    | 'vat_rate'
    | 'payment_terms'
    | 'timeline'
    | 'terms'
    | 'valid_until'
    | 'created_at'
  > & { status?: string; signed_at?: string | null };
  settings: QuoteSettings;
  /** When present, renders the signed block (signer details + signature image). */
  signature?: (QuoteSignature & { signature_data_url?: string | null }) | null;
  /** Compact mode trims outer margins (used inside the admin preview card). */
  compact?: boolean;
}

const page: React.CSSProperties = {
  direction: 'rtl',
  fontFamily: "'Heebo', 'Assistant', Arial, sans-serif",
  color: BRAND.ink,
  background: '#fff',
  lineHeight: 1.6,
  fontSize: 14,
  maxWidth: 820,
  margin: '0 auto',
  textAlign: 'right',
};

const h2: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: BRAND.brandDark,
  margin: '28px 0 10px',
  paddingBottom: 6,
  borderBottom: `2px solid ${BRAND.brandLight}`,
};

const cellBase: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: `1px solid ${BRAND.line}`,
  verticalAlign: 'top',
};

function Paragraphs({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <>
      {text
        .split(/\n{2,}|\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>
            {p}
          </p>
        ))}
    </>
  );
}

export function QuoteDocument({ quote, settings, signature, compact }: QuoteDocumentProps) {
  const totals = computeTotals(quote.line_items ?? [], Number(quote.discount_amount) || 0, Number(quote.vat_rate) || 0);
  const number = `Q-${quote.quote_number}`;
  const issued = formatDateHe(quote.created_at);
  const valid = formatDateHe(quote.valid_until ?? null);

  return (
    <div style={{ ...page, padding: compact ? '24px 28px' : '44px 52px' }} className="quote-document">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 24,
          paddingBottom: 20,
          borderBottom: `3px solid ${BRAND.brand}`,
        }}
      >
        <div>
          {settings.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo_url} alt={settings.business_name} style={{ maxHeight: 56, maxWidth: 200, objectFit: 'contain', marginBottom: 8 }} />
          ) : null}
          <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.brandDark }}>{settings.business_name}</div>
          <div style={{ fontSize: 12, color: BRAND.gray, marginTop: 2 }}>
            {[
              settings.business_id ? `${settings.business_id_label} ${settings.business_id}` : null,
              settings.address || null,
              settings.phone || null,
              settings.email || null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        <div style={{ textAlign: 'left', direction: 'ltr' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: BRAND.brand, letterSpacing: 0.5 }}>{number}</div>
          <div style={{ fontSize: 12, color: BRAND.gray, direction: 'rtl', textAlign: 'right' }}>
            <div>תאריך: {issued}</div>
            {valid ? <div>בתוקף עד: {valid}</div> : null}
          </div>
        </div>
      </div>

      {/* Title + client */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: BRAND.ink }}>{quote.title}</h1>
        </div>
        <div
          style={{
            flex: '0 1 300px',
            background: BRAND.soft,
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 13,
          }}
        >
          <div style={{ fontSize: 11, color: BRAND.gray, fontWeight: 600, marginBottom: 4 }}>לכבוד</div>
          {quote.client_name ? <div style={{ fontWeight: 700, fontSize: 15 }}>{quote.client_name}</div> : null}
          {quote.client_business ? <div>{quote.client_business}</div> : null}
          {quote.client_email ? <div style={{ direction: 'ltr', textAlign: 'right' }}>{quote.client_email}</div> : null}
          {quote.client_phone ? <div style={{ direction: 'ltr', textAlign: 'right' }}>{quote.client_phone}</div> : null}
        </div>
      </div>

      {quote.intro ? (
        <div style={{ marginTop: 22, fontSize: 15 }}>
          <Paragraphs text={quote.intro} />
        </div>
      ) : null}

      {/* Scope */}
      {quote.scope_items?.length ? (
        <>
          <h2 style={h2}>מה כולל הפרויקט</h2>
          <ol style={{ margin: 0, paddingRight: 20 }}>
            {quote.scope_items.map((s, i) => (
              <li key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>{s.title}</div>
                {s.description ? <div style={{ color: '#3B4452', whiteSpace: 'pre-wrap' }}>{s.description}</div> : null}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {/* Pricing */}
      <h2 style={h2}>תמחור</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: BRAND.soft }}>
            <th style={{ ...cellBase, textAlign: 'right', fontWeight: 700 }}>פריט</th>
            <th style={{ ...cellBase, textAlign: 'center', fontWeight: 700, width: 70 }}>כמות</th>
            <th style={{ ...cellBase, textAlign: 'center', fontWeight: 700, width: 110 }}>מחיר ליח׳</th>
            <th style={{ ...cellBase, textAlign: 'left', fontWeight: 700, width: 120 }}>סה״כ</th>
          </tr>
        </thead>
        <tbody>
          {(quote.line_items ?? []).map((li, i) => (
            <tr key={i}>
              <td style={cellBase}>
                <div style={{ fontWeight: 600 }}>{li.title}</div>
                {li.description ? <div style={{ color: BRAND.gray, fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{li.description}</div> : null}
              </td>
              <td style={{ ...cellBase, textAlign: 'center' }}>
                {li.qty} {UNIT_LABELS[li.unit ?? 'project'] && li.unit !== 'project' ? UNIT_LABELS[li.unit ?? ''] : ''}
              </td>
              <td style={{ ...cellBase, textAlign: 'center', direction: 'ltr' }}>{formatIls(Number(li.unit_price) || 0)}</td>
              <td style={{ ...cellBase, textAlign: 'left', direction: 'ltr', fontWeight: 600 }}>{formatIls(lineTotal(li))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 12 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 14, minWidth: 300 }}>
          <tbody>
            <tr>
              <td style={{ padding: '6px 12px', color: BRAND.gray }}>סכום ביניים</td>
              <td style={{ padding: '6px 12px', textAlign: 'left', direction: 'ltr' }}>{formatIls(totals.subtotal)}</td>
            </tr>
            {totals.discount_amount > 0 ? (
              <tr>
                <td style={{ padding: '6px 12px', color: BRAND.gray }}>הנחה</td>
                <td style={{ padding: '6px 12px', textAlign: 'left', direction: 'ltr', color: '#0E7C4A' }}>-{formatIls(totals.discount_amount)}</td>
              </tr>
            ) : null}
            <tr>
              <td style={{ padding: '6px 12px', color: BRAND.gray }}>מע״מ {totals.vat_rate}%</td>
              <td style={{ padding: '6px 12px', textAlign: 'left', direction: 'ltr' }}>{formatIls(totals.vat_amount)}</td>
            </tr>
            <tr style={{ background: BRAND.brand, color: '#fff' }}>
              <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: 16, borderRadius: '0 10px 10px 0' }}>סה״כ לתשלום</td>
              <td style={{ padding: '10px 12px', textAlign: 'left', direction: 'ltr', fontWeight: 800, fontSize: 16, borderRadius: '10px 0 0 10px' }}>
                {formatIls(totals.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {quote.timeline ? (
        <>
          <h2 style={h2}>לו״ז</h2>
          <Paragraphs text={quote.timeline} />
        </>
      ) : null}

      {quote.payment_terms ? (
        <>
          <h2 style={h2}>תנאי תשלום</h2>
          <Paragraphs text={quote.payment_terms} />
        </>
      ) : null}

      {quote.terms ? (
        <>
          <h2 style={h2}>תנאים כלליים</h2>
          <div style={{ fontSize: 12.5, color: '#3B4452' }}>
            <Paragraphs text={quote.terms} />
          </div>
        </>
      ) : null}

      {/* Signature block */}
      <div
        style={{
          marginTop: 36,
          padding: '18px 20px',
          border: `1.5px solid ${signature ? '#0E7C4A' : BRAND.line}`,
          borderRadius: 14,
          background: signature ? '#F1FBF5' : '#FAFAFC',
          breakInside: 'avoid',
        }}
        className="quote-signature-block"
      >
        {signature ? (
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <div style={{ fontWeight: 800, color: '#0E7C4A', fontSize: 15 }}>✓ ההצעה אושרה ונחתמה</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                <div>
                  <b>חתם/ה:</b> {signature.signer_name}
                  {signature.signer_id_number ? ` · ת.ז. ${signature.signer_id_number}` : ''}
                </div>
                {signature.signer_email ? (
                  <div>
                    <b>אימייל:</b> <span style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{signature.signer_email}</span>
                  </div>
                ) : null}
                <div>
                  <b>מועד:</b> {formatDateTimeHe(signature.signed_at)}
                </div>
                {signature.ip ? (
                  <div style={{ color: BRAND.gray, fontSize: 11.5 }}>
                    IP: <span style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{signature.ip}</span>
                  </div>
                ) : null}
                {signature.document_sha256 ? (
                  <div style={{ color: BRAND.gray, fontSize: 10.5, wordBreak: 'break-all', direction: 'ltr', textAlign: 'right' }}>
                    SHA-256: {signature.document_sha256}
                  </div>
                ) : null}
              </div>
              <div style={{ fontSize: 11, color: BRAND.gray, marginTop: 8 }}>{signature.consent_text}</div>
            </div>
            {signature.signature_data_url ? (
              <div style={{ background: '#fff', border: `1px solid ${BRAND.line}`, borderRadius: 10, padding: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={signature.signature_data_url} alt="חתימה" style={{ width: 220, height: 90, objectFit: 'contain' }} />
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px' }}>
              <div style={{ fontSize: 12, color: BRAND.gray }}>שם החותם/ת</div>
              <div style={{ borderBottom: `1px solid ${BRAND.gray}`, height: 28 }} />
            </div>
            <div style={{ flex: '1 1 220px' }}>
              <div style={{ fontSize: 12, color: BRAND.gray }}>חתימה</div>
              <div style={{ borderBottom: `1px solid ${BRAND.gray}`, height: 28 }} />
            </div>
            <div style={{ flex: '0 1 140px' }}>
              <div style={{ fontSize: 12, color: BRAND.gray }}>תאריך</div>
              <div style={{ borderBottom: `1px solid ${BRAND.gray}`, height: 28 }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 28, textAlign: 'center', fontSize: 11.5, color: BRAND.gray }}>
        {settings.business_name}
        {settings.phone ? ` · ${settings.phone}` : ''}
        {settings.email ? ` · ${settings.email}` : ''}
      </div>
    </div>
  );
}

/** Full HTML document wrapper for the PDF renderer (fonts + print rules). */
export function quoteHtmlShell(innerHtml: string, title: string): string {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${title.replace(/</g, '&lt;')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${QUOTE_FONT_LINK}" rel="stylesheet" />
<style>
  @page { size: A4; margin: 14mm 12mm; }
  html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .quote-document { padding: 0 !important; max-width: none !important; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  h2 { page-break-after: avoid; }
  .quote-signature-block { page-break-inside: avoid; }
</style>
</head>
<body>${innerHtml}</body>
</html>`;
}
