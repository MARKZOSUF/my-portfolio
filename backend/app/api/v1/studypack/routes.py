"""Topic -> notes -> PDF API.

The minimal contract the mobile app needs:

    POST /api/v1/studypack/jobs                  { "topic": "Matrices" }
    GET  /api/v1/studypack/jobs/{task_id}
    POST /api/v1/studypack/jobs/{task_id}/cancel
    POST /api/v1/studypack/jobs/{task_id}/retry
    GET  /api/v1/studypack/jobs/{task_id}/events   (SSE)
    GET  /api/v1/studypack/stages
    GET  /api/v1/studypack/notes/{note_id}/pdf

Only ``topic`` is required. Every academic-profile field is optional.
"""

import asyncio
import json
import uuid

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DB
from app.database.models import BackgroundTask, JobEvent, Note, TaskControl
from app.jobs.service import create_job, event
from app.pdf.artifacts import download_descriptor, latest_for_note, store_pdf
from app.services.storage import get_storage
from app.pdf.artifacts import download_descriptor, latest_for_note, store_pdf
from app.services.storage import get_storage
from app.studypack.pipeline import STAGES, idempotency_key, stage_catalogue
from app.topics.classifier import classify
from app.workers.studypack_tasks import studypack_task

router = APIRouter(prefix="/studypack", tags=["studypack"])

JOB_KIND = "topic_studypack"


class StudentProfile(BaseModel):
    """Every field is optional - a topic alone is always sufficient."""

    institution: str | None = None
    board: str | None = None
    course: str | None = None
    branch: str | None = None
    semester: str | None = None
    subject: str | None = None
    subject_code: str | None = None
    syllabus_year: str | None = None
    target_exam: str | None = None
    exam_date: str | None = None
    language: str | None = Field(default=None, pattern="^(en|hi|hinglish)$")
    explanation_depth: str | None = Field(default=None, pattern="^(easy|standard|deep)$")
    available_study_time_minutes: int | None = None


class TopicRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=300)
    profile: StudentProfile | None = None
    skip_clarification: bool = True


@router.get("/stages")
async def stages():
    """User-friendly stage catalogue used by the progress screen."""

    return {"stages": stage_catalogue(), "count": len(STAGES)}


@router.post("/classify")
async def classify_topic(payload: TopicRequest, user: CurrentUser):
    """Preview topic understanding (subject, confidence, optional clarification)."""

    result = classify(payload.topic)
    return result.to_dict()


@router.post("/jobs", status_code=202)
async def create(payload: TopicRequest, user: CurrentUser, db: DB,
                 idempotency: str | None = Header(default=None, alias="Idempotency-Key")):
    profile = payload.profile.model_dump(exclude_none=True) if payload.profile else {}
    key = idempotency or idempotency_key(user.id, payload.topic, profile)
    task, created = await create_job(db, user.id, JOB_KIND, key)
    if created:
        task.result = {"topic": payload.topic, "stage": "understanding_topic"}
        job = studypack_task.delay(str(user.id), str(task.id), payload.topic, profile)
        task.celery_id = job.id
    await db.commit()
    return {
        "task_id": str(task.id),
        "status": task.status,
        "created": created,
        "topic": payload.topic,
        "stages": stage_catalogue(),
    }


async def _owned_task(db, task_id, user):
    task = await db.scalar(
        select(BackgroundTask).where(
            BackgroundTask.id == task_id,
            BackgroundTask.owner_id == user.id,
            BackgroundTask.kind == JOB_KIND,
        )
    )
    if not task:
        raise HTTPException(404, "Study-pack job not found")
    return task


@router.get("/jobs/{task_id}")
async def get(task_id: uuid.UUID, user: CurrentUser, db: DB):
    task = await _owned_task(db, task_id, user)
    return {
        "task_id": str(task.id),
        "status": task.status,
        "progress": task.progress,
        "result": task.result,
        "error_code": task.error_code,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "finished_at": task.finished_at,
    }


@router.post("/jobs/{task_id}/cancel", status_code=202)
async def cancel(task_id: uuid.UUID, user: CurrentUser, db: DB):
    control = await db.scalar(select(TaskControl).where(TaskControl.task_id == task_id, TaskControl.owner_id == user.id))
    if not control:
        raise HTTPException(404, "Job not found")
    control.cancel_requested = True
    await event(db, task_id, "cancellation_requested", {})
    await db.commit()
    return {"status": "cancellation_requested"}


