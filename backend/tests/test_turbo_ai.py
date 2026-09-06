"""Tests for the Turbo-AI transformation.

Covers the P0 fixes and the new evidence/validation guarantees:

* research provider URLs, retries, timeouts, malformed payloads, fallback,
  empty results, cancellation and deduplication
* deterministic mathematics validation (never "verified" without a real check)
* structured notes, PDF rendering, filename shape
* AI router rules for keyless self-hosted models
* responsible exam-intelligence language
"""

from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.notes.structure import Block, NoteDocument, pdf_filename, safe_url  # noqa: E402
from app.research import providers  # noqa: E402
from app.topics import classifier  # noqa: E402
from app.validation import math_validator as mv  # noqa: E402


# --------------------------------------------------------------------------- 5.1
def test_provider_urls_are_valid_https():
    for url in (providers.TAVILY_SEARCH_URL, providers.BRAVE_SEARCH_URL, providers.SERPER_SEARCH_URL,
                providers.WIKIPEDIA_API_URL, providers.CROSSREF_WORKS_URL, providers.OPENALEX_WORKS_URL):
        assert url.startswith("https://"), url
        assert "{" not in url and "}" not in url, url


def test_engine_source_has_no_placeholder_urls():
    text = (BACKEND / "app/research/engine.py").read_text()
    assert "{{http" not in text


class _Response:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class _Client:
    """Minimal httpx.AsyncClient stand-in driven by a scripted list of outcomes."""

    def __init__(self, outcomes):
        self.outcomes = list(outcomes)
        self.calls = 0

    async def get(self, *args, **kwargs):
        return self._next()

    async def post(self, *args, **kwargs):
        return self._next()

    def _next(self):
        self.calls += 1
        outcome = self.outcomes.pop(0) if self.outcomes else _Response({})
        if isinstance(outcome, BaseException):
            raise outcome
        return outcome


def test_tavily_adapter_success():
    adapter = providers.TavilyAdapter()
    client = _Client([_Response({"results": [
        {"url": "https://example.org/a", "title": "A", "content": "alpha"},
        {"url": "https://example.org/b", "title": "B", "content": "beta"},
    ]})])
    hits = asyncio.run(adapter.search(client, "matrices", 5, "key"))
    assert [hit.url for hit in hits] == ["https://example.org/a", "https://example.org/b"]
    assert hits[0].provider == "tavily"


def test_adapter_malformed_payload_raises_value_error():
    adapter = providers.TavilyAdapter()
    client = _Client([_Response({"unexpected": True})])
    with pytest.raises(ValueError):
        asyncio.run(adapter.search(client, "matrices", 5, "key"))


def test_adapter_empty_result_is_empty_list():
    adapter = providers.BraveAdapter()
    client = _Client([_Response({"web": {"results": []}})])
    assert asyncio.run(adapter.search(client, "nothing", 5, "key")) == []


def test_adapter_timeout_propagates():
    adapter = providers.SerperAdapter()
    client = _Client([TimeoutError("timed out")])
    with pytest.raises(TimeoutError):
        asyncio.run(adapter.search(client, "slow", 5, "key"))


def test_retry_then_success():
    adapter = providers.TavilyAdapter()
    client = _Client([TimeoutError("first"), _Response({"results": [{"url": "https://x.org", "title": "X", "content": "c"}]})])

    async def with_retry():
        for attempt in range(2):
            try:
                return await adapter.search(client, "q", 3, "key")
            except TimeoutError:
                if attempt == 1:
                    raise
        return []

    hits = asyncio.run(with_retry())
    assert len(hits) == 1 and client.calls == 2


def test_provider_failure_falls_back_to_next_provider():
    failing = providers.TavilyAdapter()
    working = providers.BraveAdapter()
    client = _Client([RuntimeError("provider down"),
                      _Response({"web": {"results": [{"url": "https://ok.org", "title": "OK", "description": "d"}]}})])

    async def search_with_fallback():
        for adapter in (failing, working):
            try:
                return await adapter.search(client, "q", 3, "key")
            except Exception:  # noqa: BLE001
                continue
        return []

    hits = asyncio.run(search_with_fallback())
    assert len(hits) == 1 and hits[0].provider == "brave"


def test_cancellation_is_propagated():
    adapter = providers.TavilyAdapter()
    client = _Client([asyncio.CancelledError()])
    with pytest.raises(asyncio.CancelledError):
        asyncio.run(adapter.search(client, "q", 3, "key"))


def test_deduplication_removes_equivalent_urls():
    hits = [
        providers.Hit(url="https://example.org/page", title="A", snippet="s", provider="tavily"),
        providers.Hit(url="https://example.org/page?utm_source=x", title="A dup", snippet="s", provider="brave"),
        providers.Hit(url="https://other.org/page", title="B", snippet="s", provider="serper"),
    ]

    def canonicalize(url: str) -> str:
        return url.split("?")[0].rstrip("/")

    unique = providers.deduplicate(hits, canonicalize)
    assert len(unique) == 2


