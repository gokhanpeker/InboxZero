"""Enqueue helpers for background processing."""

from app.worker.tasks import process_item


def enqueue_item(item_id: int) -> None:
    """Send an item to the Celery queue with a stable task id for deduplication."""
    process_item.apply_async(args=[item_id], task_id=f"item-{item_id}")
