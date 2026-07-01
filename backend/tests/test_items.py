"""Item retry endpoint tests."""

from unittest.mock import patch

from app.models.enums import ItemStatus, JobStatus
from tests.conftest import auth_headers, create_job_with_items, create_user, token_for_user


def test_retry_stuck_queued_item(client, db):
    user = create_user(db, "retry-queued@example.com")
    _, items = create_job_with_items(db, user_id=user.id, texts=["Stuck message"])
    item = items[0]
    token = token_for_user(user.id)

    with patch("app.services.job_service.enqueue_item") as mock_enqueue:
        response = client.post(
            f"/items/{item.id}/retry",
            headers=auth_headers(token),
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "queued"
    assert body["attempts"] == 0
    mock_enqueue.assert_called_once_with(item.id)


def test_retry_stuck_processing_item(client, db):
    user = create_user(db, "retry-processing@example.com")
    _, items = create_job_with_items(
        db,
        user_id=user.id,
        texts=["Worker died"],
        item_status=ItemStatus.PROCESSING.value,
    )
    item = items[0]
    token = token_for_user(user.id)

    with patch("app.services.job_service.enqueue_item") as mock_enqueue:
        response = client.post(
            f"/items/{item.id}/retry",
            headers=auth_headers(token),
        )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "queued"
    mock_enqueue.assert_called_once_with(item.id)


def test_retry_failed_item(client, db):
    user = create_user(db, "retry-failed@example.com")
    _, items = create_job_with_items(
        db,
        user_id=user.id,
        texts=["FAIL message"],
        item_status=ItemStatus.FAILED.value,
    )
    item = items[0]
    item.attempts = 3
    item.error = "Processing failed. Please retry."
    db.commit()
    token = token_for_user(user.id)

    with patch("app.services.job_service.enqueue_item") as mock_enqueue:
        response = client.post(
            f"/items/{item.id}/retry",
            headers=auth_headers(token),
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "queued"
    assert body["attempts"] == 0
    assert body["error"] is None
    mock_enqueue.assert_called_once_with(item.id)


def test_retry_rejects_done_item(client, db):
    user = create_user(db, "retry-done@example.com")
    job, items = create_job_with_items(
        db,
        user_id=user.id,
        texts=["Finished"],
        item_status=ItemStatus.DONE.value,
    )
    item = items[0]
    job.status = JobStatus.COMPLETED.value
    db.commit()
    token = token_for_user(user.id)

    response = client.post(
        f"/items/{item.id}/retry",
        headers=auth_headers(token),
    )

    assert response.status_code == 409


def test_user_cannot_retry_other_item(client, db):
    user_a = create_user(db, "retry-a@example.com")
    user_b = create_user(db, "retry-b@example.com")
    _, items = create_job_with_items(db, user_id=user_a.id, texts=["Private"])
    item = items[0]

    response = client.post(
        f"/items/{item.id}/retry",
        headers=auth_headers(token_for_user(user_b.id)),
    )

    assert response.status_code == 404
