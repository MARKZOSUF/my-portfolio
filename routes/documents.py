"""Document upload routes.

Hardening notes:
- All parser failures arrive here as structured AppErrors (never 500s with
  parser internals).
- The (user, sha256) uniqueness race is mapped to safe reuse: the losing
  request deletes its temporary file and returns the existing document.
- Temporary files are removed on every failure path.
"""
import hashlib
import secrets
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import IntegrityError

from extensions import db, limiter
from models import Document
from services.documents.parser import parse_document
from services.documents.storage import delete_physical, scan_file
from services.syllabus.analyzer import analyze_syllabus
from utils.auth import current_user, login_required
from utils.errors import AppError
from utils.validation import page_args

bp = Blueprint("documents", __name__, url_prefix="/api/documents")

MIMES = {
    "pdf": {"application/pdf"},
    "docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip"},
    "pptx": {"application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/zip"},
    "txt": {"text/plain", "application/octet-stream"},
}


def pack(doc):
    return {
        "id": doc.public_id,
        "name": doc.original_name,
        "mime_type": doc.mime_type,
        "size_bytes": doc.size_bytes,
        "created_at": doc.created_at.isoformat(),
        "extraction_status": doc.extraction_status,
        "pages": len(doc.page_map_json or []),
        "syllabus": doc.syllabus_json,
    }


@bp.get("")
@login_required
def list_documents():
    page, size = page_args(request)
    query = Document.query.filter_by(user_id=current_user().id).order_by(Document.created_at.desc())
    pager = query.paginate(page=page, per_page=size, error_out=False)
    return jsonify(
        {
            "success": True,
            "items": [pack(x) for x in pager.items],
            "pagination": {"page": page, "page_size": size, "total": pager.total, "pages": pager.pages},
        }
    )


@bp.post("/upload")
@login_required
@limiter.limit("10 per hour")
def upload():
    file = request.files.get("file")
    if not file or not file.filename:
        raise AppError("FILE_REQUIRED", "Choose a document to upload.")
    safe_name = Path(file.filename).name
    ext = Path(safe_name).suffix.lower().lstrip(".")
    if ext not in current_app.config["ALLOWED_EXTENSIONS"]:
        raise AppError("UNSUPPORTED_FILE", "Allowed types: PDF, DOCX, PPTX, TXT.", 415)
    if file.mimetype and file.mimetype not in MIMES[ext]:
        raise AppError("MIME_MISMATCH", "The file MIME type does not match its extension.", 415)

    stored = f"{secrets.token_hex(24)}.{ext}"
    path = Path(current_app.config["UPLOAD_FOLDER"]) / stored
    digest = hashlib.sha256()
    size = 0
    try:
        with path.open("xb") as out:
            while True:
                chunk = file.stream.read(65536)
                if not chunk:
                    break
                size += len(chunk)
                if size > current_app.config["MAX_UPLOAD_BYTES"]:
                    raise AppError("FILE_TOO_LARGE", "The upload exceeds the configured size limit.", 413)
                digest.update(chunk)
                out.write(chunk)
        if not size:
            raise AppError("EMPTY_FILE", "The uploaded file is empty.")
        head = path.read_bytes()[:8]
        if ext == "pdf" and not head.startswith(b"%PDF-"):
            raise AppError("INVALID_FILE_SIGNATURE", "PDF signature is invalid.", 415)
        if ext in {"docx", "pptx"} and not head.startswith(b"PK"):
            raise AppError("INVALID_FILE_SIGNATURE", "Office document signature is invalid.", 415)
        scan_file(path)
        text, pages = parse_document(
            path,
            max_pages=current_app.config["MAX_DOCUMENT_PAGES"],
            max_chars=current_app.config["MAX_DOCUMENT_CHARS"],
            max_files=current_app.config["MAX_ARCHIVE_FILES"],
            max_expanded=current_app.config["MAX_ARCHIVE_EXPANDED_BYTES"],
            timeout=current_app.config["DOCUMENT_PROCESS_TIMEOUT"],
        )
        hexdigest = digest.hexdigest()
        existing = Document.query.filter_by(user_id=current_user().id, sha256=hexdigest).first()
        if existing:
            path.unlink(missing_ok=True)
            return jsonify({"success": True, "reused": True, "document": pack(existing)})
        doc = Document(
            user_id=current_user().id,
            original_name=safe_name[:255],
            stored_name=stored,
            mime_type=file.mimetype or "application/octet-stream",
            size_bytes=size,
            sha256=hexdigest,
            extracted_text=text,
            page_map_json=pages,
            syllabus_json=analyze_syllabus(text),
        )
        db.session.add(doc)
        try:
            db.session.commit()
        except IntegrityError:
            # Concurrent duplicate upload lost the uniqueness race: reuse the
            # winner's row and remove this request's temporary file.
            db.session.rollback()
            path.unlink(missing_ok=True)
            winner = Document.query.filter_by(user_id=current_user().id, sha256=hexdigest).first()
            if winner is None:
                raise AppError("UPLOAD_CONFLICT", "The upload conflicted with another request. Please retry.", 409)
            return jsonify({"success": True, "reused": True, "document": pack(winner)})
    except Exception:
        path.unlink(missing_ok=True)
        raise
    return jsonify({"success": True, "reused": False, "document": pack(doc)}), 201


@bp.get("/<pid>")
@login_required
def get(pid):
    doc = Document.query.filter_by(public_id=pid, user_id=current_user().id).first()
    if not doc:
        raise AppError("DOCUMENT_NOT_FOUND", "Document not found.", 404)
    return jsonify({"success": True, "document": pack(doc)})


@bp.delete("/<pid>")
@login_required
def delete(pid):
    doc = Document.query.filter_by(public_id=pid, user_id=current_user().id).first()
    if not doc:
        raise AppError("DOCUMENT_NOT_FOUND", "Document not found.", 404)
    name = doc.stored_name
    db.session.delete(doc)
    db.session.commit()
    delete_physical(type("Stored", (), {"stored_name": name})())
    return jsonify({"success": True})
