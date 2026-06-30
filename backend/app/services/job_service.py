"""Job creation and listing."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

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
