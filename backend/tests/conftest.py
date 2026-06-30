"""Shared pytest fixtures and helpers."""

from __future__ import annotations

import os
from collections.abc import Generator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Environment must be set before importing application modules.
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-at-least-32-characters-long")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("RATE_LIMIT_LOGIN", "1000/minute")
os.environ.setdefault("RATE_LIMIT_SUBMIT", "1000/hour")
os.environ.setdefault("DEBUG", "false")

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.enums import ItemStatus, JobStatus
from app.models.item import Item
from app.models.job import Job
from app.models.user import User
from app.services.auth_service import register_user

TEST_PASSWORD = "password123"


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    """Provide an isolated in-memory database session per test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, autocommit=False, autoflush=False)()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def client(db: Session) -> Generator[TestClient, None, None]:
    """FastAPI test client with database dependency override."""

    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def worker_db(db: Session, monkeypatch: pytest.MonkeyPatch) -> Session:
    """Point worker code at the same in-memory database as API tests."""
    import app.worker.processing as processing_module

    monkeypatch.setattr(processing_module, "SessionLocal", lambda: db)
    monkeypatch.setattr(db, "close", lambda: None)
    return db


@pytest.fixture(autouse=True)
def mock_enqueue() -> Generator[None, None, None]:
    """Avoid Redis/Celery during API tests."""
    with patch("app.services.job_service.enqueue_item"):
        yield


def register(client: TestClient, email: str, password: str = TEST_PASSWORD) -> str:
    """Register a user and return the access token."""
    response = client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def token_for_user(user_id: int) -> str:
    return create_access_token(user_id)


def create_user(db: Session, email: str, password: str = TEST_PASSWORD) -> User:
    return register_user(db, email, password)


def create_job_with_items(
    db: Session,
    *,
    user_id: int,
    texts: list[str],
    item_status: str = ItemStatus.QUEUED.value,
) -> tuple[Job, list[Item]]:
    job = Job(
        user_id=user_id,
        status=JobStatus.PROCESSING.value,
        total_items=len(texts),
    )
    db.add(job)
    db.flush()

    items: list[Item] = []
    for text in texts:
        item = Item(
            job_id=job.id,
            user_id=user_id,
            input_text=text,
            status=item_status,
        )
        db.add(item)
        items.append(item)

    db.commit()
    db.refresh(job)
    for item in items:
        db.refresh(item)
    return job, items
