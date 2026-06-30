"""Worker-specific exceptions for Celery retry classification."""

class AITransientError(Exception):
    """Raised when an AI call fails in a way that may succeed on retry."""


class AIPermanentError(Exception):
    """Raised when an AI call fails permanently and should not be retried."""
