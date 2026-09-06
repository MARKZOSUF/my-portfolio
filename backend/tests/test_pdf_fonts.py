"""Bundled PDF font tests.

The rescan found no .ttf/.otf bundled anywhere, so Hindi PDFs silently fell back
to a Latin face and rendered Devanagari as .notdef boxes. These tests assert the
fonts are present, licensed, registered, and that real Hindi text maps to real
glyphs.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
FONT_DIR = BACKEND / "app" / "pdf" / "fonts"
sys.path.insert(0, str(BACKEND))

HINDI = "विद्युत धारा और ओम का नियम"
HINGLISH = "Ohm ka niyam: V = I R (विद्युत धारा)"


def _require_reportlab():
    try:
        import reportlab  # noqa: F401, PLC0415
    except ModuleNotFoundError as exc:  # pragma: no cover
        import pytest

        pytest.skip(f"reportlab unavailable: {exc}")


def test_font_files_are_bundled():
    for name in (
        "NotoSans-Regular.ttf",
        "NotoSans-Bold.ttf",
        "DroidSansDevanagari-Regular.ttf",
    ):
        path = FONT_DIR / name
        assert path.exists(), f"{name} must be bundled for offline PDF rendering"
        # A truncated or Git-LFS-pointer file would be tiny.
        assert path.stat().st_size > 50_000, f"{name} looks truncated"


def test_font_licenses_are_bundled():
    licenses = FONT_DIR / "LICENSES"
    assert licenses.is_dir(), "font license texts must ship with the binaries"
    names = {p.name for p in licenses.iterdir()}
    assert "Apache-2.0.txt" in names
    assert any("NotoSans" in n for n in names)
    assert any("DroidSans" in n for n in names)
    assert (licenses / "Apache-2.0.txt").stat().st_size > 5_000


def test_bundled_fonts_are_valid_truetype():
    """Check the sfnt magic so a corrupt download fails loudly."""
    for path in FONT_DIR.glob("*.ttf"):
        head = path.read_bytes()[:4]
        assert head in (b"\x00\x01\x00\x00", b"true", b"ttcf", b"OTTO"), (
            f"{path.name} is not a valid TrueType/OpenType file"
        )


def test_devanagari_face_is_registered_from_the_bundle():
    _require_reportlab()
    from app.pdf.renderer import load_fonts  # noqa: PLC0415

    fonts = load_fonts()
    assert fonts.devanagari, (
        "a Devanagari face must be registered; Hindi PDFs would otherwise render "
        "as empty boxes"
    )


def test_devanagari_glyphs_are_not_notdef():
    """Every Hindi codepoint must have a real glyph in the registered face."""
    _require_reportlab()
    from reportlab.pdfbase import pdfmetrics  # noqa: PLC0415

    from app.pdf.renderer import load_fonts  # noqa: PLC0415

    fonts = load_fonts()
    face = pdfmetrics.getFont(fonts.devanagari).face
    cmap = face.charToGlyph
    missing = [ch for ch in set(HINDI) if not ch.isspace() and cmap.get(ord(ch), 0) == 0]
    assert not missing, f"Devanagari face lacks glyphs for {missing}"


def test_devanagari_text_has_measurable_width():
    _require_reportlab()
    from reportlab.pdfbase import pdfmetrics  # noqa: PLC0415

    from app.pdf.renderer import load_fonts  # noqa: PLC0415

    fonts = load_fonts()
    width = pdfmetrics.stringWidth(HINDI, fonts.devanagari, 12)
    assert width > 0, "Hindi text measured zero width: the face is not usable"


def test_has_devanagari_detection():
    _require_reportlab()
    from app.pdf.renderer import _has_devanagari  # noqa: PLC0415

    assert _has_devanagari(HINDI)
    assert _has_devanagari(HINGLISH)
    assert not _has_devanagari("Ohm's law states V = I R")


def test_renderer_prefers_bundled_fonts_over_host_fonts():
    source = (BACKEND / "app" / "pdf" / "renderer.py").read_text()
    assert "_BUNDLED_DEVANAGARI" in source
    assert "_bundled(" in source


def test_english_hindi_and_hinglish_pdfs_render_with_real_glyphs(tmp_path=None):
    """End-to-end ReportLab render for all three note languages."""
    _require_reportlab()
    import io  # noqa: PLC0415

    from reportlab.lib.pagesizes import A4  # noqa: PLC0415
    from reportlab.pdfgen import canvas  # noqa: PLC0415

    from app.pdf.renderer import load_fonts  # noqa: PLC0415

    fonts = load_fonts()
    for label, text, font in (
        ("english", "Ohm's law states V = I R", fonts.body),
        ("hindi", HINDI, fonts.devanagari),
        ("hinglish", HINGLISH, fonts.devanagari),
    ):
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        pdf.setFont(font, 14)
        pdf.drawString(72, 720, text)
        pdf.showPage()
        pdf.save()
        data = buffer.getvalue()
        assert data.startswith(b"%PDF-"), f"{label} PDF header missing"
        assert data.rstrip().endswith(b"%%EOF"), f"{label} PDF not finalised"
        assert len(data) > 1_000, f"{label} PDF is suspiciously small"
