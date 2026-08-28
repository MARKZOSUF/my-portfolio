"""Citation parsing and evidence-grounding checks.

Supported labels:
- ``[1]``        web source with citation_index 1
- ``[D1]``       uploaded document number 1 (1-based, in session order)
- ``[D1:p3]``    document 1, page 3
- ``[D2:slide5]`` document 2, slide 5

Verification is a heuristic grounding check, not independent factual
verification: a claim is only ``supported`` when its references exist AND a
non-empty evidence excerpt matches the referenced extracted content.
"""
import re

CITATION_RE = re.compile(
    r"\[(?P<web>\d+)\]"
    r"|\[(?P<doc>[Dd])(?P<docnum>\d+)(?::(?:(?P<page>p\d+)|(?:slide(?P<slide>\d+))))?\]"
)
NEEDS_VERIFICATION_LABEL = "[Needs verification]"


def _normalize(text):
    """Lowercase alphanumeric token stream used for excerpt matching."""
    return " ".join(re.findall(r"[a-z0-9]+", str(text or "").lower()))


def excerpt_matches(excerpt, content):
    """True when the excerpt is found in, or strongly overlaps, the content."""
    needle = _normalize(excerpt)
    haystack = _normalize(content)
    if not needle or not haystack:
        return False
    if needle in haystack:
        return True
    words = set(needle.split())
    if len(words) < 4:
        return needle in haystack
    hits = sum(1 for word in words if word in haystack)
    return hits / len(words) >= 0.7


def _doc_label(number, page=None, slide=None):
    label = f"D{number}"
    if page:
        return f"{label}:{page.lower()}"
    if slide:
        return f"{label}:slide{slide}"
    return label


def parse_doc_ref(value):
    """Normalize a document reference into 'D<n>', 'D<n>:p<page>', or None.

    Accepts ints, 'D1', 'd1:p3', 'D2:slide5', or dicts like
    {"document": 1, "page": 3} / {"document": 2, "slide": 5}.
    """
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return f"D{value}" if value > 0 else None
    if isinstance(value, dict):
        try:
            number = int(value.get("document") or value.get("id") or 0)
        except (TypeError, ValueError):
            return None
        if number <= 0:
            return None
        page = value.get("page")
        slide = value.get("slide")
        if page:
            return f"D{number}:p{int(page)}"
        if slide:
            return f"D{number}:slide{int(slide)}"
        return f"D{number}"
    text = str(value).strip()
    match = re.fullmatch(r"[Dd](\d+)(?::p(\d+)|:slide(\d+))?", text)
    if not match:
        return None
    number = int(match.group(1))
    if number <= 0:
        return None
    if match.group(2):
        return f"D{number}:p{match.group(2)}"
    if match.group(3):
        return f"D{number}:slide{match.group(3)}"
    return f"D{number}"


def split_doc_ref(label):
    """Return (document_number, page_number_or_None) for a normalized label."""
    match = re.fullmatch(r"D(\d+)(?::p(\d+)|:slide(\d+))?", label or "")
    if not match:
        return None, None
    page = match.group(2) or match.group(3)
    return int(match.group(1)), int(page) if page else None


def _doc_pages(document):
    pages = set()
    for entry in getattr(document, "page_map_json", None) or []:
        try:
            pages.add(int(entry.get("page")))
        except (TypeError, ValueError, AttributeError):
            continue
    return pages


def _doc_content(document, page=None):
    """Extracted text for a document, optionally narrowed to one page.

    ``extracted_text`` is stored with ``[Document page N]`` markers, so a page
    slice can be recovered without a schema change.
    """
    text = getattr(document, "extracted_text", "") or ""
    if page is None:
        return text
    marker = f"[Document page {page}]"
    start = text.find(marker)
    if start < 0:
        return ""
    nxt = text.find("[Document page ", start + len(marker))
    return text[start:nxt if nxt > 0 else len(text)]


class _CitationContext:
    def __init__(self, sources, documents):
        self.sources = list(sources or [])
        self.documents = list(documents or [])
        self.web_ids = {int(getattr(s, "citation_index", i)) for i, s in enumerate(self.sources, 1)}

    def web_exists(self, number):
        return number in self.web_ids

    def doc_exists(self, number, page=None):
        if not (1 <= number <= len(self.documents)):
            return False
        if page is None:
            return True
        return page in _doc_pages(self.documents[number - 1])

    def web_text(self, number):
        for source in self.sources:
            if int(getattr(source, "citation_index", 0) or 0) == number:
                return (getattr(source, "extracted_text", "") or "") + "\n" + (getattr(source, "provider_snippet", "") or "")
        return ""

    def doc_text(self, number, page=None):
        if not (1 <= number <= len(self.documents)):
            return ""
        return _doc_content(self.documents[number - 1], page)


def validate_citation_text(text, sources, documents=None):
    """Replace citations that reference missing sources/documents/pages.

    ``sources`` may be a list of source rows, an int source count, a set of
    valid web ids, or a pre-built context (backward compatible). ``documents``
    is the ordered D1..Dn list.
    """
    if isinstance(sources, _CitationContext):
        ctx = sources
    elif isinstance(sources, (int, set, frozenset)):
        ctx = _web_only_context(sources)
    else:
        ctx = _CitationContext(list(sources or []), list(documents or []))
    invalid = []

    def repl(match):
        if match.group("web"):
            number = int(match.group("web"))
            if ctx.web_exists(number):
                return match.group(0)
            invalid.append(str(number))
            return NEEDS_VERIFICATION_LABEL
        number = int(match.group("docnum"))
        page = match.group("page")
        slide = match.group("slide")
        page_num = int((page or slide or "0").lstrip("p") or 0) or None
        if ctx.doc_exists(number, page_num):
            return match.group(0)
        invalid.append(_doc_label(number, page, slide))
        return NEEDS_VERIFICATION_LABEL

    return CITATION_RE.sub(repl, str(text or "")), sorted(set(invalid))


