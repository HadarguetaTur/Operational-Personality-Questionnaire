// Supabase Edge Function: finalize-diagnostic
// ----------------------------------------------------------------------
// Atomic finalization of a diagnostic submission:
//   1. Validates leadId
//   2. Idempotency — if the lead already has a report_token + snapshot, returns it
//   3. Generates a fresh report_token, writes the snapshot to leads
//   4. Chains an internal call to trigger-send-report (Make scenario)
//   5. Returns { report_token, send_email_status } so the client can update UI
//
// The client previously did all of this directly via supabase.from('leads').update().
// Moving it to an Edge Function:
//   - Service-role auth (no RLS surprises mid-write)
//   - Single audit point (one place that finalizes a diagnostic)
//   - Idempotency in one place (re-submitting the same leadId is safe)
//   - Email trigger is chained inside the same request
// ----------------------------------------------------------------------
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const URL_SAFE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateReportToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let token = "";
  for (let i = 0; i < length; i++) {
    token += URL_SAFE_CHARS[bytes[i] % URL_SAFE_CHARS.length];
  }
  return token;
}

interface FinalizeRequest {
  lead_id?: string;
  snapshot?: Record<string, unknown>;
  result_pattern?: string | null;
  result_scale_stage?: string | null;
  result_top_metric?: string | null;
  duration_seconds?: number | null;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body: FinalizeRequest;
  try {
    body = (await req.json()) as FinalizeRequest;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const leadId = body.lead_id?.trim();
  if (!leadId) {
    return json(400, { error: "Missing lead_id in body" });
  }
  if (!body.snapshot || typeof body.snapshot !== "object") {
    return json(400, { error: "Missing or invalid snapshot in body" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Idempotency check ─────────────────────────────────────────────
  const { data: existing, error: lookupErr } = await supabase
    .from("leads")
    .select("id, report_token, result_snapshot, completed_at")
    .eq("id", leadId)
    .maybeSingle();

  if (lookupErr) {
    console.error("[finalize-diagnostic] DB lookup failed", lookupErr);
    return json(500, { error: "DB lookup failed", details: lookupErr.message });
  }
  if (!existing) {
    return json(404, { error: "Lead not found", lead_id: leadId });
  }

  // If already finalized — return the same token without re-writing.
  if (existing.report_token && existing.result_snapshot) {
    console.log("[finalize-diagnostic] idempotent re-finalize", {
      leadId,
      existingToken: existing.report_token,
    });
    return json(200, {
      report_token: existing.report_token,
      already_finalized: true,
      send_email_status: "skipped",
    });
  }

  // ── Atomic write of snapshot + token + completion fields ──────────
  const reportToken = generateReportToken(32);
  const completedAt = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    completed_at: completedAt,
    result_snapshot: body.snapshot,
    report_token: reportToken,
    lead_status: "completed",
  };
  if (body.result_pattern !== undefined) {
    updatePayload.result_pattern = body.result_pattern;
  }
  if (body.result_scale_stage !== undefined) {
    updatePayload.result_scale_stage = body.result_scale_stage;
  }
  if (body.result_top_metric !== undefined) {
    updatePayload.result_top_metric = body.result_top_metric;
  }
  if (typeof body.duration_seconds === "number") {
    updatePayload.duration_seconds = Math.round(body.duration_seconds);
  }

  const { data: updated, error: updateErr } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", leadId)
    .select("report_token")
    .single();

  if (updateErr || !updated?.report_token) {
    console.error("[finalize-diagnostic] DB update failed", updateErr);
    return json(500, {
      error: "Failed to persist diagnostic",
      details: updateErr?.message ?? "no row updated",
    });
  }

  // ── Background chain: AI → PDF → email ────────────────────────────
  // Runs after we return so the user lands on the report page in <1s.
  // Each step is best-effort: one failure does not block the next.
  // - generate-ai-diagnosis is idempotent (skips if cached)
  // - generate-pdf is idempotent (skips if URL already saved)
  // - trigger-send-report has its own idempotency via report_sent_at
  const chainPromise = (async () => {
    try {
      const { error: aiErr } = await supabase.functions.invoke(
        "generate-ai-diagnosis",
        { body: { lead_id: leadId, report_token: reportToken } },
      );
      if (aiErr) {
        console.warn(
          "[finalize-diagnostic] generate-ai-diagnosis returned error",
          aiErr.message,
        );
      }
    } catch (err) {
      console.warn("[finalize-diagnostic] generate-ai-diagnosis threw", err);
    }

    try {
      const { error: pdfErr } = await supabase.functions.invoke(
        "generate-pdf",
        { body: { lead_id: leadId, report_token: reportToken } },
      );
      if (pdfErr) {
        console.warn(
          "[finalize-diagnostic] generate-pdf returned error",
          pdfErr.message,
        );
      }
    } catch (err) {
      console.warn("[finalize-diagnostic] generate-pdf threw", err);
    }

    try {
      const { error: sendErr } = await supabase.functions.invoke(
        "trigger-send-report",
        { body: { submission_id: leadId, report_token: reportToken } },
      );
      if (sendErr) {
        console.warn(
          "[finalize-diagnostic] trigger-send-report returned error",
          sendErr.message,
        );
      }
    } catch (err) {
      console.warn("[finalize-diagnostic] trigger-send-report threw", err);
    }
  })();

  // EdgeRuntime.waitUntil keeps the function alive for the background chain
  // even after the response is returned. Falls back to inline await if the
  // runtime API isn't available (older Deno).
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) {
    runtime.waitUntil(chainPromise);
  } else {
    await chainPromise;
  }

  return json(200, {
    report_token: reportToken,
    already_finalized: false,
    pipeline_status: "queued",
  });
});
