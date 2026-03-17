from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/dropos_dev",
        description="Async PostgreSQL connection string (asyncpg driver required).",
    )

    # ── JWT / Auth ────────────────────────────────────────────────────────────
    SECRET_KEY: str = Field(
        default="INSECURE-CHANGE-ME",
        description="HMAC signing key for JWT tokens.",
    )
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=1)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30, ge=1)

    # ── Field-level Encryption ────────────────────────────────────────────────
    ENCRYPTION_KEY: str = Field(
        default="",
        description="Fernet symmetric key for encrypting Shopify tokens, supplier keys, etc.",
    )

    # ── Shopify ───────────────────────────────────────────────────────────────
    SHOPIFY_API_KEY: str = Field(default="")
    SHOPIFY_API_SECRET: str = Field(default="")
    SHOPIFY_SCOPES: str = Field(
        default="read_orders,write_orders,read_products,write_products,read_inventory,write_inventory,read_fulfillments,write_fulfillments"
    )
    SHOPIFY_REDIRECT_URI: str = Field(
        default="http://localhost:8001/api/v1/stores/oauth/callback"
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="Comma-separated list of allowed CORS origins.",
    )

    # ── App ───────────────────────────────────────────────────────────────────
    ENVIRONMENT: Literal["development", "staging", "production"] = Field(
        default="development"
    )
    DEBUG: bool = Field(default=True)

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: str | list[str]) -> list[str]:
        """Accept both a comma-separated string and a Python list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
