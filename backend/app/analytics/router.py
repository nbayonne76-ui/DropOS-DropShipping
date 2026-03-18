from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.analytics.schemas import (
    CostBreakdown,
    CustomerAnalytics,
    DashboardSummary,
    StoreComparison,
    TopOrder,
    TopProduct,
    TrendPoint,
)
from app.analytics.service import AnalyticsService, Granularity
from app.auth.dependencies import CurrentUser
from app.database import AsyncSession, get_db

router = APIRouter(prefix="/analytics", tags=["Analytics"])

DbDep = Annotated[AsyncSession, Depends(get_db)]

_today = date.today
_30_days_ago = lambda: date.today() - timedelta(days=30)


@router.get("/summary", response_model=DashboardSummary, summary="Dashboard KPI summary")
async def get_summary(
    current_user: CurrentUser,
    db: DbDep,
    store_id: uuid.UUID | None = Query(default=None),
    from_date: date = Query(default_factory=_30_days_ago),
    to_date: date = Query(default_factory=_today),
) -> DashboardSummary:
    return await AnalyticsService(db).get_summary(
        current_user.id, store_id, from_date, to_date
    )


@router.get("/trends", response_model=list[TrendPoint], summary="Revenue and profit trends over time")
async def get_trends(
    current_user: CurrentUser,
    db: DbDep,
    store_id: uuid.UUID | None = Query(default=None),
    from_date: date = Query(default_factory=_30_days_ago),
    to_date: date = Query(default_factory=_today),
    granularity: Granularity = Query(default="day"),
) -> list[TrendPoint]:
    return await AnalyticsService(db).get_trends(
        current_user.id, store_id, from_date, to_date, granularity
    )


@router.get("/costs", response_model=CostBreakdown, summary="Per-layer cost breakdown")
async def get_cost_breakdown(
    current_user: CurrentUser,
    db: DbDep,
    store_id: uuid.UUID | None = Query(default=None),
    from_date: date = Query(default_factory=_30_days_ago),
    to_date: date = Query(default_factory=_today),
) -> CostBreakdown:
    return await AnalyticsService(db).get_cost_breakdown(
        current_user.id, store_id, from_date, to_date
    )


@router.get(
    "/stores/comparison",
    response_model=list[StoreComparison],
    summary="Side-by-side comparison of all stores",
)
async def get_store_comparison(
    current_user: CurrentUser,
    db: DbDep,
    from_date: date = Query(default_factory=_30_days_ago),
    to_date: date = Query(default_factory=_today),
) -> list[StoreComparison]:
    return await AnalyticsService(db).get_store_comparison(
        current_user.id, from_date, to_date
    )


@router.get(
    "/top-products",
    response_model=list[TopProduct],
    summary="Top products by net profit",
)
async def get_top_products(
    current_user: CurrentUser,
    db: DbDep,
    store_id: uuid.UUID | None = Query(default=None),
    from_date: date = Query(default_factory=_30_days_ago),
    to_date: date = Query(default_factory=_today),
    limit: int = Query(default=10, ge=1, le=100),
) -> list[TopProduct]:
    return await AnalyticsService(db).get_top_products(
        current_user.id, store_id, from_date, to_date, limit
    )


@router.get(
    "/top-orders",
    response_model=list[TopOrder],
    summary="Top orders by net profit",
)
async def get_top_orders(
    current_user: CurrentUser,
    db: DbDep,
    store_id: uuid.UUID | None = Query(default=None),
    from_date: date = Query(default_factory=_30_days_ago),
    to_date: date = Query(default_factory=_today),
    limit: int = Query(default=10, ge=1, le=100),
) -> list[TopOrder]:
    return await AnalyticsService(db).get_top_orders(
        current_user.id, store_id, from_date, to_date, limit
    )


@router.get(
    "/customers",
    response_model=list[CustomerAnalytics],
    summary="Top customers ranked by total revenue",
)
async def get_customers(
    current_user: CurrentUser,
    db: DbDep,
    store_id: uuid.UUID | None = Query(default=None),
    from_date: date = Query(default_factory=_30_days_ago),
    to_date: date = Query(default_factory=_today),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[CustomerAnalytics]:
    return await AnalyticsService(db).get_customers(
        current_user.id, store_id, from_date, to_date, limit
    )


@router.get(
    "/export/orders",
    summary="Export all orders in the period as CSV",
)
async def export_orders(
    current_user: CurrentUser,
    db: DbDep,
    store_id: uuid.UUID | None = Query(default=None),
    from_date: date = Query(default_factory=_30_days_ago),
    to_date: date = Query(default_factory=_today),
) -> StreamingResponse:
    csv_data = await AnalyticsService(db).export_orders_csv(
        current_user.id, store_id, from_date, to_date
    )
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders.csv"},
    )


@router.get(
    "/export/summary",
    summary="Export analytics summary + trends as CSV",
)
async def export_summary(
    current_user: CurrentUser,
    db: DbDep,
    store_id: uuid.UUID | None = Query(default=None),
    from_date: date = Query(default_factory=_30_days_ago),
    to_date: date = Query(default_factory=_today),
    granularity: Granularity = Query(default="day"),
) -> StreamingResponse:
    csv_data = await AnalyticsService(db).export_summary_csv(
        current_user.id, store_id, from_date, to_date, granularity
    )
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=analytics.csv"},
    )
