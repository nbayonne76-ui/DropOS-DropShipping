"""Shopify OAuth 2.0 helpers for DropOS."""
from __future__ import annotations

import hashlib
import hmac
import secrets
import urllib.parse
from typing import Any

import httpx

from app.config import settings


def build_oauth_url(shop: str, state: str) -> str:
    """Return the Shopify OAuth authorization URL."""
    params = {
        "client_id": settings.SHOPIFY_API_KEY,
        "scope": settings.SHOPIFY_SCOPES,
        "redirect_uri": settings.SHOPIFY_REDIRECT_URI,
        "state": state,
        "grant_options[]": "per-user",
    }
    return f"https://{shop}/admin/oauth/authorize?{urllib.parse.urlencode(params)}"


def verify_hmac(params: dict[str, str]) -> bool:
    """Verify the HMAC signature returned by Shopify on the callback."""
    hmac_value = params.pop("hmac", None)
    if not hmac_value:
        return False
    sorted_params = "&".join(
        f"{k}={v}" for k, v in sorted(params.items()) if k != "hmac"
    )
    digest = hmac.new(  # type: ignore[attr-defined]
        settings.SHOPIFY_API_SECRET.encode(),
        sorted_params.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(digest, hmac_value)


async def exchange_code_for_token(shop: str, code: str) -> str:
    """Exchange the temporary code for a permanent access token."""
    url = f"https://{shop}/admin/oauth/access_token"
    payload = {
        "client_id": settings.SHOPIFY_API_KEY,
        "client_secret": settings.SHOPIFY_API_SECRET,
        "code": code,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data: dict[str, Any] = resp.json()
    return data["access_token"]


async def get_shop_info(shop: str, access_token: str) -> dict[str, Any]:
    """Fetch basic shop metadata from the Shopify Admin API."""
    url = f"https://{shop}/admin/api/2026-01/shop.json"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            url, headers={"X-Shopify-Access-Token": access_token}
        )
        resp.raise_for_status()
        return resp.json()["shop"]


def generate_state() -> str:
    return secrets.token_urlsafe(24)
