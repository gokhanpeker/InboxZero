"""Job batch endpoints."""

from fastapi import APIRouter, Request

from app.api.deps import CurrentUserId, DbSession
from app.core.config import settings
from app.core.limiter import limiter
from app.schemas.jobs import CreateJobRequest, JobCreateResponse, JobSummary
from app.services.job_service import create_job, list_jobs

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobCreateResponse, status_code=201)
@limiter.limit(settings.rate_limit_submit)
def submit_job(
    request: Request,
    body: CreateJobRequest,
    db: DbSession,
    user_id: CurrentUserId,
) -> JobCreateResponse:
    """Accept a batch of messages and enqueue them for background processing."""
    job = create_job(db, user_id, body.items)
    return JobCreateResponse(id=job.id, status=job.status)


@router.get("", response_model=list[JobSummary])
def get_jobs(db: DbSession, user_id: CurrentUserId) -> list[JobSummary]:
    """List jobs belonging to the authenticated user."""
    return [JobSummary(**row) for row in list_jobs(db, user_id)]
