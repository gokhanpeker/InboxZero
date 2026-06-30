"""Recompute job status from item terminal states."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import ItemStatus, JobStatus
from app.models.item import Item
from app.models.job import Job

_TERMINAL = {ItemStatus.DONE.value, ItemStatus.FAILED.value}


def update_job_rollup(db: Session, job_id: int) -> None:
    """Mark the job completed when every item has reached a terminal state."""
    rows = db.execute(
        select(Item.status, func.count())
        .where(Item.job_id == job_id)
        .group_by(Item.status)
    ).all()

    if not rows:
        return

    counts = {status: count for status, count in rows}
    total = sum(counts.values())
    terminal = sum(counts.get(s, 0) for s in _TERMINAL)

    if terminal < total:
        return

    job = db.get(Job, job_id)
    if job is None:
        return

    job.status = JobStatus.COMPLETED.value
    db.commit()
