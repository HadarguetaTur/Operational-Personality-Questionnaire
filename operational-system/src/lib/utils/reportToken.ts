const URL_SAFE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateReportToken(length: number = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let token = '';
  for (let i = 0; i < length; i++) {
    token += URL_SAFE_CHARS[bytes[i] % URL_SAFE_CHARS.length];
  }
  return token;
}
