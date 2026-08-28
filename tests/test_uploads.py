"""Document-upload hardening tests (spec section 8). No network required."""
import io
import zipfile

import pytest
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import Document
from services.documents.parser import inspect_office_archive, parse_document
from utils.errors import AppError


def _upload(client, data_bytes, name, mime):
    return client.post(
        "/api/documents/upload",
        data={"file": (io.BytesIO(data_bytes), name, mime)},
        content_type="multipart/form-data",
    )


def _office_zip(entries=None):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", "<document/>")
        for name, data in (entries or {}).items():
            archive.writestr(name, data)
    return buffer.getvalue()


def test_malformed_pdf_is_422_not_500(client, user, app):
    response = _upload(client, b"%PDF-1.7 garbage-not-a-real-pdf", "broken.pdf", "application/pdf")
    assert response.status_code == 422
    assert response.json["error"]["code"] == "DOCUMENT_PARSE_FAILED"
    assert "Traceback" not in response.get_data(as_text=True)


def test_malformed_office_zip_rejected(client, user, app):
    response = _upload(
        client,
        b"PK\x03\x04" + b"\x00" * 40,
        "broken.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    assert response.status_code == 415
    assert response.json["error"]["code"] == "INVALID_FILE_SIGNATURE"


def test_encrypted_office_archive_rejected():
    raw = bytearray(_office_zip())
    # Set the general-purpose encryption flag (bit 0) in the central directory.
    central = raw.find(b"PK\x01\x02")
    assert central > 0
    raw[central + 8] |= 0x01
    with pytest.raises(AppError) as exc:
        inspect_office_archive(io.BytesIO(bytes(raw)), "docx", 1000, 80 * 1024 * 1024)
    assert exc.value.code == "INVALID_ARCHIVE"


def test_archive_bomb_ratio_rejected():
    payload = _office_zip({"word/big.xml": b"A" * 2_000_000})  # compresses far beyond 200:1
    with pytest.raises(AppError) as exc:
        inspect_office_archive(io.BytesIO(payload), "docx", 1000, 80 * 1024 * 1024)
    assert exc.value.code == "ARCHIVE_BOMB"


def test_invalid_utf8_txt_rejected(client, user, app):
    response = _upload(client, b"valid start \xff\xfe\x80 broken", "notes.txt", "text/plain")
    assert response.status_code == 422
    assert response.json["error"]["code"] == "DOCUMENT_PARSE_FAILED"


def test_empty_document_rejected(client, user, app):
    response = _upload(client, b"", "empty.txt", "text/plain")
    assert response.status_code == 400
    assert response.json["error"]["code"] == "EMPTY_FILE"


def test_duplicate_upload_reused(client, user, app):
    content = b"UNIT 1\nDatabase concepts and keys."
    first = _upload(client, content, "a.txt", "text/plain")
    second = _upload(client, content, "a.txt", "text/plain")
    assert first.status_code == 201
    assert second.status_code == 200 and second.json["reused"] is True
    assert first.json["document"]["id"] == second.json["document"]["id"]


def test_concurrent_duplicate_maps_to_safe_reuse(client, user, app, monkeypatch):
    content = b"UNIT 2\nConcurrent upload content."
    winner = _upload(client, content, "winner.txt", "text/plain")
    assert winner.status_code == 201

    # Simulate the race: the existence check misses, the insert conflicts.
    import routes.documents as documents_route

    real_query = Document.query

    class RacyQuery:
        calls = 0

        def filter_by(self, **kwargs):
            RacyQuery.calls += 1
            if RacyQuery.calls == 1:
                return type("Empty", (), {"first": staticmethod(lambda: None)})()
            return real_query.filter_by(**kwargs)

    monkeypatch.setattr(Document, "query", RacyQuery())
    raced = _upload(client, content, "winner-copy.txt", "text/plain")
    monkeypatch.undo()
    assert raced.status_code == 200
    assert raced.json["reused"] is True
    assert raced.json["document"]["id"] == winner.json["document"]["id"]
    assert len(__import__("os").listdir(app.config["UPLOAD_FOLDER"])) == 1  # temp file removed


def test_cleanup_after_failed_parse(client, user, app):
    response = _upload(client, b"%PDF-9.9 broken", "broken.pdf", "application/pdf")
    assert response.status_code == 422
    assert __import__("os").listdir(app.config["UPLOAD_FOLDER"]) == []


def test_parse_document_empty_text_rejected(tmp_path):
    path = tmp_path / "blank.txt"
    path.write_text("   \n  ")
    with pytest.raises(AppError) as exc:
        parse_document(path)
    assert exc.value.code == "DOCUMENT_EMPTY"
