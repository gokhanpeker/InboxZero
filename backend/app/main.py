"""FastAPI application entry point."""

from fastapi import FastAPI

from app.core.config import settings
from app.core.error_handlers import RequestIdMiddleware, register_exception_handlers
from app.core.logging import setup_logging

setup_logging(debug=settings.debug)

app = FastAPI(
    title=settings.app_name,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

app.add_middleware(RequestIdMiddleware)
register_exception_handlers(app)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Liveness probe — confirms the API process is running."""
    return {"status": "ok"}
