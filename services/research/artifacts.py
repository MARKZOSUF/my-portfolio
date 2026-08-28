"""Validation and normalization helpers for generated study artifacts.

Centralizes MCQ structure validation and flashcard normalization so the
pipeline and the regenerate routes enforce identical rules.
"""
import hashlib
import re

MAX_MCQS = 20
MAX_FLASHCARDS = 40
DEFAULT_EXPLANATION = "Review the cited evidence for this question."


def _clean_str(value, limit):
    return " ".join(str(value or "").split())[:limit]


def validate_mcqs(items, limit=MAX_MCQS):
    """Return only structurally valid MCQs.

    A valid MCQ has a question, exactly four distinct usable options, an
    answer matching one option (case-insensitively), and an explanation
    (safely defaulted when absent).
    """
    valid = []
    for item in (items or [])[: limit * 3]:
        if not isinstance(item, dict):
            continue
        question = _clean_str(item.get("question"), 2000)
        if not question:
            continue
        options = []
        seen = set()
        for raw in item.get("options") or []:
            option = _clean_str(raw, 500)
            if option and option.casefold() not in seen:
                seen.add(option.casefold())
                options.append(option)
        if len(options) != 4:
            continue
        answer = _clean_str(item.get("answer"), 500)
        match = next((o for o in options if o.casefold() == answer.casefold()), None)
        if match is None:
            continue
        explanation = _clean_str(item.get("explanation"), 2000) or DEFAULT_EXPLANATION
        valid.append({"question": question, "options": options, "answer": match, "explanation": explanation})
        if len(valid) >= limit:
            break
    return valid


def normalize_card_text(value):
    """Collapse whitespace and trim; used for display-safe card text."""
    return re.sub(r"\s+", " ", str(value or "")).strip()


def flashcard_hash(front, back):
    """Stable dedupe hash over normalized, case-folded card text."""
    key = normalize_card_text(front).casefold() + "\0" + normalize_card_text(back).casefold()
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def dedupe_flashcards(items, limit=MAX_FLASHCARDS):
    """Normalize cards, drop empty ones, dedupe within the response.

    Returns a list of {"front", "back", "content_hash"} dicts.
    """
    cards = []
    seen = set()
    for item in (items or [])[: limit * 3]:
        if not isinstance(item, dict):
            continue
        front = normalize_card_text(item.get("front"))[:2000]
        back = normalize_card_text(item.get("back"))[:4000]
        if not front or not back:
            continue
        digest = flashcard_hash(front, back)
        if digest in seen:
            continue
        seen.add(digest)
        cards.append({"front": front, "back": back, "content_hash": digest})
        if len(cards) >= limit:
            break
    return cards
