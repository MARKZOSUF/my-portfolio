"""Contextual chat over completed research sessions.

- History is persisted in ConversationMessage and retrievable by the owner.
- Prompts are strictly delimited: system rules (system role), untrusted
  conversation history, untrusted RAG evidence, current question.
- History and message length are bounded to prevent unbounded prompt growth.
- Stored user and assistant messages are treated as untrusted data and can
  never override the system/evidence rules.
"""
from flask import Blueprint, current_app, jsonify, request

from extensions import db, limiter
from models import ConversationMessage, Document, ResearchSession
from services.ai.factory import get_ai_provider, require_ai_ready
from services.rag.engine import build_store
from services.research.prompts import CHAT_PROMPT, CHAT_SYSTEM
from utils.auth import current_user, login_required
from utils.errors import AppError
from utils.security import sanitize_prompt_text
from utils.validation import clean_text, require_json

bp = Blueprint("chat", __name__, url_prefix="/api/chat")

EMPTY_EVIDENCE_NOTE = "(no usable evidence was retrieved for this session)"


def _owned_completed(pid, require_complete=True):
    row = ResearchSession.query.filter_by(public_id=pid, user_id=current_user().id).first()
    if not row:
        raise AppError("RESEARCH_NOT_FOUND", "Research session not found.", 404)
    if require_complete and row.status != "complete":
        raise AppError("RESEARCH_NOT_READY", "Complete research is required before contextual chat.", 409)
    return row


def _recent_history(row, limit):
    if limit <= 0:
        return []
    messages = (
        ConversationMessage.query.filter_by(session_id=row.id)
        .order_by(ConversationMessage.id.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(messages))


def _pack(message):
    return {"role": message.role, "content": message.content, "created_at": message.created_at.isoformat()}


@bp.get("")
@login_required
def history():
    """Retrieve the owner's chat history for a research session."""
    row = _owned_completed(request.args.get("research_id"), require_complete=False)
    limit = current_app.config["CHAT_HISTORY_LIMIT"]
    messages = _recent_history(row, limit)
    return jsonify({"success": True, "messages": [_pack(m) for m in messages]})


@bp.post("")
@login_required
@limiter.limit("30 per hour")
def chat():
    data = require_json(request)
    require_ai_ready()
    question = clean_text(data.get("message"), current_app.config["CHAT_MESSAGE_MAX"], "message")
    row = _owned_completed(data.get("research_id"))

    documents = (
        Document.query.filter(Document.user_id == row.user_id, Document.id.in_(row.document_ids_json or [])).all()
        if row.document_ids_json
        else []
    )
    retrieved = build_store(row.sources, documents).search(question, 8)
    context = "\n\n".join(f"{x.source_label} {sanitize_prompt_text(x.text, 1200)}" for x in retrieved)
    if not context.strip():
        context = EMPTY_EVIDENCE_NOTE

    history_limit = current_app.config["CHAT_HISTORY_LIMIT"]
    history_lines = [
        f"{m.role}: {sanitize_prompt_text(m.content, current_app.config['CHAT_MESSAGE_MAX'])}"
        for m in _recent_history(row, history_limit)
    ]
    history_text = "\n".join(history_lines) if history_lines else "(no prior conversation)"

    prompt = CHAT_PROMPT.format(history=history_text, evidence=context, question=question, language=row.language)
    answer = get_ai_provider().generate(
        [{"role": "system", "content": CHAT_SYSTEM}, {"role": "user", "content": prompt}],
        max_tokens=1800,
    ).text

    db.session.add_all(
        [
            ConversationMessage(session_id=row.id, user_id=row.user_id, role="user", content=question),
            ConversationMessage(session_id=row.id, user_id=row.user_id, role="assistant", content=answer),
        ]
    )
    db.session.commit()
    return jsonify({"success": True, "answer": answer})
