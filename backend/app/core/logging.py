"""Structured logging configuration."""

import logging
import sys


class RequestIdFilter(logging.Filter):
    """Inject request_id into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = "-"
        return True


def setup_logging(*, debug: bool = False) -> None:
    """Configure root logger for stdout output with a consistent format."""
    level = logging.DEBUG if debug else logging.INFO
    root = logging.getLogger()
    root.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)s [%(name)s] request_id=%(request_id)s %(message)s"
        )
    )
    handler.addFilter(RequestIdFilter())
    root.addHandler(handler)
    root.setLevel(level)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger."""
    return logging.getLogger(name)
