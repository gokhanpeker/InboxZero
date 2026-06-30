"""Application-specific exception hierarchy with user-safe messages."""

from typing import Any


class AppException(Exception):
    """Base exception for all application errors."""

    status_code: int = 500
    code: str = "INTERNAL_ERROR"
    message: str = "Something went wrong. Please try again later."

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message or self.message)
        if message is not None:
            self.message = message
        if code is not None:
            self.code = code
        self.details = details or {}


class ValidationError(AppException):
    """Raised when request input fails validation."""

    status_code = 422
    code = "VALIDATION_ERROR"
    message = "Please check your input and try again."


class UnauthorizedError(AppException):
    """Raised when authentication is missing or invalid."""

    status_code = 401
    code = "UNAUTHORIZED"
    message = "Please sign in to continue."


class NotFoundError(AppException):
    """Raised when a resource does not exist or is not accessible."""

    status_code = 404
    code = "NOT_FOUND"
    message = "The requested resource was not found."


class ConflictError(AppException):
    """Raised when an action conflicts with current state."""

    status_code = 409
    code = "CONFLICT"
    message = "This action conflicts with current state."


class RateLimitError(AppException):
    """Raised when rate limits are exceeded."""

    status_code = 429
    code = "RATE_LIMIT_EXCEEDED"
    message = "Too many requests. Please wait and try again."


class InternalError(AppException):
    """Raised for unexpected server failures."""

    status_code = 500
    code = "INTERNAL_ERROR"
    message = "Something went wrong. Please try again later."
