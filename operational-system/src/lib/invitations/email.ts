import { sendEmail } from '@/lib/google/gmail';

interface InvitationEmailParams {
  to: string;
  fullName: string;
  inviteUrl: string;
  expiresAt: Date;
  inviterName?: string;
}

interface PasswordResetEmailParams {
  to: string;
  fullName: string;
  resetUrl: string;
  expiresAt: Date;
}

function formatHebrewDate(date: Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function buildInviteHtml(p: InvitationEmailParams): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7fafc;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 32px 16px 32px;text-align:right;">
          <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#14b8a6,#10b981);"></div>
          <h1 style="font-size:22px;color:#0f172a;margin:20px 0 8px 0;">הוזמנת לנהל את המערכת</h1>
          <p style="font-size:16px;color:#475569;margin:0;">שלום ${escapeHtml(p.fullName)},</p>
        </td></tr>
        <tr><td style="padding:8px 32px 24px 32px;text-align:right;">
          <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 16px 0;">
            ${p.inviterName ? `${escapeHtml(p.inviterName)} הזמינ/ה אותך` : 'הוזמנת'} לקבל גישת מנהל למערכת התפעול.
            כדי לסיים את ההרשמה, לחצ/י על הכפתור ובחר/י סיסמה אישית.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background:linear-gradient(135deg,#14b8a6,#10b981);border-radius:8px;">
              <a href="${p.inviteUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">
                הגדר/י סיסמה והתחל/י
              </a>
            </td></tr>
          </table>
          <p style="font-size:13px;color:#64748b;margin:0 0 8px 0;">או העתק/י את הקישור הבא לדפדפן:</p>
          <p style="font-size:12px;color:#94a3b8;word-break:break-all;direction:ltr;text-align:left;background:#f1f5f9;padding:10px;border-radius:6px;margin:0 0 24px 0;">
            ${escapeHtml(p.inviteUrl)}
          </p>
          <p style="font-size:13px;color:#64748b;margin:0;border-top:1px solid #e2e8f0;padding-top:16px;">
            הקישור תקף עד <strong style="color:#334155;">${formatHebrewDate(p.expiresAt)}</strong>.
            אם לא ביקשת זימון זה, אפשר להתעלם מהמייל.
          </p>
        </td></tr>
      </table>
      <p style="font-size:12px;color:#94a3b8;margin:16px 0 0 0;">מערכת התפעול</p>
    </td></tr>
  </table>
</body></html>`;
}

function buildResetHtml(p: PasswordResetEmailParams): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7fafc;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 32px 16px 32px;text-align:right;">
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px 0;">איפוס סיסמה</h1>
          <p style="font-size:16px;color:#475569;margin:0;">שלום ${escapeHtml(p.fullName)},</p>
        </td></tr>
        <tr><td style="padding:8px 32px 24px 32px;text-align:right;">
          <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 16px 0;">
            התקבלה בקשה לאיפוס הסיסמה לחשבון שלך. לחצ/י על הכפתור כדי להגדיר סיסמה חדשה.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background:linear-gradient(135deg,#14b8a6,#10b981);border-radius:8px;">
              <a href="${p.resetUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">
                בחר/י סיסמה חדשה
              </a>
            </td></tr>
          </table>
          <p style="font-size:12px;color:#94a3b8;word-break:break-all;direction:ltr;text-align:left;background:#f1f5f9;padding:10px;border-radius:6px;margin:0 0 24px 0;">
            ${escapeHtml(p.resetUrl)}
          </p>
          <p style="font-size:13px;color:#64748b;margin:0;border-top:1px solid #e2e8f0;padding-top:16px;">
            הקישור תקף עד <strong style="color:#334155;">${formatHebrewDate(p.expiresAt)}</strong>.
            אם לא ביקשת לאפס סיסמה, אפשר להתעלם מהמייל.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendInvitationEmail(p: InvitationEmailParams): Promise<void> {
  await sendEmail({
    to: p.to,
    subject: 'הוזמנת לנהל את מערכת התפעול',
    htmlBody: buildInviteHtml(p),
  });
}

export async function sendPasswordResetEmail(p: PasswordResetEmailParams): Promise<void> {
  await sendEmail({
    to: p.to,
    subject: 'איפוס סיסמה למערכת התפעול',
    htmlBody: buildResetHtml(p),
  });
}
