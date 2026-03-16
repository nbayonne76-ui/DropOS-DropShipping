from __future__ import annotations

import base64
import hashlib
import hmac

from fastapi import Request

from app.stores.models import Store


async def verify_shopify_webhook(request: Request, store: Store) -> bool:
    """Validate a Shopify webhook HMAC-SHA256 signature.

    Shopify signs the raw request body with the store's webhook secret using
    HMAC-SHA256 and sends the base64-encoded digest in the
    ``X-Shopify-Hmac-Sha256`` header.

    Args:
        request: The incoming FastAPI/Starlette request.
        store: The Store ORM object which must have ``webhook_secret`` set.

    Returns:
        ``True`` if the signature is valid, ``False`` otherwise.
    """
    if not store.webhook_secret:
        # Cannot verify without a secret — reject to be safe
        return False

    shopify_hmac = request.headers.get("X-Shopify-Hmac-Sha256", "")
    if not shopify_hmac:
        return False

    raw_body = await request.body()
    computed = hmac.new(
        store.webhook_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).digest()
    computed_b64 = base64.b64encode(computed).decode("utf-8")

    return hmac.compare_digest(computed_b64, shopify_hmac)
