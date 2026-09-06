"""Professional PDF renderer for StudyForge notes.

This replaces the previous primitive line-by-line ``canvas.drawString`` export.
It uses ReportLab Platypus so the document has a real flowable layout:

* A4 print layout with margins, running header, footer and page numbers
* Cover page with StudyForge AI branding, topic, subject/context, research date
* Automatic table of contents built from the structured note sections
* Typed rendering for paragraphs, bullets, definitions, formula blocks,
  callouts, tables, labelled diagrams, solved examples, solved numericals,
  questions, flashcards, sources/bibliography and research limitations
* Unicode support with Devanagari-capable font embedding (Hindi + Hinglish)

The renderer never emits raw Markdown symbols: it consumes the structured
:class:`~app.notes.structure.NoteDocument`, not a Markdown string.
"""

from __future__ import annotations

import hashlib
import io
import os
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from app.notes.structure import EXAM_DISCLAIMER, NoteDocument, pdf_filename, safe_url

RENDERER_VERSION = "studyforge-pdf/2.0-platypus"

BRAND = colors.HexColor("#3D5AFE")
INK = colors.HexColor("#1A1A1A")
MUTED = colors.HexColor("#5F6368")
RULE = colors.HexColor("#D8DCE6")
BOX_BG = colors.HexColor("#F2F4FA")

# Candidate font files, in preference order. Noto first (per specification),
# then Droid/DejaVu which ship with many Linux images. All are open-licensed.
_LATIN_CANDIDATES = (
    ("NotoSans", "/usr/share/fonts/google-noto/NotoSans-Regular.ttf", "/usr/share/fonts/google-noto/NotoSans-Bold.ttf"),
    ("NotoSans", "/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf", ""),
    ("NotoSans", "/usr/share/fonts/google-noto-vf/NotoSans[wdth,wght].ttf", ""),
    ("DroidSans", "/usr/share/fonts/google-droid-sans-fonts/DroidSans.ttf", "/usr/share/fonts/google-droid-sans-fonts/DroidSans-Bold.ttf"),
    ("DejaVuSans", "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf", "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf"),
    ("LiberationSans", "/usr/share/fonts/liberation-sans/LiberationSans-Regular.ttf", "/usr/share/fonts/liberation-sans/LiberationSans-Bold.ttf"),
)
_DEVANAGARI_CANDIDATES = (
    ("NotoSansDevanagari", "/usr/share/fonts/google-noto/NotoSansDevanagari-Regular.ttf", "/usr/share/fonts/google-noto/NotoSansDevanagari-Bold.ttf"),
    ("NotoSansDevanagariVF", "/usr/share/fonts/google-noto-vf/NotoSansDevanagari[wdth,wght].ttf", ""),
    ("DroidSansDevanagari", "/usr/share/fonts/google-droid-sans-fonts/DroidSansDevanagari-Regular.ttf", ""),
)
# Bundled Devanagari faces, tried before any host font. The first entry is the
# preferred Noto face; the second is the Apache-2.0 Droid face that ships in
# this repository so Hindi rendering never depends on host packages.
_BUNDLED_DEVANAGARI = (
    ("NotoSansDevanagari", "NotoSansDevanagari-Regular.ttf", "NotoSansDevanagari-Bold.ttf"),
    ("DroidSansDevanagari", "DroidSansDevanagari-Regular.ttf", ""),
)
# Optional bundled fonts (drop TTFs here for reproducible deployments).
_BUNDLED_DIR = os.path.join(os.path.dirname(__file__), "fonts")


class FontSet:
    def __init__(self, body: str, bold: str, mono: str, devanagari: str | None, notes: list[str]):
        self.body = body
        self.bold = bold
        self.mono = mono
        self.devanagari = devanagari
        self.notes = notes


