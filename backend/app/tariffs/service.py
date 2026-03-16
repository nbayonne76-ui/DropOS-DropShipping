from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import NotFoundError
from app.tariffs.models import TariffCache, TariffRate
from app.tariffs.schemas import LandedCostResponse, TariffRateResponse

_CACHE_TTL_HOURS = 24


def _make_cache_key(hs_code: str, origin: str, destination: str, value_cents: int) -> str:
    raw = f"{hs_code}:{origin.upper()}:{destination.upper()}:{value_cents}"
    return hashlib.sha256(raw.encode()).hexdigest()


class TariffService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def calculate_landed_cost(
        self,
        hs_code: str,
        origin: str,
        destination: str,
        value_cents: int,
    ) -> LandedCostResponse:
        """Calculate landed cost for a shipment.

        Order of operations:
        1. Check tariff_cache; if hit and not expired, return cached result.
        2. Look up tariff_rates for the given hs_code + trade route.
        3. Compute duty and store result in cache.
        """
        origin = origin.upper()
        destination = destination.upper()
        cache_key = _make_cache_key(hs_code, origin, destination, value_cents)

        # 1. Cache lookup
        cached = await self.db.scalar(
            select(TariffCache)
            .where(TariffCache.cache_key == cache_key)
            .where(TariffCache.expires_at > datetime.now(tz=timezone.utc))
        )
        if cached:
            return LandedCostResponse(
                hs_code=hs_code,
                origin_country=origin,
                destination_country=destination,
                value_cents=value_cents,
                duty_rate=Decimal(str(cached.rate_applied)),
                duty_cents=cached.duty_cents,
                total_landed_cents=value_cents + cached.duty_cents,
                cached=True,
            )

        # 2. Tariff rate lookup
        rate_row = await self.get_tariff_rate(hs_code, origin, destination)
        rate = rate_row.rate

        # 3. Compute
        duty_cents = int(Decimal(value_cents) * rate)
        expires_at = datetime.now(tz=timezone.utc) + timedelta(hours=_CACHE_TTL_HOURS)

        # Store in cache (upsert via delete-then-insert to avoid conflicts)
        old_cache = await self.db.scalar(
            select(TariffCache).where(TariffCache.cache_key == cache_key)
        )
        if old_cache:
            old_cache.duty_cents = duty_cents
            old_cache.rate_applied = float(rate)
            old_cache.expires_at = expires_at
        else:
            new_cache = TariffCache(
                cache_key=cache_key,
                hs_code=hs_code,
                origin_country=origin,
                destination_country=destination,
                value_cents=value_cents,
                duty_cents=duty_cents,
                rate_applied=float(rate),
                expires_at=expires_at,
            )
            self.db.add(new_cache)

        await self.db.flush()

        return LandedCostResponse(
            hs_code=hs_code,
            origin_country=origin,
            destination_country=destination,
            value_cents=value_cents,
            duty_rate=rate,
            duty_cents=duty_cents,
            total_landed_cents=value_cents + duty_cents,
            cached=False,
        )

    async def get_tariff_rate(
        self, hs_code: str, origin: str, destination: str
    ) -> TariffRateResponse:
        """Look up a single tariff rate row.

        Tries exact match first, then falls back to 6-digit HS code prefix.
        """
        origin = origin.upper()
        destination = destination.upper()

        row = await self.db.scalar(
            select(TariffRate)
            .where(TariffRate.hs_code == hs_code)
            .where(TariffRate.origin_country == origin)
            .where(TariffRate.destination_country == destination)
        )

        if not row:
            # Try 6-digit prefix fallback
            prefix = hs_code[:6]
            row = await self.db.scalar(
                select(TariffRate)
                .where(TariffRate.hs_code == prefix)
                .where(TariffRate.origin_country == origin)
                .where(TariffRate.destination_country == destination)
            )

        if not row:
            # Final fallback: wildcard origin (Some tariff databases use "--")
            row = await self.db.scalar(
                select(TariffRate)
                .where(TariffRate.hs_code == hs_code)
                .where(TariffRate.origin_country == "--")
                .where(TariffRate.destination_country == destination)
            )

        if not row:
            raise NotFoundError(
                f"TariffRate",
                f"{hs_code} ({origin} -> {destination})",
            )

        return TariffRateResponse.model_validate(row)
