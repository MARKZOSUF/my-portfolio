"""Adaptive quiz tests (spec section 6)."""
from extensions import db
from models import Quiz, QuizAttempt
from services.research.artifacts import validate_mcqs
from tests.conftest import make_completed_session, make_user

FOUR_MCQS = [
    {"question": f"Q{i}?", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "Because."}
    for i in range(4)
]


def _session_with_quiz(app, email="student@example.com", mcqs=None):
    user = make_user(app, email=email)
    return make_completed_session(app, user.id, result_overrides={"mcqs": mcqs if mcqs is not None else FOUR_MCQS})


def _generate(client, session_pid, difficulty="medium"):
    return client.post("/api/quiz/generate", json={"research_id": session_pid, "difficulty": difficulty})


def _submit(client, quiz_pid, answers):
    return client.post(f"/api/quiz/{quiz_pid}/submit", json={"answers": answers})


def _submit_score(client, quiz_pid, correct_count):
    """Answer the first N questions correctly (option A is always correct)."""
    questions = client.get(f"/api/quiz/{quiz_pid}").json["quiz"]["questions"]
    answers = {str(q["id"]): ("A" if i < correct_count else "B") for i, q in enumerate(questions)}
    return _submit(client, quiz_pid, answers)


def test_low_score_suggests_easy(client, user, app):
    session_row = _session_with_quiz(app)
    quiz = _generate(client, session_row.public_id).json["quiz"]
    response = _submit_score(client, quiz["id"], 0)
    assert response.json["score"] == 0
    assert response.json["next_difficulty"] == "easy"


def test_medium_score_suggests_medium(client, user, app):
    session_row = _session_with_quiz(app)
    quiz = _generate(client, session_row.public_id).json["quiz"]
    response = _submit_score(client, quiz["id"], 2)
    assert response.json["score"] == 50
    assert response.json["next_difficulty"] == "medium"


def test_high_score_suggests_hard(client, user, app):
    session_row = _session_with_quiz(app)
    quiz = _generate(client, session_row.public_id).json["quiz"]
    response = _submit_score(client, quiz["id"], 4)
    assert response.json["score"] == 100
    assert response.json["next_difficulty"] == "hard"


def test_new_version_created_and_previous_preserved(client, user, app):
    session_row = _session_with_quiz(app)
    v1 = _generate(client, session_row.public_id, "medium").json["quiz"]
    v2 = client.post(
        "/api/quiz/generate", json={"research_id": session_row.public_id, "difficulty": "hard"}
    ).json["quiz"]
    assert v2["version"] == 2 and v2["difficulty"] == "hard"
    with app.app_context():
        versions = sorted(q.version for q in Quiz.query.filter_by(session_id=session_row.id).all())
        assert versions == [1, 2]  # previous version preserved
    # Re-requesting the same difficulty reuses the current version.
    again = client.post(
        "/api/quiz/generate", json={"research_id": session_row.public_id, "difficulty": "hard"}
    )
    assert again.json["reused"] is True
    assert again.json["quiz"]["id"] == v2["id"]


def test_attempts_are_preserved(client, user, app):
    session_row = _session_with_quiz(app)
    quiz = _generate(client, session_row.public_id).json["quiz"]
    _submit(client, quiz["id"], {})
    _submit(client, quiz["id"], {})
    with app.app_context():
        assert QuizAttempt.query.count() == 2
    packed = client.get(f"/api/quiz/{quiz['id']}").json["quiz"]
    assert len(packed["attempts"]) == 2


def test_invalid_mcqs_filtered():
    items = [
        {"question": "Valid?", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "x"},
        {"question": "Three options", "options": ["A", "B", "C"], "answer": "A"},
        {"question": "Answer outside options", "options": ["A", "B", "C", "D"], "answer": "Z"},
        {"question": "", "options": ["A", "B", "C", "D"], "answer": "A"},
        {"question": "No explanation", "options": ["A", "B", "C", "D"], "answer": "B"},
    ]
    valid = validate_mcqs(items)
    assert len(valid) == 2
    assert valid[1]["explanation"]  # explanation safely defaulted


def test_empty_quiz_rejected_safely(client, user, app):
    session_row = _session_with_quiz(app, mcqs=[])
    response = _generate(client, session_row.public_id)
    assert response.status_code == 422
    assert response.json["error"]["code"] == "QUIZ_EMPTY"
    with app.app_context():
        assert Quiz.query.count() == 0
