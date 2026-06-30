"""Authentication routes."""

from fastapi import APIRouter

from app.api.deps import DbSession
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.services.auth_service import authenticate_user, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: DbSession) -> TokenResponse:
    """Create an account and return a JWT."""
    user = register_user(db, body.email, body.password)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DbSession) -> TokenResponse:
    """Authenticate with email and password and return a JWT."""
    user = authenticate_user(db, body.email, body.password)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)
