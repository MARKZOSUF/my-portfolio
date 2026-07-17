# Cloudflare production setup

This project uses Cloudflare Pages Functions. Dashboard drag-and-drop uploads only the static files and will leave `/api/*` unavailable. Use a Git-connected Pages project or `wrangler pages deploy`.

## 1. Prepare the project

```bash
cp wrangler.toml.example wrangler.toml
```

Replace the D1, R2 and KV placeholder IDs. Do not commit `wrangler.toml` if it contains environment-specific identifiers you do not want public.

Required core bindings:

```text
AI          Workers AI
DB          D1 database
FILES       R2 bucket (optional)
RATE_LIMIT  KV namespace (recommended; D1 fallback is included)
```

## 2. Create and initialize D1

For a new database:

```bash
npx wrangler d1 create markzosuf-ai-nexus
npx wrangler d1 execute markzosuf-ai-nexus --remote --file=schema.sql
```

For an existing V10/V11 database, back it up and run once:

```bash
npx wrangler d1 execute markzosuf-ai-nexus --remote --file=MIGRATE-V11-1.sql
```

Do not run both `schema.sql` and `MIGRATE-V11-1.sql` on the same new database. The migration contains one-time `ALTER TABLE` statements.

## 3. Set safe public variables

Recommended defaults:

```text
ALLOW_GUEST_AI=true
ENABLE_MODERATION=true
ENABLE_PAYMENTS=false
REQUIRE_TURNSTILE=false
REQUIRE_EMAIL_VERIFICATION=false
PUBLIC_HOSTNAME=your-domain.example
STUDENT_PLAN_AMOUNT=19900
DEVELOPER_PLAN_AMOUNT=49900
```

Plan amounts are in the smallest currency unit: `19900` means ₹199. If Stripe is used, configure Stripe Price objects with the same displayed amounts.

External AI providers require both a secret API key and an explicit model variable. Example variable names:

```text
GITHUB_MODEL
OPENAI_MODEL
ANTHROPIC_MODEL
GEMINI_MODEL
GROQ_MODEL
```

Use model identifiers currently supported by your own provider account. Optional per-profile overrides use `_FAST`, `_SMART` and `_CODING`, such as `OPENAI_MODEL_CODING`.

## 4. Add secrets

Set secrets in the Cloudflare dashboard or with Wrangler:

```bash
npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name=markzosuf-ai-nexus
npx wrangler pages secret put ADMIN_TOKEN --project-name=markzosuf-ai-nexus
```

Other optional secrets:

```text
OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY
GITHUB_TOKEN
BRAVE_SEARCH_API_KEY, TAVILY_API_KEY or SERPER_API_KEY
RESEND_API_KEY and EMAIL_FROM
STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
NOTION_API_KEY, GOOGLE_WORKSPACE_ACCESS_TOKEN
SLACK_WEBHOOK_URL, DISCORD_WEBHOOK_URL
TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
```

Google browser login also needs the public variable `GOOGLE_CLIENT_ID`. An owner Google Workspace access token is admin-only and is not a replacement for multi-user OAuth.

## 5. Configure payments safely

Stripe:

1. Create recurring Price objects and set `STRIPE_STUDENT_PRICE_ID` and `STRIPE_DEVELOPER_PRICE_ID`.
2. Create a webhook for `https://YOUR_DOMAIN/api/webhooks/stripe`.
3. Subscribe at minimum to `checkout.session.completed` and `customer.subscription.deleted`.
4. Set the webhook signing secret as `STRIPE_WEBHOOK_SECRET`.
5. Test in Stripe test mode, then set `ENABLE_PAYMENTS=true`.

Razorpay:

1. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
2. Confirm the displayed plan amounts.
3. Test an order and the `/api/payment-verify` signature flow in test mode.
4. Set `ENABLE_PAYMENTS=true` only after verification succeeds.

The server upgrades a plan only after a trusted Stripe webhook or a verified, captured Razorpay payment.

## 6. Deploy Pages

```bash
npx wrangler pages project create markzosuf-ai-nexus
npx wrangler pages deploy . --project-name=markzosuf-ai-nexus
```

For Git deployment, connect the repository to Cloudflare Pages, keep the build command empty, set the output directory to `.`, and configure the same bindings and secrets for Preview and Production as needed.

## 7. Optional background scheduler

Copy `wrangler.scheduler.toml.example`, insert the same D1 ID, and deploy:

```bash
cp wrangler.scheduler.toml.example wrangler.scheduler.toml
npx wrangler deploy --config wrangler.scheduler.toml
```

Only administrator-created tasks can use shared Slack, Discord or Telegram delivery. Browser notifications still require the app to be open.

## 8. Launch checklist

- `/api/config` returns expected capabilities without exposing secrets.
- Signup, login, logout, recovery and verification work with Turnstile.
- Signed-out users can use AI by default. Set `ALLOW_GUEST_AI=false` or `REQUIRE_SIGN_IN_FOR_AI=true` to require login.
- D1, R2 and rate-limit storage are bound in Production.
- Admin and integration endpoints reject normal users.
- Payment sandbox tests and Stripe webhook signatures succeed before live mode.
- Privacy/terms text is updated for your actual domain, contact method and providers.
- Run `npm run check` before every deployment.


## V11.2 quick diagnostics

After deployment, open:

```text
https://YOUR_DOMAIN/api/health
```

`AI` is required for Cloudflare chat. `DB` is required for accounts/sync. `FILES` and `RATE_LIMIT` are optional in V11.2. Turnstile should remain disabled until both its site and secret keys are present.


## V11.3 guest AI behavior

Guest AI is now enabled by default so the public website can answer questions without requiring login.

Optional Cloudflare variables:

```text
ALLOW_GUEST_AI=true
REQUIRE_SIGN_IN_FOR_AI=false
CHAT_RATE_LIMIT_PER_MINUTE=12
GUEST_HOURLY_MESSAGES=30
GUEST_DAILY_AI_UNITS=30000
```

To require login later, set either:

```text
ALLOW_GUEST_AI=false
```

or:

```text
REQUIRE_SIGN_IN_FOR_AI=true
```

Public AI can consume the Workers AI free allowance, so keep rate limiting enabled.


## V11.4 deployment notes

No database migration is required.

After deployment, open:

```text
https://markzosuf.pages.dev/api/health
```

Expected version:

```json
"version": "11.4.0"
```

Then hard-refresh desktop and clear the mobile site's cached data once. The V11.4
service-worker cache prevents older layout files from being reused.


## V15.1.0 deployment

No database migration is required. Bind `AI` for Cloudflare AI; add `DB` for accounts, sync, projects, usage, and other cloud features. Recommended variables:

```text
ALLOW_GUEST_AI=true
REQUIRE_SIGN_IN_FOR_AI=false
ENABLE_MODERATION=true
CHAT_RATE_LIMIT_PER_MINUTE=12
```

Verify `https://markzosuf.pages.dev/api/health?build=115` returns `"version": "15.1.0"`.
