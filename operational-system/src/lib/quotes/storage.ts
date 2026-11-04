// Server-only module (uses node:crypto / Chromium) — never import from client components.
import { createServiceRoleClient } from '@/lib/supabase/server';

const BUCKET = 'documents';

/** Path helpers — everything for a quote lives under quotes/{quoteId}/. */
export const quotePaths = {
  draftPdf: (quoteId: string) => `quotes/${quoteId}/quote.pdf`,
  signedPdf: (quoteId: string) => `quotes/${quoteId}/quote-signed.pdf`,
  signaturePng: (quoteId: string) => `quotes/${quoteId}/signature.png`,
};

export async function uploadQuoteFile(path: string, body: Buffer, contentType: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed (${path}): ${error.message}`);
}

export async function downloadQuoteFile(path: string): Promise<Buffer | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function signedUrlForQuoteFile(path: string, expiresInSeconds = 600): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Registers a file in the `documents` table so it shows up in /admin/documents
 * and on the lead card with no extra UI work. Upserts by storage_path.
 */
export async function registerQuoteDocument(params: {
  leadId: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('storage_path', params.storagePath)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('documents')
      .update({ file_name: params.fileName, file_size: params.fileSize, uploaded_at: new Date().toISOString() })
      .eq('id', existing.id);
    return;
  }

  const { error } = await supabase.from('documents').insert({
    lead_id: params.leadId,
    file_name: params.fileName,
    file_url: '',
    mime_type: params.mimeType,
    file_size: params.fileSize,
    storage_path: params.storagePath,
  });
  if (error) console.warn('[quotes/storage] documents insert failed (non-fatal):', error.message);
}
