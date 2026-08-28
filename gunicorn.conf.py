"""Gunicorn configuration for StudyResearch AI.

Timeouts are sized above the SSE progress stream cadence (heartbeats every
~2s, stream capped at 300s) and below the research job timeout (900s, which
runs on RQ workers, not the web process).
"""
import multiprocessing
import os

bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
workers = int(os.getenv("GUNICORN_WORKERS", max(2, min(4, multiprocessing.cpu_count()))))
threads = int(os.getenv("GUNICORN_THREADS", "4"))
worker_class = "gthread"

# Generous request timeout for SSE progress streams; graceful shutdown for
# safe deploys.
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT", "30"))
keepalive = 5
max_requests = int(os.getenv("GUNICORN_MAX_REQUESTS", "2000"))
max_requests_jitter = 200

accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")
