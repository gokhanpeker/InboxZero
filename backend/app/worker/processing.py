"""Core item processing logic used by the Celery worker."""

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.models.enums import ItemStatus
from app.models.item import Item
from app.services.ai_service import analyze_message
from app.services.rollup_service import update_job_rollup
from app.worker.exceptions import AIPermanentError, AITransientError

logger = get_logger(__name__)

SIMULATED_FAILURE_MESSAGE = "Simulated processing failure."
GENERIC_FAILURE_MESSAGE = "Processing failed. Please retry."
FAIL_TOKEN = "FAIL"


def _claim_item(db: Session, item_id: int) -> Item | None:
    """Atomically move an item to processing or skip if already handled."""
    result = db.execute(
        update(Item)
        .where(
            Item.id == item_id,
            Item.status.in_([ItemStatus.QUEUED.value, ItemStatus.FAILED.value]),
            Item.attempts < settings.max_retry_attempts,
        )
        .values(
            status=ItemStatus.PROCESSING.value,
            attempts=Item.attempts + 1,
        )
        .returning(Item.id)
    )
    row = result.first()
    if row is None:
        db.rollback()
        return None

    db.commit()
    return db.get(Item, item_id)


def _mark_failed(db: Session, item: Item, message: str) -> None:
    item.status = ItemStatus.FAILED.value
    item.error = message
    item.category = None
    item.priority = None
    item.sentiment = None
    item.summary = None
    item.suggested_reply = None
    db.commit()
    update_job_rollup(db, item.job_id)


def _mark_done(db: Session, item: Item, result: dict[str, str]) -> None:
    item.status = ItemStatus.DONE.value
    item.error = None
    item.category = result["category"]
    item.priority = result["priority"]
    item.sentiment = result["sentiment"]
    item.summary = result["summary"]
    item.suggested_reply = result["suggested_reply"]
    db.commit()
    update_job_rollup(db, item.job_id)


def _reset_for_transient_retry(db: Session, item: Item) -> None:
    item.status = ItemStatus.QUEUED.value
    db.commit()


def process_item_once(item_id: int) -> None:
    """Load, claim, and process a single queue item."""
    db = SessionLocal()
    try:
        item = _claim_item(db, item_id)
        if item is None:
            logger.info("Skipping item_id=%s — already processed or not claimable", item_id)
            return

        if FAIL_TOKEN in item.input_text:
            _mark_failed(db, item, SIMULATED_FAILURE_MESSAGE)
            logger.info("Simulated failure for item_id=%s", item_id)
            return

        try:
            result = analyze_message(item.input_text)
        except AITransientError:
            _reset_for_transient_retry(db, item)
            raise
        except AIPermanentError:
            _mark_failed(db, item, GENERIC_FAILURE_MESSAGE)
            logger.exception("Permanent AI failure for item_id=%s", item_id)
            return

        _mark_done(db, item, result)
        logger.info("Completed item_id=%s", item_id)
    except (AITransientError,):
        raise
    except Exception:
        item = db.get(Item, item_id)
        if item is not None and item.status == ItemStatus.PROCESSING.value:
            _mark_failed(db, item, GENERIC_FAILURE_MESSAGE)
        logger.exception("Unexpected failure for item_id=%s", item_id)
    finally:
        db.close()
