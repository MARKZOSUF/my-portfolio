"""Background job submission and recovery.

Guarantees:
- Enqueue failures raise a structured AppError so the route can mark the
  session failed and refund the daily allowance; a session is never left
  permanently queued because of a queue outage.
- Job execution itself is idempotent (the pipeline only claims sessions that
  are still ``queued``).
- ``recover_stuck_sessions`` fails sessions stuck in queued/running past a
  configurable age so users see a clear failure state instead of a spinner.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from flask import current_app

from extensions import db
from models import ResearchSession
from utils.errors import AppError

_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="research-dev")


def _run_with_app(app, session_id):
    with app.app_context():
        from services.research.pipeline import run_research

        run_research(session_id)


def rq_run_research(session_id):
    """RQ entry point (must be importable by workers)."""
    from app import create_app

    _run_with_app(create_app("production"), session_id)


def submit_research(session_id):
    """Enqueue the research job and persist the job id.

    Raises AppError(JOB_ENQUEUE_FAILED) when the job could not be queued, so
    callers can fail the session and refund quota instead of leaving it
    queued forever.
    """
    app = current_app._get_current_object()
    timeout = app.config.get("RESEARCH_JOB_TIMEOUT", 900)
    if app.config["JOB_BACKEND"] == "rq":
        try:
            from redis import Redis
            from rq import Queue

            job = Queue("research", connection=Redis.from_url(app.config["REDIS_URL"]), default_timeout=timeout).enqueue(
                "services.jobs.rq_run_research",
                session_id,
                job_timeout=timeout,
                result_ttl=86400,
                failure_ttl=604800,
            )
            job_id = job.id
        except Exception as exc:
            current_app.logger.error("Job enqueue failed: %s", type(exc).__name__)
            raise AppError("JOB_ENQUEUE_FAILED", "The research queue is unavailable. Please try again shortly.", 503) from exc
    else:
        job_id = "thread-" + uuid4().hex
        try:
            _pool.submit(_run_with_app, app, session_id)
        except Exception as exc:
            current_app.logger.error("Job submission failed: %s", type(exc).__name__)
            raise AppError("JOB_ENQUEUE_FAILED", "The research queue is unavailable. Please try again shortly.", 503) from exc
    row = db.session.get(ResearchSession, session_id)
    if row is None:
        raise AppError("RESEARCH_NOT_FOUND", "Research session not found.", 404)
    row.job_id = job_id
    db.session.commit()
    return job_id


def recover_stuck_sessions(minutes=None):
    """Mark sessions stuck in queued/running as failed. Returns the count."""
    minutes = minutes or current_app.config.get("STUCK_SESSION_MINUTES", 30)
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    stuck = ResearchSession.query.filter(
        ResearchSession.status.in_(["queued", "running"]),
        ResearchSession.updated_at < cutoff,
    ).all()
    for row in stuck:
        row.status = "failed"
        row.error_code = "STALE_JOB_RECOVERED"
        row.error_message = "The research job did not finish in time and was recovered. You can retry it."
        current_app.logger.warning("Recovered stuck research session %s", row.public_id)
    db.session.commit()
    return len(stuck)
