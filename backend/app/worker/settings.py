"""
ARQ WorkerSettings — loaded by the arq CLI:

    arq app.worker.settings.WorkerSettings

Or run via the helper script:

    python -m app.worker.settings
"""
from __future__ import annotations

from arq import cron
from arq.connections import RedisSettings

from app.config import settings
from app.worker.jobs import auto_fulfill_job, evaluate_alerts_job, score_suppliers_job, sync_store_job


class WorkerSettings:
    """ARQ worker configuration."""

    # Jobs available to this worker
    functions = [sync_store_job, auto_fulfill_job, evaluate_alerts_job, score_suppliers_job]

    # Cron jobs
    cron_jobs = [
        cron(evaluate_alerts_job, minute={0, 15, 30, 45}),          # every 15 min
        cron(score_suppliers_job, weekday=0, hour=3, minute=0),     # weekly Monday 03:00 UTC
    ]

    # Redis connection
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)

    # Worker behaviour
    max_jobs: int = 10
    job_timeout: int = 600       # 10 minutes max per job (large syncs)
    keep_result: int = 3_600     # Keep job results in Redis for 1 hour
    keep_result_forever: bool = False
    retry_jobs: bool = True
    max_tries: int = 3           # Retry failed jobs up to 3 times

    # Health check
    health_check_interval: int = 30
    health_check_key: str = "dropos:worker:health"

    # Logging
    log_results: bool = True
