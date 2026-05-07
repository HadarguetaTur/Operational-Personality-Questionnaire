'use client';

type SignUrlResponse = { url?: string; error?: string };

/** Opens uploaded follow-up files: signed URL when `storage_path` exists; else legacy `file_url`. */
export async function openLeadDocument(
  storagePath: string | null | undefined,
  fileUrl: string | null | undefined,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const path = typeof storagePath === 'string' ? storagePath.trim() : '';
  if (path) {
    try {
      const res = await fetch('/api/admin/documents/sign-url', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: path }),
      });
      const data = (await res.json()) as SignUrlResponse;
      if (!res.ok || !data.url) {
        return { ok: false, message: data.error ?? 'לא ניתן לפתוח את הקובץ' };
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
      return { ok: true };
    } catch {
      return { ok: false, message: 'שגיאת רשת' };
    }
  }

  const legacy = typeof fileUrl === 'string' ? fileUrl.trim() : '';
  if (legacy) {
    window.open(legacy, '_blank', 'noopener,noreferrer');
    return { ok: true };
  }

  return { ok: false, message: 'אין קישור לקובץ' };
}
