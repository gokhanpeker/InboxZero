"""Job creation, listing, and item retry."""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.enums import ItemStatus, JobStatus
from app.models.item import Item
from app.models.job import Job
from app.services.queue_service import enqueue_item


def _count_items_by_status(db: Session, job_id: int) -> dict[str, int]:
    """Return per-status item counts for a job."""
    rows = db.execute(
        select(Item.status, func.count())
        .where(Item.job_id == job_id)
        .group_by(Item.status)
    ).all()
    counts = {status.value: 0 for status in ItemStatus}
    for status, count in rows:
        counts[status] = count
    return counts


def _job_to_summary(db: Session, job: Job) -> dict:
    counts = _count_items_by_status(db, job.id)
    return {
        "id": job.id,
        "status": job.status,
        "total_items": job.total_items,
        "created_at": job.created_at,
        "queued": counts[ItemStatus.QUEUED.value],
        "processing": counts[ItemStatus.PROCESSING.value],
        "done": counts[ItemStatus.DONE.value],
        "failed": counts[ItemStatus.FAILED.value],
    }


def create_job(db: Session, user_id: int, items: list[str]) -> Job:
    """Persist a job and its items, then enqueue each item without blocking on AI."""
    job = Job(
        user_id=user_id,
        status=JobStatus.PROCESSING.value,
        total_items=len(items),
    )
    db.add(job)
    db.flush()

    item_ids: list[int] = []
    for text in items:
        item = Item(
            job_id=job.id,
            user_id=user_id,
            input_text=text,
            status=ItemStatus.QUEUED.value,
        )
        db.add(item)
        db.flush()
        item_ids.append(item.id)

    db.commit()
    db.refresh(job)

    for item_id in item_ids:
        enqueue_item(item_id)

    return job


def list_jobs(db: Session, user_id: int) -> list[dict]:
    """Return all jobs for the authenticated user with rollup counts."""
    jobs = db.scalars(
        select(Job).where(Job.user_id == user_id).order_by(Job.created_at.desc())
    ).all()
    return [_job_to_summary(db, job) for job in jobs]


def _get_user_job(db: Session, user_id: int, job_id: int) -> Job:
    """Load a job scoped to the authenticated user or raise 404."""
    job = db.scalar(select(Job).where(Job.id == job_id, Job.user_id == user_id))
    if job is None:
        raise NotFoundError()
    return job


def get_job(db: Session, user_id: int, job_id: int) -> dict:
    """Return a single job with rollup counts for the authenticated user."""
    job = _get_user_job(db, user_id, job_id)
    return _job_to_summary(db, job)


def list_job_items(db: Session, user_id: int, job_id: int) -> list[dict]:
    """Return items for a job owned by the authenticated user."""
    _get_user_job(db, user_id, job_id)
    items = db.scalars(
        select(Item)
        .where(Item.job_id == job_id, Item.user_id == user_id)
        .order_by(Item.id)
    ).all()
    return [_item_to_dict(item) for item in items]


def _item_to_dict(item: Item) -> dict:
    return {
        "id": item.id,
        "job_id": item.job_id,
        "input_text": item.input_text,
        "status": item.status,
        "attempts": item.attempts,
        "category": item.category,
        "priority": item.priority,
        "sentiment": item.sentiment,
        "summary": item.summary,
        "suggested_reply": item.suggested_reply,
        "error": item.error,
        "updated_at": item.updated_at,
    }


_RETRIABLE_STATUSES = (
    ItemStatus.FAILED.value,
    ItemStatus.QUEUED.value,
    ItemStatus.PROCESSING.value,
)


def _reset_item_for_processing(item: Item) -> None:
    """Clear runtime state so a manual retry starts a fresh worker run."""
    item.status = ItemStatus.QUEUED.value
    item.attempts = 0
    item.error = None
    item.category = None
    item.priority = None
    item.sentiment = None
    item.summary = None
    item.suggested_reply = None
    item.updated_at = datetime.now(timezone.utc)


def retry_item(db: Session, user_id: int, item_id: int) -> dict:
    """Re-enqueue a failed or stuck item after resetting its state."""
    item = db.scalar(select(Item).where(Item.id == item_id, Item.user_id == user_id))
    if item is None:
        raise NotFoundError()

    if item.status not in _RETRIABLE_STATUSES:
        raise ConflictError("This item cannot be retried.")

    _reset_item_for_processing(item)

    job = _get_user_job(db, user_id, item.job_id)
    if job.status == JobStatus.COMPLETED.value:
        job.status = JobStatus.PROCESSING.value

    db.commit()
    db.refresh(item)

    enqueue_item(item.id, skip_fail_simulation=True)
    return _item_to_dict(item)
