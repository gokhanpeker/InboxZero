"""Background tasks — full processing logic added in a later worker commit."""

from app.worker.celery_app import celery_app


@celery_app.task(name="process_item", bind=True)
def process_item(self, item_id: int) -> None:
    """Process one queue item with AI. Stub until worker pipeline is implemented."""
    _ = self, item_id
