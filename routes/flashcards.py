"""Flashcard routes.

Regeneration never deletes cards: outdated cards are archived
(``is_current = False``) so study progress (``status``) is preserved. Cards
whose normalized content already exists are reactivated in place instead of
being duplicated.
"""
from flask import Blueprint, current_app, jsonify, request

from extensions import db, limiter
from models import Flashcard, ResearchSession
from services.research.artifacts import dedupe_flashcards
from utils.auth import current_user, login_required
from utils.errors import AppError
from utils.validation import require_json

bp = Blueprint("flashcards", __name__, url_prefix="/api/flashcards")

VALID_STATUSES = {"known", "review", "new"}


def pack(card):
    return {"id": card.public_id, "front": card.front, "back": card.back, "status": card.status, "version": card.version}


def owned_session(pid):
    row = ResearchSession.query.filter_by(public_id=pid, user_id=current_user().id).first()
    if not row:
        raise AppError("RESEARCH_NOT_FOUND", "Research session not found.", 404)
    return row


@bp.get("")
@login_required
def list_cards():
    row = owned_session(request.args.get("research_id"))
    cards = Flashcard.query.filter_by(session_id=row.id, is_current=True).order_by(Flashcard.id).all()
    return jsonify({"success": True, "flashcards": [pack(x) for x in cards]})


@bp.post("/generate")
@login_required
@limiter.limit("10 per hour")
def generate():
    data = require_json(request)
    row = owned_session(data.get("research_id"))
    if row.status != "complete":
        raise AppError("RESEARCH_NOT_READY", "Research is not ready.", 409)
    existing = Flashcard.query.filter_by(session_id=row.id).all()
    current_cards = [c for c in existing if c.is_current]
    if current_cards and not data.get("regenerate"):
        return jsonify({"success": True, "reused": True, "flashcards": [pack(x) for x in current_cards]})

    version = max([x.version for x in existing], default=0) + 1
    by_hash = {c.content_hash: c for c in existing}
    new_cards = dedupe_flashcards(row.result_json.get("flashcards"))
    new_hashes = {c["content_hash"] for c in new_cards}

    # Archive cards that are not part of the new generation (kept in DB).
    for card in existing:
        if card.content_hash not in new_hashes:
            card.is_current = False

    result_cards = []
    for item in new_cards:
        prior = by_hash.get(item["content_hash"])
        if prior is not None:
            # Identical content already exists: reactivate it and keep its
            # study status instead of creating a duplicate.
            prior.is_current = True
            result_cards.append(prior)
            continue
        try:
            with db.session.begin_nested():
                card = Flashcard(
                    session_id=row.id,
                    front=item["front"],
                    back=item["back"],
                    content_hash=item["content_hash"],
                    version=version,
                    is_current=True,
                )
                db.session.add(card)
                db.session.flush()
            result_cards.append(card)
        except Exception:
            current_app.logger.info("Skipped duplicate flashcard insert for session %s", row.public_id)
    db.session.commit()
    if not result_cards:
        raise AppError(
            "FLASHCARDS_EMPTY",
            "The research result did not contain any usable flashcards. The notes and quiz remain available.",
            422,
        )
    return jsonify({"success": True, "reused": False, "flashcards": [pack(x) for x in result_cards]}), 201


@bp.post("/<pid>/status")
@login_required
def status(pid):
    data = require_json(request)
    card = Flashcard.query.filter_by(public_id=pid).first()
    row = ResearchSession.query.filter_by(id=card.session_id, user_id=current_user().id).first() if card else None
    if not row:
        raise AppError("FLASHCARD_NOT_FOUND", "Flashcard not found.", 404)
    if data.get("status") not in VALID_STATUSES:
        raise AppError("INVALID_STATUS", "Status must be New, Review, or Known.")
    card.status = data["status"]
    db.session.commit()
    return jsonify({"success": True, "flashcard": pack(card)})
