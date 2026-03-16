from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import CurrentUser
from app.database import AsyncSession, get_db
from app.tariffs.schemas import LandedCostRequest, LandedCostResponse, TariffRateResponse
from app.tariffs.service import TariffService

router = APIRouter(prefix="/tariffs", tags=["Tariffs & Landed Cost"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get(
    "/calculate",
    response_model=LandedCostResponse,
    summary="Calculate landed cost (duty + value) for a shipment",
)
async def calculate_landed_cost(
    current_user: CurrentUser,
    db: DbDep,
    hs_code: str = Query(description="Harmonized System code, e.g. '9403.20'"),
    origin: str = Query(description="ISO 3166-1 alpha-2 origin country code."),
    destination: str = Query(description="ISO 3166-1 alpha-2 destination country code."),
    value_cents: int = Query(ge=0, description="Declared value in cents."),
) -> LandedCostResponse:
    return await TariffService(db).calculate_landed_cost(
        hs_code, origin, destination, value_cents
    )


@router.get(
    "/rates",
    response_model=TariffRateResponse,
    summary="Look up a tariff rate for a given HS code and trade route",
)
async def get_tariff_rate(
    current_user: CurrentUser,
    db: DbDep,
    hs_code: str = Query(description="Harmonized System code."),
    origin: str = Query(description="ISO 3166-1 alpha-2 origin country code."),
    destination: str = Query(description="ISO 3166-1 alpha-2 destination country code."),
) -> TariffRateResponse:
    return await TariffService(db).get_tariff_rate(hs_code, origin, destination)