def _try_register(name: str, regular: str, bold: str) -> tuple[str, str] | None:
    if not regular or not os.path.exists(regular):
        return None
    try:
        pdfmetrics.registerFont(TTFont(name, regular))
    except Exception:  # noqa: BLE001 - broken font file
        return None
    bold_name = name
    if bold and os.path.exists(bold):
        try:
            pdfmetrics.registerFont(TTFont(name + "-Bold", bold))
            bold_name = name + "-Bold"
        except Exception:  # noqa: BLE001
            bold_name = name
    return name, bold_name


def _bundled(pattern: str) -> str:
    path = os.path.join(_BUNDLED_DIR, pattern)
    return path if os.path.exists(path) else ""


def load_fonts() -> FontSet:
    """Register the best available Unicode fonts. Always returns a usable set."""

    notes: list[str] = []
    body = bold = "Helvetica"
    bold_default = "Helvetica-Bold"

    candidates = (("NotoSans", _bundled("NotoSans-Regular.ttf"), _bundled("NotoSans-Bold.ttf")),) + _LATIN_CANDIDATES
    for name, regular, bold_path in candidates:
        registered = _try_register(name, regular, bold_path)
        if registered:
            body, bold = registered
            break
    else:
        body, bold = "Helvetica", bold_default
        notes.append("No Unicode TTF was found; fell back to Helvetica (Latin-1 only).")

    devanagari = None
    dev_candidates = tuple(
        (name, _bundled(regular), _bundled(bold) if bold else "")
        for name, regular, bold in _BUNDLED_DEVANAGARI
    ) + _DEVANAGARI_CANDIDATES
    for name, regular, bold_path in dev_candidates:
        registered = _try_register(name, regular, bold_path)
        if registered:
            devanagari = registered[0]
            break
    if devanagari is None:
        notes.append(
            "No Devanagari font could be registered. Hindi text will not render correctly. "
            "The repository bundles app/pdf/fonts/DroidSansDevanagari-Regular.ttf; verify the file "
            "was not stripped from the deployment image."
        )

    mono = "Courier"
    for name, regular in (("DejaVuSansMono", "/usr/share/fonts/dejavu-sans-mono-fonts/DejaVuSansMono.ttf"),
                          ("LiberationMono", "/usr/share/fonts/liberation-mono/LiberationMono-Regular.ttf")):
        if _try_register(name, regular, ""):
            mono = name
            break

    return FontSet(body, bold, mono, devanagari, notes)


def _has_devanagari(text: str) -> bool:
    return any("\u0900" <= ch <= "\u097F" for ch in text)


class NoteDocTemplate(BaseDocTemplate):
    """A4 template with a running header/footer and page numbers."""

    def __init__(self, buffer, topic: str, fonts: FontSet, **kwargs):
        super().__init__(buffer, pagesize=A4, leftMargin=20 * mm, rightMargin=18 * mm,
                         topMargin=22 * mm, bottomMargin=18 * mm, title=f"StudyForge AI - {topic}",
                         author="StudyForge AI", subject=topic, **kwargs)
        self.topic = topic
        self.fonts = fonts
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="body")
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[frame]),
            PageTemplate(id="content", frames=[frame], onPage=self._decorate),
        ])

    def _decorate(self, canvas, doc):
        canvas.saveState()
        width, height = A4
        canvas.setFont(self.fonts.body, 8)
        canvas.setFillColor(MUTED)
        header = self.topic if not _has_devanagari(self.topic) or self.fonts.devanagari else "StudyForge AI Notes"
        if _has_devanagari(header) and self.fonts.devanagari:
            canvas.setFont(self.fonts.devanagari, 8)
        canvas.drawString(20 * mm, height - 13 * mm, header[:80])
        canvas.setFont(self.fonts.body, 8)
        canvas.drawRightString(width - 18 * mm, height - 13 * mm, "StudyForge AI")
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.4)
        canvas.line(20 * mm, height - 15 * mm, width - 18 * mm, height - 15 * mm)
        canvas.line(20 * mm, 14 * mm, width - 18 * mm, 14 * mm)
        canvas.drawString(20 * mm, 10 * mm, "Generated by StudyForge AI - verify against your official syllabus")
        canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()


