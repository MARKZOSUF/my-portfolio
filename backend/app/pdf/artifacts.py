"""Durable storage of generated note PDFs.

The rendered bytes go to private object storage; only metadata is kept in the
database (owner, note, storage key, checksum, byte size, renderer version,
creation date, generation status and error status).  Nothing depends on
ephemeral application-server disk in production - configuration validation
rejects a non-s3 ``STORAGE_PROVIDER`` when ``PDF_REQUIRE_DURABLE_STORAGE`` is on.
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.config.settings import get_settings
from app.database.models import GeneratedPdf
from app.notes.structure import pdf_filename
from app.services.storage import get_storage


def storage_key(owner_id, note_id: uuid.UUID, filename: str) -> str:
    """Owner-scoped, unguessable key. Never a user-controlled path."""

    return f"notes/{owner_id}/{note_id}/{uuid.uuid4().hex}/{filename}"


async def store_pdf(db, owner_id, note_id, topic: str, data: bytes, renderer_version: str) -> GeneratedPdf:
    """Persist rendered bytes and their metadata; returns the artifact row."""

    filename = pdf_filename(topic)
    key = storage_key(owner_id, note_id, filename)
    checksum = hashlib.sha256(data).hexdigest()
    record = GeneratedPdf(
        owner_id=owner_id,
        note_id=note_id,
        storage_key=key,
        filename=filename,
        checksum=checksum,
        byte_size=len(data),
        renderer_version=renderer_version,
        status="ready",
    )
    try:
        get_storage().put_bytes(data, key)
    except Exception as exc:  # storage outage must not lose the job
        record.status = "failed"
        record.error = f"{type(exc).__name__}: {exc}"[:500]
    db.add(record)
    await db.flush()
    return record


async def latest_for_note(db, note_id, owner_id) -> GeneratedPdf | None:
    """Owner-scoped lookup - a foreign note id can never resolve."""

    return (
        await db.scalars(
            select(GeneratedPdf)
            .where(GeneratedPdf.note_id == note_id, GeneratedPdf.owner_id == owner_id)
            .order_by(GeneratedPdf.created_at.desc())
            .limit(1)
        )
    ).first()


def download_descriptor(record: GeneratedPdf) -> dict:
    """Expiring signed URL when the backend supports it, else authenticated download."""

    settings = get_settings()
    url = None
    try:
        url = get_storage().signed_url(record.storage_key, settings.storage_signed_url_ttl_seconds)
    except Exception:
        url = None
    return {
        "pdf_id": str(record.id),
        "filename": record.filename,
        "checksum": record.checksum,
        "byte_size": record.byte_size,
        "renderer_version": record.renderer_version,
        "status": record.status,
        "error": record.error,
        "created_at": (record.created_at or datetime.now(timezone.utc)).isoformat(),
        "signed_url": url,
        "expires_in_seconds": settings.storage_signed_url_ttl_seconds if url else None,
        "download_path": f"/api/v1/studypack/notes/{record.note_id}/pdf",
    }
