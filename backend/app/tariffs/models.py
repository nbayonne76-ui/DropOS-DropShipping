from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.models import BaseModel


class TariffRate(BaseModel):
    """Official tariff rate for a given HS code + trade route.

    Rates are loaded from an external tariff data source (e.g. WTO, customs APIs)
    and used as the basis for landed-cost calculations.
    """

    __tablename__ = "tariff_rates"

    hs_code: Mapped[str] = mapped_column(
        String(20), nullable=False,
        comment="Harmonized System commodity code (e.g. '9403.20')"
    )
    origin_country: Mapped[str] = mapped_column(
        String(2), nullable=False,
        comment="ISO 3166-1 alpha-2 origin country code"
    )
    destination_country: Mapped[str] = mapped_column(
        String(2), nullable=False,
        comment="ISO 3166-1 alpha-2 destination country code"
    )
    # Rate stored as a fraction: 0.05 = 5%
    rate: Mapped[float] = mapped_column(
        Numeric(8, 6), nullable=False,
        comment="Import duty rate as a decimal fraction (e.g. 0.05 = 5%)"
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    effective_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expiry_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        UniqueConstraint(
            "hs_code", "origin_country", "destination_country",
            name="uq_tariff_rates_hs_origin_dest",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<TariffRate hs={self.hs_code!r} "
            f"{self.origin_country}->{self.destination_country} rate={self.rate}>"
        )


class TariffCache(BaseModel):
    """Caches landed-cost calculation results to avoid redundant lookups."""

    __tablename__ = "tariff_cache"

    cache_key: Mapped[str] = mapped_column(
        String(256), nullable=False, unique=True, index=True,
        comment="Hash of (hs_code, origin, destination, value_cents)"
    )
    hs_code: Mapped[str] = mapped_column(String(20), nullable=False)
    origin_country: Mapped[str] = mapped_column(String(2), nullable=False)
    destination_country: Mapped[str] = mapped_column(String(2), nullable=False)
    value_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    duty_cents: Mapped[int] = mapped_column(
        Integer, nullable=False,
        comment="Computed duty amount in cents"
    )
    rate_applied: Mapped[float] = mapped_column(Numeric(8, 6), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    def __repr__(self) -> str:
        return f"<TariffCache key={self.cache_key!r} duty={self.duty_cents}>"
