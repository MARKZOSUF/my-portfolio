"""Adaptive quiz routes.

Adaptivity is real: a submitted quiz records an immutable QuizAttempt,
computes the next difficulty, and generating with that difficulty creates a
new preserved quiz version. Prior versions and attempts are never deleted.
"""
from flask import Blueprint, jsonify, request

from extensions import db, limiter
from models import Quiz, QuizAttempt, QuizQuestion, ResearchSession
from services.research.artifacts import validate_mcqs
from utils.auth import current_user, login_required
from utils.errors import AppError
from utils.validation import require_json

bp = Blueprint("quiz", __name__, url_prefix="/api/quiz")

DIFFICULTIES = {"easy", "medium", "hard"}


def next_difficulty(score):
    """Score thresholds: <50 easy, 50-79 medium, >=80 hard."""
    if score >= 80:
        return "hard"
    if score < 50:
        return "easy"
    return "medium"


def owned_quiz(pid):
    quiz = Quiz.query.filter_by(public_id=pid).first()
    row = ResearchSession.query.filter_by(id=quiz.session_id, user_id=current_user().id).first() if quiz else None
    if not quiz or not row:
        raise AppError("QUIZ_NOT_FOUND", "Quiz not found.", 404)
    return quiz, row


def pack(quiz, answers=False):
    return {
        "id": quiz.public_id,
        "title": quiz.title,
        "difficulty": quiz.difficulty,
        "version": quiz.version,
        "score": quiz.score,
        "attempts": [
            {"score": a.score, "next_difficulty": a.next_difficulty, "created_at": a.created_at.isoformat()}
            for a in quiz.attempts
        ],
        "questions": [
            {
                "id": q.id,
                "type": q.question_type,
                "prompt": q.prompt,
                "options": q.options,
                "difficulty": q.difficulty,
                **({"answer": q.answer, "explanation": q.explanation} if answers else {}),
            }
            for q in quiz.questions
        ],
    }


@bp.get("/<pid>")
@login_required
def get(pid):
    return jsonify({"success": True, "quiz": pack(owned_quiz(pid)[0])})


@bp.post("/generate")
@login_required
@limiter.limit("10 per hour")
def generate():
    data = require_json(request)
    row = ResearchSession.query.filter_by(public_id=data.get("research_id"), user_id=current_user().id).first()
    if not row or row.status != "complete":
        raise AppError("RESEARCH_NOT_READY", "Research is not ready.", 409)
    difficulty = data.get("difficulty", "medium")
    if difficulty not in DIFFICULTIES:
        raise AppError("INVALID_DIFFICULTY", "Difficulty is invalid.")
    current = Quiz.query.filter_by(session_id=row.id).order_by(Quiz.version.desc()).first()
    wants_new = bool(data.get("regenerate")) or (current is not None and difficulty != current.difficulty)
    if current and not wants_new:
        return jsonify({"success": True, "reused": True, "quiz": pack(current)})

    questions = validate_mcqs(row.result_json.get("mcqs"))
    if not questions:
        raise AppError(
            "QUIZ_EMPTY",
            "The research result did not contain any valid quiz questions. Regenerate the research or continue studying with notes and flashcards.",
            422,
        )
    quiz = Quiz(
        session_id=row.id,
        title=f"Adaptive quiz — {row.query[:120]}",
        difficulty=difficulty,
        version=(current.version + 1 if current else 1),
    )
    db.session.add(quiz)
    db.session.flush()
    for item in questions:
        db.session.add(
            QuizQuestion(
                quiz_id=quiz.id,
                question_type="mcq",
                prompt=item["question"],
                options=item["options"],
                answer=item["answer"],
                explanation=item["explanation"],
                difficulty=difficulty,
            )
        )
    db.session.commit()
    return jsonify({"success": True, "reused": False, "quiz": pack(quiz)}), 201


@bp.post("/<pid>/submit")
@login_required
def submit(pid):
    quiz, row = owned_quiz(pid)
    data = require_json(request)
    answers = data.get("answers")
    if not isinstance(answers, dict):
        raise AppError("INVALID_ANSWERS", "Answers must be an object.")
    if not quiz.questions:
        raise AppError("QUIZ_EMPTY", "This quiz has no questions.", 422)
    results = []
    correct = 0
    for question in quiz.questions:
        given = str(answers.get(str(question.id), "")).strip()
        ok = given.casefold() == question.answer.strip().casefold()
        correct += int(ok)
        results.append(
            {"id": question.id, "correct": ok, "given": given, "answer": question.answer, "explanation": question.explanation}
        )
    quiz.score = round(100 * correct / len(quiz.questions), 1)
    nxt = next_difficulty(quiz.score)
    db.session.add(
        QuizAttempt(
            quiz_id=quiz.id,
            user_id=row.user_id,
            score=quiz.score,
            next_difficulty=nxt,
            answers_json={str(k): str(v)[:500] for k, v in list(answers.items())[:100]},
        )
    )
    db.session.commit()
    return jsonify({"success": True, "score": quiz.score, "results": results, "next_difficulty": nxt, "version": quiz.version})
