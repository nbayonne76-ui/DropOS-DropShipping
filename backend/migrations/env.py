from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# ── Alembic Config ────────────────────────────────────────────────────────────
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Import ALL models so Alembic autogenerate can detect them ─────────────────
# Order matters only if there are forward-reference issues; import Base last.
from app.auth.models import RefreshToken, User  # noqa: F401
from app.stores.models import Store  # noqa: F401
from app.orders.models import Order, OrderLineItem  # noqa: F401
from app.tariffs.models import TariffCache, TariffRate  # noqa: F401
from app.suppliers.models import (  # noqa: F401
    ProductSupplierLink,
    Supplier,
    SupplierPerformanceSnapshot,
)
from app.products.models import Product, ProductVariant  # noqa: F401
from app.webhooks.models import WebhookEvent  # noqa: F401

from app.database import Base  # noqa: F401 — must come AFTER model imports

target_metadata = Base.metadata

# ── Read DATABASE_URL from app settings (overrides alembic.ini) ──────────────
from app.config import settings

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


# ── Offline migrations ────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine.
    Calls to context.execute() emit the given string to the script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ── Online migrations (async) ─────────────────────────────────────────────────

def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create the Engine and associate a connection with
    the context, then run migrations using the async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