def test_keyless_baseline_discloses_its_limits():
    assert providers.LIMITATION_NOTE
    note = providers.LIMITATION_NOTE.lower()
    assert "not a full web index" in note
    assert providers.KEYLESS_PROVIDERS >= {"wikipedia", "crossref", "openalex"}


# --------------------------------------------------------------------------- 13
def test_determinant_and_rank():
    matrix = [[1, 2], [3, 4]]
    assert mv.validate_determinant(matrix, -2).passed
    assert not mv.validate_determinant(matrix, 5).passed
    assert mv.validate_rank(matrix, 2).passed
    assert mv.validate_rank([[1, 2], [2, 4]], 1).passed


def test_inverse_verifies_identity_product():
    matrix = [[4, 7], [2, 6]]
    inverse = [[0.6, -0.7], [-0.2, 0.4]]
    assert mv.validate_inverse(matrix, inverse).passed
    assert not mv.validate_inverse(matrix, [[1, 0], [0, 1]]).passed


def test_eigenpair_residual():
    matrix = [[2, 0], [0, 3]]
    assert mv.validate_eigenpair(matrix, 3, [0, 1]).passed
    assert not mv.validate_eigenpair(matrix, 3, [1, 0]).passed
    assert mv.validate_eigenpair(matrix, 3, [0, 0]).status == mv.FAILED


def test_cayley_hamilton_zero_matrix():
    result = mv.validate_cayley_hamilton([[1, 2], [3, 4]])
    assert result.passed, result.detail


def test_numeric_substitution_and_dimensions():
    ok = mv.validate_numeric_substitution("0.5*m*v**2", {"m": 2, "v": 3}, 9.0)
    assert ok.passed
    bad = mv.validate_numeric_substitution("0.5*m*v**2", {"m": 2, "v": 3}, 10.0)
    assert bad.status == mv.FAILED
    assert mv.validate_dimensions("kg*m^2/s^2", "J").passed
    assert mv.validate_dimensions("kg*m/s^2", "J").status == mv.FAILED


def test_expression_safety_filter():
    result = mv.validate_numeric_substitution("__import__('os').system('ls')", {}, 0)
    assert result.status == mv.NOT_RUN


def test_nine_step_numerical_schema_is_enforced():
    incomplete = {"problem": "Find KE", "given_data": "m=2kg", "expression": "0.5*m*v**2",
                  "values": {"m": 2, "v": 3}, "answer_value": 9.0}
    checked = mv.validate_solved_numerical(incomplete)
    assert checked["verified"] is False
    completeness = next(v for v in checked["validations"] if v["check"] == "nine_step_completeness")
    assert completeness["status"] == mv.FAILED
    assert completeness["data"]["missing"]


def test_nothing_is_verified_without_a_deterministic_check():
    result = mv.validate_determinant([[1, 2, 3]], 0)  # not square
    assert result.status == mv.NOT_RUN
    assert not result.passed


# --------------------------------------------------------------------------- 6
def test_topic_only_classification_never_invents_a_syllabus():
    result = classifier.classify("Matrices")
    assert result.subject
    assert 0 < result.confidence <= 1
    payload = result.to_dict()
    assert "university" not in str(payload).lower() or payload["academic_contexts"]
    assert classifier.classify("Photosynthesis").subject


def test_ambiguous_topic_offers_one_clarification():
    result = classifier.classify("Cell")
    assert result.is_ambiguous
    assert result.clarification_question
    assert isinstance(result.ambiguous_meanings, list) and result.ambiguous_meanings


def test_language_detection():
    assert classifier.detect_language("\u0917\u0924\u093f \u0915\u0947 \u0928\u093f\u092f\u092e") == "hi"
    assert classifier.detect_language("Matrices") == "en"


def test_research_queries_are_deduplicated():
    queries = classifier.research_queries(classifier.classify("Thermodynamics"))
    assert len(queries) == len(set(queries))
    assert queries


# --------------------------------------------------------------------------- 11 & 17
def _sample_document() -> NoteDocument:
    document = NoteDocument(topic="Matrices", subject="Mathematics", academic_context="general/inferred")
    document.add("overview", Block("paragraph", "A matrix is a rectangular array of numbers.", citations=["S1"]))
    document.add("formulas", Block("formula", "det(AB) = det(A)det(B)", data={"label": "Determinant product"}))
    document.add("tables", Block("table", items=[["2x2", "ad - bc"]], data={"headers": ["Order", "Determinant"]}))
    document.add("solved_numericals", Block("numerical", "Find det for [[1,2],[3,4]]",
                                            data={"final_answer": "-2", "verified": True}))
    document.add("quick_revision", Block("callout", "\u0906\u0935\u094d\u092f\u0942\u0939 \u0915\u093e \u0938\u093e\u0930\u093e\u0902\u0936", data={"title": "Hindi revision"}))
    document.add("sources", Block("source", data={"title": "[S1] Example", "url": "https://example.org/matrices"}))
    document.prune()
    return document


