/**
 * מפעיל את סנריו send_report ב-Make דרך Supabase Edge Function (שמתחברת ל-Make API).
 * קוראים אחרי עדכון דטא/טוקן הדוח ב-DB.
 */
import { supabase } from '../../lib/supabase';

export interface SendReportPayload {
  submission_id: string;
  report_token?: string;
}

/**
 * שולח submission_id ו-report_token ל-Edge Function שמפעילה את סנריו send_report ב-Make.
 */
export async function triggerSendReportScenario(
  submissionId: string,
  reportToken?: string
): Promise<void> {
  try {
    const body: SendReportPayload = { submission_id: submissionId };
    if (reportToken?.trim()) body.report_token = reportToken.trim();
    const { error } = await supabase.functions.invoke('trigger-send-report', {
      body,
    });
    if (error) {
      console.warn('[Make send_report]', error.message);
    }
  } catch (err) {
    console.warn('[Make send_report] Failed to trigger scenario:', err);
  }
}
