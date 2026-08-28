"""Research session routes.

Acceptance order for every new session (create/continue/retry):
1. AI readiness gate (enabled + supported + configured) — before quota.
2. Mode decision and validation (structured 422s, never silent fallback).
3. Quota reservation.
4. Session creation + job enqueue (enqueue failure marks the session failed
   and refunds the quota).
"""
import json
import time

from flask import Blueprint, Response, current_app, jsonify, request, stream_with_context

from extensions import db, limiter
from models import Document, ResearchSession
from services.ai.factory import provider_status, require_ai_ready
from services.jobs import submit_research
from utils.auth import current_user, login_required
from utils.errors import AppError
from utils.usage import refund_daily_usage, reserve_daily_usage
from utils.validation import clean_text, page_args, require_json

bp = Blueprint("research", __name__, url_prefix="/api/research")

VALID_MODES = {"quick", "standard", "deep"}
VALID_LANGUAGES = {"English", "Hindi", "Hinglish"}
MAX_SELECTED_DOCUMENTS = 10


def owned(pid):
    """Central ownership lookup: a session exists only for its owner."""
    row = ResearchSession.query.filter_by(public_id=pid, user_id=current_user().id).first()
    if not row:
        raise AppError("RESEARCH_NOT_FOUND", "Research session not found.", 404)
    return row


def pack(row, include_result=True):
    out = {
        "id": row.public_id,
        "parent_id": row.parent.public_id if getattr(row, "parent", None) else None,
        "query": row.query,
        "mode": row.mode,
        "study_mode": row.study_mode,
        "language": row.language,
        "status": row.status,
        "stage": row.stage,
        "progress": row.progress,
        "created_at": row.created_at.isoformat(),
        "intent": row.intent_json,
        "plan": row.plan_json,
        "error": {"code": row.error_code, "message": row.error_message} if row.error_code else None,
    }
    if include_result:
        out["result"] = row.result_json
    return out


def selected_documents(ids, user):
    """Resolve requested document public ids to user-owned documents."""
    if not isinstance(ids, list) or len(ids) > MAX_SELECTED_DOCUMENTS:
        raise AppError("INVALID_DOCUMENTS", f"Select at most {MAX_SELECTED_DOCUMENTS} documents.")
    result = []
    for pid in ids:
        doc = Document.query.filter_by(public_id=str(pid), user_id=user.id).first()
        if not doc:
            raise AppError("DOCUMENT_NOT_FOUND", "One of the selected documents was not found.", 404)
        result.append(doc)
    return result


def _decide_study_mode(status, requested_live, documents):
    """Strict mode decision. Never silently upgrades a document study to web
    research and never accepts full research without a search-capable
    provider."""
    if requested_live:
        if not status["capabilities"]["web_search"]:
            raise AppError(
                "WEB_SEARCH_NOT_SUPPORTED",
                "Live web research is not supported by the configured provider. "
                "Disable live research and upload documents to use Document Study Mode.",
                422,
            )
        return "full_research"
    if not documents:
        raise AppError(
            "DOCUMENTS_REQUIRED",
            "Document Study Mode requires at least one selected document. "
            "Upload a document or enable live web research.",
            422,
        )
    return "document_study"


def _enqueue_or_fail(row, user_id):
    """Enqueue the job; on failure mark the session failed and refund quota."""
    try:
        submit_research(row.id)
    except AppError:
        db.session.rollback()
        fresh = db.session.get(ResearchSession, row.id)
        if fresh is not None:
            fresh.status = "failed"
            fresh.error_code = "JOB_ENQUEUE_FAILED"
            fresh.error_message = "The research job could not be queued. Your daily allowance was not consumed."
            db.session.commit()
        refund_daily_usage(user_id)
        raise AppError(
            "JOB_ENQUEUE_FAILED",
            "The research job could not be queued. Your daily allowance was not consumed. Please try again shortly.",
            503,
        )


@bp.get("")
@login_required
def history():
    page, size = page_args(request)
    query = ResearchSession.query.filter_by(user_id=current_user().id).order_by(ResearchSession.created_at.desc())
    pager = query.paginate(page=page, per_page=size, error_out=False)
    return jsonify(
        {
            "success": True,
            "items": [pack(x, False) for x in pager.items],
            "pagination": {"page": page, "page_size": size, "total": pager.total, "pages": pager.pages},
        }
    )


@bp.post("")
@login_required
@limiter.limit("10 per hour")
def create():
    data = require_json(request)
    user = current_user()
    query = clean_text(data.get("query"), current_app.config["MAX_QUERY_LENGTH"], "research topic")
    mode = str(data.get("mode", "standard")).lower()
    language = data.get("language", "English")
    if mode not in VALID_MODES:
        raise AppError("INVALID_MODE", "Mode must be quick, standard, or deep.")
    if language not in VALID_LANGUAGES:
        raise AppError("INVALID_LANGUAGE", "Unsupported language.")

    # Readiness gate runs before quota consumption and session creation.
    status = require_ai_ready()
    documents = selected_documents(data.get("document_ids") or [], user)
    requested_live = bool(data.get("live_research", True))
    study_mode = _decide_study_mode(status, requested_live, documents)

    reserve_daily_usage(user.id)
    row = ResearchSession(
        user_id=user.id,
        query=query,
        mode=mode,
        study_mode=study_mode,
        language=language,
        level=str(data.get("level") or "")[:80],
        document_ids_json=[d.id for d in documents],
    )
    db.session.add(row)
    db.session.commit()
    _enqueue_or_fail(row, user.id)
    return jsonify({"success": True, "research": pack(row, False)}), 202


