"""Flashcard reliability tests (spec section 7)."""
from extensions import db
from models import Flashcard, ResearchSession
from tests.conftest import make_completed_session, make_user


def _session_with_cards(app, cards, email="student@example.com"):
    user = make_user(app, email=email)
    return make_completed_session(app, user.id, result_overrides={"flashcards": cards})


def _generate(client, pid, regenerate=False):
    return client.post("/api/flashcards/generate", json={"research_id": pid, "regenerate": regenerate})


def test_duplicate_cards_deduped(client, user, app):
    card = {"front": "Q?", "back": "A."}
    session_row = _session_with_cards(app, [card, card, dict(card)])
    response = _generate(client, session_row.public_id)
    assert response.status_code == 201
    assert len(response.json["flashcards"]) == 1


def test_whitespace_and_case_variants_deduped(client, user, app):
    session_row = _session_with_cards(
        app,
        [
            {"front": "What is 1NF?", "back": "Atomic values."},
            {"front": "  what is 1nf? ", "back": "atomic   values."},
        ],
    )
    response = _generate(client, session_row.public_id)
    assert len(response.json["flashcards"]) == 1


def test_empty_cards_skipped_and_empty_deck_rejected(client, user, app):
    session_row = _session_with_cards(
        app, [{"front": "", "back": "A"}, {"front": "Q", "back": "  "}, {"front": None, "back": None}]
    )
    response = _generate(client, session_row.public_id)
    assert response.status_code == 422
    assert response.json["error"]["code"] == "FLASHCARDS_EMPTY"
    with app.app_context():
        assert Flashcard.query.count() == 0


def test_regeneration_preserves_progress_and_versions(client, user, app):
    session_row = _session_with_cards(
        app, [{"front": "Keep me", "back": "Known answer"}, {"front": "Old card", "back": "Old back"}]
    )
    first = _generate(client, session_row.public_id).json["flashcards"]
    keep = next(c for c in first if c["front"] == "Keep me")
    client.post(f"/api/flashcards/{keep['id']}/status", json={"status": "known"})

    # Regenerate with one identical card (case variant) and one new card.
    with app.app_context():
        session = db.session.get(ResearchSession, session_row.id)
        session.result_json = {
            **session.result_json,
            "flashcards": [
                {"front": "keep me", "back": "known answer"},
                {"front": "Brand new", "back": "New back"},
            ],
        }
        db.session.commit()
    second = _generate(client, session_row.public_id, regenerate=True)
    assert second.status_code == 201
    cards = second.json["flashcards"]
    assert len(cards) == 2
    revived = next(c for c in cards if c["front"] == "Keep me")
    assert revived["status"] == "known"  # progress preserved on reactivation
    new_card = next(c for c in cards if c["front"] == "Brand new")
    assert new_card["version"] == 2
    with app.app_context():
        all_cards = Flashcard.query.filter_by(session_id=session_row.id).all()
        assert len(all_cards) == 3  # nothing deleted: old card archived
        archived = [c for c in all_cards if not c.is_current]
        assert len(archived) == 1 and archived[0].front == "Old card"


def test_ownership_and_status_rules(client, user, other_user, app):
    session_row = _session_with_cards(app, [{"front": "Q", "back": "A"}])
    card = _generate(client, session_row.public_id).json["flashcards"][0]
    assert client.get(f"/api/flashcards?research_id={session_row.public_id}").status_code == 404
    assert client.post(f"/api/flashcards/{card['id']}/status", json={"status": "known"}).status_code == 404
    assert client.post(f"/api/flashcards/{card['id']}/status", json={"status": "bogus"}).status_code in {400, 404}


def test_status_update_roundtrip(client, user, app):
    session_row = _session_with_cards(app, [{"front": "Q", "back": "A"}])
    card = _generate(client, session_row.public_id).json["flashcards"][0]
    response = client.post(f"/api/flashcards/{card['id']}/status", json={"status": "review"})
    assert response.json["flashcard"]["status"] == "review"
    listed = client.get(f"/api/flashcards?research_id={session_row.public_id}").json["flashcards"]
    assert listed[0]["status"] == "review"
