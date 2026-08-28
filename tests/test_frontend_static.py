"""Frontend static checks (spec section 12): no inline scripts, safe
rendering, required UI surfaces, and template/JS id wiring."""
import re
from pathlib import Path

TEMPLATES = ["templates/base.html", "templates/index.html", "templates/research.html", "templates/admin.html"]
SCRIPTS = ["static/js/app.js", "static/js/research.js", "static/js/admin.js"]


def test_no_inline_scripts_anywhere():
    for path in TEMPLATES:
        body = Path(path).read_text()
        for match in re.finditer(r"<script\b([^>]*)>", body):
            assert "src=" in match.group(1), f"inline script in {path}"
        assert "onload=" not in body and "onclick=" not in body


def test_no_unsafe_html_rendering():
    for path in SCRIPTS:
        body = Path(path).read_text()
        assert "innerHTML" not in body
        assert "outerHTML" not in body
        assert "document.write" not in body


def test_research_workspace_has_required_surfaces():
    html = Path("templates/research.html").read_text()
    for marker in (
        'id="chatLog"',
        'id="adaptiveQuiz"',
        'data-next-difficulty="hard"',
        'data-next-difficulty="medium"',
        'data-next-difficulty="easy"',
        'id="regenerateCards"',
        'id="cardsEmpty"',
        'id="quizEmpty"',
        'id="noteEmpty"',
        'id="retryResearch"',
        'aria-live="polite"',
    ):
        assert marker in html


def test_js_references_existing_dom_ids():
    """Every getElementById target in the page JS exists in some template."""
    html = "\n".join(Path(p).read_text() for p in TEMPLATES)
    for script in ("static/js/research.js", "static/js/app.js"):
        for target in set(re.findall(r"getElementById\('([^']+)'\)", Path(script).read_text())):
            assert f'id="{target}"' in html, f"{script} references missing #{target}"


def test_csp_header_is_strict(client):
    response = client.get("/")
    csp = response.headers["Content-Security-Policy"]
    assert "unsafe-inline" not in csp and "unsafe-eval" not in csp
    assert "script-src 'self'" in csp


def test_reduced_motion_and_touch_targets():
    css = Path("static/css/app.css").read_text()
    assert "prefers-reduced-motion" in css
    assert "min-height:44px" in css
    assert ":focus-visible" in css
