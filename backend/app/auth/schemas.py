from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=200)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token lifetime in seconds.")


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    is_active: bool
    is_verified: bool
    plan: str
    timezone: str
    avatar_url: str | None
    created_at: datetime
    updated_at: datetime


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=200)
    timezone: str | None = Field(default=None, max_length=60)
    avatar_url: str | None = Field(default=None)
    current_password: str | None = Field(default=None, description="Required to change password.")
    new_password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not any(c.isupper() for c in v):
            raise ValueError("New password must contain at least one uppercase letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("New password must contain at least one digit.")
        return v
