from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import RefreshToken, User
from app.auth.schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.common.exceptions import (
    ConflictError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
)
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_access_token(user_id: uuid.UUID, plan: str) -> str:
    expire = datetime.now(tz=timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "plan": plan,
        "exp": expire,
        "iat": datetime.now(tz=timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _create_refresh_token_string() -> str:
    import secrets

    return secrets.token_urlsafe(64)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(self, data: RegisterRequest) -> TokenResponse:
        # Check uniqueness
        existing = await self.db.scalar(select(User).where(User.email == data.email))
        if existing:
            raise ConflictError(f"An account with email '{data.email}' already exists.")

        user = User(
            email=data.email,
            hashed_password=_hash_password(data.password),
            full_name=data.full_name,
        )
        self.db.add(user)
        await self.db.flush()  # get user.id before commit
        return await self._issue_tokens(user)

    async def login(self, data: LoginRequest) -> TokenResponse:
        user = await self.db.scalar(select(User).where(User.email == data.email))
        if not user or not _verify_password(data.password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password.")
        if not user.is_active:
            raise UnauthorizedError("Your account has been deactivated.")
        return await self._issue_tokens(user)

    async def refresh_token(self, raw_refresh_token: str) -> TokenResponse:
        token_row = await self.db.scalar(
            select(RefreshToken)
            .where(RefreshToken.token == raw_refresh_token)
            .where(RefreshToken.revoked.is_(False))
        )
        if not token_row or not token_row.is_valid:
            raise UnauthorizedError("Refresh token is invalid or expired.")

        # Rotate: revoke old, issue new
        token_row.revoked = True
        user = await self.db.get(User, token_row.user_id)
        if not user or not user.is_active:
            raise UnauthorizedError("User not found or inactive.")
        return await self._issue_tokens(user)

    async def logout(self, raw_refresh_token: str) -> None:
        token_row = await self.db.scalar(
            select(RefreshToken).where(RefreshToken.token == raw_refresh_token)
        )
        if token_row:
            token_row.revoked = True

    async def get_current_user(self, user_id: uuid.UUID) -> User:
        user = await self.db.get(User, user_id)
        if not user or not user.is_active:
            raise NotFoundError("User", user_id)
        return user

    async def update_profile(
        self, user: User, data: UpdateProfileRequest
    ) -> UserResponse:
        if data.new_password:
            if not data.current_password:
                raise ValidationError("current_password is required to change password.")
            if not _verify_password(data.current_password, user.hashed_password):
                raise UnauthorizedError("Current password is incorrect.")
            user.hashed_password = _hash_password(data.new_password)

        if data.full_name is not None:
            user.full_name = data.full_name
        if data.timezone is not None:
            user.timezone = data.timezone
        if data.avatar_url is not None:
            user.avatar_url = data.avatar_url

        await self.db.flush()
        return UserResponse.model_validate(user)

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _issue_tokens(self, user: User) -> TokenResponse:
        access_token = _create_access_token(user.id, user.plan)
        raw_refresh = _create_refresh_token_string()
        expires_at = datetime.now(tz=timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        token_row = RefreshToken(
            token=raw_refresh,
            user_id=user.id,
            expires_at=expires_at,
        )
        self.db.add(token_row)
        await self.db.flush()
        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )


def decode_access_token(token: str) -> dict:
    """Decode and validate an access token, returning the payload dict."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            raise UnauthorizedError("Invalid token type.")
        return payload
    except JWTError as exc:
        raise UnauthorizedError(str(exc)) from exc
