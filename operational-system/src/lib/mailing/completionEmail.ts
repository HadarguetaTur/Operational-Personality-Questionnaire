import { HOME_ABOUT_SECTION } from '@/config/landingCopy';
import { getSiteUrlString } from '@/lib/site';

/** Stored in `email_logs.metadata` to dedupe successful sends. */
export const QUIZ_COMPLETION_EMAIL_METADATA_KIND = 'quiz_completion' as const;

/** Optional DB override: `email_templates.name`. */
export const QUIZ_COMPLETION_TEMPLATE_NAME = 'quiz_completion' as const;

export const defaultQuizCompletionSubjectTemplate =
  'הדוח התפעולי שלך מוכן — {{name}}';

function calcomSectionHtml(calcomUrl: string): string {
  const u = calcomUrl.trim();
  if (!u) return '';
  return `
    <div style="margin: 28px 0; padding: 20px; background: #f1f5f9; border-radius: 8px;">
      <p style="color: #334155; font-size: 16px; line-height: 1.7; margin: 0 0 12px 0;">
        מוכנה לעבור על הדוח יחד? אפשר לקבוע שיחת בהירות של כ־30 דקות:
      </p>
      <a href="${u}" style="color: #0d9488; font-weight: 600; font-size: 16px;">קביעת מועד →</a>
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
      תודה שהשלמת את האבחון התפעולי. הדפוס שזוהה אצלך: <strong>{{pattern}}</strong>.
    </p>
    <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 8px 0;">
      תוצאת השאלון והדוח המלא מחכים לך בקישור הבא:
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{{report_url}}" style="background: #14b8a6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        לצפייה בתוצאת השאלון
      </a>
    </div>
    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
      הקישור שמור עבורך — אפשר לחזור אליו בכל עת ולהוריד PDF מתוך הדף.
    </p>

    <h2 style="color: #1e293b; font-size: 18px; margin: 24px 0 12px 0;">מה תמצאי בדוח</h2>
    <ul style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0; padding: 0 24px 0 0;">
      <li style="margin-bottom: 8px;">תמונה של המצב הנוכחי — איפה העסק נשען עלייך</li>
      <li style="margin-bottom: 8px;">פערים מרכזיים שכדאי לטפל בהם קודם</li>
      <li style="margin-bottom: 8px;">צעדים מיידיים וכיוון להמשך</li>
    </ul>

    <h2 style="color: #1e293b; font-size: 18px; margin: 28px 0 12px 0;">קצת עליי</h2>
    <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0;">
      ${aboutIntro.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </p>

    {{calcom_block}}

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
}

/**
 * Variables for subject + body templates (admin override or default).
 */
export function buildQuizCompletionVariables(input: QuizCompletionVariableInput): Record<string, string> {
  const base = getSiteUrlString().replace(/\/$/, '');
  const calRaw = process.env.NEXT_PUBLIC_CALCOM_URL?.trim() ?? '';
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? '';
  const supportPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE?.trim() ?? '';
  const businessAddress = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS?.trim() ?? '';

  return {
    name: input.name || '',
    pattern: input.pattern || '',
    report_url: input.reportUrl,
    calcom_url: calRaw,
    calcom_block: calcomSectionHtml(calRaw),
    support_email: supportEmail,
    support_phone: supportPhone,
    business_address: businessAddress,
    privacy_url: `${base}/privacy`,
    terms_url: `${base}/terms`,
  };
}
