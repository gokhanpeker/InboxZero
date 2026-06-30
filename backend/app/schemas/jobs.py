"""Pydantic schemas for job endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.core.config import settings


class CreateJobRequest(BaseModel):
    items: list[str] = Field(min_length=1)

    @field_validator("items")
    @classmethod
    def validate_items(cls, items: list[str]) -> list[str]:
        if len(items) > settings.max_batch_size:
            msg = f"A batch cannot contain more than {settings.max_batch_size} items."
            raise ValueError(msg)

        cleaned: list[str] = []
        for raw in items:
            text = raw.strip()
            if not text:
                raise ValueError("Each item must contain non-empty text.")
            if len(text) > settings.max_item_chars:
                msg = f"Each item must be at most {settings.max_item_chars} characters."
                raise ValueError(msg)
            cleaned.append(text)

        return cleaned


class JobCreateResponse(BaseModel):
    id: int
    status: str


class JobSummary(BaseModel):
    id: int
    status: str
    total_items: int
    created_at: datetime
    queued: int = 0
    processing: int = 0
    done: int = 0
    failed: int = 0
