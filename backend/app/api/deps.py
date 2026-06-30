"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user_id(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
) -> int:
    """Require a valid Bearer token and return the authenticated user id."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError()
    return decode_access_token(credentials.credentials)


CurrentUserId = Annotated[int, Depends(get_current_user_id)]