def test_structured_note_roundtrip_and_renderings():
    document = _sample_document()
    restored = NoteDocument.from_dict(document.to_dict())
    assert [s.key for s in restored.sections] == [s.key for s in document.sections]
    markdown = document.to_markdown()
    assert "## Formulas" in markdown
    html = document.to_html()
    assert "<h1>Matrices</h1>" in html
    assert document.table_of_contents()


def test_html_rendering_escapes_untrusted_content():
    document = NoteDocument(topic="XSS")
    document.add("overview", Block("paragraph", "<script>alert(1)</script>"))
    document.add("sources", Block("source", data={"title": "bad", "url": "javascript:alert(1)"}))
    html = document.to_html()
    assert "<script>" not in html
    assert "javascript:" not in html
    assert safe_url("javascript:alert(1)") == ""


def test_pdf_filename_pattern():
    name = pdf_filename("Class 10 Electricity")
    assert re.match(r"^StudyForge-Class-10-Electricity-Notes-\d{4}-\d{2}-\d{2}\.pdf$", name), name


def test_pdf_renders_a_real_document():
    from app.pdf.renderer import RENDERER_VERSION, render_note_pdf

    data, metadata = render_note_pdf(_sample_document())
    assert data[:5] == b"%PDF-"
    assert data.rstrip().endswith(b"%%EOF")
    assert metadata["byte_size"] > 3000
    assert metadata["renderer_version"] == RENDERER_VERSION
    assert metadata["page_size"] == "A4"
    assert len(metadata["checksum"]) == 64


def test_pdf_never_contains_raw_markdown_heading_markers():
    document = _sample_document()
    data, _ = render_note_pdf_safe(document)
    assert b"## " not in data


def render_note_pdf_safe(document):
    from app.pdf.renderer import render_note_pdf

    return render_note_pdf(document)


# --------------------------------------------------------------------------- 9
def test_keyless_self_hosted_omits_authorization_header():
    from app.ai.models.openai_compatible import OpenAICompatibleModel

    keyless = OpenAICompatibleModel("http://localhost:11434/v1", "", "llama3.1:8b")
    assert keyless.keyless is True
    assert "Authorization" not in keyless.headers()
    keyed = OpenAICompatibleModel("https://api.openai.com/v1", "sk-test", "gpt-4.1-mini")
    assert keyed.headers()["Authorization"] == "Bearer sk-test"


def test_self_hosted_host_allowlist():
    try:
        from app.ai.models.router import host_allowed
    except ModuleNotFoundError as exc:  # pragma: no cover - bare offline environment
        pytest.skip(f"backend runtime dependency missing: {exc.name}")

    assert host_allowed("http://ollama:11434/v1", ["ollama", "localhost"])
    assert not host_allowed("http://169.254.169.254/latest", ["ollama", "localhost"])


# --------------------------------------------------------------------------- 14
def test_irresponsible_exam_language_is_rejected():
    from app.studypack.builder import assert_responsible, topic_priority

    assert assert_responsible("Explain Ohm's law")
    for phrase in ("This is a guaranteed question", "100% coming", "Leaked paper"):
        with pytest.raises(ValueError):
            assert_responsible(phrase)

    category, rationale = topic_priority({"papers_analyzed": 0})
    assert category == "Insufficient Evidence"
    category, _ = topic_priority({"papers_analyzed": 6, "appearance_count": 6, "recent_appearances": 3})
    assert category == "Very High Priority"


def test_unsupported_claims_are_removed_and_disclosed():
    from app.studypack.builder import build_document

    classification = classifier.classify("Thermodynamics")
    sources = [{"id": "1", "url": "https://example.org/thermo", "title": "Thermo", "source_type": "web"}]
    claims = [
        {"claim_id": "C1", "claim_text": "Entropy never decreases in an isolated system.",
         "citation_id": "S1", "source_url": "https://example.org/thermo",
         "supporting_passage": "Entropy never decreases in an isolated system."},
        {"claim_id": "C2", "claim_text": "Invented claim", "citation_id": "S9",
         "supporting_passage": "nothing"},
    ]
    document = build_document(
        classification,
        sources=sources,
        claims=claims,
        retrieved_text={"https://example.org/thermo": "Entropy never decreases in an isolated system."},
    )
    assert document.validations["claims"]["supported"] == 1
    assert document.validations["claims"]["removed_unsupported"] == 1
    assert any("unsupported" in limitation.lower() for limitation in document.limitations)
    assert "Invented claim" not in document.to_markdown()


def test_no_generative_model_is_disclosed_not_faked():
    from app.studypack.builder import build_document

    document = build_document(classifier.classify("Matrices"), sources=[], claims=[], generative_available=False)
    text = " ".join(document.limitations).lower()
    assert "no generative model" in text


# --------------------------------------------------------------------------- 19
def test_no_billing_settings_remain():
    settings_text = (BACKEND / "app/config/settings.py").read_text()
    assert "billing_provider" not in settings_text
    assert "billing_webhook_secret" not in settings_text
