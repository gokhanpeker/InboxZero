"""Unified error response tests."""

from unittest.mock import patch

from tests.conftest import auth_headers, register


def test_request_id_in_error_response(client):
    response = client.get("/jobs")
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["request_id"]
    assert response.headers.get("X-Request-ID") == body["error"]["request_id"]


def test_500_returns_generic_message(client):
    token = register(client, "server@example.com")

    with patch("app.api.jobs.list_jobs", side_effect=RuntimeError("secret sql detail")):
        response = client.get("/jobs", headers=auth_headers(token))

    assert response.status_code == 500
    body = response.json()
    assert body["error"]["code"] == "INTERNAL_ERROR"
    assert body["error"]["message"] == "Something went wrong. Please try again later."
    assert "secret sql" not in response.text
    assert "traceback" not in response.text.lower()
