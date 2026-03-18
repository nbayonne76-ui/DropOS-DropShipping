"""Shopify order and product sync engine for DropOS — GraphQL Admin API.

Uses GraphQL instead of REST to avoid Shopify's protected customer data
restriction on the REST orders endpoint.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy import select

from app.common.security import decrypt
from app.database import AsyncSession
from app.orders.service import OrderService
from app.products.models import Product, ProductVariant
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


PRODUCTS_QUERY = """
query GetProducts($first: Int!, $after: String) {
  products(first: $first, after: $after, sortKey: ID) {
    edges {
      node {
        id
        title
        vendor
        productType
        status
        variants(first: 100) {
          edges {
            node {
              id
              title
              sku
              price
              compareAtPrice
              inventoryQuantity
              weight
              weightUnit
              requiresShipping
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

_WEIGHT_TO_GRAMS = {
    "KILOGRAMS": 1000,
    "GRAMS": 1,
    "POUNDS": 453,
    "OUNCES": 28,
}


async def sync_store_products(
    db: AsyncSession,
    store: Store,
    tenant_id: uuid.UUID,
) -> dict[str, int]:
    """Pull products and variants from Shopify via GraphQL and upsert into DB.

    Also updates Product.total_inventory as the sum of all variant quantities.
    """
    if not store.shopify_access_token_encrypted:
        raise ValueError(f"Store {store.id} has no access token.")

    access_token = decrypt(store.shopify_access_token_encrypted)
    gql_url = f"https://{store.shopify_domain}/admin/api/{SHOPIFY_API_VERSION}/graphql.json"
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
    }

    fetched = upserted = 0
    cursor: str | None = None

    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            variables: dict = {"first": PAGE_SIZE, "after": cursor}
            resp = await client.post(
                gql_url, headers=headers,
                json={"query": PRODUCTS_QUERY, "variables": variables},
            )
            resp.raise_for_status()

            body = resp.json()
            if "errors" in body:
                raise RuntimeError(f"Shopify GraphQL error: {body['errors']}")

            products_data = body["data"]["products"]
            edges = products_data["edges"]
            page_info = products_data["pageInfo"]

            fetched += len(edges)

            for edge in edges:
                node = edge["node"]
                shopify_product_id = _gid_to_str(node["id"])

                # Upsert Product
                product = await db.scalar(
                    select(Product)
                    .where(Product.tenant_id == tenant_id)
                    .where(Product.shopify_product_id == shopify_product_id)
                    .where(Product.deleted_at.is_(None))
                )
                if not product:
                    product = Product(
                        tenant_id=tenant_id,
                        store_id=store.id,
                        shopify_product_id=shopify_product_id,
                        title=node.get("title", ""),
                        vendor=node.get("vendor") or None,
                        product_type=node.get("productType") or None,
                        status=(node.get("status") or "ACTIVE").lower(),
                        total_inventory=0,
                    )
                    db.add(product)
                    await db.flush()  # get product.id
                else:
                    product.title = node.get("title", product.title)
                    product.vendor = node.get("vendor") or product.vendor
                    product.product_type = node.get("productType") or product.product_type
                    product.status = (node.get("status") or "ACTIVE").lower()

                # Upsert variants and track total inventory
                total_inv = 0
                for ve in node.get("variants", {}).get("edges", []):
                    vnode = ve["node"]
                    shopify_variant_id = _gid_to_str(vnode["id"])
                    inv_qty = int(vnode.get("inventoryQuantity") or 0)
                    total_inv += max(inv_qty, 0)

                    weight_raw = vnode.get("weight")
                    weight_unit = vnode.get("weightUnit", "GRAMS")
                    weight_grams: int | None = None
                    if weight_raw is not None:
                        try:
                            weight_grams = round(
                                float(weight_raw) * _WEIGHT_TO_GRAMS.get(weight_unit, 1)
                            )
                        except (ValueError, TypeError):
                            pass

                    price_cents = _to_cents(vnode.get("price"))
                    compare_cents_raw = vnode.get("compareAtPrice")
                    compare_at_cents = _to_cents(compare_cents_raw) if compare_cents_raw else None

                    variant = await db.scalar(
                        select(ProductVariant)
                        .where(ProductVariant.product_id == product.id)
                        .where(ProductVariant.shopify_variant_id == shopify_variant_id)
                    )
                    if not variant:
                        variant = ProductVariant(
                            product_id=product.id,
                            shopify_variant_id=shopify_variant_id,
                            title=vnode.get("title", ""),
                            sku=vnode.get("sku") or None,
                            price_cents=price_cents,
                            compare_at_price_cents=compare_at_cents,
                            weight_grams=weight_grams,
                            inventory_quantity=inv_qty,
                            requires_shipping=bool(vnode.get("requiresShipping", True)),
                        )
                        db.add(variant)
                    else:
                        variant.title = vnode.get("title", variant.title)
                        variant.sku = vnode.get("sku") or variant.sku
                        variant.price_cents = price_cents
                        variant.compare_at_price_cents = compare_at_cents
                        variant.weight_grams = weight_grams
                        variant.inventory_quantity = inv_qty
                        variant.requires_shipping = bool(vnode.get("requiresShipping", True))

                product.total_inventory = total_inv
                upserted += 1

            await db.flush()

            if not page_info["hasNextPage"] or not edges:
                break
            cursor = page_info["endCursor"]

    return {"fetched": fetched, "upserted": upserted}


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
