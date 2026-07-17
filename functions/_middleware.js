export async function onRequest(context) {
  const requestId = crypto.randomUUID();
  try {
    const response = await context.next();
    const headers = new Headers(response.headers);
    headers.set("X-Request-ID", requestId);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (new URL(context.request.url).pathname.startsWith("/api/")) {
      headers.set("Cache-Control", "no-store");
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    const status = Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 500;
    console.error("Unhandled request error", { requestId, status, message: error?.message, stack: error?.stack });
    const message = status < 500 || context.env.DEBUG_ERRORS === "true"
      ? String(error?.message || "Request failed.")
      : "Unexpected server error.";
    return new Response(JSON.stringify({ error: message, requestId }), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Request-ID": requestId
      }
    });
  }
}
