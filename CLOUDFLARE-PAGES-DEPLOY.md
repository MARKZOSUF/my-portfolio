# Deploy StudyForge AI to Cloudflare Pages (zero-build, crash-proof)

The web app in `web/` is **plain HTML + CSS + ES modules**. There is no bundler,
no `npm install`, no build step. Cloudflare Pages therefore has nothing that can
fail at build time.

## 1. Push to Git

```bash
cd studyforge-ai
git init
git add .
git commit -m "StudyForge AI: web app + backend"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## 2. Create the Pages project

Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Pages** ->
**Connect to Git** -> pick your repository, then use exactly these settings:

| Setting | Value |
| --- | --- |
| Framework preset | **None** |
| Build command | **(leave completely empty)** |
| Build output directory | **`web`** |
| Root directory | **(leave empty / repository root)** |
| Environment variables | **none required** |
| Node version | not needed (no build) |

Click **Save and Deploy**. The first deploy takes a few seconds because Pages
only uploads static files. Your site is live at `https://<project>.pages.dev`.

## 3. Add ONE key so visitors never have to (do this once)

This is the important step. Add your key on Cloudflare and every visitor can
just type a topic - no sign-up, no key, no settings.

Pages -> your project -> **Settings** -> **Variables and Secrets** -> **Add**:

| Variable | Required | Example |
| --- | --- | --- |
| `AI_API_KEY` | **yes** | `sk-or-v1-...` |
| `AI_BASE_URL` | no | `https://openrouter.ai/api/v1` |
| `AI_MODEL` | no | `google/gemini-2.0-flash-001` |
| `AI_DIALECT` | no | `anthropic` only for a Claude key |

Use **Secret** (encrypted) for `AI_API_KEY`. Then **Deployments -> Retry
deployment** so the variable is picked up.

That is all. The app checks `/api/ai` on load; when it answers
`{ configured: true }` the key prompt disappears completely and the composer is
immediately usable.

### How it behaves

- **Key set on Cloudflare** -> visitor types a topic and presses the arrow. Done.
- **Visitor pastes their own key in Settings** -> their key wins, your quota is
  untouched.
- **No key anywhere** -> the app politely asks for one instead of crashing.

The browser never receives your key: requests go to `/api/ai`, the Pages
Function attaches the key server-side.

### Protect your quota

Because anyone can use your key through the site, either keep the project on a
cheap/fast model (`gpt-4o-mini`, `gemini-2.0-flash`, Groq Llama), set a spend
limit with your provider, or add Cloudflare **Access** / **Rate limiting** on
`/api/*` if the site is public.

## 4. First run

1. Open the site, click **Dashboard**.
2. Type a topic - or upload a PDF, record your voice, paste a YouTube link.
3. Press the purple arrow. Notes appear section by section.

If `AI_API_KEY` is missing, `/api/ai` simply answers `501` with a readable
message and the app falls back to asking for a personal key. It cannot crash the site.

`web/functions/api/youtube.js` needs no key at all - it reads public caption
tracks.

## 5. Why deployment cannot fail

- No build command, so no build error is possible.
- No `package.json` inside `web/`, so Pages never runs a package manager.
- Every asset path is relative (`./assets/...`), so it works on `pages.dev`,
  a custom domain, and preview URLs alike.
- KaTeX, pdf.js and mammoth are loaded lazily from a CDN **only when needed**.
  If the CDN is blocked, math falls back to readable raw LaTeX and file upload
  shows a friendly message instead of throwing.
- The Python backend in `backend/` is **not** part of the Pages deployment. It is
  optional and deploys separately (Render, Railway, Fly, Docker). Pages ignores it.

## 6. Custom domain

Pages -> **Custom domains** -> **Set up a domain**. No app change needed.

## 7. Local preview

```bash
cd web
python3 -m http.server 8080
# open http://localhost:8080
```

Pages Functions (`/api/*`) only run on Cloudflare or via `npx wrangler pages dev web`.
The app degrades gracefully without them.
