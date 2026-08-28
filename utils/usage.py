"""Daily usage reservation and audit recording.

Quota policy: a research run consumes one daily allowance at reservation
time. If job enqueue fails, the reservation is refunded. Retries of failed
sessions do not consume additional allowance (see docs/OPERATIONS.md).
"""
from datetime import datetime, timezone

from flask import current_app
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import DailyUsage, UsageRecord
from utils.errors import AppError


def reserve_daily_usage(user_id, action="research", limit=None):
    """Atomically consume one unit of the daily allowance or raise 429."""
    day = datetime.now(timezone.utc).date()
    limit = limit or current_app.config["FREE_DAILY_RESEARCH_LIMIT"]
    try:
        with db.session.begin_nested():
            db.session.add(DailyUsage(user_id=user_id, day=day, action=action, count=1))
            db.session.flush()
        db.session.commit()
        return 1
    except IntegrityError:
        db.session.rollback()
    stmt = (
        update(DailyUsage)
        .where(
            DailyUsage.user_id == user_id,
            DailyUsage.day == day,
            DailyUsage.action == action,
            DailyUsage.count < limit,
        )
        .values(count=DailyUsage.count + 1)
    )
    result = db.session.execute(stmt)
    if result.rowcount != 1:
        db.session.rollback()
        raise AppError("DAILY_LIMIT_REACHED", "Daily research limit reached. Try again tomorrow.", 429)
    row = DailyUsage.query.filter_by(user_id=user_id, day=day, action=action).first()
    db.session.commit()
    return row.count


def refund_daily_usage(user_id, action="research"):
    """Return one unit of allowance (used when a job could not be queued)."""
    day = datetime.now(timezone.utc).date()
    stmt = (
        update(DailyUsage)
        .where(
            DailyUsage.user_id == user_id,
            DailyUsage.day == day,
            DailyUsage.action == action,
            DailyUsage.count > 0,
        )
        .values(count=DailyUsage.count - 1)
    )
    db.session.execute(stmt)
    db.session.commit()


def record_usage(user_id, action, success=True, **meta):
    """Append an audit record. Metadata must never contain secrets."""
    db.session.add(UsageRecord(user_id=user_id, action=action, success=success, metadata_json=meta))
    db.session.commit()
