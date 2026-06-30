"""Job submission and listing tests."""

from tests.conftest import auth_headers, register


def test_submit_returns_immediately(client):
    token = register(client, "submit@example.com")
    response = client.post(
        "/jobs",
        headers=auth_headers(token),
        json={"items": ["Billing issue", "Feature request"]},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "processing"
    assert isinstance(body["id"], int)


def test_list_jobs_after_submit(client):
    token = register(client, "lister@example.com")
    submit = client.post(
        "/jobs",
        headers=auth_headers(token),
        json={"items": ["Hello world"]},
    )
    job_id = submit.json()["id"]

    response = client.get("/jobs", headers=auth_headers(token))
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) == 1
    assert jobs[0]["id"] == job_id
    assert jobs[0]["total_items"] == 1


def test_get_job_detail(client):
    token = register(client, "detail@example.com")
    submit = client.post(
        "/jobs",
        headers=auth_headers(token),
        json={"items": ["Need help"]},
    )
    job_id = submit.json()["id"]

    response = client.get(f"/jobs/{job_id}", headers=auth_headers(token))
    assert response.status_code == 200
    assert response.json()["id"] == job_id


def test_get_job_items(client):
    token = register(client, "items@example.com")
    submit = client.post(
        "/jobs",
        headers=auth_headers(token),
        json={"items": ["First", "Second"]},
    )
    job_id = submit.json()["id"]

    response = client.get(f"/jobs/{job_id}/items", headers=auth_headers(token))
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 2
    assert items[0]["status"] == "queued"
