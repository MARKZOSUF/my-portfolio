import { json, requireUser } from "../_shared/auth.js";
import { enforceRateLimit } from "../_shared/security.js";

const PLANS = {
  student: { priceEnv: "STRIPE_STUDENT_PRICE_ID", amountEnv: "STUDENT_PLAN_AMOUNT", defaultAmount: 19900 },
  developer: { priceEnv: "STRIPE_DEVELOPER_PRICE_ID", amountEnv: "DEVELOPER_PLAN_AMOUNT", defaultAmount: 49900 }
};

export async function onRequestPost({ request, env }) {
  if (env.ENABLE_PAYMENTS !== "true") return json({ error: "Payments are disabled." }, 503);
  if (!env.DB) return json({ error: 'D1 binding "DB" is required for payments.' }, 503);
  try {
    const user = await requireUser(request, env);
    await enforceRateLimit(request, env, "checkout", 5, 900);
    const body = await request.json().catch(() => ({}));
    const planDefinition = PLANS[body.plan];
    const plan = planDefinition ? { ...planDefinition, amount: planAmount(env, planDefinition) } : null;
    if (!plan) return json({ error: "Unknown plan." }, 400);
    const provider = body.provider || (env.STRIPE_SECRET_KEY ? "stripe" : "razorpay");
    if (provider === "stripe") return stripeCheckout(body.plan, plan, user, request, env);
    if (provider === "razorpay") return razorpayCheckout(body.plan, plan, user, env);
    return json({ error: "Unsupported payment provider." }, 400);
  } catch (error) {
    return json({ error: error.message || "Checkout failed." }, error.status || 500);
  }
}

function planAmount(env, plan) {
  const configured = Number(env[plan.amountEnv] || plan.defaultAmount);
  return Number.isInteger(configured) && configured >= 100 && configured <= 10_000_000 ? configured : plan.defaultAmount;
}

async function stripeCheckout(planName, plan, user, request, env) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return json({ error: "Stripe secret and webhook secret are required." }, 503);
  }
  const priceId = env[plan.priceEnv];
  if (!priceId) return json({ error: `${plan.priceEnv} is not configured.` }, 503);
  const origin = new URL(request.url).origin;
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${origin}/?payment=cancelled`);
  params.set("customer_email", user.email);
  params.set("client_reference_id", user.id);
  params.set("metadata[user_id]", user.id);
  params.set("metadata[plan]", planName);
  params.set("subscription_data[metadata][user_id]", user.id);
  params.set("subscription_data[metadata][plan]", planName);
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const data = await response.json();
  if (!response.ok) return json({ error: data.error?.message || "Stripe checkout failed." }, response.status);
  await savePayment(env, user.id, "stripe", data.id, planName, plan.amount, "INR");
  return json({ provider: "stripe", url: data.url });
}

async function razorpayCheckout(planName, plan, user, env) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return json({ error: "Razorpay is not configured." }, 503);
  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: plan.amount,
      currency: "INR",
      receipt: `nexus_${Date.now()}`,
      notes: { plan: planName, user_id: user.id },
      payment_capture: 1
    })
  });
  const data = await response.json();
  if (!response.ok) return json({ error: data.error?.description || "Razorpay order failed." }, response.status);
  await savePayment(env, user.id, "razorpay", data.id, planName, plan.amount, "INR");
  return json({
    provider: "razorpay",
    orderId: data.id,
    amount: plan.amount,
    currency: "INR",
    keyId: env.RAZORPAY_KEY_ID,
    plan: planName,
    customer: { name: user.displayName, email: user.email }
  });
}

async function savePayment(env, userId, provider, providerRef, plan, amount, currency) {
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO payments(id,user_id,provider,provider_ref,plan,amount,currency,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'created',?,?)"
  ).bind(crypto.randomUUID(), userId, provider, providerRef, plan, amount, currency, now, now).run();
}