@router.post("/jobs/{task_id}/retry", status_code=202)
async def retry(task_id: uuid.UUID, user: CurrentUser, db: DB):
    task = await _owned_task(db, task_id, user)
    if task.status not in {"failed", "cancelled", "capability_unavailable", "insufficient_evidence"}:
        raise HTTPException(409, "Only a finished, unsuccessful job can be retried")
    control = await db.scalar(select(TaskControl).where(TaskControl.task_id == task_id))
    if control:
        control.cancel_requested = False
    topic = (task.result or {}).get("topic") or ""
    if not topic:
        raise HTTPException(409, "Original topic is no longer available; start a new job")
    task.status = "queued"
    task.progress = 0
    task.error_code = None
    await event(db, task_id, "retry_requested", {"topic": topic})
    job = studypack_task.delay(str(user.id), str(task.id), topic, (task.result or {}).get("profile") or {})
    task.celery_id = job.id
    await db.commit()
    return {"status": "queued", "task_id": str(task.id)}


@router.get("/jobs/{task_id}/events")
async def events(task_id: uuid.UUID, user: CurrentUser, db: DB, last_event_id: int = 0):
    task = await _owned_task(db, task_id, user)

    async def stream():
        cursor = last_event_id
        for _ in range(600):
            rows = (await db.scalars(
                select(JobEvent).where(JobEvent.task_id == task_id, JobEvent.sequence > cursor).order_by(JobEvent.sequence)
            )).all()
            for row in rows:
                cursor = row.sequence
                yield f"id: {row.sequence}\nevent: {row.event_type}\ndata: {json.dumps(row.payload, default=str)}\n\n"
            await db.refresh(task)
            if task.status in {"succeeded", "failed", "cancelled", "capability_unavailable", "insufficient_evidence"} and not rows:
                break
            yield ": keep-alive\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/notes/{note_id}")
async def structured_note(note_id: uuid.UUID, user: CurrentUser, db: DB):
    """Return the structured note document for the in-app viewer."""

    note = await db.get(Note, note_id)
    if not note or note.owner_id != user.id:
        raise HTTPException(404, "Note not found")
    structured = getattr(note, "structured", None)
    return {
        "note_id": str(note.id),
        "title": note.title,
        "structured": structured,
        "markdown": note.content,
        "has_structured": structured is not None,
    }


@router.get("/notes/{note_id}/pdf")
async def download_pdf(note_id: uuid.UUID, user: CurrentUser, db: DB):
    """Authenticated, owner-scoped download of the stored PDF."""

    record = await latest_for_note(db, note_id, user.id)
    if record is None:
        raise HTTPException(404, "No PDF has been generated for this note")
    if record.status != "ready":
        raise HTTPException(409, {"status": record.status, "error": record.error})
    try:
        with get_storage().open(record.storage_key) as handle:
            data = handle.read()
    except Exception as exc:
        raise HTTPException(503, f"Stored PDF is temporarily unavailable: {type(exc).__name__}")
    return Response(
        content=data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{record.filename}"',
            "X-Content-Checksum": record.checksum,
            "X-Renderer-Version": record.renderer_version,
        },
    )


@router.get("/notes/{note_id}/pdf/link")
async def pdf_link(note_id: uuid.UUID, user: CurrentUser, db: DB):
    """Metadata plus an expiring signed URL for share/offline download."""

    record = await latest_for_note(db, note_id, user.id)
    if record is None:
        raise HTTPException(404, "No PDF has been generated for this note")
    return download_descriptor(record)


@router.post("/notes/{note_id}/pdf/retry", status_code=202)
async def retry_pdf(note_id: uuid.UUID, user: CurrentUser, db: DB):
    """Re-render the PDF for an existing note."""

    note = await db.get(Note, note_id)
    if not note or note.owner_id != user.id:
        raise HTTPException(404, "Note not found")
    structured = getattr(note, "structured", None)
    if not structured:
        raise HTTPException(409, "This note has no structured document to render")

    from app.notes.structure import NoteDocument
    from app.pdf.renderer import RENDERER_VERSION, render_note_pdf

    data, _meta = render_note_pdf(NoteDocument.from_dict(structured))
    record = await store_pdf(db, user.id, note.id, note.title, data, RENDERER_VERSION)
    await db.commit()
    return download_descriptor(record)


@router.delete("/notes/{note_id}/pdf", status_code=204)
async def delete_pdf(note_id: uuid.UUID, user: CurrentUser, db: DB):
    """Delete every stored PDF for this note (owner only)."""

    from sqlalchemy import select as _select

    from app.database.models import GeneratedPdf

    rows = (await db.scalars(
        _select(GeneratedPdf).where(GeneratedPdf.note_id == note_id, GeneratedPdf.owner_id == user.id)
    )).all()
    if not rows:
        raise HTTPException(404, "No PDF has been generated for this note")
    storage = get_storage()
    for row in rows:
        try:
            storage.delete(row.storage_key)
        except Exception:
            pass  # metadata removal must still succeed
        await db.delete(row)
    await db.commit()
    return Response(status_code=204)
