// Supabase Edge Function: generate-pdf
// ----------------------------------------------------------------------
// Renders the live /result/{token} page with Browserless.io and stores the
// resulting PDF in Supabase Storage. Saves the public URL onto the lead row
// so the Make email scenario (and the on-screen "Download PDF" button) can
// link to it.
//
// Flow:
//   1. Receives { lead_id, report_token }
//   2. Idempotency: if report_pdf_url is already set, returns it
//   3. Marks lead.report_pdf_status='generating'
//   4. Calls Browserless.io /pdf endpoint with the live result URL
//   5. Uploads the binary to Storage bucket "reports" (named by token)
//   6. Updates lead with report_pdf_url + report_pdf_status='ready'
//   7. On any failure → status='failed' (or 'unconfigured' if no key)
//
// Failure-mode design:
//   - If BROWSERLESS_API_KEY is missing → status='unconfigured', return 200
//     with reason. This lets the caller still trigger the email (the email
//     just won't include a PDF link).
//   - If Browserless / Storage fails → status='failed', return 500 with
//     details. The caller may still continue the email chain.
// ----------------------------------------------------------------------
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BROWSERLESS_API_KEY = Deno.env.get("BROWSERLESS_API_KEY");
const BROWSERLESS_ENDPOINT = Deno.env.get("BROWSERLESS_ENDPOINT") ??
  "https://production-sfo.browserless.io";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL"); // public URL of the Vite app
const STORAGE_BUCKET = Deno.env.get("REPORTS_BUCKET") ?? "reports";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

interface RequestBody {
  lead_id?: string;
  report_token?: string;
  force_refresh?: boolean;
}

async function renderPdfViaBrowserless(url: string): Promise<
  | { ok: true; pdf: Uint8Array }
  | { ok: false; error: string }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(
      `${BROWSERLESS_ENDPOINT}/pdf?token=${BROWSERLESS_API_KEY}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          options: {
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
          },
          // Wait until the report's main heading is in the DOM and AI
          // sections have rendered. The page sets data-report-ready="true"
          // on body once everything is hydrated.
          waitForSelector: { selector: "body[data-report-ready='true']", timeout: 25000 },
          gotoOptions: { waitUntil: "networkidle0", timeout: 30000 },
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Browserless HTTP ${res.status}: ${text.slice(0, 400)}` };
    }
    const pdf = new Uint8Array(await res.arrayBuffer());
    if (pdf.byteLength === 0) {
      return { ok: false, error: "Browserless returned empty PDF" };
    }
    return { ok: true, pdf };
  } catch (err) {
    return { ok: false, error: `Fetch failed: ${(err as Error).message}` };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const leadId = body.lead_id?.trim();
  const reportToken = body.report_token?.trim();
  if (!leadId) return json(400, { error: "Missing lead_id" });
  if (!reportToken) return json(400, { error: "Missing report_token" });

  if (!APP_BASE_URL) {
    return json(500, {
      error: "APP_BASE_URL secret not configured",
      hint: "Set APP_BASE_URL to the public URL of the Vite app (e.g. https://diagnostic.example.com)",
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Load lead row ─────────────────────────────────────────────────
  const { data: lead, error: lookupErr } = await supabase
    .from("leads")
    .select("id, report_token, report_pdf_url, report_pdf_status")
    .eq("id", leadId)
    .maybeSingle();

  if (lookupErr) return json(500, { error: "DB lookup failed", details: lookupErr.message });
  if (!lead) return json(404, { error: "Lead not found" });
  if (lead.report_token !== reportToken) {
    return json(403, { error: "report_token mismatch" });
  }

  // ── Idempotency ───────────────────────────────────────────────────
  if (lead.report_pdf_url && !body.force_refresh) {
    return json(200, {
      report_pdf_url: lead.report_pdf_url,
      status: "ready",
      cached: true,
    });
  }

  // ── No Browserless key? Mark as unconfigured and bail gracefully ──
  if (!BROWSERLESS_API_KEY) {
    await supabase
      .from("leads")
      .update({ report_pdf_status: "unconfigured" })
      .eq("id", leadId);
    return json(200, {
      report_pdf_url: null,
      status: "unconfigured",
      reason: "BROWSERLESS_API_KEY not set",
    });
  }

  // ── Mark as generating ────────────────────────────────────────────
  await supabase
    .from("leads")
    .update({ report_pdf_status: "generating" })
    .eq("id", leadId);

  // ── Render PDF ────────────────────────────────────────────────────
  const reportUrl = `${APP_BASE_URL.replace(/\/$/, "")}/result/${encodeURIComponent(reportToken)}?print=1`;
  const render = await renderPdfViaBrowserless(reportUrl);
  if (!render.ok) {
    console.error("[generate-pdf] Browserless render failed", render.error);
    await supabase
      .from("leads")
      .update({ report_pdf_status: "failed" })
      .eq("id", leadId);
    return json(500, { error: "PDF render failed", details: render.error });
  }

  // ── Upload to Storage ─────────────────────────────────────────────
  const objectPath = `${reportToken}/report.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, render.pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadErr) {
    console.error("[generate-pdf] Storage upload failed", uploadErr);
    await supabase
      .from("leads")
      .update({ report_pdf_status: "failed" })
      .eq("id", leadId);
    return json(500, { error: "Storage upload failed", details: uploadErr.message });
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(objectPath);
  const reportPdfUrl = publicUrlData.publicUrl;

  // ── Persist URL on lead ───────────────────────────────────────────
  const generatedAt = new Date().toISOString();
  const { error: persistErr } = await supabase
    .from("leads")
    .update({
      report_pdf_url: reportPdfUrl,
      report_pdf_status: "ready",
      report_pdf_generated_at: generatedAt,
    })
    .eq("id", leadId);
  if (persistErr) {
    console.error("[generate-pdf] Failed to persist report_pdf_url", persistErr);
    // Storage upload succeeded but DB update failed. Still return URL — caller
    // can use it; next finalize will retry the DB write via idempotency.
  }

  return json(200, {
    report_pdf_url: reportPdfUrl,
    status: "ready",
    cached: false,
    generated_at: generatedAt,
  });
});
