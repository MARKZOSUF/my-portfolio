import { json } from "../_shared/auth.js";
import { realtimeCapabilities } from "../_shared/realtime-tools.js";
import { isGuestAiAllowed } from "../_shared/security.js";
export async function onRequestGet({ env }) {
  const providers = { cloudflare: Boolean(env.AI),
    github: Boolean(env.GITHUB_TOKEN && env.GITHUB_MODEL), openai: Boolean(env.OPENAI_API_KEY && env.OPENAI_MODEL), anthropic: Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_MODEL), gemini: Boolean(env.GEMINI_API_KEY && env.GEMINI_MODEL), groq: Boolean(env.GROQ_API_KEY && env.GROQ_MODEL) };
  const stripeReady = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_STUDENT_PRICE_ID && env.STRIPE_DEVELOPER_PRICE_ID);
  const razorpayReady = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  const paymentsEnabled = env.ENABLE_PAYMENTS === "true" && Boolean(env.DB) && (stripeReady || razorpayReady);
  return json({ features: { ai: Object.values(providers).some(Boolean), database: Boolean(env.DB), storage: Boolean(env.FILES), webSearch: Boolean(env.BRAVE_SEARCH_API_KEY || env.TAVILY_API_KEY || env.SERPER_API_KEY), deepResearch: true, realtime: true, freePublicDiscovery: true, mcp: Boolean(env.MCP_ALLOWED_HOSTS), microsoft: Boolean(env.MICROSOFT_GRAPH_ACCESS_TOKEN), turnstile: env.REQUIRE_TURNSTILE === "true" && Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY),
      googleAuth: Boolean(env.GOOGLE_CLIENT_ID), payments: paymentsEnabled, rateLimit: Boolean(env.RATE_LIMIT || env.DB), projects:Boolean(env.DB), scheduledTasks:Boolean(env.DB), email:Boolean(env.RESEND_API_KEY&&env.EMAIL_FROM), imageEditing:Boolean(env.IMAGE_EDIT_API_URL), integrations:Boolean(env.GITHUB_TOKEN||env.NOTION_API_KEY||env.SLACK_WEBHOOK_URL||env.DISCORD_WEBHOOK_URL||env.TELEGRAM_BOT_TOKEN||env.GOOGLE_WORKSPACE_ACCESS_TOKEN), guestAi: isGuestAiAllowed(env), localFileFallback: true, memoryRateLimitFallback: true }, providers, turnstileSiteKey: env.TURNSTILE_SITE_KEY || "",
    googleClientId: env.GOOGLE_CLIENT_ID || "", cloudflareModel: env.CF_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast", realtime: realtimeCapabilities(env), paymentProvider: paymentsEnabled ? (stripeReady ? "stripe" : "razorpay") : "",
    guestPolicy: { enabled: isGuestAiAllowed(env), hourlyMessages: Number(env.GUEST_HOURLY_MESSAGES || 30), dailyUnits: Number(env.GUEST_DAILY_AI_UNITS || 30000) }, planPrices: { student: Math.round(Number(env.STUDENT_PLAN_AMOUNT || 19900) / 100), developer: Math.round(Number(env.DEVELOPER_PLAN_AMOUNT || 49900) / 100), currency: "INR", periodDays: 30 } });
}
