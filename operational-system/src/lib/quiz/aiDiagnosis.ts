/**
 * Client helper for the generate-ai-diagnosis Edge Function.
 * Returns the AI diagnosis (cached on the leads row), or null if generation
 * failed — in which case the caller should silently omit AI sections.
 */
import { createClient } from '@/lib/supabase/client';
import { aiDiagnosisSchema, type ValidatedAiDiagnosis } from '@/lib/quiz/schemas';

export interface AiDiagnosisMeta {
  model?: string;
  provider?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
  generated_at?: string;
}

export interface AiDiagnosisResult {
  diagnosis: ValidatedAiDiagnosis | null;
  meta: AiDiagnosisMeta | null;
  cached: boolean;
  /** Populated only when the call succeeded but the response failed validation. */
  parseError?: string;
  /** Populated only when the upstream Edge Function reported a failure. */
  upstreamError?: string;
}

interface InvokeBody {
  lead_id: string;
  report_token?: string;
  force_refresh?: boolean;
}

interface InvokeResponse {
  ai_diagnosis?: unknown;
  meta?: AiDiagnosisMeta;
  cached?: boolean;
  error?: string;
}

export async function requestAiDiagnosis(
  leadId: string,
  reportToken?: string,
  options?: { forceRefresh?: boolean },
): Promise<AiDiagnosisResult> {
  const supabase = createClient();
  if (!supabase) {
    return {
      diagnosis: null,
      meta: null,
      cached: false,
      upstreamError: 'Missing Supabase environment variables',
    };
  }

  const body: InvokeBody = { lead_id: leadId };
  if (reportToken) body.report_token = reportToken;
  if (options?.forceRefresh) body.force_refresh = true;

  const { data, error } = await supabase.functions.invoke<InvokeResponse>(
    'generate-ai-diagnosis',
    { body },
  );

  if (error) {
    return {
      diagnosis: null,
      meta: null,
      cached: false,
      upstreamError: error.message,
    };
  }
  if (data?.error) {
    return {
      diagnosis: null,
      meta: data.meta ?? null,
      cached: data.cached ?? false,
      upstreamError: data.error,
    };
  }
  if (!data?.ai_diagnosis) {
    return {
      diagnosis: null,
      meta: data?.meta ?? null,
      cached: data?.cached ?? false,
    };
  }

  const parsed = aiDiagnosisSchema.safeParse(data.ai_diagnosis);
  if (!parsed.success) {
    return {
      diagnosis: null,
      meta: data.meta ?? null,
      cached: data.cached ?? false,
      parseError: JSON.stringify(parsed.error.format()).slice(0, 400),
    };
  }
  return {
    diagnosis: parsed.data,
    meta: data.meta ?? null,
    cached: data.cached ?? false,
  };
}
