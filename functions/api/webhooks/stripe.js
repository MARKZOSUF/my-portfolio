import { json } from "../../_shared/auth.js";

export async function onRequestPost({ request, env }) {
  if (env.ENABLE_PAYMENTS !== "true" || !env.DB || !env.STRIPE_WEBHOOK_SECRET) {
    return json({ error: "Stripe webhook is not configured." }, 503);
  }
  const raw = await request.text();
  const header = request.headers.get("Stripe-Signature") || "";
  if (!(await verifyStripeSignature(raw, header, env.STRIPE_WEBHOOK_SECRET))) {
    return json({ error: "Invalid Stripe signature." }, 400);
  }
  const event = JSON.parse(raw);
  const object = event.data?.object || {};

  if (event.type === "checkout.session.completed" && ["paid", "no_payment_required"].includes(object.payment_status)) {
    const userId = String(object.metadata?.user_id || object.client_reference_id || "");
    const plan = String(object.metadata?.plan || "");
    if (userId && ["student", "developer"].includes(plan)) {
      await env.DB.batch([
        env.DB.prepare("UPDATE payments SET status='completed',subscription_ref=?,updated_at=? WHERE provider='stripe' AND provider_ref=? AND user_id=?")
          .bind(String(object.subscription || ""), Date.now(), object.id, userId),
        env.DB.prepare("UPDATE users SET plan=?,plan_expires_at=0 WHERE id=?").bind(plan, userId)
      ]);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const userId = String(object.metadata?.user_id || "");
    if (userId) {
      await env.DB.batch([
        env.DB.prepare("UPDATE payments SET status='cancelled',updated_at=? WHERE provider='stripe' AND subscription_ref=?")
          .bind(Date.now(), object.id),
        env.DB.prepare("UPDATE users SET plan='free',plan_expires_at=0 WHERE id=?").bind(userId)
      ]);
    }
  }

  return json({ received: true });
}

async function verifyStripeSignature(payload, header, secret) {
  const values = Object.fromEntries(header.split(",").map(part => part.split("=")).filter(part => part.length === 2));
  const timestamp = Number(values.t || 0);
  const signatures = header.split(",").filter(part => part.startsWith("v1=")).map(part => part.slice(3));
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300 || !signatures.length) return false;
  const expected = await hmacHex(secret, `${timestamp}.${payload}`);
  return signatures.some(signature => constantTimeEqual(signature, expected));
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
