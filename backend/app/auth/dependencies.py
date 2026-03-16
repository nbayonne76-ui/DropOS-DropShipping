from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.models import User
from app.auth.service import AuthService, decode_access_token
from app.common.exceptions import PlanRequiredError, UnauthorizedError
from app.database import AsyncSession, get_db

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Extract and validate the JWT bearer token, then return the active User.

    Raises :class:`~app.common.exceptions.UnauthorizedError` if the token is
    missing, expired, or the corresponding user is not found / inactive.
    """
    if credentials is None:
        raise UnauthorizedError("Authorization header missing.")

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
