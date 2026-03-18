from __future__ import annotations

import logging
import logging.config
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.common.exceptions import DropOSError
from app.common.middleware import RequestLoggingMiddleware
from app.config import settings

# ── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("dropos")


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown hooks."""
    logger.info(
        "DropOS API starting — environment=%s debug=%s",
        settings.ENVIRONMENT,
        settings.DEBUG,
    )
    # Verify DB connectivity on startup
    from app.database import engine
    async with engine.connect() as conn:
        await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    logger.info("Database connection verified.")

    yield

    # Graceful shutdown
    await engine.dispose()
    logger.info("DropOS API shut down cleanly.")


# ── App factory ────────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title="DropOS API",
        version="0.1.0",
        description=(
            "DropOS is a dropshipping SaaS platform. "
            "This API covers analytics, profit tracking, landed cost calculation, "
            "and multi-store dashboard for Phase 1 MVP."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── Middleware ─────────────────────────────────────────────────────────────
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ─────────────────────────────────────────────────────

    @app.exception_handler(DropOSError)
    async def dropos_error_handler(request: Request, exc: DropOSError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = []
        for err in exc.errors():
            errors.append({
                "loc": " -> ".join(str(l) for l in err["loc"]),
                "msg": err["msg"],
                "type": err["type"],
            })
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Validation error.", "errors": errors},
        )

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc: Any) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": f"Route {request.url.path!r} not found."},
        )

    @app.exception_handler(500)
    async def internal_error_handler(request: Request, exc: Any) -> JSONResponse:
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An unexpected internal error occurred."},
        )

    # ── Models (must be imported before routers so SQLAlchemy resolves all
    #    cross-model relationships before any mapper is initialised) ────────────
    import importlib
    for _mod in (
        "app.auth.models", "app.stores.models", "app.orders.models",
        "app.products.models", "app.suppliers.models",
        "app.tariffs.models", "app.webhooks.models",
        "app.notifications.models", "app.team.models",
        "app.api_keys.models", "app.orders.refund_models",
        "app.audit_log.models", "app.purchase_orders.models",
        "app.returns.models",
    ):
        importlib.import_module(_mod)

    # ── Routers ────────────────────────────────────────────────────────────────
    from app.analytics.router import router as analytics_router
    from app.api_keys.router import router as api_keys_router
    from app.audit_log.router import router as audit_log_router
    from app.purchase_orders.router import router as purchase_orders_router
    from app.returns.router import router as returns_router
    from app.auth.router import router as auth_router
    from app.billing.router import router as billing_router
    from app.jobs.router import router as jobs_router
    from app.notifications.router import router as notifications_router
    from app.orders.router import router as orders_router
    from app.team.router import router as team_router
    from app.products.router import router as products_router
    from app.stores.router import router as stores_router
    from app.suppliers.router import router as suppliers_router
    from app.tariffs.router import router as tariffs_router
    from app.webhooks.router import router as webhooks_router

    prefix = "/api/v1"
    app.include_router(auth_router, prefix=prefix)
    app.include_router(stores_router, prefix=prefix)
    app.include_router(orders_router, prefix=prefix)
    app.include_router(analytics_router, prefix=prefix)
    app.include_router(tariffs_router, prefix=prefix)
    app.include_router(suppliers_router, prefix=prefix)
    app.include_router(products_router, prefix=prefix)
    app.include_router(webhooks_router, prefix=prefix)
    app.include_router(jobs_router, prefix=prefix)
    app.include_router(billing_router, prefix=prefix)
    app.include_router(notifications_router, prefix=prefix)
    app.include_router(team_router, prefix=prefix)
    app.include_router(api_keys_router, prefix=prefix)
    app.include_router(audit_log_router, prefix=prefix)
    app.include_router(purchase_orders_router, prefix=prefix)
    app.include_router(returns_router, prefix=prefix)

    # ── Health check ───────────────────────────────────────────────────────────

    @app.get("/health", tags=["Infra"], summary="Liveness / readiness probe")
    async def health() -> dict:
        return {
            "status": "ok",
            "environment": settings.ENVIRONMENT,
            "version": "0.1.0",
        }

    return app


app = create_app()