def _styles(fonts: FontSet) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("sfTitle", parent=base["Title"], fontName=fonts.bold, fontSize=26, leading=31, textColor=BRAND),
        "subtitle": ParagraphStyle("sfSubtitle", parent=base["Normal"], fontName=fonts.body, fontSize=12, leading=17, textColor=MUTED, alignment=TA_CENTER),
        "h1": ParagraphStyle("sfH1", parent=base["Heading1"], fontName=fonts.bold, fontSize=16, leading=20, spaceBefore=14, spaceAfter=7, textColor=BRAND),
        "h2": ParagraphStyle("sfH2", parent=base["Heading2"], fontName=fonts.bold, fontSize=12.5, leading=16, spaceBefore=9, spaceAfter=4, textColor=INK),
        "body": ParagraphStyle("sfBody", parent=base["BodyText"], fontName=fonts.body, fontSize=10.2, leading=15.2, alignment=TA_JUSTIFY, textColor=INK, spaceAfter=5),
        "bullet": ParagraphStyle("sfBullet", parent=base["BodyText"], fontName=fonts.body, fontSize=10.2, leading=15, textColor=INK),
        "formula": ParagraphStyle("sfFormula", parent=base["BodyText"], fontName=fonts.mono, fontSize=11, leading=16, alignment=TA_CENTER, textColor=INK),
        "caption": ParagraphStyle("sfCaption", parent=base["BodyText"], fontName=fonts.body, fontSize=8.6, leading=12, textColor=MUTED),
        "toc": ParagraphStyle("sfToc", parent=base["BodyText"], fontName=fonts.body, fontSize=10.5, leading=17, textColor=INK),
        "devanagari": ParagraphStyle("sfDev", parent=base["BodyText"], fontName=fonts.devanagari or fonts.body, fontSize=10.6, leading=17, textColor=INK, spaceAfter=5),
    }


def _para(text: str, style: ParagraphStyle, styles: dict, fonts: FontSet) -> Paragraph:
    """Escape content and switch to the Devanagari font when required."""

    safe = escape(text or "")
    if _has_devanagari(text or "") and fonts.devanagari and style.fontName != fonts.mono:
        chosen = ParagraphStyle(f"{style.name}Dev", parent=style, fontName=fonts.devanagari)
        return Paragraph(safe, chosen)
    return Paragraph(safe, style)


def _boxed(flowables, padding: int = 7):
    table = Table([[flowables]], colWidths=[None])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BOX_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), padding),
        ("RIGHTPADDING", (0, 0), (-1, -1), padding),
        ("TOPPADDING", (0, 0), (-1, -1), padding),
        ("BOTTOMPADDING", (0, 0), (-1, -1), padding),
    ]))
    return table


