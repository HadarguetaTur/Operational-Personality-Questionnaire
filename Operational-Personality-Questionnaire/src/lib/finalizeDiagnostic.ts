/**
 * Client helper for the finalize-diagnostic Edge Function.
 * Atomically: writes the snapshot + a fresh report token to the leads row,
 * marks the lead completed, and chains an email-trigger scenario.
 *
 * Use this from useReport.generateNewReport() instead of direct DB updates,
 * so we get idempotency, service-role auth, and a single audit point.
 *
 * Includes a client-side fallback (legacyFinalize) for when the Edge Function
 * is not yet deployed or unreachable — ensures the diagnostic still completes
 * even before deployment. The fallback path mirrors pre-Sprint-2 behavior:
 * direct DB update + direct send-report invocation.
 */
import { supabase } from './supabase';
import { generateReportToken } from './reportToken';
import { triggerSendReportScenario } from './makeSendReport';

export interface FinalizePayload {
  leadId: string;
  snapshot: Record<string, unknown>;
  result_pattern?: string | null;
  result_scale_stage?: string | null;
  result_top_metric?: string | null;
  duration_seconds?: number | null;
}

export interface FinalizeResult {
  reportToken: string;
  alreadyFinalized: boolean;
  /**
   * 'queued' for new finalizes (the AI/PDF/email chain runs in background).
   * 'skipped' on idempotent re-finalize (no work scheduled).
   * 'ok'/'failed' for the legacy direct-DB fallback path.
   */
  pipelineStatus: 'queued' | 'skipped' | 'ok' | 'failed';
  /** True if we used the client-side fallback (Edge Function unreachable). */
  usedFallback?: boolean;
}

/**
 * Heuristic: detect when the invoke error indicates the function isn't reachable
 * (vs. when the function ran and returned an error). The Supabase client wraps
 * fetch failures with this exact message; deployed functions returning errors
 * use FunctionsHttpError with different wording.
 */
function isFunctionUnreachable(err: { name?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.name === 'FunctionsFetchError') return true;
  const msg = err.message ?? '';
  return /failed to send a request|fetch|network|404|not found/i.test(msg);
}

async function legacyFinalize(payload: FinalizePayload): Promise<FinalizeResult> {
  console.warn(
    '[finalizeDiagnostic] Edge Function unreachable — falling back to direct DB write. ' +
    'Deploy the function with: supabase functions deploy finalize-diagnostic',
  );
  const reportToken = generateReportToken(32);
  const completedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('leads')
    .update({
      completed_at: completedAt,
      duration_seconds: payload.duration_seconds != null ? Math.round(payload.duration_seconds) : null,
      result_pattern: payload.result_pattern ?? null,
      result_scale_stage: payload.result_scale_stage ?? null,
      result_top_metric: payload.result_top_metric ?? null,
      result_snapshot: payload.snapshot,
      report_token: reportToken,
      lead_status: 'completed',
    })
    .eq('id', payload.leadId)
    .select('report_token')
    .single();

  if (error || !data?.report_token) {
    throw new Error(
      `Legacy fallback DB update failed: ${error?.message ?? 'no row updated'}`,
    );
  }

  let pipelineStatus: FinalizeResult['pipelineStatus'] = 'ok';
  try {
    await triggerSendReportScenario(payload.leadId, data.report_token);
  } catch (err) {
    console.warn('[finalizeDiagnostic] legacy send-report trigger failed', err);
    pipelineStatus = 'failed';
  }

  return {
    reportToken: data.report_token,
    alreadyFinalized: false,
    pipelineStatus,
    usedFallback: true,
  };
}

export async function finalizeDiagnostic(
  payload: FinalizePayload,
): Promise<FinalizeResult> {
  const { data, error } = await supabase.functions.invoke<{
    report_token?: string;
    already_finalized?: boolean;
    pipeline_status?: 'queued' | 'skipped' | 'ok' | 'failed';
    send_email_status?: 'ok' | 'failed' | 'skipped';
    error?: string;
    details?: string;
  }>('finalize-diagnostic', {
    body: {
      lead_id: payload.leadId,
      snapshot: payload.snapshot,
      result_pattern: payload.result_pattern ?? null,
      result_scale_stage: payload.result_scale_stage ?? null,
      result_top_metric: payload.result_top_metric ?? null,
      duration_seconds: payload.duration_seconds ?? null,
    },
  });

  if (error) {
    if (isFunctionUnreachable(error as { name?: string; message?: string })) {
      return legacyFinalize(payload);
    }
    throw new Error(`finalize-diagnostic invoke failed: ${error.message}`);
  }
  if (!data?.report_token) {
    throw new Error(
      `finalize-diagnostic returned no token (${data?.error ?? 'unknown error'}): ${data?.details ?? ''}`,
    );
  }
  // Prefer the new pipeline_status. Fall back to legacy send_email_status if
  // an older Edge Function deployment is still returning that field.
  const pipelineStatus: FinalizeResult['pipelineStatus'] =
    data.pipeline_status ?? data.send_email_status ?? 'queued';
  return {
    reportToken: data.report_token,
    alreadyFinalized: data.already_finalized ?? false,
    pipelineStatus,
  };
}
