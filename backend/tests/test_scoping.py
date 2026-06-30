"""Multi-tenant access control tests."""

from tests.conftest import auth_headers, create_job_with_items, create_user, register, token_for_user


def test_user_cannot_access_other_job(client, db):
    user_a = create_user(db, "a@example.com")
    user_b = create_user(db, "b@example.com")
    job, _ = create_job_with_items(db, user_id=user_a.id, texts=["private"])

    response = client.get(
        f"/jobs/{job.id}",
        headers=auth_headers(token_for_user(user_b.id)),
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_user_scoping_jobs_list(client, db):
    user_a = create_user(db, "scope-a@example.com")
    user_b = create_user(db, "scope-b@example.com")
    create_job_with_items(db, user_id=user_a.id, texts=["only for a"])

    response = client.get("/jobs", headers=auth_headers(token_for_user(user_b.id)))
    assert response.status_code == 200
    assert response.json() == []


def test_user_cannot_retry_other_item(client, db):
    user_a = create_user(db, "retry-a@example.com")
    user_b = create_user(db, "retry-b@example.com")
    job, items = create_job_with_items(
        db,
        user_id=user_a.id,
        texts=["FAIL message"],
        item_status="failed",
    )
    item_id = items[0].id
    assert job.id

    response = client.post(
        f"/items/{item_id}/retry",
        headers=auth_headers(token_for_user(user_b.id)),
    )
    assert response.status_code == 404


def test_not_found_generic_message(client):
    token = register(client, "notfound@example.com")

    response = client.get("/jobs/99999", headers=auth_headers(token))
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["message"] == "The requested resource was not found."
    assert "99999" not in body["error"]["message"]
