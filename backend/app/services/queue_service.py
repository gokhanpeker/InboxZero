"""Enqueue helpers for background processing."""

import time

from app.worker.tasks import process_item


def enqueue_item(item_id: int, *, skip_fail_simulation: bool = False) -> None:
    """Send an item to Celery; each enqueue uses a unique task id so retries are not dropped."""
    task_id = f"item-{item_id}-{int(time.time() * 1000)}"
    process_item.apply_async(
        args=[item_id],
        kwargs={"skip_fail_simulation": skip_fail_simulation},
        task_id=task_id,
    )
