"""Authentication business logic."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import hash_password, verify_password
from app.models.user import User

INVALID_CREDENTIALS_MESSAGE = "Invalid email or password."


def register_user(db: Session, email: str, password: str) -> User:
    """Create a new user account with a hashed password."""
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise ConflictError(message="An account with this email already exists.")

    user = User(email=email, password_hash=hash_password(password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(message="An account with this email already exists.") from exc
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Return the user when credentials are valid; otherwise raise UnauthorizedError."""
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.password_hash):
        raise UnauthorizedError(message=INVALID_CREDENTIALS_MESSAGE)
    return user
