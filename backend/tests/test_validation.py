"""Request validation tests."""

from tests.conftest import auth_headers, register


def test_empty_batch_rejected(client):
    token = register(client, "empty@example.com")
    response = client.post(
        "/jobs",
        headers=auth_headers(token),
        json={"items": []},
    )
    assert response.status_code == 422


def test_batch_validation_rejects_oversized_count(client):
    token = register(client, "count@example.com")
    items = [f"message-{index}" for index in range(51)]
    response = client.post(
        "/jobs",
        headers=auth_headers(token),
        json={"items": items},
    )
    assert response.status_code == 422


def test_batch_validation_rejects_oversized_item(client):
    token = register(client, "size@example.com")
    response = client.post(
        "/jobs",
        headers=auth_headers(token),
        json={"items": ["x" * 10_001]},
    )
    assert response.status_code == 422


def test_validation_error_no_field_leak(client):
    token = register(client, "validation@example.com")
    response = client.post(
        "/jobs",
        headers=auth_headers(token),
        json={"items": [""]},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["message"] == "Please check your input and try again."
    assert "items" not in response.text
