"""
Shopify Fulfillment API helpers.

Uses the FulfillmentOrders flow (recommended since API 2022-07):
  1. GET  /orders/{shopify_order_id}/fulfillment_orders.json  → get fulfillment_order_id
  2. POST /fulfillments.json                                  → create fulfillment

Requires scopes: read_fulfillments, write_fulfillments  (already in SHOPIFY_SCOPES).
"""
from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.common.security import decrypt

SHOPIFY_API_VERSION = "2026-01"


@dataclass
class FulfillmentResult:
    shopify_fulfillment_id: str
    tracking_number: str | None
    tracking_company: str | None
    status: str  # e.g. "success", "pending"


async def get_fulfillment_order_id(
    shop_domain: str,
    access_token: str,
    shopify_order_id: str,
) -> str | None:
    """
    Returns the first open fulfillment_order_id for a given Shopify order.
    Returns None if there are no open fulfillment orders (e.g. already fulfilled).
    """
    url = (
        f"https://{shop_domain}/admin/api/{SHOPIFY_API_VERSION}"
        f"/orders/{shopify_order_id}/fulfillment_orders.json"
    )
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            url,
            headers={"X-Shopify-Access-Token": access_token},
        )
        resp.raise_for_status()
        fulfillment_orders = resp.json().get("fulfillment_orders", [])

    # Return the first "open" fulfillment order
    for fo in fulfillment_orders:
        if fo.get("status") == "open":
            return str(fo["id"])

    # Fall back to the first one if none are "open" (e.g. partial)
    if fulfillment_orders:
        return str(fulfillment_orders[0]["id"])

    return None


async def create_fulfillment(
    shop_domain: str,
    access_token: str,
    fulfillment_order_id: str,
    tracking_number: str | None = None,
    tracking_company: str | None = None,
    notify_customer: bool = True,
) -> FulfillmentResult:
    """
    Creates a fulfillment on Shopify for the given fulfillment_order_id.
    Returns a FulfillmentResult with the created fulfillment's details.
    """
    url = f"https://{shop_domain}/admin/api/{SHOPIFY_API_VERSION}/fulfillments.json"

    body: dict = {
        "fulfillment": {
            "notify_customer": notify_customer,
            "line_items_by_fulfillment_order": [
                {"fulfillment_order_id": int(fulfillment_order_id)}
            ],
        }
    }

    if tracking_number or tracking_company:
        body["fulfillment"]["tracking_info"] = {
            "company": tracking_company or "",
            "number": tracking_number or "",
        }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url,
            headers={
                "X-Shopify-Access-Token": access_token,
                "Content-Type": "application/json",
            },
            json=body,
        )
        resp.raise_for_status()
        data = resp.json().get("fulfillment", {})

    tracking_info = data.get("tracking_info") or {}
    return FulfillmentResult(
        shopify_fulfillment_id=str(data.get("id", "")),
        tracking_number=tracking_info.get("number") or tracking_number,
        tracking_company=tracking_info.get("company") or tracking_company,
        status=data.get("status", "pending"),
    )


async def fulfill_shopify_order(
    shop_domain: str,
    encrypted_access_token: str,
    shopify_order_id: str,
    tracking_number: str | None = None,
    tracking_company: str | None = None,
    notify_customer: bool = True,
) -> FulfillmentResult:
    """
    High-level helper: decrypts token, gets fulfillment_order_id, creates fulfillment.
    Raises RuntimeError if no open fulfillment order is found.
    """
    access_token = decrypt(encrypted_access_token)

    fulfillment_order_id = await get_fulfillment_order_id(
        shop_domain, access_token, shopify_order_id
    )
    if not fulfillment_order_id:
        raise RuntimeError(
            f"No open fulfillment order found for Shopify order {shopify_order_id}."
        )

    return await create_fulfillment(
        shop_domain=shop_domain,
        access_token=access_token,
        fulfillment_order_id=fulfillment_order_id,
        tracking_number=tracking_number,
        tracking_company=tracking_company,
        notify_customer=notify_customer,
    )
