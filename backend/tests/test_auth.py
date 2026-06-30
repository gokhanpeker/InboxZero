"""Authentication endpoint tests."""

import jwt

from app.core.config import settings


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_register_login_returns_jwt(client):
    response = client.post(
        "/auth/register",
        json={"email": "user@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]

    login = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    assert login.json()["access_token"]


def test_unauthorized_returns_401(client):
    response = client.get("/jobs")
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "UNAUTHORIZED"
    assert "traceback" not in response.text.lower()


def test_invalid_jwt_rejected(client):
    response = client.get(
        "/jobs",
        headers={"Authorization": "Bearer not-a-valid-token"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_tampered_jwt_rejected(client):
    token = jwt.encode(
        {"sub": "1", "iat": 1, "exp": 9999999999},
        "wrong-secret-key-at-least-32-chars",
        algorithm="HS256",
    )
    response = client.get("/jobs", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_protected_route_accepts_valid_token(client):
    register = client.post(
        "/auth/register",
        json={"email": "valid@example.com", "password": "password123"},
    )
    token = register.json()["access_token"]

    response = client.get("/jobs", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == []

    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )
    assert payload["sub"]
