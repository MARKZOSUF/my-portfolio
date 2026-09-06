# Research and citation system

## Providers

| Provider | Key required | Notes |
| --- | --- | --- |
| Tavily | yes | optional, administrator-configured |
| Brave | yes | optional |
| Serper | yes | optional |
| MediaWiki (en/hi) | no | documented public API, polite User-Agent |
| Crossref | no | polite pool via `CROSSREF_MAILTO` |
| OpenAlex | no | documented open API |

Nothing scrapes blocked content, bypasses authentication, or uses
reverse-engineered private endpoints.

**Keyless baseline disclosure.** When no commercial key is configured, the run
uses only the keyless adapters and the note carries this limitation verbatim:

> This run used the keyless public-source baseline (MediaWiki, Crossref,
> OpenAlex). It covers encyclopaedic and open academic metadata only. It is not a
> full web index, it may miss very recent material, and it cannot access
> paywalled or login-protected sources.

## Source priority

1. Official syllabus 2. Official question papers 3. Official marking schemes and
model papers 4. Government / university sources 5. Prescribed textbooks
6. Peer-reviewed and open-access research 7. Open educational resources
8. Public documentation 9. Reputable educational websites 10. User-uploaded material.

Priority feeds the quality score used for ranking and for ordering the
bibliography.

## Retrieval safety (preserved and tested)

SSRF protection and private-IP blocking, DNS resolution safety, redirect limits,
content-size limits, MIME validation, per-request timeouts, bounded retries with
jittered backoff, provider fallback, canonical-URL deduplication, source retention
and cooperative cancellation.

## Claims, citations and fact checking

Every important claim stores claim id, claim text, source id, source URL, the
exact supporting passage, source type, retrieval date, relevance score, quality
score, support status and confidence.

Validation is **not** performed by the same language model that wrote the text.
`validate_claim_support()` is deterministic: it checks that the cited source
exists in the retrieved set, that the URL belongs to that retrieved source, and
that the supporting passage really occurs in the retrieved content.

| Result | Action |
| --- | --- |
| supported | kept with its citation |
| uncertain | kept, explicitly marked uncertain |
| unsupported | removed from the notes and counted in the limitations section |

Conflicting claims are disclosed rather than silently resolved; outdated claims
are marked.

## Mathematics

`app/validation/math_validator.py` uses exact `Fraction` arithmetic (with SymPy
for symbolic equivalence when installed). It verifies determinant, rank,
`A A^-1 = I`, `Av = λv`, Cayley-Hamilton `p(A) = 0`, polynomial identities, unit
and dimensional consistency, numeric substitution, intermediate steps, final
answers and reasonableness. Numericals must present all nine steps (given data,
required quantity, formula, unit conversion, substitution, intermediate
calculation, final answer, unit/dimensional check, reasonableness) or they are
not marked verified. A result is **never** labelled verified unless a
deterministic validator actually passed; when a checker cannot run, the status is
`not_run`.

## Responsible exam intelligence

A question may be labelled a verified PYQ only when provenance (source paper,
institution/exam, year, page, question number, marks, type, mapped topic,
exact/paraphrased) is present. Generated practice questions, probable patterns
and mock questions are labelled separately and never presented as PYQs.

Priority categories: Very High Priority, High Priority, Medium Priority,
Foundation Topic, Low Historical Frequency, Insufficient Evidence - always with
the rationale (papers analysed, year range, appearances, marks, recency,
diversity, syllabus prominence). No fake probability precision is displayed.

Banned phrases ("guaranteed question", "confirmed future question", "100% coming",
"leaked paper", "definitely asked") are rejected in code by `assert_responsible()`.
Every exam-intelligence section carries:

> These suggestions are based on available syllabus and historical question-paper
> patterns. They do not guarantee the contents of a future examination.
