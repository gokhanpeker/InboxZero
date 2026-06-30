"""Celery application configuration."""

from celery import Celery

from app.core.config import settings

celery_app = Celery("inboxzero", broker=settings.redis_url, backend=settings.redis_url)

celery_app.conf.update(
    task_acks_late=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    task_default_queue="default",
)

celery_app.autodiscover_tasks(["app.worker"])
