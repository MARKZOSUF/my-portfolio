from types import SimpleNamespace
from services.export.pdf_export import make_pdf
def test_pdf():
    s=SimpleNamespace(query="Test",language="English",study_mode="document_study",result_json={"quick_summary":"Summary","complete_notes_markdown":"# Notes","revision_sheet_markdown":"Rev"}); assert make_pdf(s,[]).read(4)==b"%PDF"
