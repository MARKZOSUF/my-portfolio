"""Structured note document model.

A generated note is stored as structured data (ordered typed sections with
typed blocks), never as a single opaque Markdown string. Markdown, sanitized
HTML and PDF are all *renderings* of this structure.

Section keys follow the product specification. Only sections that are genuinely
applicable to the topic are emitted - the builder never pads a note with empty
formulas, numericals, derivations or fake previous-year questions.
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Iterable

SCHEMA_VERSION = "studyforge-note/2.0"

EXAM_DISCLAIMER = (
    "These suggestions are based on available syllabus and historical question-paper patterns. "
    "They do not guarantee the contents of a future examination."
)

# Canonical ordered catalogue of sections (key, human title).
SECTION_CATALOGUE: tuple[tuple[str, str], ...] = (
    ("overview", "Topic overview"),
    ("why_it_matters", "Why the topic matters"),
    ("prerequisites", "Prerequisites"),
    ("learning_objectives", "Learning objectives"),
    ("academic_context", "Academic / syllabus context"),
    ("key_terminology", "Key terminology"),
    ("definitions", "Definitions"),
    ("core_concepts", "Core concepts"),
    ("detailed_theory", "Detailed theory"),
    ("step_by_step", "Step-by-step explanation"),
    ("formulas", "Formulas"),
    ("derivations", "Formula derivations"),
    ("proofs", "Proofs"),
    ("tables", "Tables and comparisons"),
    ("diagrams", "Labelled diagrams"),
    ("solved_examples", "Solved examples"),
    ("solved_numericals", "Solved numericals"),
    ("units_checks", "Units and dimensional checks"),
    ("applications", "Real-world applications"),
    ("misconceptions", "Common misconceptions"),
    ("exam_mistakes", "Common examination mistakes"),
    ("important_topics", "Important topics"),
    ("verified_pyqs", "Verified previous-year questions"),
    ("question_patterns", "Probable question patterns"),
    ("marks_wise_questions", "Marks-wise questions"),
    ("quick_revision", "Quick revision"),
    ("formula_sheet", "Formula sheet"),
    ("flashcards", "Flashcards"),
    ("practice_quiz", "Practice quiz"),
    ("mock_exam", "Mock examination"),
    ("answer_key", "Answer key"),
    ("sources", "Sources"),
    ("limitations", "Research limitations"),
)

SECTION_TITLES = dict(SECTION_CATALOGUE)
SECTION_ORDER = [key for key, _ in SECTION_CATALOGUE]

# Block kinds understood by every renderer (viewer, Markdown, HTML, PDF).
BLOCK_KINDS = frozenset({
    "paragraph", "bullets", "numbered", "definition", "formula", "callout",
    "table", "diagram", "example", "numerical", "question", "flashcard",
    "quiz_item", "source", "note",
})


@dataclass
class Block:
    kind: str
    text: str = ""
    items: list[Any] = field(default_factory=list)
    data: dict[str, Any] = field(default_factory=dict)
    citations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Section:
    key: str
    title: str
    blocks: list[Block] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not any(block.text.strip() or block.items or block.data for block in self.blocks)

    def to_dict(self) -> dict:
        return {"key": self.key, "title": self.title, "blocks": [block.to_dict() for block in self.blocks]}


@dataclass
class NoteDocument:
    topic: str
    subject: str = ""
    academic_context: str = "general/inferred"
    language: str = "en"
    schema_version: str = SCHEMA_VERSION
    generated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    classification: dict[str, Any] = field(default_factory=dict)
    sections: list[Section] = field(default_factory=list)
    citations: list[dict[str, Any]] = field(default_factory=list)
    validations: dict[str, Any] = field(default_factory=dict)
    limitations: list[str] = field(default_factory=list)

    # -- construction ----------------------------------------------------
    def section(self, key: str) -> Section:
        for section in self.sections:
            if section.key == key:
                return section
        section = Section(key, SECTION_TITLES.get(key, key.replace("_", " ").title()))
        self.sections.append(section)
        return section

    def add(self, key: str, block: Block) -> None:
        self.section(key).blocks.append(block)

    def prune(self) -> None:
        """Drop sections with no real content and restore canonical order."""

        self.sections = [section for section in self.sections if not section.is_empty]
        self.sections.sort(key=lambda s: SECTION_ORDER.index(s.key) if s.key in SECTION_ORDER else 999)

    # -- serialisation ---------------------------------------------------
    def to_dict(self) -> dict:
        return {
            "schema_version": self.schema_version,
            "topic": self.topic,
            "subject": self.subject,
            "academic_context": self.academic_context,
            "language": self.language,
            "generated_at": self.generated_at,
            "classification": self.classification,
            "sections": [section.to_dict() for section in self.sections],
            "citations": self.citations,
            "validations": self.validations,
            "limitations": self.limitations,
        }

    @classmethod
    def from_dict(cls, payload: dict) -> "NoteDocument":
        document = cls(
            topic=payload.get("topic", ""),
            subject=payload.get("subject", ""),
            academic_context=payload.get("academic_context", "general/inferred"),
            language=payload.get("language", "en"),
            schema_version=payload.get("schema_version", SCHEMA_VERSION),
            generated_at=payload.get("generated_at", datetime.now(timezone.utc).isoformat()),
            classification=payload.get("classification", {}),
            citations=payload.get("citations", []),
            validations=payload.get("validations", {}),
            limitations=payload.get("limitations", []),
        )
        for raw_section in payload.get("sections", []):
            section = Section(raw_section["key"], raw_section.get("title", raw_section["key"]))
            for raw_block in raw_section.get("blocks", []):
                section.blocks.append(
                    Block(
                        kind=raw_block.get("kind", "paragraph"),
                        text=raw_block.get("text", ""),
                        items=raw_block.get("items", []),
                        data=raw_block.get("data", {}),
                        citations=raw_block.get("citations", []),
                    )
                )
            document.sections.append(section)
        return document

    # -- renderings ------------------------------------------------------
    def to_markdown(self) -> str:
        lines: list[str] = [f"# {self.topic}", ""]
        if self.subject:
            lines += [f"*Subject:* {self.subject}  ", f"*Academic context:* {self.academic_context}", ""]
        for section in self.sections:
            lines += [f"## {section.title}", ""]
            for block in section.blocks:
                lines += _block_markdown(block)
            lines.append("")
        return "\n".join(lines).strip() + "\n"

    def to_html(self) -> str:
        parts = [
            "<article class=\"studyforge-note\">",
            f"<h1>{html.escape(self.topic)}</h1>",
        ]
        if self.subject:
            parts.append(
                f"<p class=\"meta\">Subject: {html.escape(self.subject)} &middot; "
                f"Context: {html.escape(self.academic_context)}</p>"
            )
        for section in self.sections:
            parts.append(f"<section id=\"{html.escape(section.key)}\"><h2>{html.escape(section.title)}</h2>")
            for block in section.blocks:
                parts.append(_block_html(block))
            parts.append("</section>")
        parts.append("</article>")
        return "".join(parts)

    def table_of_contents(self) -> list[dict[str, str]]:
        return [{"key": section.key, "title": section.title} for section in self.sections]


# ---------------------------------------------------------------------------
# rendering helpers
# ---------------------------------------------------------------------------

_ALLOWED_URL = re.compile(r"^https?://", re.I)


def safe_url(url: str) -> str:
    """Only http(s) links survive; anything else is neutralised."""

    url = (url or "").strip()
    return url if _ALLOWED_URL.match(url) else ""


def _citation_suffix(block: Block) -> str:
    return " " + " ".join(f"[{ref}]" for ref in block.citations) if block.citations else ""


def _block_markdown(block: Block) -> list[str]:
    kind = block.kind
    if kind == "paragraph":
        return [block.text + _citation_suffix(block), ""]
    if kind == "bullets":
        return [f"- {item}" for item in block.items] + [""]
    if kind == "numbered":
        return [f"{index}. {item}" for index, item in enumerate(block.items, 1)] + [""]
    if kind == "definition":
        return [f"**{block.data.get('term', '')}** — {block.text}{_citation_suffix(block)}", ""]
    if kind == "formula":
        label = block.data.get("label", "")
        return ([f"**{label}**", ""] if label else []) + ["```", block.text, "```", ""]
    if kind == "callout":
        return [f"> **{block.data.get('title', 'Note')}:** {block.text}", ""]
    if kind == "table":
        headers = block.data.get("headers", [])
        rows = block.items or []
        if not headers:
            return []
        out = ["| " + " | ".join(str(h) for h in headers) + " |",
               "| " + " | ".join("---" for _ in headers) + " |"]
        out += ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
        return out + [""]
    if kind == "diagram":
        out = [f"**Figure: {block.data.get('caption', block.text)}**", ""]
        out += [f"- {label}" for label in block.items]
        return out + [""]
    if kind == "example":
        return [f"**Example.** {block.text}", ""] + [f"{index}. {step}" for index, step in enumerate(block.items, 1)] + [""]
    if kind == "numerical":
        out = [f"**Numerical.** {block.text}", ""]
        for step in ("given_data", "required_quantity", "formula", "unit_conversion", "substitution",
                     "intermediate_calculation", "final_answer", "unit_dimensional_check", "reasonableness_check"):
            value = block.data.get(step)
            if value:
                out.append(f"- *{step.replace('_', ' ').capitalize()}:* {value}")
        status = "verified" if block.data.get("verified") else "not deterministically verified"
        out += ["", f"*Validation status: {status}.*", ""]
        return out
    if kind == "question":
        marks = block.data.get("marks")
        head = f"**Q.** {block.text}" + (f" *({marks} marks)*" if marks else "")
        out = [head]
        if block.data.get("origin"):
            out.append(f"*Origin: {block.data['origin']}*")
        if block.data.get("model_answer"):
            out += ["", f"*Model answer:* {block.data['model_answer']}"]
        return out + [""]
    if kind == "flashcard":
        return [f"- **{block.data.get('front', '')}** → {block.data.get('back', '')}"]
    if kind == "quiz_item":
        out = [f"**{block.text}**"] + [f"   {chr(97 + i)}) {option}" for i, option in enumerate(block.items)]
        return out + [""]
    if kind == "source":
        url = safe_url(block.data.get("url", ""))
        title = block.data.get("title", url or "Source")
        return [f"- {title}" + (f" — {url}" if url else " — (URL withheld: unsupported scheme)")]
    return [block.text, ""]


def _block_html(block: Block) -> str:
    escape = html.escape
    kind = block.kind
    if kind in {"paragraph", "note"}:
        return f"<p>{escape(block.text)}{escape(_citation_suffix(block))}</p>"
    if kind == "bullets":
        return "<ul>" + "".join(f"<li>{escape(str(item))}</li>" for item in block.items) + "</ul>"
    if kind == "numbered":
        return "<ol>" + "".join(f"<li>{escape(str(item))}</li>" for item in block.items) + "</ol>"
    if kind == "definition":
        return (f"<dl class=\"definition\"><dt>{escape(str(block.data.get('term', '')))}</dt>"
                f"<dd>{escape(block.text)}</dd></dl>")
    if kind == "formula":
        return f"<div class=\"formula\"><code>{escape(block.text)}</code></div>"
    if kind == "callout":
        return (f"<aside class=\"callout\"><strong>{escape(str(block.data.get('title', 'Note')))}</strong> "
                f"{escape(block.text)}</aside>")
    if kind == "table":
        headers = block.data.get("headers", [])
        head = "".join(f"<th>{escape(str(h))}</th>" for h in headers)
        body = "".join(
            "<tr>" + "".join(f"<td>{escape(str(cell))}</td>" for cell in row) + "</tr>" for row in block.items
        )
        return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"
    if kind == "source":
        url = safe_url(str(block.data.get("url", "")))
        title = escape(str(block.data.get("title", url or "Source")))
        if not url:
            return f"<li>{title} (URL withheld: unsupported scheme)</li>"
        return f'<li><a href="{escape(url)}" rel="noopener noreferrer nofollow" target="_blank">{title}</a></li>'
    if kind == "flashcard":
        return (f"<div class=\"flashcard\"><span class=\"front\">{escape(str(block.data.get('front', '')))}</span>"
                f"<span class=\"back\">{escape(str(block.data.get('back', '')))}</span></div>")
    return f"<p>{escape(block.text)}</p>"


def sanitized_topic(topic: str) -> str:
    """Filesystem-safe topic fragment used in the PDF filename."""

    cleaned = re.sub(r"[^A-Za-z0-9\u0900-\u097F]+", "-", (topic or "notes").strip())
    cleaned = re.sub(r"-{2,}", "-", cleaned).strip("-")
    return (cleaned or "Notes")[:60]


def pdf_filename(topic: str, when: datetime | None = None) -> str:
    date = (when or datetime.now(timezone.utc)).strftime("%Y-%m-%d")
    return f"StudyForge-{sanitized_topic(topic)}-Notes-{date}.pdf"


def iter_blocks(document: NoteDocument) -> Iterable[tuple[Section, Block]]:
    for section in document.sections:
        for block in section.blocks:
            yield section, block
