import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getQuoteById, getQuoteSignature, quoteFileName } from '@/lib/quotes/service';
import { getQuoteSettings } from '@/lib/quotes/settings';
import { renderQuotePdf } from '@/lib/quotes/pdf';
import { downloadQuoteFile } from '@/lib/quotes/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

const paramsSchema = z.object({ quoteId: z.string().uuid() });

/**
 * GET — PDF for the admin.
 *   * signed quote → the stored signed PDF (never re-rendered, hash must stay stable)
 *   * otherwise   → fresh render of the current content (preview/download)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const p = paramsSchema.safeParse(await params);
  if (!p.success) return NextResponse.json({ error: 'מזהה לא תקין' }, { status: 400 });

  const quote = await getQuoteById(p.data.quoteId);
  if (!quote) return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 });

  const inline = new URL(request.url).searchParams.get('inline') === '1';
  const signed = quote.status === 'signed' || quote.status === 'paid';

  let pdf: Buffer | null = null;
  if (signed && quote.signed_pdf_storage_path) {
    pdf = await downloadQuoteFile(quote.signed_pdf_storage_path);
  }
  if (!pdf) {
    try {
      const settings = await getQuoteSettings();
      let signature = null;
      if (signed) {
        const sig = await getQuoteSignature(quote.id);
        if (sig) {
          const png = await downloadQuoteFile(sig.signature_image_path);
          signature = { ...sig, signature_data_url: png ? `data:image/png;base64,${png.toString('base64')}` : null };
        }
      }
      pdf = (await renderQuotePdf({ quote, settings, signature })).pdf;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'יצירת PDF נכשלה';
      console.error('[admin/quotes/pdf]', err);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const filename = encodeURIComponent(quoteFileName(quote, signed));
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${filename}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
