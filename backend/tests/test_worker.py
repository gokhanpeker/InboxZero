"""Worker processing, rollup, and idempotency tests."""

from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session

from app.models.enums import ItemStatus, JobStatus
from app.models.item import Item
from app.worker.exceptions import AIPermanentError
from app.services.rollup_service import update_job_rollup
from app.worker.processing import (
    GENERIC_FAILURE_MESSAGE,
    SIMULATED_FAILURE_MESSAGE,
    process_item_once,
)
from tests.conftest import create_job_with_items, create_user


@pytest.fixture()
def worker_db(db: Session, monkeypatch: pytest.MonkeyPatch) -> Session:
    """Point worker code at the same in-memory database as API tests."""
    import app.worker.processing as processing_module

    monkeypatch.setattr(processing_module, "SessionLocal", lambda: db)
    monkeypatch.setattr(db, "close", lambda: None)
    return db


def test_fail_keyword_marks_item_failed(worker_db: Session):
    user = create_user(worker_db, "fail@example.com")
    _, items = create_job_with_items(
        worker_db,
        user_id=user.id,
        texts=["This will FAIL on purpose"],
    )
    item_id = items[0].id

    process_item_once(item_id)

    item = worker_db.get(Item, item_id)
    assert item is not None
    assert item.status == ItemStatus.FAILED.value
    assert item.error == SIMULATED_FAILURE_MESSAGE


def test_idempotency_guard_skips_done_item(worker_db: Session):
    user = create_user(worker_db, "done@example.com")
    _, items = create_job_with_items(
        worker_db,
        user_id=user.id,
        texts=["Already processed"],
        item_status=ItemStatus.DONE.value,
    )
    item_id = items[0].id
    item = worker_db.get(Item, item_id)
    assert item is not None
    item.category = "bug"
    item.summary = "Existing summary"
    worker_db.commit()

    with patch("app.worker.processing.analyze_message") as mock_analyze:
        process_item_once(item_id)
        mock_analyze.assert_not_called()

    refreshed = worker_db.get(Item, item_id)
    assert refreshed is not None
    assert refreshed.status == ItemStatus.DONE.value
    assert refreshed.summary == "Existing summary"


def test_worker_stores_safe_error_on_permanent_ai_failure(worker_db: Session):
    user = create_user(worker_db, "ai-fail@example.com")
    _, items = create_job_with_items(
        worker_db,
        user_id=user.id,
        texts=["Process me"],
    )
    item_id = items[0].id

    with patch(
        "app.worker.processing.analyze_message",
        side_effect=AIPermanentError("invalid key"),
    ):
        process_item_once(item_id)

    item = worker_db.get(Item, item_id)
    assert item is not None
    assert item.status == ItemStatus.FAILED.value
    assert item.error == GENERIC_FAILURE_MESSAGE
    assert "invalid key" not in (item.error or "")


def test_job_rollup_completes_when_all_items_terminal(worker_db: Session):
    user = create_user(worker_db, "rollup@example.com")
    job, items = create_job_with_items(
        worker_db,
        user_id=user.id,
        texts=["One", "Two"],
    )

    for item in items:
        item.status = ItemStatus.DONE.value
        item.summary = "done"
    worker_db.commit()

    update_job_rollup(worker_db, job.id)
    worker_db.refresh(job)

    assert job.status == JobStatus.COMPLETED.value


def test_successful_processing_writes_ai_result(worker_db: Session):
    user = create_user(worker_db, "success@example.com")
    _, items = create_job_with_items(
        worker_db,
        user_id=user.id,
        texts=["Help with billing"],
    )
    item_id = items[0].id

    ai_result = {
        "category": "billing",
        "priority": "high",
        "sentiment": "negative",
        "summary": "Billing question",
        "suggested_reply": "We can help with billing.",
    }

    with patch("app.worker.processing.analyze_message", return_value=ai_result):
        process_item_once(item_id)

    item = worker_db.get(Item, item_id)
    assert item is not None
    assert item.status == ItemStatus.DONE.value
    assert item.category == "billing"
    assert item.summary == "Billing question"
