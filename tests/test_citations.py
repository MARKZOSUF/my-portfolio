"""Citation and evidence-model tests (spec section 2)."""
from types import SimpleNamespace

from services.research.citations import (
    excerpt_matches,
    parse_doc_ref,
    validate_citation_text,
    validate_result_citations,
)


def web_source(index, text):
    return SimpleNamespace(citation_index=index, extracted_text=text, provider_snippet="")


def document(text, pages):
    body = "\n\n".join(f"[Document page {p}]\n{text}" for p in pages)
    return SimpleNamespace(
        original_name="notes.pdf",
        extracted_text=body,
        page_map_json=[{"page": p, "characters": len(text)} for p in pages],
    )


DOC = document("Normalization removes redundancy from relational schemas.", [1, 3])
SRC = web_source(1, "Normal forms organize database tables to reduce redundancy.")


def _result(claims, overview=""):
    return {
        "overview": overview,
        "quick_summary": "",
        "complete_notes_markdown": "",
        "revision_sheet_markdown": "",
        "comparison_tables_markdown": "",
        "claims": claims,
    }


def test_valid_web_citation_kept():
    text, invalid = validate_citation_text("Fact [1].", [SRC])
    assert "[1]" in text and invalid == []


def test_invalid_web_citation_replaced():
    text, invalid = validate_citation_text("Fact [9].", [SRC])
    assert "[9]" not in text and "Needs verification" in text and invalid == ["9"]


def test_valid_document_citation_kept():
    text, invalid = validate_citation_text("From my notes [D1].", [], [DOC])
    assert "[D1]" in text and invalid == []


def test_invalid_document_citation_replaced():
    text, invalid = validate_citation_text("Ghost [D7].", [], [DOC])
    assert "[D7]" not in text and invalid == ["D7"]


def test_document_page_references():
    ok, bad_ok = validate_citation_text("See [D1:p3].", [], [DOC])
    assert "[D1:p3]" in ok and bad_ok == []
    replaced, bad = validate_citation_text("See [D1:p9].", [], [DOC])
    assert "[D1:p9]" not in replaced and bad == ["D1:p9"]
    slide_ok, _ = validate_citation_text("See [D1:slide3].", [], [DOC])
    assert "[D1:slide3]" in slide_ok


def test_parse_doc_ref_variants():
    assert parse_doc_ref(2) == "D2"
    assert parse_doc_ref("d1:p3") == "D1:p3"
    assert parse_doc_ref({"document": 2, "slide": 5}) == "D2:slide5"
    assert parse_doc_ref("nope") is None


def test_supported_claim_with_matching_excerpt():
    claim = {
        "claim": "Normalization reduces redundancy.",
        "confidence": 0.9,
        "supporting_source_ids": [1],
        "evidence_excerpts": ["reduce redundancy"],
    }
    result = validate_result_citations(_result([claim]), [SRC])
    assert result["claims"][0]["verification_status"] == "supported"


def test_unsupported_claim_needs_verification():
    claim = {"claim": "Unreferenced statement.", "confidence": 0.9, "supporting_source_ids": []}
    result = validate_result_citations(_result([claim]), [SRC])
    assert result["claims"][0]["verification_status"] == "needs_verification"


def test_mismatched_excerpt_not_supported():
    claim = {
        "claim": "X.",
        "supporting_source_ids": [1],
        "evidence_excerpts": ["completely unrelated content about cooking"],
    }
    result = validate_result_citations(_result([claim]), [SRC])
    assert result["claims"][0]["verification_status"] == "needs_verification"


def test_partial_support_when_some_references_match():
    claim = {
        "claim": "X.",
        "supporting_source_ids": [1, 2],
        "evidence_excerpts": ["reduce redundancy"],
    }
    result = validate_result_citations(_result([claim]), [SRC, web_source(2, "unrelated text")])
    assert result["claims"][0]["verification_status"] == "partially_supported"


def test_document_only_claim_supported_without_web_source():
    claim = {
        "claim": "Normalization removes redundancy.",
        "supporting_source_ids": [],
        "supporting_document_ids": ["D1:p3"],
        "evidence_excerpts": ["removes redundancy from relational schemas"],
    }
    result = validate_result_citations(_result([claim]), [], [DOC])
    validated = result["claims"][0]
    assert validated["verification_status"] == "supported"
    assert validated["supporting_document_ids"] == ["D1:p3"]


def test_conflicting_evidence_remains_visible():
    claim = {
        "claim": "X.",
        "supporting_source_ids": [1],
        "contradicting_source_ids": [1],
        "evidence_excerpts": ["reduce redundancy"],
    }
    result = validate_result_citations(_result([claim]), [SRC])
    validated = result["claims"][0]
    assert validated["verification_status"] == "contradicted"
    assert validated["contradicting_source_ids"] == [1]


def test_backward_compatible_int_source_count():
    result = validate_result_citations(_result([], overview="A [1] B [9]"), 1)
    assert "[1]" in result["overview"] and "[9]" not in result["overview"]


def test_excerpt_matching_is_approximate():
    assert excerpt_matches("removes redundancy from relational schemas", DOC.extracted_text)
    assert not excerpt_matches("", DOC.extracted_text)
    assert not excerpt_matches("unrelated cooking excerpt with many words", DOC.extracted_text)
