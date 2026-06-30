"""Application startup validation."""

from app.core.config import settings

MIN_JWT_SECRET_LENGTH = 32


def validate_settings() -> None:
    """Fail fast when required security settings are misconfigured."""
    if len(settings.jwt_secret) < MIN_JWT_SECRET_LENGTH:
        raise ValueError(
            "JWT_SECRET must be at least 32 characters. "
            "Set a strong random value in your environment."
        )

    if settings.jwt_algorithm != "HS256":
        raise ValueError("JWT_ALGORITHM must be HS256.")
