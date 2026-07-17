# Security Policy

## Reporting
Do not publish secrets or exploit details in a public issue. Contact the repository owner privately with the affected endpoint, impact, and reproduction steps.

## Deployment checklist
- Store API keys only in Cloudflare secrets.
- Configure `ALLOWED_ORIGINS` for public API access.
- Bind D1, KV, R2 and Workers AI only when required.
- Rotate exposed credentials immediately.
- Keep dependencies and Cloudflare compatibility dates current.
