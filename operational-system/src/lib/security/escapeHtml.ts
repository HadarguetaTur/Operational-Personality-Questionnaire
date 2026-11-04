/** Escapes a string for safe interpolation into HTML (email bodies, templates). */
export function escapeHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}
