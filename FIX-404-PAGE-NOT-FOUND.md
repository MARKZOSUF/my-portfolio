# Fix: "This <hash>.<project>.pages.dev page can't be found"

Your deploy **succeeded**. This 404 only means Cloudflare Pages served a folder
that has no `index.html` in it - almost always because **Build output directory**
was left empty (repository root) instead of `web`.

## The 30-second fix

1. Cloudflare dashboard -> **Workers & Pages** -> your project.
2. **Settings** -> **Build** (older UI: *Builds & deployments*) -> **Edit configuration**.
3. Set exactly:

| Setting | Value |
| --- | --- |
| Framework preset | **None** |
| Build command | **(completely empty)** |
| Build output directory | **`web`** |
| Root directory | **(completely empty)** |

4. **Save**.
5. **Deployments** tab -> latest deployment -> **...** -> **Retry deployment**.

Wait ~20 seconds, then open the main URL (not the hash preview URL):
`https://<project>.pages.dev`

## This build also fixes it automatically

Two safety nets are now included, so the 404 cannot come back:

1. **`wrangler.toml` at the repo root** contains `pages_build_output_dir = "web"`.
   Pages reads this file and points itself at the right folder even if the
   dashboard setting is wrong. This alone fixes your error after one more push.

2. **A root `index.html` redirect.** If Pages does serve the repository root, that
   page instantly forwards to `./web/index.html` instead of 404ing. A matching
   `functions/api/` copy sits at the root too, so `/api/ai` keeps working in
   either configuration.

So: push this new ZIP's contents, retry the deployment, and the site opens.

## Checklist if it still 404s

- **Are you opening the hash URL?** `68e479c6.markzosuf.pages.dev` is a
  per-deployment preview. Use `markzosuf.pages.dev`. If the preview 404s but the
  main URL works, that deployment was simply an older/failed one.
- **Did the files actually get pushed?** Open your GitHub repo in the browser and
  confirm you can see the `web/` folder containing `index.html`. If `web/` is
  missing, run:
  ```bash
  git add -A
  git commit -m "Add StudyForge web app"
  git push
  ```
- **Is `web/` being ignored by git?** Check with `git check-ignore -v web/index.html`.
  If it prints a rule, remove that line from `.gitignore` and push again.
- **Deployment log**: Pages -> Deployments -> click the deployment. Under
  "Deploying to Cloudflare's global network" it should say it uploaded around
  **29 files**. If it says 0-2 files, the output directory is still wrong.
- **Wrong branch?** Pages -> Settings -> Build -> **Production branch** must match
  the branch you push to (usually `main`).
- **Root directory set by mistake?** It must be empty. If it says `web`, then the
  output directory must be `.` (a single dot), not `web` - otherwise Pages looks
  for `web/web`.

## Verify the API function after deploying

Open this in a browser tab:

```
https://<project>.pages.dev/api/ai
```

- `{"ok":true,"configured":true,...}` -> shared key is live, visitors need nothing.
- `{"ok":true,"configured":false,...}` -> add the `AI_API_KEY` variable, then retry the deployment.
- 404 -> the `functions/` folder was not deployed; re-check the output directory.