@bp.get("/<pid>")
@login_required
def get(pid):
    return jsonify({"success": True, "research": pack(owned(pid))})


@bp.delete("/<pid>")
@login_required
def delete(pid):
    row = owned(pid)
    if row.status == "running":
        raise AppError("RESEARCH_RUNNING", "Wait for research to finish before deleting it.", 409)
    db.session.delete(row)
    db.session.commit()
    return jsonify({"success": True})


@bp.get("/<pid>/sources")
@login_required
def sources(pid):
    row = owned(pid)
    items = []
    for source in row.sources:
        # URL was validated before storage; defense-in-depth without DNS during rendering.
        from utils.security import validate_public_url

        try:
            url = validate_public_url(source.url, resolve=False).url
        except AppError:
            continue
        items.append(
            {
                "id": source.public_id,
                "citation_index": source.citation_index,
                "title": source.title,
                "url": url,
                "domain": source.domain,
                "source_type": source.source_type,
                "publication_date": source.publication_date,
                "quality_score": source.reliability_score,
                "quality_label": "Heuristic source-quality indicator",
                "extraction_status": source.extraction_status,
            }
        )
    return jsonify({"success": True, "sources": items})


@bp.post("/<pid>/continue")
@login_required
@limiter.limit("5 per hour")
def continue_research(pid):
    previous = owned(pid)
    data = require_json(request)
    focus = clean_text(data.get("focus"), 500, "focus")
    user = current_user()

    # Follow-ups preserve the parent's study mode. A document-only parent
    # stays document-only even when the provider supports web search.
    status = require_ai_ready()
    if previous.study_mode == "full_research" and not status["capabilities"]["web_search"]:
        raise AppError(
            "WEB_SEARCH_NOT_SUPPORTED",
            "This session used live web research, which the configured provider does not support.",
            422,
        )
    if previous.study_mode == "document_study" and not previous.document_ids_json:
        raise AppError("DOCUMENTS_REQUIRED", "Document Study Mode requires at least one uploaded document.", 422)

    reserve_daily_usage(user.id)
    row = ResearchSession(
        user_id=user.id,
        parent_session_id=previous.id,
        query=f"{previous.query} — Follow-up: {focus}",
        mode="deep",
        study_mode=previous.study_mode,
        language=previous.language,
        level=previous.level,
        document_ids_json=previous.document_ids_json,
    )
    db.session.add(row)
    db.session.commit()
    _enqueue_or_fail(row, user.id)
    return jsonify({"success": True, "research": pack(row, False)}), 202


@bp.post("/<pid>/retry")
@login_required
@limiter.limit("5 per hour")
def retry(pid):
    """Re-queue a failed session. Retries do not consume additional daily
    allowance; the endpoint is rate-limited instead (see docs/OPERATIONS.md)."""
    row = owned(pid)
    if row.status != "failed":
        raise AppError("RESEARCH_NOT_FAILED", "Only failed research sessions can be retried.", 409)
    require_ai_ready()
    row.status = "queued"
    row.stage = "Queued"
    row.progress = 0
    row.error_code = None
    row.error_message = None
    db.session.commit()
    try:
        submit_research(row.id)
    except AppError:
        db.session.rollback()
        fresh = db.session.get(ResearchSession, row.id)
        fresh.status = "failed"
        fresh.error_code = "JOB_ENQUEUE_FAILED"
        fresh.error_message = "The research job could not be queued. Please try again shortly."
        db.session.commit()
        raise AppError("JOB_ENQUEUE_FAILED", "The research job could not be queued. Please try again shortly.", 503)
    return jsonify({"success": True, "research": pack(row, False)}), 202


@bp.get("/<pid>/events")
@login_required
def events(pid):
    owned(pid)

    @stream_with_context
    def generate():
        last = None
        started = time.monotonic()
        while time.monotonic() - started < 300:
            db.session.expire_all()
            row = ResearchSession.query.filter_by(public_id=pid, user_id=current_user().id).first()
            if not row:
                break
            state = (row.status, row.stage, row.progress)
            if state != last:
                yield f"event: progress\ndata: {json.dumps({'status': row.status, 'stage': row.stage, 'progress': row.progress})}\n\n"
                last = state
            else:
                yield ": heartbeat\n\n"
            if row.status in {"complete", "failed"}:
                yield "event: done\ndata: {}\n\n"
                break
            time.sleep(2)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@bp.get("/provider")
@login_required
def provider():
    """Server-safe provider status for the frontend (no key material)."""
    return jsonify({"success": True, "provider": provider_status()})
