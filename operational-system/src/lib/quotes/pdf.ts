// Server-only module (uses node:crypto / Chromium) — never import from client components.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import React from 'react';
// 'react-dom/server.edge' — Next 15 rejects a bare 'react-dom/server' import in the
// route-handler (RSC) layer; the edge build exposes the same renderToStaticMarkup.
import { renderToStaticMarkup } from 'react-dom/server.edge';
import { QuoteDocument, quoteHtmlShell, type QuoteDocumentProps } from '@/components/quotes/QuoteDocument';

/**
 * HTML → PDF with headless Chromium.
 *   * Vercel / Linux: @sparticuz/chromium ships the binary.
 *   * Local Windows/macOS dev: set CHROME_EXECUTABLE_PATH, or we probe the
 *     usual Chrome/Edge install locations.
 */

const WINDOWS_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const MAC_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

async function resolveBrowser(): Promise<{ executablePath: string; args: string[]; headless: boolean }> {
  const explicit = process.env.CHROME_EXECUTABLE_PATH?.trim();
  if (explicit && existsSync(explicit)) {
    return { executablePath: explicit, args: ['--no-sandbox', '--disable-gpu'], headless: true };
  }

  if (process.platform === 'linux') {
    const chromium = (await import('@sparticuz/chromium')).default;
    const executablePath = await chromium.executablePath();
    return { executablePath, args: chromium.args, headless: true };
  }

  const candidates = process.platform === 'win32' ? WINDOWS_CANDIDATES : MAC_CANDIDATES;
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      'לא נמצא דפדפן ליצירת PDF. הגדירי CHROME_EXECUTABLE_PATH בקובץ .env.local (נתיב ל-chrome.exe).',
    );
  }
  return { executablePath: found, args: ['--no-sandbox', '--disable-gpu'], headless: true };
}

export function renderQuoteHtml(props: QuoteDocumentProps): string {
  const inner = renderToStaticMarkup(React.createElement(QuoteDocument, props));
  return quoteHtmlShell(inner, `${props.quote.title} — Q-${props.quote.quote_number}`);
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer-core');
  const { executablePath, args, headless } = await resolveBrowser();
  const browser = await puppeteer.launch({ executablePath, args, headless });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 45_000 });
    // Make sure web fonts are actually loaded before printing (Hebrew glyphs).
    await page.evaluate(async () => {
      const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
      if (fonts?.ready) await fonts.ready;
    });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/** Renders the quote document to a PDF buffer and returns its SHA-256. */
export async function renderQuotePdf(props: QuoteDocumentProps): Promise<{ pdf: Buffer; sha256: string }> {
  const html = renderQuoteHtml(props);
  const pdf = await htmlToPdf(html);
  const sha256 = createHash('sha256').update(pdf).digest('hex');
  return { pdf, sha256 };
}
