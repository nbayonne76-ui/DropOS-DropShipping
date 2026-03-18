from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, Security
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select

from app.auth.models import User
from app.auth.service import AuthService, decode_access_token
from app.common.exceptions import PlanRequiredError, UnauthorizedError
from app.database import AsyncSession, get_db

bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    api_key: Annotated[str | None, Security(api_key_header)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Authenticate via JWT Bearer token OR X-API-Key header.

    JWT is checked first; if absent, falls back to API key lookup.
    Raises :class:`~app.common.exceptions.UnauthorizedError` if neither is valid.
    """
    # ── JWT path ──────────────────────────────────────────────────────────────
    if credentials is not None:
        payload = decode_access_token(credentials.credentials)
        raw_id = payload.get("sub")
        if not raw_id:
            raise UnauthorizedError("Token subject is missing.")
        try:
            user_id = uuid.UUID(raw_id)
        except ValueError as exc:
            raise UnauthorizedError("Token subject is not a valid UUID.") from exc
        service = AuthService(db)
        return await service.get_current_user(user_id)

    # ── API key path ──────────────────────────────────────────────────────────
    if api_key is not None:
        from app.api_keys.service import ApiKeyService
        svc = ApiKeyService(db)
        key_record = await svc.authenticate(api_key)
        if key_record is None:
            raise UnauthorizedError("Invalid or revoked API key.")
        # Load the owning user
        service = AuthService(db)
        return await service.get_current_user(key_record.tenant_id)

    raise UnauthorizedError("Authorization header or X-API-Key required.")


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_plan(plan: str):
    """Factory that returns a dependency which gates access to a minimum plan tier.

    Usage::

        @router.get("/feature", dependencies=[Depends(require_plan("growth"))])
        async def premium_feature(): ...
    """

    async def _check(current_user: CurrentUser) -> User:
        if not current_user.has_plan(plan):
            raise PlanRequiredError(plan)
        return current_user

    return Depends(_check)
