# Citation model

## Formats

| Label | Meaning |
|---|---|
| `[1]`, `[2]` | Web source with `citation_index` n (stored ResearchSource) |
| `[D1]`, `[D2]` | Uploaded document n (1-based, in session document order) |
| `[D1:p3]` | Document 1, page 3 |
| `[D2:slide5]` | Document 2, slide 5 |

The synthesis prompt teaches both formats explicitly. The frontend highlights
both patterns; the PDF export lists web sources and notes when Document Study
Mode used no live sources.

## Validation (`services/research/citations.py`)

Narrative fields (overview, summaries, notes, revision sheet, comparison
tables) are scanned; citations referencing missing sources, documents, or
pages are replaced with `[Needs verification]` and reported in
`citation_quality.invalid_citations_replaced`.

Claims carry `supporting_source_ids`, `contradicting_source_ids`,
`supporting_document_ids`, and `contradicting_document_ids`. A claim is only
labeled `supported` when:

1. at least one referenced source/document/page exists, and
2. at least one non-empty evidence excerpt matches the referenced extracted
   content (exact normalized substring, or ≥70% token overlap for approximate
   matches).

Statuses:

- `supported` — every provided reference matched its content.
- `partially_supported` — some references matched, others did not.
- `needs_verification` — no references, or references whose excerpts did not
  match the stored content (a bare ID is never enough).
- `contradicted` — contradicting references matched evidence; the conflicting
  references remain visible in the claim record.

Document-supported claims are fully valid without any numeric web source.

## Limitations (honest labeling)

This is a heuristic grounding check, not independent factual verification: it
confirms that a claim's cited excerpt plausibly appears in the referenced
text. It cannot prove the claim true. Quality scores are heuristic indicators
and are labeled as such in the UI and PDF export.

## Backward compatibility

`validate_result_citations(result, sources, documents)` still accepts an int
source count or a set of valid web ids for `sources`, in which case only web
citations are validated.
