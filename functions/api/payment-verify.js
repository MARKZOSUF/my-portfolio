import { json, requireUser } from "../_shared/auth.js";
import { enforceRateLimit } from "../_shared/security.js";

export async function onRequestPost({ request, env }) {
  if (env.ENABLE_PAYMENTS !== "true" || !env.DB) return json({ error: "Payments are not available." }, 503);
  try {
    const user = await requireUser(request, env);
    await enforceRateLimit(request, env, "payment-verify", 10, 900);
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.razorpay_order_id || "");
    const paymentId = String(body.razorpay_payment_id || "");
    const signature = String(body.razorpay_signature || "");
    if (!orderId || !paymentId || !signature || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_KEY_ID) {
      return json({ error: "Incomplete payment verification data." }, 400);
    }
    const expected = await hmacHex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);
    if (!constantTimeEqual(signature, expected)) return json({ error: "Payment signature is invalid." }, 400);
    const pending = await env.DB.prepare(
      "SELECT id,plan,amount,currency,status FROM payments WHERE provider='razorpay' AND provider_ref=? AND user_id=?"
    ).bind(orderId, user.id).first();
    if (!pending) return json({ error: "Payment order was not found." }, 404);
    if (pending.status === "completed") return json({ verified: true, plan: pending.plan });

    const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" }
    });
    const payment = await response.json();
    if (!response.ok || payment.status !== "captured" || payment.order_id !== orderId || Number(payment.amount) !== Number(pending.amount) || payment.currency !== pending.currency) {
      return json({ error: "Payment is not captured or does not match the order." }, 400);
    }
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("UPDATE payments SET status='completed',subscription_ref=?,updated_at=? WHERE id=?")
        .bind(paymentId, now, pending.id),
      env.DB.prepare("UPDATE users SET plan=?,plan_expires_at=? WHERE id=?")
        .bind(pending.plan, now + 30 * 86400000, user.id)
    ]);
    return json({ verified: true, plan: pending.plan, expiresAt: now + 30 * 86400000 });
  } catch (error) {
    return json({ error: error.message || "Payment verification failed." }, error.status || 500);
  }
}

async function hmacHex(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left, right) {
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return mismatch === 0;
}
