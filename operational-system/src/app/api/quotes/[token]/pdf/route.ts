import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { buildAndStoreDraftPdf, getQuoteByToken, quoteFileName } from '@/lib/quotes/service';
import { downloadQuoteFile } from '@/lib/quotes/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

const TEN_MIN_MS = 10 * 60 * 1000;

/** GET /api/quotes/[token]/pdf — download a copy (signed version once signed). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!checkRateLimit(request, 'quote_pdf', 20, TEN_MIN_MS)) {
    return NextResponse.json({ error: 'יותר מדי בקשות' }, { status: 429 });
  }

  const quote = await getQuoteByToken((await params).token);
  if (!quote || quote.status === 'draft') {
    return NextResponse.json({ error: 'ההצעה לא נמצאה' }, { status: 404 });
  }

  const signed = quote.status === 'signed' || quote.status === 'paid';
  let pdf: Buffer | null = null;

  if (signed && quote.signed_pdf_storage_path) {
    pdf = await downloadQuoteFile(quote.signed_pdf_storage_path);
  } else if (!signed) {
    if (quote.pdf_storage_path) pdf = await downloadQuoteFile(quote.pdf_storage_path);
    if (!pdf) {
      try {
        pdf = (await buildAndStoreDraftPdf(quote)).pdf;
      } catch (err) {
        console.error('[quotes/pdf] render failed:', err);
      }
    }
  }

  if (!pdf) return NextResponse.json({ error: 'הקובץ אינו זמין כרגע' }, { status: 503 });

  const filename = encodeURIComponent(quoteFileName(quote, signed));
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
