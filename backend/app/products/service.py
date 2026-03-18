from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.common.pagination import Page, PageParams
from app.orders.cost_calculator import recalculate_order
from app.orders.models import Order, OrderLineItem
from app.products.models import Product
from app.products.schemas import (
    BulkCogsImportResult,
    ProductLandedCostResponse,
    ProductResponse,
    UpdateProductRequest,
)
from app.tariffs.service import TariffService


class ProductService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_products(
        self,
        tenant_id: uuid.UUID,
        store_id: uuid.UUID | None,
        params: PageParams,
    ) -> Page[ProductResponse]:
        from sqlalchemy import func

        base_q = (
            select(Product)
            .where(Product.tenant_id == tenant_id)
            .where(Product.deleted_at.is_(None))
        )
        if store_id:
            base_q = base_q.where(Product.store_id == store_id)

        total = await self.db.scalar(
            select(func.count()).select_from(base_q.subquery())
        )
        rows = await self.db.scalars(
            base_q.options(selectinload(Product.variants))
            .order_by(Product.title)
            .offset(params.offset)
            .limit(params.limit)
        )
        items = [ProductResponse.model_validate(p) for p in rows.all()]
        return Page.create(items=items, total=total or 0, params=params)

    async def get_product(
        self, product_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> ProductResponse:
        product = await self._get_owned(product_id, tenant_id)
        return ProductResponse.model_validate(product)

    async def update_product(
        self,
        product_id: uuid.UUID,
        tenant_id: uuid.UUID,
        data: UpdateProductRequest,
    ) -> ProductResponse:
        product = await self._get_owned(product_id, tenant_id)

        if data.hs_code is not None:
            product.hs_code = data.hs_code
        if data.origin_country is not None:
            product.origin_country = data.origin_country

        await self.db.flush()
        return ProductResponse.model_validate(product)

    async def get_landed_cost(
        self,
        product_id: uuid.UUID,
        tenant_id: uuid.UUID,
        destination_country: str,
        value_cents: int,
    ) -> ProductLandedCostResponse:
        product = await self._get_owned(product_id, tenant_id)

        if not product.hs_code:
            raise ValidationError(
                f"Product {product_id} has no HS code set. "
                "Update the product with an hs_code before calculating landed cost."
            )
        if not product.origin_country:
            raise ValidationError(
                f"Product {product_id} has no origin_country set."
            )

        tariff_svc = TariffService(self.db)
        result = await tariff_svc.calculate_landed_cost(
            hs_code=product.hs_code,
            origin=product.origin_country,
            destination=destination_country,
            value_cents=value_cents,
        )

        return ProductLandedCostResponse(
            product_id=product.id,
            shopify_product_id=product.shopify_product_id,
            hs_code=product.hs_code,
            origin_country=product.origin_country,
            destination_country=destination_country,
            value_cents=value_cents,
            duty_rate=float(result.duty_rate),
            duty_cents=result.duty_cents,
            total_landed_cents=result.total_landed_cents,
            cached=result.cached,
        )

    async def bulk_import_cogs(
        self,
        tenant_id: uuid.UUID,
        csv_bytes: bytes,
    ) -> BulkCogsImportResult:
        """
        Parse a CSV with columns ``sku,unit_cogs_cents`` and update every
        matching OrderLineItem.  Affected parent orders are recalculated.

        CSV requirements:
        - Header row must contain ``sku`` and ``unit_cogs_cents``
        - ``unit_cogs_cents`` must be a non-negative integer (amounts in cents)
        - Rows with unknown SKUs are reported in ``not_found_skus``
        """
        reader = csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig")))
        if reader.fieldnames is None or not {"sku", "unit_cogs_cents"}.issubset(
            set(reader.fieldnames)
        ):
            raise ValidationError(
                "CSV must have a header row with at least 'sku' and 'unit_cogs_cents' columns."
            )

        # Build a mapping of SKU → unit_cogs_cents from the file
        sku_map: dict[str, int] = {}
        for row in reader:
            raw_sku = (row.get("sku") or "").strip()
            raw_cogs = (row.get("unit_cogs_cents") or "").strip()
            if not raw_sku or not raw_cogs:
                continue
            try:
                sku_map[raw_sku] = int(raw_cogs)
            except ValueError:
                raise ValidationError(
                    f"Invalid unit_cogs_cents value '{raw_cogs}' for SKU '{raw_sku}'. Must be an integer."
                )

        if not sku_map:
            return BulkCogsImportResult(updated=0, orders_recalculated=0, not_found_skus=[])

        # Find all matching line items for this tenant
        stmt = (
            select(OrderLineItem)
            .join(Order, Order.id == OrderLineItem.order_id)
            .where(Order.tenant_id == tenant_id)
            .where(Order.deleted_at.is_(None))
            .where(OrderLineItem.sku.in_(list(sku_map.keys())))
        )
        rows = await self.db.scalars(stmt)
        line_items = list(rows.all())

        found_skus: set[str] = set()
        affected_order_ids: set[uuid.UUID] = set()

        for li in line_items:
            if li.sku and li.sku in sku_map:
                li.unit_cogs = sku_map[li.sku]
                found_skus.add(li.sku)
                affected_order_ids.add(li.order_id)

        # Recalculate total cogs on affected orders
        orders_recalculated = 0
        if affected_order_ids:
            order_stmt = (
                select(Order)
                .where(Order.id.in_(list(affected_order_ids)))
                .options(selectinload(Order.line_items))
            )
            affected_orders = await self.db.scalars(order_stmt)
            for order in affected_orders.all():
                new_cogs = sum(li.unit_cogs * li.quantity for li in order.line_items)
                order.cogs = new_cogs
                computed = recalculate_order(
                    gross_revenue=order.gross_revenue,
                    refund_amount=order.refund_amount,
                    cogs=order.cogs,
                    shipping=order.shipping_cost,
                    platform_fee=order.platform_fee,
                    payment_fee=order.payment_fee,
                    chargeback_fee=order.chargeback_fee,
                    refund_fee=order.refund_fee,
                    fx_loss=order.fx_loss,
                    import_duty=order.import_duty,
                )
                order.net_revenue = computed["net_revenue"]
                order.total_cost = computed["total_cost"]
                order.net_profit = computed["net_profit"]
                order.profit_margin = computed["profit_margin"]
                orders_recalculated += 1

        await self.db.flush()

        not_found = sorted(set(sku_map.keys()) - found_skus)
        return BulkCogsImportResult(
            updated=len(line_items),
            orders_recalculated=orders_recalculated,
            not_found_skus=not_found,
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_owned(self, product_id: uuid.UUID, tenant_id: uuid.UUID) -> Product:
        product = await self.db.scalar(
            select(Product)
            .where(Product.id == product_id)
            .where(Product.deleted_at.is_(None))
            .options(selectinload(Product.variants))
        )
        if not product:
            raise NotFoundError("Product", product_id)
        if product.tenant_id != tenant_id:
            raise ForbiddenError()
        return product
