"""System endpoints: health checks and usage.

Health model:
- ``/api/health/live`` — process liveness only. Never touches the database,
  Redis, or the paid AI provider. Always 200 when the process can serve.
- ``/api/health/ready`` — dependency readiness: database, Redis when RQ or
  a Redis rate-limit backend is configured, and production configuration
  sanity. Returns 503 when any dependency is unavailable. Never calls the
  AI provider (a missing AI key is not a readiness failure).
- ``/api/health`` — backward-compatible composite summary (always 200; the
  ``status`` field carries ok/degraded).
"""
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify

from extensions import db
from models import DailyUsage
from services.ai.factory import provider_status
from utils.auth import current_user, login_required

bp = Blueprint("system", __name__, url_prefix="/api")


def _database_ok():
    try:
        db.session.execute(db.text("SELECT 1"))
        return True
    except Exception:
        db.session.rollback()
        return False


def _redis_required():
    cfg = current_app.config
    return cfg.get("JOB_BACKEND") == "rq" or str(cfg.get("RATELIMIT_STORAGE_URI", "")).startswith("redis")


def _redis_ok():
    try:
        import redis

        client = redis.Redis.from_url(current_app.config["REDIS_URL"], socket_connect_timeout=2, socket_timeout=2)
        return bool(client.ping())
    except Exception:
        return False


def _config_ready():
    from config import validate_config

    return not validate_config(current_app.config)


@bp.get("/health/live")
def health_live():
    return jsonify({"status": "alive"})


@bp.get("/health/ready")
def health_ready():
    checks = {"database": _database_ok()}
    if _redis_required():
        checks["redis"] = _redis_ok()
    checks["configuration"] = _config_ready()
    ready = all(checks.values())
    return jsonify({"status": "ready" if ready else "not_ready", "checks": checks}), 200 if ready else 503


@bp.get("/health")
def health():
    database = "ok" if _database_ok() else "error"
    status = provider_status()
    return jsonify(
        {
            "status": "ok" if database == "ok" else "degraded",
            "database": database,
            "provider_configured": status["configured"],
            "provider_enabled": status["enabled"],
            "provider_ready": status["ready"],
            "provider": status["provider"],
            "mode": status["mode"],
            "capabilities": status["capabilities"],
        }
    )


@bp.get("/usage")
@login_required
def usage():
    today = datetime.now(timezone.utc).date()
    daily = DailyUsage.query.filter_by(user_id=current_user().id, day=today, action="research").first()
    used = daily.count if daily else 0
    status = provider_status()
    return jsonify(
        {
            "success": True,
            "daily": {
                "research_used": used,
                "research_limit": current_app.config["FREE_DAILY_RESEARCH_LIMIT"],
                "research_remaining": max(0, current_app.config["FREE_DAILY_RESEARCH_LIMIT"] - used),
            },
            "provider": status,
        }
    )