def _render_block(block, styles, fonts) -> list:
    out: list = []
    kind = block.kind
    citation = " " + " ".join(f"[{ref}]" for ref in block.citations) if block.citations else ""

    if kind in {"paragraph", "note"}:
        out.append(_para(block.text + citation, styles["body"], styles, fonts))
    elif kind in {"bullets", "numbered"}:
        items = [ListItem(_para(str(item), styles["bullet"], styles, fonts), leftIndent=12) for item in block.items]
        if items:
            out.append(ListFlowable(items, bulletType="1" if kind == "numbered" else "bullet",
                                    start="1" if kind == "numbered" else None, leftIndent=14))
            out.append(Spacer(1, 4))
    elif kind == "definition":
        term = str(block.data.get("term", ""))
        out.append(_boxed([_para(f"<b>{escape(term)}</b>", styles["body"], styles, fonts),
                           _para(block.text + citation, styles["body"], styles, fonts)]))
        out.append(Spacer(1, 5))
    elif kind == "formula":
        label = str(block.data.get("label", ""))
        inner = []
        if label:
            inner.append(_para(f"<b>{escape(label)}</b>", styles["caption"], styles, fonts))
        inner.append(Paragraph(escape(block.text), styles["formula"]))
        if block.data.get("validation_status"):
            inner.append(_para(f"Validation: {block.data['validation_status']}", styles["caption"], styles, fonts))
        out.append(_boxed(inner))
        out.append(Spacer(1, 5))
    elif kind == "callout":
        title = str(block.data.get("title", "Note"))
        out.append(_boxed([_para(f"<b>{escape(title)}</b>: {escape(block.text)}", styles["body"], styles, fonts)]))
        out.append(Spacer(1, 5))
    elif kind == "table":
        headers = [str(h) for h in block.data.get("headers", [])]
        rows = [[_para(str(cell), styles["bullet"], styles, fonts) for cell in row] for row in block.items]
        if headers:
            data = [[_para(f"<b>{escape(h)}</b>", styles["bullet"], styles, fonts) for h in headers]] + rows
            table = Table(data, repeatRows=1, hAlign="LEFT")
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), BOX_BG),
                ("GRID", (0, 0), (-1, -1), 0.4, RULE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            out.append(table)
            if block.data.get("caption"):
                out.append(_para(str(block.data["caption"]), styles["caption"], styles, fonts))
            out.append(Spacer(1, 7))
    elif kind == "diagram":
        inner = [_para(f"<b>Figure:</b> {escape(str(block.data.get('caption', block.text)))}", styles["body"], styles, fonts)]
        for label in block.items:
            inner.append(_para(f"\u2022 {escape(str(label))}", styles["bullet"], styles, fonts))
        out.append(_boxed(inner))
        out.append(Spacer(1, 6))
    elif kind == "example":
        inner = [_para(f"<b>Example.</b> {escape(block.text)}", styles["body"], styles, fonts)]
        for index, step in enumerate(block.items, 1):
            inner.append(_para(f"{index}. {escape(str(step))}", styles["bullet"], styles, fonts))
        out.append(KeepTogether(_boxed(inner)))
        out.append(Spacer(1, 6))
    elif kind == "numerical":
        inner = [_para(f"<b>Numerical.</b> {escape(block.text)}", styles["body"], styles, fonts)]
        for step in ("given_data", "required_quantity", "formula", "unit_conversion", "substitution",
                     "intermediate_calculation", "final_answer", "unit_dimensional_check", "reasonableness_check"):
            value = block.data.get(step)
            if value:
                label = step.replace("_", " ").capitalize()
                inner.append(_para(f"<b>{label}:</b> {escape(str(value))}", styles["bullet"], styles, fonts))
        status = "Deterministically verified" if block.data.get("verified") else "Not deterministically verified"
        inner.append(_para(status, styles["caption"], styles, fonts))
        out.append(KeepTogether(_boxed(inner)))
        out.append(Spacer(1, 6))
    elif kind == "question":
        marks = block.data.get("marks")
        head = f"<b>Q.</b> {escape(block.text)}" + (f" <i>({marks} marks)</i>" if marks else "")
        inner = [_para(head, styles["body"], styles, fonts)]
        if block.data.get("origin"):
            inner.append(_para(f"Origin: {escape(str(block.data['origin']))}", styles["caption"], styles, fonts))
        if block.data.get("model_answer"):
            inner.append(_para(f"<b>Model answer:</b> {escape(str(block.data['model_answer']))}", styles["bullet"], styles, fonts))
        for point in block.data.get("marking_points", []) or []:
            inner.append(_para(f"\u2013 {escape(str(point))}", styles["bullet"], styles, fonts))
        out.append(KeepTogether(inner))
        out.append(Spacer(1, 5))
    elif kind == "flashcard":
        front = escape(str(block.data.get("front", "")))
        back = escape(str(block.data.get("back", "")))
        out.append(_para(f"<b>{front}</b> \u2192 {back}", styles["bullet"], styles, fonts))
    elif kind == "quiz_item":
        out.append(_para(f"<b>{escape(block.text)}</b>", styles["body"], styles, fonts))
        for index, option in enumerate(block.items):
            out.append(_para(f"({chr(97 + index)}) {escape(str(option))}", styles["bullet"], styles, fonts))
        out.append(Spacer(1, 4))
    elif kind == "source":
        url = safe_url(str(block.data.get("url", "")))
        title = escape(str(block.data.get("title", url or "Source")))
        meta = block.data.get("retrieved") or ""
        suffix = f" &mdash; {escape(url)}" if url else " &mdash; (URL withheld: unsupported scheme)"
        line = f"{title}{suffix}"
        if meta:
            line += f" (retrieved {escape(str(meta))})"
        out.append(_para(line, styles["bullet"], styles, fonts))
    else:
        out.append(_para(block.text, styles["body"], styles, fonts))
    return out


def render_note_pdf(document: NoteDocument) -> tuple[bytes, dict]:
    """Render a :class:`NoteDocument` to PDF bytes plus metadata."""

    fonts = load_fonts()
    styles = _styles(fonts)
    buffer = io.BytesIO()
    template = NoteDocTemplate(buffer, document.topic or "Notes", fonts)

    story: list = []
    generated = document.generated_at or datetime.now(timezone.utc).isoformat()
    date_label = generated[:10]

    # ---- cover page -----------------------------------------------------
    story.append(Spacer(1, 45 * mm))
    story.append(Paragraph("StudyForge AI", styles["subtitle"]))
    story.append(Spacer(1, 6 * mm))
    story.append(_para(document.topic or "Study Notes", styles["title"], styles, fonts))
    story.append(Spacer(1, 4 * mm))
    detail = f"Subject: {document.subject or 'General'}<br/>Academic context: {document.academic_context}<br/>Research date: {date_label}"
    story.append(Paragraph(detail, styles["subtitle"]))
    story.append(Spacer(1, 10 * mm))
    story.append(_boxed([_para(
        "Research-backed study notes generated from retrieved sources. "
        "Claims carry citations, and only deterministically checked mathematics is marked verified.",
        styles["caption"], styles, fonts)]))
    story.append(PageBreak())

    # ---- table of contents ---------------------------------------------
    story.append(_para("Table of contents", styles["h1"], styles, fonts))
    for index, entry in enumerate(document.table_of_contents(), 1):
        story.append(Paragraph(f"{index}. {escape(entry['title'])}", styles["toc"]))
    story.append(PageBreak())

    # ---- body ------------------------------------------------------------
    for section in document.sections:
        story.append(_para(section.title, styles["h1"], styles, fonts))
        if section.key in {"verified_pyqs", "question_patterns", "important_topics", "marks_wise_questions", "mock_exam"}:
            story.append(_boxed([_para(EXAM_DISCLAIMER, styles["caption"], styles, fonts)]))
            story.append(Spacer(1, 5))
        for block in section.blocks:
            story.extend(_render_block(block, styles, fonts))
        story.append(Spacer(1, 4))

    if fonts.notes:
        story.append(_para("Renderer notes", styles["h2"], styles, fonts))
        for note in fonts.notes:
            story.append(_para(note, styles["caption"], styles, fonts))

    template.build(story)
    data = buffer.getvalue()

    metadata = {
        "filename": pdf_filename(document.topic, datetime.now(timezone.utc)),
        "renderer_version": RENDERER_VERSION,
        "byte_size": len(data),
        "checksum": hashlib.sha256(data).hexdigest(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "fonts": {"body": fonts.body, "devanagari": fonts.devanagari},
        "font_warnings": fonts.notes,
        "page_size": "A4",
    }
    return data, metadata
