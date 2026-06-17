import { HOME_ABOUT_SECTION } from '@/config/landingCopy';
import { getSiteUrlString } from '@/lib/site';

/** Stored in `email_logs.metadata` to dedupe successful sends. */
export const QUIZ_COMPLETION_EMAIL_METADATA_KIND = 'quiz_completion' as const;

/** Optional DB override: `email_templates.name`. */
export const QUIZ_COMPLETION_TEMPLATE_NAME = 'quiz_completion' as const;

export const defaultQuizCompletionSubjectTemplate =
  'התמונה האישית שלך מוכנה, {{name}}';

export interface RoiEmailData {
  result_type?: string;
  total_low?: number;
  total_high?: number;
  efficiency_low?: number;
  efficiency_high?: number;
  accuracy_level?: string;
  confidence_notes?: string;
}

/** Converts an Israeli mobile number like "050-434-3547" → "972504343547". */
export function buildWhatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  const international = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

// No self-service Cal.com button anymore — every meeting is booked through the
// WhatsApp bot so Hadar has full tracking per lead. WhatsApp is the single CTA.
function ctaBlockHtml(whatsappUrl: string): string {
  const hasWhatsapp = !!whatsappUrl.trim();
  if (!hasWhatsapp) return '';

  const waBtn = `<a href="${whatsappUrl}"
         style="display:inline-block; background:#25D366; color:white; padding:12px 22px;
                border-radius:8px; text-decoration:none; font-weight:700; font-size:15px; margin: 0 6px 10px 6px;">
         💬 לתיאום שיחה בוואטסאפ
       </a>`;

  return `
    <div style="margin: 32px 0; padding: 24px; background: #f1f5f9; border-radius: 10px; text-align: center;">
      <p style="color: #334155; font-size: 16px; line-height: 1.7; margin: 0 0 18px 0; font-weight: 600;">
        רוצה לעבור על הדוח יחד?
      </p>
      <p style="color: #475569; font-size: 14px; margin: 0 0 18px 0;">
        אפשר לכתוב לי בוואטסאפ ונתאם שיחה קצרה ישירות שם.
      </p>
      ${waBtn}
    </div>`;
}

/**
 * Default RTL HTML for the post-quiz email. Uses <code>{{placeholders}}</code> compatible with
 * {@link import('@/lib/google/gmail').injectTemplateVariables}.
 */
export function getDefaultQuizCompletionHtmlTemplate(): string {
  const aboutIntro = HOME_ABOUT_SECTION.whyMeIntro;
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: 'Heebo', Arial, sans-serif; background: #f8fafc; padding: 40px 20px; direction: rtl;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #1e293b; font-size: 22px; margin: 0 0 16px 0;">שלום {{name}},</h1>
    <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 12px 0;">
      תודה שעשית את הבדיקה "איפה הכסף?". התמונה האישית שלך מוכנה.
    </p>

    <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 8px 0;">
      התמונה המלאה, עם הדפוס שזיהינו אצלך והצעד הראשון שכדאי לעשות, מחכה לך בקישור הבא:
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{{report_url}}" style="background: #14b8a6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        לצפייה בתוצאה המלאה ←
      </a>
    </div>
    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
      הקישור שמור עבורך, אפשר לחזור אליו בכל עת.
    </p>

    <h2 style="color: #1e293b; font-size: 18px; margin: 24px 0 12px 0;">מה מחכה לך בתמונה המלאה</h2>
    <ul style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0; padding: 0 24px 0 0;">
      <li style="margin-bottom: 8px;">הדפוס שזיהינו אצלך, ואיפה הכסף והזמן נוזלים בדרך</li>
      <li style="margin-bottom: 8px;">התחום שכדאי לסדר ראשון, עם הסבר למה</li>
      <li style="margin-bottom: 8px;">שלושה צעדים שאפשר להתחיל מהם כבר עכשיו</li>
    </ul>

    <h2 style="color: #1e293b; font-size: 18px; margin: 28px 0 12px 0;">קצת עליי</h2>
    <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0;">
      ${aboutIntro.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </p>

    {{cta_block}}

    <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 24px;">
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 8px 0;">
        יצירת קשר: <a href="mailto:{{support_email}}" style="color: #64748b;">{{support_email}}</a>
        · {{support_phone}}
      </p>
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0 0 8px 0;">
        {{business_address}}
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        <a href="{{privacy_url}}" style="color: #94a3b8;">מדיניות פרטיות</a>
        ·
        <a href="{{terms_url}}" style="color: #94a3b8;">תנאי שימוש</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export interface QuizCompletionVariableInput {
  name: string;
  pattern: string;
  reportUrl: string;
  roiData?: RoiEmailData | null;
}

/**
 * Variables for subject + body templates (admin override or default).
 */
export function buildQuizCompletionVariables(input: QuizCompletionVariableInput): Record<string, string> {
  const base = getSiteUrlString().replace(/\/$/, '');
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? '';
  const supportPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE?.trim() ?? '';
  const businessAddress = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS?.trim() ?? '';
  const whatsappUrl = buildWhatsappUrl(supportPhone);

  return {
    name: input.name || '',
    pattern: input.pattern || '',
    report_url: input.reportUrl,
    // Funnel is qualitative now — no numeric ROI block in the email.
    roi_block: '',
    // Backwards-compat: templates that still reference {{calcom_url}} now get
    // the WhatsApp chat URL — booking happens only through the bot.
    calcom_url: whatsappUrl,
    whatsapp_url: whatsappUrl,
    cta_block: ctaBlockHtml(whatsappUrl),
    support_email: supportEmail,
    support_phone: supportPhone,
    business_address: businessAddress,
    privacy_url: `${base}/privacy`,
    terms_url: `${base}/terms`,
  };
}
