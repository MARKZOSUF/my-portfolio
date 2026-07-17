# MARKZOSUF AI NEXUS V9.3 PLUS — Features 4–15

## Included features

4. Native Android/iOS wrapper scaffold using Capacitor  
5. Offline assistant with browser on-device model detection and local fallback  
6. Live collaboration rooms using D1 event polling  
7. Organizations and owner/admin/editor/viewer roles  
8. User-to-user organization channels  
9. AdSense, sponsor and affiliate configuration  
10. Public developer API keys and `/api/v1/chat`  
11. Fine-tuning dataset jobs and external provider adapter  
12. AES-GCM end-to-end encrypted vaults and encrypted channel messages  
13. Automatic daily cloud backup and restore  
14. WhatsApp share and optional WhatsApp Cloud API  
15. UPI payment intent, QR and initiation records  

## Cloudflare variables

### Monetization

```text
ADSENSE_CLIENT
ADSENSE_SLOT
SPONSOR_TITLE
SPONSOR_URL
AFFILIATE_LINKS_JSON
```

Example `AFFILIATE_LINKS_JSON`:

```json
[
  {
    "name": "Hosting partner",
    "url": "https://example.com/ref/markzosuf",
    "description": "Recommended hosting"
  }
]
```

### Fine-tuning provider

```text
FINE_TUNE_API_URL
FINE_TUNE_API_KEY
```

The URL must accept a JSON POST request. Without it, jobs are saved as
`dataset-ready`.

### WhatsApp Cloud API

```text
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_GRAPH_VERSION
```

`WHATSAPP_GRAPH_VERSION` is intentionally configurable so the deployment can
use the Graph API version supported by the connected Meta app.

### UPI

```text
UPI_VPA
UPI_PAYEE_NAME
```

A UPI intent is not payment verification. Confirm money through a bank record
or a verified payment-gateway webhook.

### Invitation email

```text
PUBLIC_SITE_URL
RESEND_API_KEY
EMAIL_FROM
```

## Database

The enterprise endpoint creates its tables safely on first authenticated use.
`MIGRATE-V9.3-PLUS.sql` is also included for a manual D1 migration.

Do not rerun the old `schema.sql` on an existing production database.

## Developer API

Create a key from **V9.3 Plus → Developer API**.

```bash
curl -X POST "https://markzosuf.pages.dev/api/v1/chat" \
  -H "Authorization: Bearer nx_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain Python lists"}'
```

Keys are hashed in D1 and the full secret is displayed only once.

## Limits and external requirements

- The ZIP provides native wrapper source, not a signed APK/AAB/IPA.
- Live collaboration uses three-second D1 polling, not WebSocket presence.
- The local offline fallback is not a full universal LLM. A browser-provided
  on-device model is used automatically when available.
- Fine-tuning requires an external provider endpoint for actual training.
- AdSense only renders after the publisher client and slot are approved and
  configured.
- WhatsApp server sending requires Meta Cloud API credentials.
- UPI QR images use an online QR image service; the UPI deep link remains
  available if the image service is unavailable.
