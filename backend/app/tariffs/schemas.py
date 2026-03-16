from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class LandedCostRequest(BaseModel):
    hs_code: str = Field(
        max_length=20,
        examples=["9403.20"],
        description="Harmonized System commodity code.",
    )
    origin_country: str = Field(
        max_length=2,
        examples=["CN"],
        description="ISO 3166-1 alpha-2 origin country code.",
    )
    destination_country: str = Field(
        max_length=2,
        examples=["US"],
        description="ISO 3166-1 alpha-2 destination country code.",
    )
    value_cents: int = Field(
        ge=0,
        description="Declared customs value in smallest currency unit (cents).",
    )


class LandedCostResponse(BaseModel):
    hs_code: str
    origin_country: str
    destination_country: str
    value_cents: int
    duty_rate: Decimal = Field(description="Applied duty rate as a decimal (e.g. 0.05 = 5%).")
    duty_cents: int = Field(description="Calculated duty amount in cents.")
    total_landed_cents: int = Field(description="value_cents + duty_cents.")
    cached: bool = Field(description="Whether the result was served from cache.")


class TariffRateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    hs_code: str
    origin_country: str
    destination_country: str
    rate: Decimal
    description: str | None
    effective_date: datetime | None
    expiry_date: datetime | None
