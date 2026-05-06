import { google } from 'googleapis';

/**
 * Creates an authenticated Google OAuth2 client using service account or OAuth2 credentials.
 * For workspace-wide access (Gmail sending, Drive), use a service account with domain-wide delegation,
 * or OAuth2 with refresh token.
 */
export function getGoogleAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Google OAuth2 credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in environment variables.'
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return auth;
}

/**
 * Alternative: Service Account auth for domain-wide delegation.
 * Requires GOOGLE_SERVICE_ACCOUNT_KEY (JSON) and GOOGLE_DELEGATED_USER env vars.
 */
export function getServiceAccountAuth(scopes: string[]) {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const delegatedUser = process.env.GOOGLE_DELEGATED_USER;

  if (!keyJson) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable.');
  }

  const key = JSON.parse(keyJson);

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes,
    subject: delegatedUser || undefined,
  });

  return auth;
}
