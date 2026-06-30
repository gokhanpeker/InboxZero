"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware

from app.api.auth import router as auth_router
from app.core.config import settings
from app.core.error_handlers import RequestIdMiddleware, register_exception_handlers
from app.core.limiter import limiter
from app.core.logging import setup_logging
from app.core.startup import validate_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Validate security-sensitive settings before serving traffic."""
    validate_settings()
    yield


setup_logging(debug=settings.debug)

app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(RequestIdMiddleware)

if settings.debug:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

register_exception_handlers(app)

app.include_router(auth_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Liveness probe — confirms the API process is running."""
    return {"status": "ok"}
