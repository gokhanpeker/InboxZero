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
)