def _web_only_context(available):
    """Backward-compatible shim: int count, a set of valid web ids, or a
    list of source-like objects with ``citation_index``."""
    if isinstance(available, int):
        ids = set(range(1, available + 1))
    else:
        ids = set()
        for item in available or []:
            if isinstance(item, bool):
                continue
            if isinstance(item, int):
                ids.add(item)
            elif hasattr(item, "citation_index"):
                ids.add(int(item.citation_index))
    ctx = _CitationContext([], [])
    ctx.web_ids = ids
    return ctx


def _clean_id_list(values, valid_ints):
    out = set()
    for value in values or []:
        try:
            number = int(value)
        except (TypeError, ValueError):
            continue
        if number in valid_ints:
            out.add(number)
    return sorted(out)


def _clean_doc_list(values, ctx):
    out = []
    for value in values or []:
        label = parse_doc_ref(value)
        if not label:
            continue
        number, page = split_doc_ref(label)
        if number and ctx.doc_exists(number, page):
            out.append(label)
    return sorted(set(out))


def _excerpt_grounding(excerpts, ctx, web_ids, doc_labels):
    """Check non-empty excerpts against referenced content.

    Returns (matched, total_references). A reference counts as matched when at
    least one excerpt approximately matches that reference's extracted text.
    """
    clean = [str(x).strip() for x in (excerpts or []) if str(x or "").strip()]
    if not clean:
        return 0, 0
    matched = 0
    total = len(web_ids) + len(doc_labels)
    for number in web_ids:
        content = ctx.web_text(number)
        if content and any(excerpt_matches(x, content) for x in clean):
            matched += 1
    for label in doc_labels:
        number, page = split_doc_ref(label)
        content = ctx.doc_text(number, page)
        if content and any(excerpt_matches(x, content) for x in clean):
            matched += 1
    return matched, total


def _validate_claim(raw, ctx):
    claim_text = str(raw.get("claim", "")).strip()
    if not claim_text:
        return None
    supporting = _clean_id_list(raw.get("supporting_source_ids"), ctx.web_ids)
    contradicting = _clean_id_list(raw.get("contradicting_source_ids"), ctx.web_ids)
    supporting_docs = _clean_doc_list(raw.get("supporting_document_ids"), ctx)
    contradicting_docs = _clean_doc_list(raw.get("contradicting_document_ids"), ctx)
    excerpts = [str(x)[:500] for x in raw.get("evidence_excerpts", [])[:5]]

    has_support = bool(supporting or supporting_docs)
    has_contra = bool(contradicting or contradicting_docs)
    matched, total = _excerpt_grounding(excerpts, ctx, supporting + contradicting, supporting_docs + contradicting_docs)

    notes = []
    if has_support and matched >= total and total > 0:
        status = "supported"
    elif has_support and matched > 0:
        status = "partially_supported"
        notes.append("Only some referenced evidence excerpts matched the stored content.")
    elif has_support:
        status = "needs_verification"
        notes.append("References exist but no evidence excerpt matched the referenced content.")
    else:
        status = "needs_verification"
        notes.append("No valid supporting reference was provided.")
    if has_contra:
        contra_matched, contra_total = _excerpt_grounding(excerpts, ctx, contradicting, contradicting_docs)
        if contra_matched:
            status = "contradicted"
            notes.append("Conflicting evidence matched the referenced content and remains visible.")
        else:
            notes.append("Conflicting references were reported but did not match stored evidence.")
    if raw.get("verification_notes"):
        notes.append(str(raw["verification_notes"])[:400])

    try:
        confidence = max(0.0, min(1.0, float(raw.get("confidence", 0))))
    except (TypeError, ValueError):
        confidence = 0.0
    return {
        "claim": claim_text[:2000],
        "verification_status": status,
        "confidence": confidence,
        "supporting_source_ids": supporting,
        "contradicting_source_ids": contradicting,
        "supporting_document_ids": supporting_docs,
        "contradicting_document_ids": contradicting_docs,
        "evidence_excerpts": excerpts,
        "verification_notes": " ".join(notes)[:1000],
    }


def validate_result_citations(result, sources, documents=None):
    """Validate narrative citations and claims against stored evidence.

    ``sources`` may be a list of ResearchSource rows, an int source count, or
    a set of valid web ids (backward compatible). ``documents`` is the ordered
    list of Document rows used as D1..Dn.
    """
    if isinstance(sources, (int, set, frozenset)):
        ctx = _web_only_context(sources)
    else:
        ctx = _CitationContext(sources, documents)
    invalid = []
    for key in ("overview", "quick_summary", "complete_notes_markdown", "revision_sheet_markdown", "comparison_tables_markdown"):
        result[key], bad = validate_citation_text(result.get(key, ""), ctx)
        invalid.extend(bad)
    claims = []
    raw_claims = result.get("claims", [])
    if isinstance(raw_claims, list):
        for raw in raw_claims:
            if not isinstance(raw, dict):
                continue
            claim = _validate_claim(raw, ctx)
            if claim:
                claims.append(claim)
    result["claims"] = claims
    result["citation_quality"] = {
        "invalid_citations_replaced": sorted(set(invalid)),
        "source_count": len(ctx.web_ids),
        "document_count": len(ctx.documents),
        "label": "Heuristic citation-grounding check, not independent factual verification",
    }
    return result
