"""Shopify order sync engine for DropOS — GraphQL Admin API.

Uses GraphQL instead of REST to avoid Shopify's protected customer data
restriction on the REST orders endpoint.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import httpx

from app.common.security import decrypt
from app.database import AsyncSession
from app.orders.service import OrderService
from app.stores.models import Store


SHOPIFY_API_VERSION = "2026-01"
PAGE_SIZE = 50  # safe page size for GraphQL

ORDERS_QUERY = """
query GetOrders($first: Int!, $after: String) {
  orders(first: $first, after: $after, sortKey: ID) {
    edges {
      node {
        id
        name
        createdAt
        updatedAt
        displayFinancialStatus
        currencyCode
        totalPriceSet       { shopMoney { amount } }
        totalShippingPriceSet { shopMoney { amount } }
        totalRefundedSet    { shopMoney { amount } }
        lineItems(first: 50) {
          edges {
            node {
              id
              title
              quantity
              sku
              originalUnitPriceSet { shopMoney { amount } }
              product { id }
              variant  { id }
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
"""


def _gid_to_str(gid: str) -> str:
    """Convert Shopify GID like gid://shopify/Order/12345 → '12345'."""
    return gid.split("/")[-1] if gid else ""


def _to_cents(amount_str: str | None) -> int:
    """Convert Shopify money string '29.99' → 2999 cents."""
    if not amount_str:
        return 0
    try:
        return round(float(amount_str) * 100)
    except (ValueError, TypeError):
        return 0


def _gql_to_payload(node: dict) -> dict:
    """Convert a GraphQL order node to the REST-like payload expected by ingest_from_shopify_payload."""
    return {
        "id": _gid_to_str(node["id"]),
        "order_number": node.get("name", ""),
        "financial_status": (node.get("displayFinancialStatus") or "open").lower().replace(" ", "_"),
        "created_at": node["createdAt"],
        "currency": node.get("currencyCode", "USD"),
        "total_price": node.get("totalPriceSet", {}).get("shopMoney", {}).get("amount", "0"),
        "refunds": [
            {"transactions": [{"amount": node.get("totalRefundedSet", {}).get("shopMoney", {}).get("amount", "0")}]}
        ] if _to_cents(node.get("totalRefundedSet", {}).get("shopMoney", {}).get("amount")) > 0 else [],
        "line_items": [
            {
                "id": _gid_to_str(li["node"]["id"]),
                "title": li["node"].get("title", ""),
                "quantity": li["node"].get("quantity", 1),
                "sku": li["node"].get("sku"),
                "price": li["node"].get("originalUnitPriceSet", {}).get("shopMoney", {}).get("amount", "0"),
                "product_id": _gid_to_str((li["node"].get("product") or {}).get("id", "")),
                "variant_id": _gid_to_str((li["node"].get("variant") or {}).get("id", "")),
            }
            for li in node.get("lineItems", {}).get("edges", [])
        ],
    }


async def sync_store_orders(
    db: AsyncSession,
    store: Store,
    tenant_id: uuid.UUID,
    full_sync: bool = False,
) -> dict[str, int]:
    """Pull orders from Shopify via GraphQL and upsert into DB."""
    if not store.shopify_access_token_encrypted:
        raise ValueError(f"Store {store.id} has no access token.")

    access_token = decrypt(store.shopify_access_token_encrypted)
    gql_url = f"https://{store.shopify_domain}/admin/api/{SHOPIFY_API_VERSION}/graphql.json"
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
    }

    order_service = OrderService(db)
    fetched = upserted = pages = 0

    # Use stored cursor for incremental sync, or None for full sync
    cursor: str | None = None if full_sync else store.sync_cursor

    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            variables: dict = {"first": PAGE_SIZE, "after": cursor}
            resp = await client.post(gql_url, headers=headers, json={"query": ORDERS_QUERY, "variables": variables})
            resp.raise_for_status()

            body = resp.json()
            if "errors" in body:
                raise RuntimeError(f"Shopify GraphQL error: {body['errors']}")

            orders_data = body["data"]["orders"]
            edges = orders_data["edges"]
            page_info = orders_data["pageInfo"]

            pages += 1
            fetched += len(edges)

            for edge in edges:
                payload = _gql_to_payload(edge["node"])
                await order_service.ingest_from_shopify_payload(
                    payload=payload,
                    store_id=store.id,
                    tenant_id=tenant_id,
                )
                upserted += 1

            if not page_info["hasNextPage"] or not edges:
                cursor = page_info.get("endCursor")
                break

            cursor = page_info["endCursor"]

    # Persist sync metadata
    store.last_synced_at = datetime.now(tz=timezone.utc)
    store.sync_cursor = cursor
    await db.flush()

    return {"fetched": fetched, "upserted": upserted, "pages": pages}
