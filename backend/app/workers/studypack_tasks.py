"""Celery worker for the unified topic -> notes -> PDF job."""

import asyncio
import uuid

from app.database.session import SessionLocal
from app.jobs.service import update
from app.services.storage import get_storage
from app.studypack.pipeline import Cancelled, run_topic_job
from app.workers.celery_app import celery


async def _run(owner_id: str, task_id: str, topic: str, profile: dict):
    async with SessionLocal() as db:
        return await run_topic_job(db, uuid.UUID(owner_id), uuid.UUID(task_id), topic, profile, storage=get_storage())


@celery.task(bind=True, max_retries=2, name="studypack.topic", retry_backoff=True, retry_jitter=True)
def studypack_task(self, owner_id: str, task_id: str, topic: str, profile: dict | None = None):
    try:
        return asyncio.run(_run(owner_id, task_id, topic, profile or {}))
    except Cancelled:
        return {"status": "cancelled"}
    except Exception as exc:  # noqa: BLE001 - job must always record a structured failure
        async def fail():
            async with SessionLocal() as db:
                await update(
                    db,
                    uuid.UUID(task_id),
                    "failed",
                    1,
                    "failed",
                    {"error_code": type(exc).__name__, "message": str(exc)[:500]},
                    error=type(exc).__name__,
                )
                await db.commit()

        asyncio.run(fail())
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        raise
