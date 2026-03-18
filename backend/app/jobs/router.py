"""
Job status endpoint.

Clients can poll GET /jobs/{job_id} to track the progress of a background job
(e.g. a Shopify order sync triggered via POST /stores/{store_id}/sync).
"""
from __future__ import annotations

from typing import Any

from arq.connections import ArqRedis, RedisSettings, create_pool
from arq.jobs import Job, JobStatus
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.auth.dependencies import CurrentUser
from app.config import settings

router = APIRouter(prefix="/jobs", tags=["Jobs"])


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: Any | None = None
    error: str | None = None


@router.get(
    "/{job_id}",
    response_model=JobStatusResponse,
    summary="Poll the status of a background job",
)
async def get_job_status(
    job_id: str,
    current_user: CurrentUser,  # noqa: ARG001 — auth guard only
) -> JobStatusResponse:
    """
    Returns the current state of an ARQ job.

    Possible statuses:
    - **queued** — job is waiting to be picked up by a worker
    - **in_progress** — a worker is actively executing the job
    - **complete** — job finished successfully; result is in `result`
    - **not_found** — job ID is unknown or result TTL has expired
    - **deferred** — job is scheduled for a future time
    """
    redis: ArqRedis = await create_pool(
        RedisSettings.from_dsn(settings.REDIS_URL)
    )
    try:
        job = Job(job_id, redis=redis)
        job_status: JobStatus = await job.status()

        if job_status == JobStatus.not_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job '{job_id}' not found. It may have expired.",
            )

        result = None
        error = None

        if job_status == JobStatus.complete:
            try:
                info = await job.result_info()
                if info is not None:
                    if info.success:
                        result = info.result
                    else:
                        error = str(info.result)
            except Exception:
                pass

        return JobStatusResponse(
            job_id=job_id,
            status=job_status.value,
            result=result,
            error=error,
        )
    finally:
        await redis.aclose()
