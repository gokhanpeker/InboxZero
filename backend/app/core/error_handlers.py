"""Global exception handlers and request context middleware."""

import logging
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.types import ASGIApp

from app.core.exceptions import AppException, InternalError, ValidationError
from app.core.logging import get_logger

logger = get_logger(__name__)

REQUEST_ID_HEADER = "X-Request-ID"


def _error_body(*, code: str, message: str, request_id: str) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "request_id": request_id}}


def _get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid.uuid4()))


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Assign a unique request_id to every incoming request."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response


def register_exception_handlers(app: FastAPI) -> None:
    """Register global handlers that return a unified, user-safe error JSON shape."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        request_id = _get_request_id(request)
        log = logging.LoggerAdapter(logger, {"request_id": request_id})
        if exc.status_code >= 500:
            log.exception("AppException: %s", exc.code, exc_info=exc)
        else:
            log.warning("AppException: %s — %s", exc.code, exc.details or exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(code=exc.code, message=exc.message, request_id=request_id),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        request_id = _get_request_id(request)
        log = logging.LoggerAdapter(logger, {"request_id": request_id})
        # Field-level detail stays in logs only — never exposed to clients
        log.warning("Validation error: %s", exc.errors())
        validation_error = ValidationError()
        return JSONResponse(
            status_code=validation_error.status_code,
            content=_error_body(
                code=validation_error.code,
                message=validation_error.message,
                request_id=request_id,
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = _get_request_id(request)
        log = logging.LoggerAdapter(logger, {"request_id": request_id})
        log.exception("Unhandled exception", exc_info=exc)
        internal = InternalError()
        return JSONResponse(
            status_code=internal.status_code,
            content=_error_body(
                code=internal.code,
                message=internal.message,
                request_id=request_id,
            ),
        )
