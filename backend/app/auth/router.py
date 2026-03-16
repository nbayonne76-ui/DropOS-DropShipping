from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.auth.dependencies import CurrentUser
from app.auth.schemas import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.auth.service import AuthService
from app.database import AsyncSession, get_db

router = APIRouter(prefix="/auth", tags=["Auth"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(body: RegisterRequest, db: DbDep) -> TokenResponse:
    return await AuthService(db).register(body)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive access + refresh tokens",
)
async def login(body: LoginRequest, db: DbDep) -> TokenResponse:
    return await AuthService(db).login(body)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Exchange a refresh token for a new token pair",
)
async def refresh(body: RefreshRequest, db: DbDep) -> TokenResponse:
    return await AuthService(db).refresh_token(body.refresh_token)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke a refresh token",
)
async def logout(body: LogoutRequest, db: DbDep) -> Response:
    await AuthService(db).logout(body.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently authenticated user",
)
async def get_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update profile fields (name, timezone, password)",
)
async def update_me(
    body: UpdateProfileRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> UserResponse:
    return await AuthService(db).update_profile(current_user, body)
