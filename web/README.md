# StudyForge AI — web app

Zero-build static app. Open `index.html` or serve the folder; there is nothing to compile.

```
web/
  index.html          landing page
  app.html            dashboard (composer + lessons)
  lesson.html         notes reader, quiz, flashcards, tutor
  _headers            security + cache headers (Cloudflare Pages)
  _redirects          pretty-URL rewrites
  robots.txt
  assets/css/app.css  full design system, light + dark, print styles
  assets/js/
    config.js         single-API-key store + provider auto-detection
    ai.js             chat / streaming / JSON calls, retries, friendly errors
    prompts.js        system prompt + the 17 section prompts
    research.js       keyless deep research (Wikipedia, Wikibooks, OpenAlex, arXiv, Crossref)
    generate.js       3-pass lesson pipeline (plan -> research -> parallel sections)
    render.js         Markdown + LaTeX + diagram/table renderer
    extract.js        PDF / DOCX / text extraction, YouTube, dictation
    store.js          IndexedDB lessons, folders, spaced-repetition progress
    quiz.js           interactive MCQ engine
    flashcards.js     SM-2 style flashcard drill
    ui.js             toasts, banners, modals, theme, download helpers
    dashboard.js      dashboard controller
    lesson.js         reader controller
  functions/api/
    ai.js             optional server-side key proxy (Pages Function)
    youtube.js        keyless transcript fetcher (Pages Function)
```

## Zero setup for visitors (default)

Set **one** environment variable in Cloudflare Pages -> Settings -> Variables:

```
AI_API_KEY = <any provider key>
```

On load the app calls `/api/ai`; when that Function reports a configured key,
the settings prompt disappears and visitors simply type a topic and press the
arrow. Nothing to sign up for, nothing to paste.

Optional extras: `AI_BASE_URL`, `AI_MODEL`, `AI_DIALECT` (`anthropic` for Claude).

## Bring your own key (fallback)

If no server key exists, or a visitor wants to use their own quota, they can
paste a key in **Settings**. A personal key always wins over the shared one.
The provider and a sensible default model are detected from the key prefix:

| Prefix | Provider | Default model |
| --- | --- | --- |
| `sk-or-` | OpenRouter | `google/gemini-2.0-flash-001` |
| `sk-ant-` | Anthropic | `claude-3-7-sonnet-latest` |
| `sk-proj-`, `sk-` | OpenAI | `gpt-4o` |
| `AIza` | Google Gemini | `gemini-2.5-pro` |
| `gsk_` | Groq | `llama-3.3-70b-versatile` |
| `csk-` | Cerebras | provider default |
| `xai-` | xAI | provider default |
| `hf_` | Hugging Face | provider default |
| `tgp_` | Together | provider default |
| 32-hex `sk-...` | DeepSeek | provider default |
| anything else | Custom | add a base URL under Advanced |

You can always override the model and base URL manually.

## Sections generated

**Core (always):** overview, syllabus & weightage, definitions, formula sheet,
step-by-step explanations, derivations, diagrams, solved numericals, question
bank, important/expected questions, common traps, revision sheet.

**Optional:** flashcards, quiz, mind map, viva questions, real-world applications.

Each section is a separate AI call, so long derivations are never truncated.

## Deployment

See `../CLOUDFLARE-PAGES-DEPLOY.md`. Short version: build command empty, output
directory `web`, no environment variables.
