// Supabase Edge Function: מקבל submission_id ומפעיל סנריו send_report ב-Make (דרך API או Webhook)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MAKE_API_KEY = Deno.env.get("MAKE_API_KEY");
const MAKE_ZONE = Deno.env.get("MAKE_ZONE") ?? "eu2.make.com";
const MAKE_ORG_ID = Deno.env.get("MAKE_ORG_ID");
const SCENARIO_ID = Deno.env.get("MAKE_SEND_REPORT_SCENARIO_ID");
const MAKE_SEND_REPORT_WEBHOOK_URL = Deno.env.get("MAKE_SEND_REPORT_WEBHOOK_URL");

interface ReqBody {
  submission_id?: string;
  report_token?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const useWebhook = MAKE_SEND_REPORT_WEBHOOK_URL?.trim();
  if (!useWebhook && !MAKE_API_KEY?.trim()) {
    return new Response(
      JSON.stringify({
        error:
          "Configure MAKE_API_KEY or MAKE_SEND_REPORT_WEBHOOK_URL in Supabase Secrets",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const submissionId = body?.submission_id?.trim();
  if (!submissionId) {
    return new Response(
      JSON.stringify({ error: "Missing submission_id in body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const reportToken = body?.report_token?.trim() ?? null;
  const payload = reportToken
    ? { submission_id: submissionId, report_token: reportToken }
    : { submission_id: submissionId };

  if (useWebhook) {
    const hookRes = await fetch(useWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!hookRes.ok) {
      const text = await hookRes.text();
      return new Response(
        JSON.stringify({
          error: "Make webhook error",
          status: hookRes.status,
          details: text.slice(0, 500),
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ ok: true, submission_id: submissionId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  let scenarioId = SCENARIO_ID?.trim();
  if (!scenarioId && MAKE_ORG_ID && MAKE_API_KEY) {
    try {
      const listRes = await fetch(
        `https://${MAKE_ZONE}/api/v2/scenarios?organizationId=${MAKE_ORG_ID}`,
        {
          headers: {
            Authorization: `Token ${MAKE_API_KEY}`,
            Accept: "application/json",
          },
        }
      );
      if (listRes.ok) {
        const data = (await listRes.json()) as {
          scenarios?: { id: number; name: string }[];
        };
        const sendReport = data.scenarios?.find(
          (s) => s.name?.toLowerCase() === "send_report"
        );
        if (sendReport) scenarioId = String(sendReport.id);
      }
    } catch (_e) {
      // ignore
    }
  }

  if (!scenarioId) {
    return new Response(
      JSON.stringify({
        error:
          "MAKE_SEND_REPORT_SCENARIO_ID not set and could not find scenario named send_report",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const runUrl = `https://${MAKE_ZONE}/api/v2/scenarios/${scenarioId}/run`;
  const runRes = await fetch(runUrl, {
    method: "POST",
    headers: {
      Authorization: `Token ${MAKE_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!runRes.ok) {
    const text = await runRes.text();
    return new Response(
      JSON.stringify({
        error: "Make API error",
        status: runRes.status,
        details: text.slice(0, 500),
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, submission_id: submissionId }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
