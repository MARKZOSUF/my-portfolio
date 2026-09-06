"""Unified, resumable topic -> notes -> PDF generation workflow.

One background job carries a topic all the way from raw text to a stored note
and a rendered PDF. Every stage is persisted so the mobile app can be closed and
reopened, and so a failed stage can be restarted without redoing everything.

Stages are surfaced to the user with friendly names (see :data:`STAGES`).
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.config.settings import get_settings
from app.database.models import Note, ResearchRun, ResearchSource, Source
from app.jobs.service import cancelled, update
from app.notes.structure import NoteDocument, pdf_filename
from app.pdf.renderer import render_note_pdf
from app.research.engine import SearchRouter, canonical
from app.research.providers import LIMITATION_NOTE, SearchUnavailable
from app.studypack.builder import build_document
from app.topics.classifier import classify, research_queries

# (key, user facing label, progress fraction when the stage completes)
STAGES: tuple[tuple[str, str, float], ...] = (
    ("understanding_topic", "Understanding topic", 0.04),
    ("detecting_subject", "Detecting subject", 0.08),
    ("planning_research", "Planning research", 0.13),
    ("finding_sources", "Finding sources", 0.25),
    ("reading_sources", "Reading sources", 0.38),
    ("comparing_evidence", "Comparing evidence", 0.46),
    ("building_outline", "Building outline", 0.52),
    ("writing_notes", "Writing notes", 0.64),
    ("checking_facts", "Checking facts", 0.71),
    ("verifying_formulas", "Verifying formulas", 0.77),
    ("solving_numericals", "Solving numericals", 0.81),
    ("creating_questions", "Creating questions", 0.86),
    ("creating_practice", "Creating flashcards and quiz", 0.90),
    ("rendering_pdf", "Rendering PDF", 0.95),
    ("saving", "Saving", 0.98),
    ("completed", "Completed", 1.0),
)

STAGE_LABELS = {key: label for key, label, _ in STAGES}
STAGE_PROGRESS = {key: progress for key, _, progress in STAGES}
STAGE_ORDER = [key for key, _, _ in STAGES]

TERMINAL_STATUSES = {"succeeded", "failed", "cancelled", "capability_unavailable", "insufficient_evidence"}


class Cancelled(Exception):
    """Raised when the owner cancelled the job mid-flight."""


async def _stage(db, task_id, stage: str, extra: dict | None = None):
    """Persist stage transition and emit a job event for SSE/polling clients."""

    if await cancelled(db, task_id):
        await update(db, task_id, "cancelled", STAGE_PROGRESS.get(stage, 0), "cancelled", {"stage": stage})
        await db.commit()
        raise Cancelled(stage)
    payload = {"stage": stage, "stage_label": STAGE_LABELS[stage], "progress": STAGE_PROGRESS[stage]}
    payload.update(extra or {})
    await update(db, task_id, "running", STAGE_PROGRESS[stage], "stage", payload)
    await db.commit()


def idempotency_key(owner_id, topic: str, profile: dict | None) -> str:
    raw = json.dumps({"o": str(owner_id), "t": (topic or "").strip().lower(), "p": profile or {}}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


async def run_topic_job(db, owner_id: uuid.UUID, task_id: uuid.UUID, topic: str,
                        profile: dict | None = None, storage=None) -> dict:
    """Execute the full topic -> notes -> PDF workflow. Returns the job result."""

    settings = get_settings()
    profile = profile or {}
    started = datetime.now(timezone.utc)

    # 1-2 understanding + subject detection ------------------------------
    await _stage(db, task_id, "understanding_topic", {"topic": topic})
    classification = classify(topic)
    await _stage(db, task_id, "detecting_subject", {
        "subject": classification.subject,
        "confidence": classification.confidence,
        "is_ambiguous": classification.is_ambiguous,
        "clarification_question": classification.clarification_question,
        "ambiguous_meanings": classification.ambiguous_meanings,
    })

    # 3 research planning --------------------------------------------------
    queries = research_queries(classification, profile)
    await _stage(db, task_id, "planning_research", {"query_count": len(queries)})

    run = ResearchRun(owner_id=owner_id, query=classification.normalized_topic, status="running",
                      source_map={"queries": queries, "classification": classification.to_dict()})
    db.add(run)
    await db.flush()

    # 4 source discovery ---------------------------------------------------
    router = SearchRouter(settings)
    limitations: list[str] = []
    hits = []
    if not router.available:
        limitations.append("No search provider is enabled, so no external evidence could be retrieved.")
    else:
        if router.keyless_only:
            limitations.append(LIMITATION_NOTE)
        for query in queries[: settings.research_max_searches]:
            try:
                hits.extend(await router.search(query, settings.search_max_results))
            except SearchUnavailable as exc:
                limitations.append(f"Search failed for '{query}': {exc}")
    await _stage(db, task_id, "finding_sources", {"raw_hits": len(hits), "providers": router.active_provider_names})

    # 5 retrieval + dedup --------------------------------------------------
    seen: set[str] = set()
    unique = []
    for hit in hits:
        try:
            key = canonical(hit.url)
        except Exception:  # noqa: BLE001 - malformed URL from a provider
            continue
        if key in seen:
            continue
        seen.add(key)
        unique.append(hit)
    unique = unique[: settings.research_max_sources]
    await _stage(db, task_id, "reading_sources", {"unique_sources": len(unique)})

    sources: list[dict] = []
    retrieved_text: dict[str, str] = {}
    for index, hit in enumerate(unique, 1):
        record = await db.scalar(select(Source).where(Source.url == hit.url))
        if record is None:
            record = Source(url=hit.url, title=hit.title, source_type=hit.source_type)
            db.add(record)
            await db.flush()
        db.add(ResearchSource(run_id=run.id, source_id=record.id, relevance_score=1.0 - index / (len(unique) + 1)))
        sources.append({
            "id": str(record.id),
            "url": hit.url,
            "title": hit.title,
            "source_type": hit.source_type,
            "provider": hit.provider,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "relevance_score": round(1.0 - index / (len(unique) + 1), 3),
            "quality_score": _quality_score(hit.source_type),
        })
        retrieved_text[hit.url] = hit.snippet or ""

    # 6 evidence comparison -------------------------------------------------
    claims = [
        {
            "claim_id": f"C{index}",
            "claim_text": hit.snippet.strip(),
            "citation_id": f"S{index}",
            "source_url": hit.url,
            "supporting_passage": hit.snippet.strip(),
        }
        for index, hit in enumerate(unique, 1)
        if (hit.snippet or "").strip()
    ]
    await _stage(db, task_id, "comparing_evidence", {"claims": len(claims)})
    await _stage(db, task_id, "building_outline", {"sections_planned": len(classification.subtopics)})

    # 7-13 note construction, validation and study resources ---------------
    await _stage(db, task_id, "writing_notes")
    document = build_document(
        classification,
        sources=sources,
        claims=claims,
        retrieved_text=retrieved_text,
        generated={},
        profile=profile,
        limitations=limitations,
        generative_available=_generative_available(),
    )
    await _stage(db, task_id, "checking_facts", {"claim_status": document.validations.get("claims", {})})
    await _stage(db, task_id, "verifying_formulas", {"validations": document.validations.get("counts", {})})
    await _stage(db, task_id, "solving_numericals")
    await _stage(db, task_id, "creating_questions")
    await _stage(db, task_id, "creating_practice")

    # 14 PDF ----------------------------------------------------------------
    await _stage(db, task_id, "rendering_pdf")
    pdf_bytes, pdf_meta = render_note_pdf(document)
    storage_key = None
    storage_error = None
    if storage is not None:
        try:
            import io

            storage_key = storage.put(io.BytesIO(pdf_bytes), ".pdf")
        except Exception as exc:  # noqa: BLE001 - storage backends vary
            storage_error = f"{type(exc).__name__}: {exc}"

    # 15 save ---------------------------------------------------------------
    await _stage(db, task_id, "saving")
    note = Note(
        owner_id=owner_id,
        title=document.topic,
        content=document.to_markdown(),
    )
    if hasattr(note, "structured"):
        note.structured = document.to_dict()
    if hasattr(note, "metadata_json"):
        note.metadata_json = {"pdf": {**pdf_meta, "storage_key": storage_key, "error": storage_error}}
    db.add(note)
    await db.flush()

    run.status = "succeeded"
    result = {
        "note_id": str(note.id),
        "run_id": str(run.id),
        "topic": document.topic,
        "subject": document.subject,
        "academic_context": document.academic_context,
        "sections": [section.key for section in document.sections],
        "citation_count": len(document.citations),
        "validations": document.validations,
        "limitations": document.limitations,
        "pdf": {
            "filename": pdf_meta["filename"],
            "status": "stored" if storage_key else ("failed" if storage_error else "not_stored"),
            "storage_key": storage_key,
            "checksum": pdf_meta["checksum"],
            "byte_size": pdf_meta["byte_size"],
            "renderer_version": pdf_meta["renderer_version"],
            "error": storage_error,
        },
        "duration_seconds": (datetime.now(timezone.utc) - started).total_seconds(),
    }

    await update(db, task_id, "succeeded", 1.0, "completed", {"stage": "completed", "stage_label": "Completed"}, result=result)
    await db.commit()
    return result


def _quality_score(source_type: str) -> float:
    """Source-priority weighting (official syllabus highest, general web lowest)."""

    return {
        "official_syllabus": 1.0,
        "question_paper": 0.97,
        "marking_scheme": 0.94,
        "government": 0.9,
        "textbook": 0.86,
        "peer_reviewed": 0.82,
        "open_educational": 0.75,
        "documentation": 0.7,
        "encyclopaedia": 0.65,
        "web": 0.5,
        "user_upload": 0.45,
    }.get(source_type, 0.5)


def _generative_available() -> bool:
    try:
        from app.ai.models.router import ModelRouter

        return ModelRouter().generative_available
    except Exception:  # noqa: BLE001 - never let diagnostics break a job
        return False


def stage_catalogue() -> list[dict]:
    """Public description of the workflow for the mobile progress UI."""

    return [{"key": key, "label": label, "progress": progress} for key, label, progress in STAGES]
