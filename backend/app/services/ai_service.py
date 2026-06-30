"""Analyze inbox messages with Google Gemini."""

import json
import re
from typing import Literal

import google.generativeai as genai
import httpx
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings
from app.core.logging import get_logger
from app.worker.exceptions import AIPermanentError, AITransientError

logger = get_logger(__name__)

Category = Literal["bug", "billing", "feature-request", "spam"]
Priority = Literal["low", "medium", "high"]
Sentiment = Literal["positive", "neutral", "negative"]


class AIAnalysis(BaseModel):
    category: Category
    priority: Priority
    sentiment: Sentiment
    summary: str = Field(max_length=500)
    suggested_reply: str = Field(max_length=2000)


_SYSTEM_PROMPT = """You triage customer support messages.
Return JSON with keys: category, priority, sentiment, summary, suggested_reply.
category must be one of: bug, billing, feature-request, spam.
priority must be one of: low, medium, high.
sentiment must be one of: positive, neutral, negative.
summary is one line, max 500 characters.
suggested_reply is a draft reply, max 2000 characters."""


def _strip_fences(text: str) -> str:
    cleaned = text.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", cleaned, flags=re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return cleaned


def _build_prompt(input_text: str) -> str:
    return (
        f"{_SYSTEM_PROMPT}\n\n"
        "---MESSAGE START---\n"
        f"{input_text}\n"
        "---MESSAGE END---"
    )


def _configure_client() -> None:
    if not settings.gemini_api_key:
        raise AIPermanentError("Gemini API key is not configured.")
    genai.configure(api_key=settings.gemini_api_key)


def analyze_message(input_text: str) -> dict[str, str]:
    """Call Gemini and return a validated analysis payload."""
    _configure_client()

    model = genai.GenerativeModel(settings.gemini_model)
    prompt = _build_prompt(input_text)

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            ),
        )
    except Exception as exc:
        if _is_transient(exc):
            logger.warning("Transient Gemini error: %s", type(exc).__name__)
            raise AITransientError(str(exc)) from exc
        logger.exception("Permanent Gemini error")
        raise AIPermanentError(str(exc)) from exc

    raw = getattr(response, "text", None) or ""
    try:
        payload = json.loads(_strip_fences(raw))
        analysis = AIAnalysis.model_validate(payload)
    except (json.JSONDecodeError, ValidationError, TypeError) as exc:
        logger.warning("Invalid Gemini JSON for message triage: %s", type(exc).__name__)
        raise AITransientError("Invalid AI response format.") from exc

    return analysis.model_dump()


def _is_transient(exc: Exception) -> bool:
    if isinstance(exc, httpx.TimeoutException):
        return True

    status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    if isinstance(status, int) and (status == 429 or status >= 500):
        return True

    message = str(exc).lower()
    transient_markers = ("timeout", "rate limit", "429", "503", "502", "500")
    return any(marker in message for marker in transient_markers)
