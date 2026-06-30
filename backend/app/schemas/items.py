"""Pydantic schemas for item endpoints."""

from datetime import datetime

from pydantic import BaseModel


class ItemResponse(BaseModel):
    id: int
    job_id: int
    input_text: str
    status: str
    attempts: int
    category: str | None = None
    priority: str | None = None
    sentiment: str | None = None
    summary: str | None = None
    suggested_reply: str | None = None
    error: str | None = None
    updated_at: datetime
