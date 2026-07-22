from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
)


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code


def register_user(db: Session, email: str, password: str, full_name: str | None) -> User:
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise AuthError("An account with this email already exists.", status_code=409)

    user = User(email=email, hashed_password=hash_password(password), full_name=full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(password, user.hashed_password):
        # Deliberately identical message for "no such user" and "wrong password" —
        # distinguishing them lets an attacker enumerate valid emails.
        raise AuthError("Invalid email or password.", status_code=401)
    if not user.is_active:
        raise AuthError("This account has been deactivated.", status_code=403)
    return user


def issue_tokens(db: Session, user: User) -> tuple[str, str, datetime]:
    access_token = create_access_token(str(user.id))
    raw_refresh, token_hash, expires_at = generate_refresh_token()

    db.add(RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    db.commit()

    return access_token, raw_refresh, expires_at


def rotate_refresh_token(db: Session, raw_refresh: str) -> tuple[User, str, str, datetime]:
    token_hash = hash_refresh_token(raw_refresh)
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))

    if not record:
        raise AuthError("Invalid session. Please log in again.", status_code=401)

    if record.revoked_at is not None:
        # Reuse of an already-rotated token — treat as compromise and kill every
        # active session for this user.
        db.query(RefreshToken).filter(
            RefreshToken.user_id == record.user_id, RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": datetime.now(timezone.utc)})
        db.commit()
        raise AuthError("Session invalidated for security reasons. Please log in again.", status_code=401)

    if record.expires_at < datetime.now(timezone.utc):
        raise AuthError("Session expired. Please log in again.", status_code=401)

    user = db.get(User, record.user_id)
    if not user or not user.is_active:
        raise AuthError("Account unavailable.", status_code=403)

    record.revoked_at = datetime.now(timezone.utc)
    access_token = create_access_token(str(user.id))
    raw_new_refresh, new_hash, new_expires = generate_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=new_hash, expires_at=new_expires))
    db.commit()

    return user, access_token, raw_new_refresh, new_expires


def revoke_refresh_token(db: Session, raw_refresh: str) -> None:
    token_hash = hash_refresh_token(raw_refresh)
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if record and record.revoked_at is None:
        record.revoked_at = datetime.now(timezone.utc)
        db.commit()