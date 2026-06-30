"""Background tasks for inbox item processing."""

import httpx

from app.worker.celery_app import celery_app
from app.worker.exceptions import AITransientError
from app.worker.processing import process_item_once


@celery_app.task(
    name="process_item",
    bind=True,
    autoretry_for=(AITransientError, httpx.TimeoutException),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=3,
)
def process_item(self, item_id: int) -> None:
    """Process one queue item with idempotency guards and safe error storage."""
    _ = self
    process_item_once(item_id)
