import { json } from "../_shared/auth.js";
import { listRealtimeServices, realtimeCapabilities, runRealtimeTool } from "../_shared/realtime-tools.js";
import { enforceRateLimit } from "../_shared/security.js";

const HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS });
  if (request.method === "GET") {
    return json({ services: listRealtimeServices(), capabilities: realtimeCapabilities(env) }, 200, HEADERS);
  }
  if (request.method !== "POST") return json({ error: "Only GET and POST are supported." }, 405, HEADERS);

  try {
    await enforceRateLimit(request, env, "realtime", 30, 60);
    const raw = await request.text();
    if (raw.length > 40000) return json({ error: "Request is too large." }, 413, HEADERS);
    let body;
    try { body = JSON.parse(raw || "{}"); }
    catch { return json({ error: "Request body must be valid JSON." }, 400, HEADERS); }
    const result = await runRealtimeTool(body.tool || "auto", {
      query: typeof body.query === "string" ? body.query : "",
      location: body.location,
      amount: body.amount,
      from: body.from,
      to: body.to,
      asset: body.asset,
      quote: body.quote,
      package: body.package,
      url: body.url,
      limit: body.limit,
      domainFocus: body.domainFocus,
      researchMode: body.researchMode
    }, { env, request });
    return json(result, 200, HEADERS);
  } catch (error) {
    console.error("Realtime API error", error);
    return json({ error: error.message || "Live service failed." }, error.status || 500, HEADERS);
  }
}
